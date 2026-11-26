/**
 * Real-time Weather + Air Quality, Geocoding, Reverse-Geocoding, and
 * GPS/IP Location Detection powered by Open-Meteo and keyless public APIs.
 */

import { estimatePollutantsFromAqi } from '../utils/impactCalculator.js';
import { clampNumber, sanitizeText } from '../utils/sanitize.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';
const IP_GEO_URL = 'https://get.geojs.io/v1/ip/geo.json';

/**
 * Curated winter-smog benchmark cities for quick comparison.
 */
export const PRESET_CITIES = [
  {
    name: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    fallbackAqi: 385,
  },
  {
    name: 'Lahore',
    country: 'Pakistan',
    latitude: 31.5497,
    longitude: 74.3436,
    fallbackAqi: 410,
  },
  {
    name: 'Beijing',
    country: 'China',
    latitude: 39.9042,
    longitude: 116.4074,
    fallbackAqi: 185,
  },
  {
    name: 'Salt Lake City',
    country: 'United States',
    latitude: 40.7608,
    longitude: -111.891,
    fallbackAqi: 142,
  },
  {
    name: 'Kolkata',
    country: 'India',
    latitude: 22.5726,
    longitude: 88.3639,
    fallbackAqi: 248,
  },
];

/**
 * Translates WMO weather codes into concise human-readable conditions.
 * @param {number} code - WMO weather code.
 * @returns {string}
 */
export function describeWeatherCode(code) {
  const num = Number(code);
  if (num === 0) return 'Clear Sky';
  if (num >= 1 && num <= 3) return 'Partly Cloudy';
  if (num === 45 || num === 48) return 'Fog / Winter Haze';
  if (num >= 51 && num <= 57) return 'Light Drizzle';
  if (num >= 61 && num <= 67) return 'Rain';
  if (num >= 71 && num <= 77) return 'Snow / Frost';
  if (num >= 80 && num <= 82) return 'Rain Showers';
  if (num >= 95) return 'Thunderstorm';
  return 'Haze / Calm';
}

/**
 * Searches Open-Meteo Geocoding API for matching cities, towns, or districts worldwide.
 * @param {string} cityQuery - Location query entered by the user.
 * @returns {Promise<Array<{ name: string, country: string, admin1?: string, latitude: number, longitude: number }>>}
 */
export async function searchCityCoordinates(cityQuery) {
  const cleanQuery = sanitizeText(cityQuery, 64);
  if (cleanQuery.length < 2) {
    return [];
  }

  const presetMatch = PRESET_CITIES.filter((c) =>
    c.name.toLowerCase().includes(cleanQuery.toLowerCase())
  );

  try {
    const url = `${GEOCODING_URL}?name=${encodeURIComponent(cleanQuery)}&count=6&language=en&format=json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!response.ok) {
      throw new Error(`Geocoding error (${response.status})`);
    }
    const data = await response.json();
    if (!Array.isArray(data.results) || data.results.length === 0) {
      return presetMatch;
    }
    return data.results.map((item) => ({
      name: item.name,
      country: item.country || '',
      admin1: item.admin1 || '',
      latitude: item.latitude,
      longitude: item.longitude,
    }));
  } catch {
    return presetMatch;
  }
}

/**
 * Reverse-geocodes GPS coordinates into a human-readable city/locality name.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ name: string, country: string, admin1: string }>}
 */
export async function reverseGeocodeCoordinates(latitude, longitude) {
  try {
    const url = `${REVERSE_GEOCODE_URL}?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`;
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      throw new Error(`Reverse geocode error (${response.status})`);
    }
    const data = await response.json();
    const cityName =
      sanitizeText(data.city || data.locality || data.principalSubdivision || '', 64) ||
      'Detected Location';
    return {
      name: cityName,
      admin1: sanitizeText(data.principalSubdivision || '', 48),
      country: sanitizeText(data.countryName || '', 48),
    };
  } catch {
    return {
      name: 'Detected Location',
      admin1: '',
      country: '',
    };
  }
}

/**
 * Detects approximate city and coordinates via IP geolocation without browser permission prompts.
 * @returns {Promise<{ name: string, country: string, admin1: string, latitude: number, longitude: number, method: string } | null>}
 */
export async function detectLocationByIp() {
  try {
    const response = await fetch(IP_GEO_URL, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const lat = Number(data.latitude);
    const lon = Number(data.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    const name = sanitizeText(data.city || data.region || '', 64);
    if (!name) return null;

    return {
      name,
      admin1: sanitizeText(data.region || '', 48),
      country: sanitizeText(data.country || '', 48),
      latitude: lat,
      longitude: lon,
      method: 'ip',
    };
  } catch {
    return null;
  }
}

/**
 * Detects the user's location using browser GPS + reverse geocoding first,
 * falling back seamlessly to IP-based city detection if GPS is denied or unavailable.
 * @returns {Promise<{ name: string, country: string, admin1: string, latitude: number, longitude: number, method: string } | null>}
 */
export async function detectUserLocation() {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 7000,
          maximumAge: 300000,
        });
      });
      const { latitude, longitude } = position.coords;
      const resolved = await reverseGeocodeCoordinates(latitude, longitude);
      return {
        ...resolved,
        latitude,
        longitude,
        method: 'gps',
      };
    } catch {
      // Fall through cleanly to IP detection
    }
  }

  return detectLocationByIp();
}

/**
 * Builds an hourly winter thermal-inversion curve from a baseline AQI
 * when live hourly telemetry is unavailable or when simulation mode is active.
 * @param {number} peakAqi - Target AQI level.
 * @returns {Array<{ hour: string, aqi: number }>} 24h sampled blocks (every 3 hours).
 */
export function buildInversionProfile(peakAqi) {
  const safeAqi = clampNumber(peakAqi, 25, 500, 220);
  const factors = [
    { hour: '06:00', factor: 1.05 },
    { hour: '09:00', factor: 1.0 },
    { hour: '12:00', factor: 0.78 },
    { hour: '15:00', factor: 0.62 },
    { hour: '18:00', factor: 0.88 },
    { hour: '21:00', factor: 1.08 },
  ];

  return factors.map(({ hour, factor }) => ({
    hour,
    aqi: Math.round(clampNumber(safeAqi * factor, 20, 500, safeAqi)),
  }));
}

/**
 * Fetches live AQI pollutants AND real-time weather (temperature, humidity, wind, condition)
 * from Open-Meteo APIs in parallel. Falls back gracefully if offline.
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} params.cityName
 * @param {string} [params.country]
 * @returns {Promise<object>} Normalized air quality & weather telemetry object.
 */
export async function fetchLiveAirQuality({ latitude, longitude, cityName, country = '' }) {
  const safeName = sanitizeText(cityName, 64) || 'Delhi';

  const aqiUrl =
    `${AIR_QUALITY_URL}?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    `&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone` +
    `&hourly=us_aqi,pm2_5&timezone=auto&forecast_days=1`;

  const weatherUrl =
    `${WEATHER_URL}?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&timezone=auto`;

  try {
    const [aqiRes, weatherRes] = await Promise.all([
      fetch(aqiUrl, { signal: AbortSignal.timeout(8000) }),
      fetch(weatherUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null),
    ]);

    if (!aqiRes.ok) {
      throw new Error(`Open-Meteo returned HTTP ${aqiRes.status}`);
    }

    const data = await aqiRes.json();
    const current = data.current || {};
    const aqi = Math.round(clampNumber(current.us_aqi, 5, 500, 150));
    const pm25 = Number(
      clampNumber(current.pm2_5, 0, 999, estimatePollutantsFromAqi(aqi).pm25).toFixed(1)
    );
    const pm10 = Number(clampNumber(current.pm10, 0, 1500, pm25 * 1.5).toFixed(1));
    const no2 = Number(clampNumber(current.nitrogen_dioxide, 0, 500, 28).toFixed(1));

    let weather = {
      temperatureC: 16,
      humidityPct: 68,
      windSpeedKmh: 6.5,
      condition: 'Winter Haze',
    };

    if (weatherRes && weatherRes.ok) {
      try {
        const wData = await weatherRes.json();
        const wCur = wData.current || {};
        weather = {
          temperatureC: Number(clampNumber(wCur.temperature_2m, -50, 60, 16).toFixed(1)),
          humidityPct: Math.round(clampNumber(wCur.relative_humidity_2m, 0, 100, 68)),
          windSpeedKmh: Number(clampNumber(wCur.wind_speed_10m, 0, 200, 6.5).toFixed(1)),
          condition: describeWeatherCode(wCur.weather_code),
        };
      } catch {
        // Keep baseline winter weather values if weather response parse fails
      }
    }

    const hourlyTimes = data.hourly?.time || [];
    const hourlyAqi = data.hourly?.us_aqi || [];
    const targetHours = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
    const hourlyTrend = targetHours.map((slot) => {
      const idx = hourlyTimes.findIndex((t) => typeof t === 'string' && t.endsWith(slot));
      const val = idx >= 0 && Number.isFinite(hourlyAqi[idx]) ? hourlyAqi[idx] : aqi;
      return { hour: slot, aqi: Math.round(clampNumber(val, 10, 500, aqi)) };
    });

    return {
      city: safeName,
      country: sanitizeText(country, 48),
      latitude,
      longitude,
      aqi,
      pm25,
      pm10,
      no2,
      ozone: Number(clampNumber(current.ozone, 0, 400, 42).toFixed(1)),
      weather,
      hourlyTrend,
      updatedAt: current.time || new Date().toISOString(),
      source: 'Open-Meteo Real-Time Weather & AQI',
      isSimulated: false,
      isFallbackOffline: false,
    };
  } catch {
    const preset = PRESET_CITIES.find(
      (c) => c.name.toLowerCase() === safeName.toLowerCase()
    );
    const baselineAqi = preset ? preset.fallbackAqi : 240;
    const pollutants = estimatePollutantsFromAqi(baselineAqi);

    return {
      city: safeName,
      country: sanitizeText(country || preset?.country || '', 48),
      latitude,
      longitude,
      aqi: baselineAqi,
      pm25: pollutants.pm25,
      pm10: pollutants.pm10,
      no2: pollutants.no2,
      ozone: 38,
      weather: {
        temperatureC: 14.5,
        humidityPct: 74,
        windSpeedKmh: 4.8,
        condition: 'Fog / Winter Haze',
      },
      hourlyTrend: buildInversionProfile(baselineAqi),
      updatedAt: new Date().toISOString(),
      source: 'Offline Winter Benchmark (Network Unavailable)',
      isSimulated: false,
      isFallbackOffline: true,
    };
  }
}
