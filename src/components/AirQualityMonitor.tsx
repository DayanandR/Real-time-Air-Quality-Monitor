import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Wind,
  Eye,
  Thermometer,
  Droplets,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
} from "lucide-react";
import { calculateHealthIndex, calculateTrend, convertAQIToUSScale, formatTimestamp, generateDemoAirQualityData, generateRecommendations, getAqiColor, getAqiLevel, getBarColor, getParticleColor } from "../utils/helper";

interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  temperature: number;
  humidity: number;
  location: string;
  timestamp: number;
  healthIndex?: number;
  recommendations?: string[];
  trend?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

const AirQualityMonitor = () => {
  const [airQualityData, setAirQualityData] = useState<AirQualityData | null>(
    null
  );
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set()
  );
  const [refreshing, setRefreshing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiDialog, setShowApiDialog] = useState(false);

  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(null);
  const particlesRef = useRef<any[]>([]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem("openweather_api_key");
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowApiDialog(true);
    }
  }, []);

  const saveApiKey = (key: string) => {
    localStorage.setItem("openweather_api_key", key);
    setApiKey(key);
    setShowApiDialog(false);
  };

  const fetchAirQualityData = useCallback(
    async (lat: number, lon: number) => {
      try {
        setError(null);
        setRefreshing(true);

        const airPollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${
          apiKey || "demo_key"
        }`;
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${
          apiKey || "demo_key"
        }&units=metric`;

        if (!apiKey) {
          throw new Error("API key required for real data");
        }

        const [airResponse, weatherResponse] = await Promise.all([
          fetch(airPollutionUrl),
          fetch(weatherUrl),
        ]);

        if (!airResponse.ok || !weatherResponse.ok) {
          throw new Error("Failed to fetch data from OpenWeatherMap");
        }

        const airData = await airResponse.json();
        const weatherData = await weatherResponse.json();

        const apiData = airData.list[0];
        const aqiValue = convertAQIToUSScale(apiData.main.aqi);

        const airQualityData: AirQualityData = {
          aqi: aqiValue,
          pm25: Math.round(apiData.components.pm2_5 || 0),
          pm10: Math.round(apiData.components.pm10 || 0),
          o3: Math.round(apiData.components.o3 || 0),
          no2: Math.round(apiData.components.no2 || 0),
          so2: Math.round(apiData.components.so2 || 0),
          co: Math.round((apiData.components.co || 0) / 1000), 
          temperature: Math.round(weatherData.main.temp),
          humidity: Math.round(weatherData.main.humidity),
          location: `${weatherData.name}, ${weatherData.sys.country}`,
          timestamp: Date.now(),
        };

        processDataInBackground(airQualityData);
      } catch (error) {
        console.error("Error fetching air quality data:", error);
        setError("Failed to fetch real-time data. Using demo data instead.");

        const fallbackData = generateDemoAirQualityData(
          location?.city || "Unknown"
        );
        processDataInBackground(fallbackData);
      } finally {
        setRefreshing(false);
      }
    },
    [apiKey]
  );

  const fetchAlternativeAirQualityData = useCallback(
    async (lat: number, lon: number) => {
      try {
        setError(null);
        setRefreshing(true);
        const response = await fetch(
          `https://api.waqi.info/feed/geo:${lat};${lon}/?token=demo`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch from alternative API");
        }

        const data = await response.json();

        if (data.status !== "ok") {
          throw new Error("Invalid response from alternative API");
        }

        const aqiData = data.data;

        const airQualityData: AirQualityData = {
          aqi: aqiData.aqi || 0,
          pm25: aqiData.iaqi?.pm25?.v || 0,
          pm10: aqiData.iaqi?.pm10?.v || 0,
          o3: aqiData.iaqi?.o3?.v || 0,
          no2: aqiData.iaqi?.no2?.v || 0,
          so2: aqiData.iaqi?.so2?.v || 0,
          co: aqiData.iaqi?.co?.v || 0,
          temperature: aqiData.iaqi?.t?.v || 20,
          humidity: aqiData.iaqi?.h?.v || 50,
          location: aqiData.city?.name || "Unknown",
          timestamp: Date.now(),
        };

        processDataInBackground(airQualityData);
      } catch (error) {
        console.error("Error fetching alternative air quality data:", error);
        setError("Failed to fetch real-time data. Using demo data instead.");

        const fallbackData = generateDemoAirQualityData(
          location?.city || "Unknown"
        );
        processDataInBackground(fallbackData);
      } finally {
        setRefreshing(false);
      }
    },
    [location]
  );

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setRefreshing(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${
            apiKey || "demo_key"
          }`;

          let locationData: LocationData = {
            latitude,
            longitude,
            city: "Unknown",
            country: "Unknown",
          };

          try {
            if (apiKey) {
              const geoResponse = await fetch(reverseGeoUrl);
              if (geoResponse.ok) {
                const geoData = await geoResponse.json();
                if (geoData.length > 0) {
                  locationData = {
                    latitude,
                    longitude,
                    city: geoData[0].name,
                    country: geoData[0].country,
                  };
                }
              }
            }
          } catch (geoError) {
            console.warn("Reverse geocoding failed, using coordinates only");
          }

          setLocation(locationData);

          if (apiKey) {
            await fetchAirQualityData(latitude, longitude);
          } else {
            await fetchAlternativeAirQualityData(latitude, longitude);
          }
        } catch (error) {
          console.error("Error processing location:", error);
          setError("Error processing location data");
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setError(`Location access denied: ${error.message}`);

        const defaultLocation = {
          latitude: 12.9716,
          longitude: 77.5946,
          city: "Bengaluru",
          country: "IN",
        };

        setLocation(defaultLocation);

        if (apiKey) {
          fetchAirQualityData(
            defaultLocation.latitude,
            defaultLocation.longitude
          );
        } else {
          fetchAlternativeAirQualityData(
            defaultLocation.latitude,
            defaultLocation.longitude
          );
        }

        setLoading(false);
        setRefreshing(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, 
      }
    );
  }, [apiKey]);

  // Background task for data processing
  const processDataInBackground = useCallback((data: AirQualityData) => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        const processedData = {
          ...data,
          healthIndex: calculateHealthIndex(data),
          recommendations: generateRecommendations(data),
          trend: calculateTrend(data),
        };
        setAirQualityData(processedData);
      });
    } else {
      setTimeout(() => {
        const processedData = {
          ...data,
          healthIndex: calculateHealthIndex(data),
          recommendations: generateRecommendations(data),
          trend: calculateTrend(data),
        };
        setAirQualityData(processedData);
      }, 0);
    }
  }, []);

  const refreshData = useCallback(() => {
    if (location) {
      if (apiKey) {
        fetchAirQualityData(location.latitude, location.longitude);
      } else {
        fetchAlternativeAirQualityData(location.latitude, location.longitude);
      }
    } else {
      getCurrentLocation();
    }
  }, [
    location,
    apiKey,
    fetchAirQualityData,
    fetchAlternativeAirQualityData,
    getCurrentLocation,
  ]);

  const initParticleAnimation = useCallback(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas || !airQualityData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particleCount = Math.min(airQualityData.aqi * 2, 200);
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      color: getParticleColor(airQualityData.aqi),
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, [airQualityData]);

  const drawChart = useCallback(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas || !airQualityData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const data = [
      { label: "PM2.5", value: airQualityData.pm25, max: 100 },
      { label: "PM10", value: airQualityData.pm10, max: 200 },
      { label: "O3", value: airQualityData.o3, max: 300 },
      { label: "NO2", value: airQualityData.no2, max: 200 },
      { label: "SO2", value: airQualityData.so2, max: 150 },
    ];

    const barWidth = canvas.width / data.length - 20;
    const maxBarHeight = canvas.height - 60;

    data.forEach((item, index) => {
      const x = index * (barWidth + 20) + 10;
      const barHeight = (item.value / item.max) * maxBarHeight;
      const y = canvas.height - barHeight - 30;

      ctx.fillStyle = getBarColor(item.value, item.max);
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(item.label, x + barWidth / 2, canvas.height - 10);
      ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
    });
  }, [airQualityData]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            setVisibleSections((prev) => new Set([...prev, sectionId]));

            if (sectionId === "particle-section") {
              initParticleAnimation();
            } else if (sectionId === "chart-section") {
              drawChart();
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    return () => observerRef.current?.disconnect();
  }, [initParticleAnimation, drawChart]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && location) {
        refreshData();
      }
    }, 600000); 

    return () => clearInterval(interval);
  }, [isOnline, location, refreshData]);

  useEffect(() => {
    const sections = document.querySelectorAll("[data-observe]");
    sections.forEach((section) => {
      observerRef.current?.observe(section);
    });
  }, []);

  useEffect(() => {
    if (apiKey || !showApiDialog) {
      getCurrentLocation();
    }
  }, [apiKey, showApiDialog]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (showApiDialog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="text-center mb-4">
            <Settings className="h-12 w-12 mx-auto mb-2 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">
              API Configuration
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenWeatherMap API Key (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter your API key for real-time data"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your free API key at{" "}
                <a
                  href="https://openweathermap.org/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  openweathermap.org
                </a>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => saveApiKey(apiKey)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                {apiKey ? "Save & Continue" : "Use Demo Data"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2">Getting your location...</p>
          <p className="text-sm text-gray-500">
            Fetching real-time air quality data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Real-time Air Quality Monitor
              </h1>
              <div className="flex items-center gap-2 mt-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                {location?.city}, {location?.country}
                <span className="text-xs text-gray-400">
                  ({location?.latitude.toFixed(4)},{" "}
                  {location?.longitude.toFixed(4)})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                  <Wifi className="h-3 w-3" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </span>
              )}
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-yellow-800">
              <p className="font-medium">Notice</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {airQualityData && (
          <>
            {/* Main AQI Display */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center md:col-span-2">
                  <div
                    className={`w-32 h-32 rounded-full ${getAqiColor(
                      airQualityData.aqi
                    )} text-white flex items-center justify-center mx-auto mb-4 shadow-lg`}
                  >
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {airQualityData.aqi}
                      </div>
                      <div className="text-sm opacity-90">AQI</div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Air Quality Index
                  </h3>
                  <p className="text-gray-600 mb-1">
                    {getAqiLevel(airQualityData.aqi)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last updated: {formatTimestamp(airQualityData.timestamp)}
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <Thermometer className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">
                      {airQualityData.temperature}°C
                    </p>
                    <p className="text-gray-600">Temperature</p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <Droplets className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">
                      {airQualityData.humidity}%
                    </p>
                    <p className="text-gray-600">Humidity</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Particle Animation */}
            <div
              id="particle-section"
              data-observe
              className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Wind className="h-5 w-5" />
                <h3 className="text-lg font-semibold">
                  Pollution Particles Visualization
                </h3>
              </div>
              <canvas
                ref={particleCanvasRef}
                className="w-full h-64 border rounded-lg bg-gray-50"
                style={{
                  display: visibleSections.has("particle-section")
                    ? "block"
                    : "none",
                }}
              />
              {!visibleSections.has("particle-section") && (
                <div className="w-full h-64 border rounded-lg bg-gray-50 flex items-center justify-center">
                  <p className="text-gray-500">
                    Scroll to view particle animation
                  </p>
                </div>
              )}
            </div>

            {/* Pollutant Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">PM2.5</h4>
                <p className="text-2xl font-bold text-orange-600">
                  {airQualityData.pm25}
                </p>
                <p className="text-sm text-gray-600">μg/m³</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (airQualityData.pm25 / 100) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">PM10</h4>
                <p className="text-2xl font-bold text-red-600">
                  {airQualityData.pm10}
                </p>
                <p className="text-sm text-gray-600">μg/m³</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (airQualityData.pm10 / 200) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">O3 (Ozone)</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {airQualityData.o3}
                </p>
                <p className="text-sm text-gray-600">μg/m³</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (airQualityData.o3 / 300) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">NO2</h4>
                <p className="text-2xl font-bold text-yellow-600">
                  {airQualityData.no2}
                </p>
                <p className="text-sm text-gray-600">μg/m³</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (airQualityData.no2 / 200) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">SO2</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {airQualityData.so2}
                </p>
                <p className="text-sm text-gray-600">μg/m³</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (airQualityData.so2 / 150) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">CO</h4>
                <p className="text-2xl font-bold text-green-600">
                  {airQualityData.co}
                </p>
                <p className="text-sm text-gray-600">mg/m³</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (airQualityData.co / 30) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div
              id="chart-section"
              data-observe
              className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5" />
                <h3 className="text-lg font-semibold">
                  Pollutant Levels Chart
                </h3>
              </div>
              <canvas
                ref={chartCanvasRef}
                className="w-full h-64 border rounded-lg bg-gray-50"
                style={{
                  display: visibleSections.has("chart-section")
                    ? "block"
                    : "none",
                }}
              />
              {!visibleSections.has("chart-section") && (
                <div className="w-full h-64 border rounded-lg bg-gray-50 flex items-center justify-center">
                  <p className="text-gray-500">Scroll to view chart</p>
                </div>
              )}
            </div>

            {/* Health Recommendations */}
            {airQualityData.recommendations && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Health Recommendations
                </h3>
                <div className="space-y-2">
                  {airQualityData.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-yellow-50 rounded-md"
                    >
                      <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Air Quality Trend
                </h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 mb-2">
                    {airQualityData.trend}
                  </p>
                  <p className="text-gray-600">Current Status</p>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Health Index</h3>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600 mb-2">
                    {airQualityData.healthIndex}
                  </p>
                  <p className="text-gray-600">Overall Health Impact</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                Data refreshes automatically every 10 minutes.
                {apiKey ? " Using OpenWeatherMap API" : " Using demo data"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Location: {airQualityData.location} | Last updated:{" "}
                {formatTimestamp(airQualityData.timestamp)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AirQualityMonitor;
