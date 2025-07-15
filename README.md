# Real-time Air Quality Monitor

A comprehensive, real-time air quality monitoring application built with React and TypeScript that provides detailed air pollution data, health recommendations, and interactive visualizations.

## 🌟 Features

### Core Functionality
- **Real-time Air Quality Data**: Fetches live AQI and pollutant data from OpenWeatherMap API
- **Geolocation Support**: Automatically detects user location or falls back to Bengaluru, India
- **Comprehensive Pollutant Tracking**: Monitors PM2.5, PM10, O3, NO2, SO2, and CO levels
- **Weather Integration**: Displays temperature and humidity alongside air quality data
- **Health Index Calculation**: Provides an overall health impact score
- **Personalized Recommendations**: Generates health and activity recommendations based on current air quality

### Interactive Visualizations
- **Real-time Particle Animation**: Canvas-based particle system that visualizes pollution density
- **Pollutant Level Charts**: Interactive bar charts showing individual pollutant concentrations
- **Color-coded AQI Display**: Intuitive color system (green to maroon) indicating air quality levels
- **Progress Bars**: Visual representation of each pollutant's concentration relative to safe limits

### User Experience
- **Responsive Design**: Fully responsive layout optimized for desktop and mobile devices
- **Offline Support**: Graceful degradation when internet connection is unavailable
- **Auto-refresh**: Automatic data updates every 10 minutes
- **Loading States**: Smooth loading animations and progress indicators
- **Error Handling**: Comprehensive error handling with fallback to demo data

### Technical Features
- **Performance Optimized**: Uses Intersection Observer for lazy loading of animations
- **Background Processing**: Utilizes `requestIdleCallback` for non-blocking data processing
- **Memory Management**: Proper cleanup of animation frames and event listeners
- **API Key Management**: Secure API key storage in localStorage with optional demo mode

## 🚀 Technologies Used

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **APIs**: OpenWeatherMap Air Pollution API, OpenWeatherMap Weather API
- **Canvas**: HTML5 Canvas for particle animations and charts
- **Geolocation**: Browser Geolocation API

## 📋 Prerequisites

- Node.js 16+ and npm/yarn
- OpenWeatherMap API key (optional - demo mode available)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/air-quality-monitor.git
cd air-quality-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔧 Configuration

### API Key Setup
1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. The app will prompt you to enter your API key on first run
3. API key is stored securely in localStorage
4. Demo mode available without API key

### Environment Variables (Optional)
```bash
REACT_APP_OPENWEATHER_API_KEY=your_api_key_here
```

## 🎯 Usage

1. **Location Access**: Allow location permissions for accurate local data
2. **API Key**: Enter your OpenWeatherMap API key or use demo mode
3. **Real-time Data**: View current AQI, pollutant levels, and weather conditions
4. **Visualizations**: Scroll to see particle animations and charts
5. **Health Guidance**: Check personalized recommendations based on current air quality

## 📊 Air Quality Index (AQI) Scale

| AQI Range | Level | Color | Health Impact |
|-----------|-------|-------|---------------|
| 0-50 | Good | Green | Minimal impact |
| 51-100 | Moderate | Yellow | Acceptable for most people |
| 101-150 | Unhealthy for Sensitive Groups | Orange | Sensitive individuals may experience problems |
| 151-200 | Unhealthy | Red | Everyone may experience problems |
| 201-300 | Very Unhealthy | Purple | Health alert for everyone |
| 301+ | Hazardous | Maroon | Emergency conditions |

## 🔄 Data Sources

- **Primary**: OpenWeatherMap Air Pollution API
- **Weather**: OpenWeatherMap Weather API
- **Fallback**: Demo data generator for offline/testing scenarios

## 🎨 Key Components

- **AirQualityMonitor**: Main component handling data fetching and state management
- **Particle Animation**: Canvas-based particle system reflecting pollution levels
- **Pollutant Charts**: Interactive bar charts for individual pollutants
- **Health Recommendations**: Dynamic health advice based on current conditions
- **Location Services**: Geolocation handling with fallback options

## 🙏 Acknowledgments

- OpenWeatherMap for providing comprehensive air quality data
- Lucide React for beautiful icons
- Tailwind CSS for utility-first styling
- React community for excellent documentation and support

## 🐛 Known Issues

- Particle animation may be intensive on lower-end devices
- Location access required for accurate local data
- API rate limits apply (60 calls/minute for free tier)


---

**Live Demo**: [Your Demo URL]
**API Documentation**: [OpenWeatherMap Air Pollution API](https://openweathermap.org/api/air-pollution)
