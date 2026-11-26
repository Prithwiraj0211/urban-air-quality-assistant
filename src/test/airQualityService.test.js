import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildInversionProfile,
  describeWeatherCode,
  detectLocationByIp,
  fetchLiveAirQuality,
  PRESET_CITIES,
  reverseGeocodeCoordinates,
} from '../services/airQualityService.js';

describe('Air Quality & Real-Time Weather Service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a diurnal thermal inversion curve showing afternoon trough', () => {
    const curve = buildInversionProfile(300);
    expect(curve).toHaveLength(6);
    const morning = curve.find((c) => c.hour === '06:00');
    const afternoon = curve.find((c) => c.hour === '15:00');
    expect(afternoon.aqi).toBeLessThan(morning.aqi);
  });

  it('maps WMO weather codes into human-readable labels', () => {
    expect(describeWeatherCode(0)).toBe('Clear Sky');
    expect(describeWeatherCode(45)).toBe('Fog / Winter Haze');
    expect(describeWeatherCode(61)).toBe('Rain');
  });

  it('parses Open-Meteo live air quality and real-time weather responses cleanly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (String(url).includes('air-quality-api.open-meteo.com')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              current: {
                us_aqi: 215,
                pm2_5: 165.4,
                pm10: 240.1,
                nitrogen_dioxide: 52.3,
                ozone: 41.0,
                time: '2026-11-28T10:00',
              },
              hourly: {
                time: [
                  '2026-11-28T06:00',
                  '2026-11-28T09:00',
                  '2026-11-28T12:00',
                  '2026-11-28T15:00',
                  '2026-11-28T18:00',
                  '2026-11-28T21:00',
                ],
                us_aqi: [240, 220, 175, 140, 210, 260],
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            current: {
              temperature_2m: 14.2,
              relative_humidity_2m: 78,
              wind_speed_10m: 4.5,
              weather_code: 45,
            },
          }),
        });
      })
    );

    const delhi = PRESET_CITIES[0];
    const result = await fetchLiveAirQuality({
      latitude: delhi.latitude,
      longitude: delhi.longitude,
      cityName: delhi.name,
      country: delhi.country,
    });

    expect(result.aqi).toBe(215);
    expect(result.pm25).toBe(165.4);
    expect(result.no2).toBe(52.3);
    expect(result.weather).toEqual({
      temperatureC: 14.2,
      humidityPct: 78,
      windSpeedKmh: 4.5,
      condition: 'Fog / Winter Haze',
    });
    expect(result.isFallbackOffline).toBe(false);
    expect(result.hourlyTrend[3]).toEqual({ hour: '15:00', aqi: 140 });
  });

  it('detects city via IP geolocation and reverse-geocodes coordinates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (String(url).includes('geojs.io')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              city: 'Kolkata',
              region: 'West Bengal',
              country: 'India',
              latitude: '22.5726',
              longitude: '88.3639',
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            city: 'Salt Lake',
            principalSubdivision: 'West Bengal',
            countryName: 'India',
          }),
        });
      })
    );

    const ipLoc = await detectLocationByIp();
    expect(ipLoc.name).toBe('Kolkata');
    expect(ipLoc.latitude).toBeCloseTo(22.5726);

    const rev = await reverseGeocodeCoordinates(22.58, 88.41);
    expect(rev.name).toBe('Salt Lake');
    expect(rev.country).toBe('India');
  });

  it('falls back gracefully to benchmark winter telemetry when network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));

    const delhi = PRESET_CITIES[0];
    const result = await fetchLiveAirQuality({
      latitude: delhi.latitude,
      longitude: delhi.longitude,
      cityName: delhi.name,
      country: delhi.country,
    });

    expect(result.isFallbackOffline).toBe(true);
    expect(result.aqi).toBe(delhi.fallbackAqi);
    expect(result.pm25).toBeGreaterThan(100);
    expect(result.weather.condition).toBe('Fog / Winter Haze');
  });
});
