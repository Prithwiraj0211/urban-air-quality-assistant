import React from 'react';
import {
  Activity,
  Clock,
  CloudFog,
  Droplets,
  ShieldAlert,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  calculateVulnerabilityProfile,
  classifyAqi,
} from '../utils/impactCalculator.js';
import { AqiBadge } from './AqiBadge.jsx';

/**
 * Displays live or simulated AQI telemetry, real-time weather conditions,
 * primary pollutants (PM2.5, PM10, NO2), household vulnerability multiplier,
 * and hourly thermal inversion trend bars.
 */
export function AirQualityTelemetry({ aqiData, household, isLoading }) {
  const tier = classifyAqi(aqiData.aqi);
  const vulnerability = calculateVulnerabilityProfile(household);
  const trend = aqiData.hourlyTrend || [];
  const maxTrendAqi = Math.max(100, ...trend.map((t) => t.aqi));
  const weather = aqiData.weather || {
    temperatureC: 16,
    humidityPct: 68,
    windSpeedKmh: 6.5,
    condition: 'Winter Haze',
  };

  return (
    <section
      aria-labelledby="telemetry-heading"
      className={`bg-white rounded-2xl border-2 ${tier.accentBorder} shadow-sm p-5 space-y-4`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <CloudFog className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>{aqiData.source}</span>
          </div>
          <h2 id="telemetry-heading" className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            {aqiData.city}
            {aqiData.country ? (
              <span className="text-slate-500 font-semibold text-base ml-1.5">
                {aqiData.country}
              </span>
            ) : null}
          </h2>
        </div>

        <AqiBadge aqi={aqiData.aqi} size="lg" />
      </div>

      {/* Real-Time Weather Conditions Bar */}
      <div
        aria-label="Real-time local weather conditions"
        className="flex flex-wrap items-center gap-3 px-3.5 py-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-slate-800"
      >
        <span className="font-bold text-teal-950">{weather.condition}</span>
        <span className="text-slate-300" aria-hidden="true">|</span>
        <span className="inline-flex items-center gap-1 font-semibold">
          <Thermometer className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
          <span>{weather.temperatureC}°C</span>
        </span>
        <span className="inline-flex items-center gap-1 font-semibold">
          <Droplets className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
          <span>{weather.humidityPct}% Humidity</span>
        </span>
        <span className="inline-flex items-center gap-1 font-semibold">
          <Wind className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
          <span>{weather.windSpeedKmh} km/h Wind</span>
        </span>
        <span className="ml-auto text-[11px] font-medium text-teal-900">
          {weather.windSpeedKmh < 8
            ? 'Low wind increases smog trapping'
            : 'Moderate wind aids dispersion'}
        </span>
      </div>

      {/* Main AQI + Pollutant Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 text-white">
          <div className="text-xs font-medium text-slate-300">US AQI Index</div>
          <div className="text-3xl font-black tabular-nums mt-0.5">
            {isLoading ? '...' : aqiData.aqi}
          </div>
          <div className="text-[11px] text-slate-300 mt-1">
            {aqiData.isSimulated ? 'Simulated Mode' : 'Live Reading'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-xs font-semibold text-slate-600">PM2.5 (Fine Soot)</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
            {aqiData.pm25}
            <span className="text-xs font-medium text-slate-500 ml-1">µg/m³</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">WHO 24h guideline: 15</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-xs font-semibold text-slate-600">PM10 (Coarse Dust)</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
            {aqiData.pm10}
            <span className="text-xs font-medium text-slate-500 ml-1">µg/m³</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">WHO 24h guideline: 45</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-xs font-semibold text-slate-600">NO2 (Traffic Gas)</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
            {aqiData.no2}
            <span className="text-xs font-medium text-slate-500 ml-1">µg/m³</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Combustion tracer</div>
        </div>
      </div>

      {/* Thermal Inversion Bar Chart + Household Vulnerability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
        <div className="lg:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>Diurnal Thermal Inversion Curve (AQI by Hour)</span>
            </span>
            <span className="text-[11px] text-teal-800 font-semibold">
              Best ventilation: 13:30–15:30
            </span>
          </div>
          <div
            className="grid grid-cols-6 gap-2 items-end h-20 pt-2"
            role="img"
            aria-label={`Hourly AQI curve from 06:00 to 21:00 peaking around ${Math.max(...trend.map((t) => t.aqi), aqiData.aqi)}`}
          >
            {trend.map((point) => {
              const heightPct = Math.max(18, Math.round((point.aqi / maxTrendAqi) * 100));
              const isLiftWindow = point.hour === '12:00' || point.hour === '15:00';
              return (
                <div key={point.hour} className="flex flex-col items-center h-full justify-end">
                  <span className="text-[10px] font-bold text-slate-700 tabular-nums mb-0.5">
                    {point.aqi}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all ${
                      isLiftWindow ? 'bg-teal-600' : 'bg-slate-700'
                    }`}
                  />
                  <span className="text-[10px] text-slate-600 mt-1 font-medium">{point.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>Household Risk Multiplier</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {vulnerability.multiplier}x
              </span>
              <span className="text-xs font-semibold text-teal-800">
                {vulnerability.riskLevel}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-600">
            <Activity className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" aria-hidden="true" />
            <span>
              {vulnerability.activeGroups.length > 0
                ? vulnerability.activeGroups.join(', ')
                : 'General adult household baseline'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
