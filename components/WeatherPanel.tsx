'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface WindData {
  direction: number;
  speed: number;
  gust: number;
  unit: string;
  variable: boolean;
  variableFrom?: number;
  variableTo?: number;
}

interface CloudLayer {
  cover: string;
  base: number | null;
  type?: string | null;
}

interface DecodedMetar {
  raw: string;
  station: string;
  time: string;
  wind: WindData;
  visibility: string;
  visibilityMetres?: number;
  clouds: CloudLayer[];
  temperature: number;
  dewpoint: number;
  qnh: number;
  conditions: string[];
  cavok?: boolean;
}

interface WeatherData {
  metar: {
    raw: string;
    decoded: DecodedMetar;
    observationTime: string;
  };
  taf: string | null;
  icao: string;
  fetchedAt: string;
}

interface WeatherPanelProps {
  icao?: string;
  runwayHeading?: number; // Runway heading for crosswind calculation (e.g., 40 for RWY 04)
}

// Calculate crosswind and headwind components
const calculateWindComponents = (windDir: number, windSpeed: number, runwayHeading: number) => {
  const angleDiff = ((windDir - runwayHeading + 360) % 360) * (Math.PI / 180);
  const headwind = Math.round(windSpeed * Math.cos(angleDiff));
  const crosswind = Math.round(Math.abs(windSpeed * Math.sin(angleDiff)));
  const crosswindDir = Math.sin(((windDir - runwayHeading + 360) % 360) * (Math.PI / 180)) > 0 ? 'R' : 'L';
  return { headwind, crosswind, crosswindDir };
};

// Get wind direction as compass point
const getWindCompass = (degrees: number): string => {
  if (degrees < 0) return 'VRB';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(degrees / 22.5) % 16];
};

const WeatherPanel: React.FC<WeatherPanelProps> = ({ icao = 'EGNR', runwayHeading = 40 }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTaf, setShowTaf] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/weather?icao=${icao}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch weather');
      }
      const data = await response.json();
      setWeather(data);
      setLastFetch(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [icao]);

  // Fetch on mount and every 5 minutes
  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (loading && !weather) {
    return (
      <div className="bg-slate-700 p-4 rounded-lg mb-4 animate-pulse">
        <div className="h-4 bg-slate-600 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-slate-600 rounded w-2/3"></div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="bg-red-900/50 border border-red-600 p-4 rounded-lg mb-4">
        <p className="text-red-400 text-sm">Weather unavailable: {error}</p>
        <button onClick={fetchWeather} className="text-xs text-red-300 underline mt-1">Retry</button>
      </div>
    );
  }

  if (!weather) return null;

  const { decoded } = weather.metar;
  const windComponents = decoded.wind.direction >= 0
    ? calculateWindComponents(decoded.wind.direction, decoded.wind.speed, runwayHeading)
    : null;

  // Determine visibility warning level
  const getVisibilityStatus = () => {
    if (decoded.cavok) return { color: 'text-green-400', label: 'CAVOK' };
    if (decoded.visibilityMetres !== undefined) {
      if (decoded.visibilityMetres < 550) return { color: 'text-red-400', label: `${decoded.visibilityMetres}m` };
      if (decoded.visibilityMetres < 1500) return { color: 'text-amber-400', label: `${decoded.visibilityMetres}m` };
      if (decoded.visibilityMetres < 5000) return { color: 'text-yellow-300', label: `${decoded.visibilityMetres}m` };
      return { color: 'text-green-400', label: `${decoded.visibilityMetres}m` };
    }
    return { color: 'text-green-400', label: decoded.visibility || 'N/A' };
  };

  const visStatus = getVisibilityStatus();

  // Determine wind warning level
  const getWindStatus = () => {
    const speed = decoded.wind.gust || decoded.wind.speed;
    if (speed >= 30) return 'text-red-400';
    if (speed >= 20) return 'text-amber-400';
    return 'text-green-400';
  };

  // Determine crosswind warning
  const getCrosswindStatus = () => {
    if (!windComponents) return 'text-slate-300';
    if (windComponents.crosswind >= 20) return 'text-red-400';
    if (windComponents.crosswind >= 15) return 'text-amber-400';
    return 'text-green-400';
  };

  // Format observation time
  const formatObsTime = () => {
    if (decoded.time) {
      const day = decoded.time.slice(0, 2);
      const hour = decoded.time.slice(2, 4);
      const min = decoded.time.slice(4, 6);
      return `${day}/${hour}:${min}Z`;
    }
    return 'Unknown';
  };

  return (
    <div className="bg-slate-700 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-2">
          🌤️ Weather - {icao}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{formatObsTime()}</span>
          <button
            onClick={fetchWeather}
            className="text-xs text-slate-400 hover:text-white transition-colors"
            title="Refresh weather"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Main weather grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Wind */}
        <div className="bg-slate-800 p-2 rounded">
          <p className="text-xs text-slate-400 mb-1">Wind</p>
          <p className={`text-lg font-bold ${getWindStatus()}`}>
            {decoded.wind.variable ? 'VRB' : `${String(decoded.wind.direction).padStart(3, '0')}°`}
            {' '}{decoded.wind.speed}{decoded.wind.unit}
          </p>
          {decoded.wind.gust > 0 && (
            <p className="text-xs text-amber-400">Gusting {decoded.wind.gust}{decoded.wind.unit}</p>
          )}
          {decoded.wind.variableFrom !== undefined && (
            <p className="text-xs text-slate-400">Variable {decoded.wind.variableFrom}°-{decoded.wind.variableTo}°</p>
          )}
        </div>

        {/* Visibility */}
        <div className="bg-slate-800 p-2 rounded">
          <p className="text-xs text-slate-400 mb-1">Visibility</p>
          <p className={`text-lg font-bold ${visStatus.color}`}>
            {visStatus.label}
          </p>
          {decoded.conditions.length > 0 && (
            <p className="text-xs text-amber-300">{decoded.conditions.join(', ')}</p>
          )}
        </div>

        {/* Clouds */}
        <div className="bg-slate-800 p-2 rounded">
          <p className="text-xs text-slate-400 mb-1">Cloud</p>
          {decoded.clouds.length > 0 ? (
            decoded.clouds.map((cloud, idx) => (
              <p key={idx} className="text-sm text-slate-200">
                {cloud.cover}{cloud.base !== null ? ` ${cloud.base}ft` : ''}
                {cloud.type ? ` (${cloud.type})` : ''}
              </p>
            ))
          ) : (
            <p className="text-sm text-green-400">No significant cloud</p>
          )}
        </div>

        {/* Temperature & QNH */}
        <div className="bg-slate-800 p-2 rounded">
          <p className="text-xs text-slate-400 mb-1">Temp / QNH</p>
          <p className="text-sm text-slate-200">
            {decoded.temperature}°C / DP {decoded.dewpoint}°C
          </p>
          <p className="text-lg font-bold text-blue-400">
            Q{decoded.qnh}
          </p>
        </div>
      </div>

      {/* Crosswind component for active runway */}
      {windComponents && decoded.wind.speed > 0 && (
        <div className="bg-slate-800 p-2 rounded mb-3">
          <p className="text-xs text-slate-400 mb-1">Runway {String(runwayHeading / 10).padStart(2, '0')} Wind Components</p>
          <div className="flex justify-between">
            <span className="text-sm">
              {windComponents.headwind >= 0 ? 'Headwind' : 'Tailwind'}:{' '}
              <span className={windComponents.headwind < 0 ? 'text-amber-400 font-bold' : 'text-green-400'}>
                {Math.abs(windComponents.headwind)}kt
              </span>
            </span>
            <span className="text-sm">
              Crosswind:{' '}
              <span className={`font-bold ${getCrosswindStatus()}`}>
                {windComponents.crosswind}kt {windComponents.crosswindDir}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Raw METAR */}
      <div className="bg-slate-900 p-2 rounded mb-2">
        <p className="text-xs font-mono text-slate-300 break-all">{weather.metar.raw}</p>
      </div>

      {/* TAF toggle */}
      {weather.taf && (
        <>
          <button
            onClick={() => setShowTaf(!showTaf)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showTaf ? 'Hide TAF ▲' : 'Show TAF ▼'}
          </button>
          {showTaf && (
            <div className="bg-slate-900 p-2 rounded mt-2">
              <p className="text-xs font-mono text-slate-300 break-all whitespace-pre-wrap">{weather.taf}</p>
            </div>
          )}
        </>
      )}

      {/* LVP Warning based on visibility */}
      {decoded.visibilityMetres !== undefined && decoded.visibilityMetres < 1500 && (
        <div className="mt-3 p-2 bg-amber-900/50 border border-amber-600 rounded">
          <p className="text-xs text-amber-400 font-bold">
            ⚠️ Visibility below 1500m - Consider LVP activation
          </p>
        </div>
      )}
    </div>
  );
};

export default WeatherPanel;
