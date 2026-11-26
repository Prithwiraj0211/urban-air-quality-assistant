import React, { useEffect, useState } from 'react';
import {
  Baby,
  Building2,
  Car,
  Flame,
  HeartPulse,
  LocateFixed,
  MapPin,
  PawPrint,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Wind,
} from 'lucide-react';
import { PRESET_CITIES, searchCityCoordinates } from '../services/airQualityService.js';

const HOUSEHOLD_TOGGLES = [
  { key: 'children', label: 'Infants / Children', icon: Baby },
  { key: 'elderly', label: 'Elderly (65+)', icon: UserRound },
  { key: 'asthma', label: 'Asthma / Respiratory', icon: HeartPulse },
  { key: 'pets', label: 'Indoor Pets', icon: PawPrint },
];

const COMMUTE_OPTIONS = [
  { value: 'car', label: 'Private Car' },
  { value: 'two-wheeler', label: 'Two-Wheeler / Scooter' },
  { value: 'public-transit', label: 'Metro / Bus / Transit' },
  { value: 'wfh', label: 'Work From Home (WFH)' },
];

const VENTILATION_OPTIONS = [
  { value: 'natural-windows', label: 'Natural Windows Only' },
  { value: 'hepa-purifier', label: 'HEPA Air Purifier' },
  { value: 'exhaust-only', label: 'Kitchen/Bath Exhaust Fans' },
  { value: 'leaky-drafty', label: 'Older / Drafty Windows' },
];

const COOKING_OPTIONS = [
  { value: 'lpg-gas', label: 'Piped Gas / LPG Stove' },
  { value: 'electric-induction', label: 'Electric / Induction' },
  { value: 'biomass-solid', label: 'Wood / Coal / Biomass' },
  { value: 'mixed-low-vent', label: 'Gas + Minimal Exhaust' },
];

/**
 * Context & Household Profiler sidebar/panel featuring instant GPS/IP location detection,
 * global city typeahead search, winter smog simulation, sensitivity toggles, and lifestyle inputs.
 */
export function HouseholdProfiler({
  profile,
  onProfileChange,
  onSelectCity,
  onDetectLocation,
  onGeneratePlan,
  isFetchingAqi,
  isDetectingLocation,
  isGeneratingPlan,
  locationSourceLabel,
}) {
  const [cityInput, setCityInput] = useState(profile.city);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sync text input when location is auto-detected externally
  useEffect(() => {
    setCityInput(profile.city);
  }, [profile.city]);

  // Live typeahead autocomplete for any city/town worldwide
  useEffect(() => {
    const trimmed = cityInput.trim();
    if (trimmed.length < 2 || trimmed.toLowerCase() === profile.city.toLowerCase()) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchCityCoordinates(trimmed);
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cityInput, profile.city]);

  async function handleCitySearch(e) {
    e.preventDefault();
    if (!cityInput.trim()) return;
    setIsSearching(true);
    const results = await searchCityCoordinates(cityInput);
    setSearchResults(results);
    if (results.length > 0) {
      onSelectCity(results[0]);
      setSearchResults([]);
    }
    setIsSearching(false);
  }

  function toggleHousehold(key) {
    onProfileChange({
      ...profile,
      household: {
        ...profile.household,
        [key]: !profile.household[key],
      },
    });
  }

  function updateLifestyle(field, value) {
    onProfileChange({
      ...profile,
      lifestyle: {
        ...profile.lifestyle,
        [field]: value,
      },
    });
  }

  return (
    <aside
      aria-label="Context and Household Profiler"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6"
    >
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-teal-700" aria-hidden="true" />
          <span>1. Location &amp; Household Context</span>
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Detect your exact city for real-time weather &amp; AQI, or search any place worldwide.
        </p>
      </div>

      {/* Auto-Detect Location + Global City Search */}
      <section aria-labelledby="city-search-heading" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label
            id="city-search-heading"
            htmlFor="city-search-input"
            className="block text-sm font-semibold text-slate-800"
          >
            Your City / Location
          </label>
          {locationSourceLabel ? (
            <span className="text-[11px] font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              {locationSourceLabel}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onDetectLocation}
          disabled={isDetectingLocation || isFetchingAqi}
          className="w-full py-2 px-3 rounded-xl border-2 border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-950 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
        >
          <LocateFixed
            className={`w-4 h-4 text-teal-700 ${isDetectingLocation ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>
            {isDetectingLocation
              ? 'Detecting Your Location...'
              : 'Detect My Current Location (GPS / Auto)'}
          </span>
        </button>

        <form onSubmit={handleCitySearch} className="flex gap-2">
          <div className="relative flex-1">
            <MapPin
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="city-search-input"
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Search any city, town, or district..."
              aria-autocomplete="list"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-600"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || isFetchingAqi}
            aria-label="Search city weather and air quality"
            className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>{isSearching ? '...' : 'Go'}</span>
          </button>
        </form>

        {searchResults.length > 0 && (
          <ul
            aria-label="Matching cities"
            className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 max-h-44 overflow-y-auto shadow-xs"
          >
            {searchResults.map((city, idx) => (
              <li key={`${city.name}-${city.latitude}-${idx}`}>
                <button
                  type="button"
                  onClick={() => {
                    setCityInput(city.name);
                    setSearchResults([]);
                    onSelectCity(city);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 text-slate-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">
                    {city.name}
                    {city.admin1 ? `, ${city.admin1}` : ''}
                  </span>
                  <span className="text-slate-500">{city.country}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1">
          <span className="text-[11px] font-medium text-slate-500">
            Winter Smog Benchmark Presets:
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick city presets">
            {PRESET_CITIES.map((preset) => {
              const active = profile.city.toLowerCase() === preset.name.toLowerCase();
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setCityInput(preset.name);
                    setSearchResults([]);
                    onSelectCity(preset);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Manual AQI Simulation Override */}
      <section
        aria-labelledby="aqi-sim-heading"
        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 id="aqi-sim-heading" className="text-sm font-semibold text-slate-900">
              Winter Smog Simulator
            </h3>
            <p className="text-xs text-slate-600">
              Override live feed to test severe inversion episodes
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profile.useSimulation}
            aria-label="Toggle manual AQI simulation override"
            onClick={() =>
              onProfileChange({ ...profile, useSimulation: !profile.useSimulation })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
              profile.useSimulation ? 'bg-teal-700' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                profile.useSimulation ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className={profile.useSimulation ? 'space-y-2' : 'space-y-2 opacity-60'}>
          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
            <label htmlFor="aqi-slider">Simulated US AQI</label>
            <span className="font-bold text-slate-900 tabular-nums">
              AQI {profile.simulatedAqi}
            </span>
          </div>
          <input
            id="aqi-slider"
            type="range"
            min="25"
            max="500"
            step="5"
            disabled={!profile.useSimulation}
            value={profile.simulatedAqi}
            onChange={(e) =>
              onProfileChange({
                ...profile,
                useSimulation: true,
                simulatedAqi: Number(e.target.value),
              })
            }
            className="w-full accent-teal-700 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                onProfileChange({ ...profile, useSimulation: true, simulatedAqi: 120 })
              }
              className="flex-1 px-2 py-1 text-xs font-medium rounded-md border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 cursor-pointer"
            >
              Moderate (120)
            </button>
            <button
              type="button"
              onClick={() =>
                onProfileChange({ ...profile, useSimulation: true, simulatedAqi: 455 })
              }
              className="flex-1 px-2 py-1 text-xs font-medium rounded-md border border-red-300 bg-red-50 text-red-950 hover:bg-red-100 cursor-pointer"
            >
              Severe Smog (455)
            </button>
          </div>
        </div>
      </section>

      {/* Household Composition */}
      <section aria-labelledby="household-heading" className="space-y-2.5">
        <h3 id="household-heading" className="text-sm font-semibold text-slate-800">
          Household Sensitivity Profile
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {HOUSEHOLD_TOGGLES.map(({ key, label, icon: Icon }) => {
            const active = Boolean(profile.household[key]);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => toggleHousehold(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-teal-50 border-teal-600 text-teal-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-teal-700' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span className="leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Daily Lifestyle Inputs */}
      <section aria-labelledby="lifestyle-heading" className="space-y-3">
        <h3 id="lifestyle-heading" className="text-sm font-semibold text-slate-800">
          Daily Lifestyle &amp; Home Setup
        </h3>

        <div>
          <label
            htmlFor="commute-select"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1"
          >
            <Car className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Primary Commute Mode</span>
          </label>
          <select
            id="commute-select"
            value={profile.lifestyle.commute}
            onChange={(e) => updateLifestyle('commute', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900"
          >
            {COMMUTE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="ventilation-select"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1"
          >
            <Wind className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Home Ventilation &amp; Filtration</span>
          </label>
          <select
            id="ventilation-select"
            value={profile.lifestyle.ventilation}
            onChange={(e) => updateLifestyle('ventilation', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900"
          >
            {VENTILATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="cooking-select"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1"
          >
            <Flame className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Cooking Fuel &amp; Kitchen Habits</span>
          </label>
          <select
            id="cooking-select"
            value={profile.lifestyle.cooking}
            onChange={(e) => updateLifestyle('cooking', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900"
          >
            {COOKING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <button
        type="button"
        onClick={onGeneratePlan}
        disabled={isGeneratingPlan}
        className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
      >
        {isGeneratingPlan ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Updating Action Plan...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Refresh Personalized Plan</span>
          </>
        )}
      </button>

      <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">
        <Building2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          Adapts automatically for winter boundary-layer inversion peaks (06:00–10:00 &amp;
          19:00–23:00).
        </span>
      </div>
    </aside>
  );
}
