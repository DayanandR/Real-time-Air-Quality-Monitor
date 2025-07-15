export const convertAQIToUSScale = (owmAqi: number): number => {
  const conversion = {
    1: 25,
    2: 75, // Fair
    3: 125, // Moderate
    4: 175, // Poor
    5: 225, // Very Poor
  };
  return conversion[owmAqi as keyof typeof conversion] || 100;
};

export const generateDemoAirQualityData = (city: string) => {
  // Generate realistic data based on common pollution levels
  const baseAqi = city === "Bengaluru" ? 150 : city === "Mumbai" ? 180 : 100;
  return {
    aqi: baseAqi + Math.floor(Math.random() * 40),
    pm25: 25 + Math.floor(Math.random() * 50),
    pm10: 40 + Math.floor(Math.random() * 80),
    o3: 60 + Math.floor(Math.random() * 120),
    no2: 30 + Math.floor(Math.random() * 70),
    so2: 15 + Math.floor(Math.random() * 35),
    co: 8 + Math.floor(Math.random() * 20),
    temperature: 25 + Math.floor(Math.random() * 10),
    humidity: 50 + Math.floor(Math.random() * 30),
    location: city,
    timestamp: Date.now(),
  };
};

export const calculateHealthIndex = (data: any) => {
  return Math.round((data.aqi + data.pm25 + data.pm10) / 3);
};

export const generateRecommendations = (data: any): string[] => {
  const recommendations = [];
  if (data.aqi > 200)
    recommendations.push("Stay indoors and avoid all outdoor activities");
  else if (data.aqi > 150)
    recommendations.push(
      "Avoid outdoor activities, especially for sensitive groups"
    );
  else if (data.aqi > 100)
    recommendations.push("Limit prolonged outdoor activities");

  if (data.pm25 > 35)
    recommendations.push("Use air purifier indoors and wear N95 mask outdoors");
  if (data.pm10 > 50)
    recommendations.push("Close windows and use air conditioning");
  if (data.o3 > 100)
    recommendations.push("Avoid outdoor exercise, especially during midday");
  if (data.no2 > 40)
    recommendations.push("Limit time near busy roads and traffic");

  return recommendations;
};

export const calculateTrend = (data: any): string => {
  if (data.aqi > 200) return "Hazardous";
  if (data.aqi > 150) return "Unhealthy";
  if (data.aqi > 100) return "Moderate";
  if (data.aqi > 50) return "Fair";
  return "Good";
};

export const getAqiColor = (aqi: number): string => {
  if (aqi <= 50) return "bg-green-500";
  if (aqi <= 100) return "bg-yellow-500";
  if (aqi <= 150) return "bg-orange-500";
  if (aqi <= 200) return "bg-red-500";
  return "bg-purple-500";
};

export const getAqiLevel = (aqi: number): string => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  return "Hazardous";
};

export const getParticleColor = (aqi: number): string => {
  if (aqi <= 50) return "rgba(34, 197, 94, 0.6)";
  if (aqi <= 100) return "rgba(234, 179, 8, 0.6)";
  if (aqi <= 150) return "rgba(249, 115, 22, 0.6)";
  if (aqi <= 200) return "rgba(239, 68, 68, 0.6)";
  return "rgba(147, 51, 234, 0.6)";
};

export const getBarColor = (value: number, max: number): string => {
  const ratio = value / max;
  if (ratio <= 0.3) return "#22c55e";
  if (ratio <= 0.6) return "#eab308";
  if (ratio <= 0.8) return "#f97316";
  return "#ef4444";
};

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};
