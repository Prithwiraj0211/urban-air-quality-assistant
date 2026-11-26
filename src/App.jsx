import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudSun, Shield, Sparkles } from 'lucide-react';
import { ActionPlanSection } from './components/ActionPlanSection.jsx';
import { AirQualityTelemetry } from './components/AirQualityTelemetry.jsx';
import { CommunityShareCard } from './components/CommunityShareCard.jsx';
import { HouseholdProfiler } from './components/HouseholdProfiler.jsx';
import { ImpactDashboard } from './components/ImpactDashboard.jsx';
import {
  buildInversionProfile,
  detectLocationByIp,
  detectUserLocation,
  fetchLiveAirQuality,
  PRESET_CITIES,
} from './services/airQualityService.js';
import {
  generateActionPlan,
  generateFallbackActionPlan,
} from './services/geminiService.js';
import {
  calculateAdoptedImpact,
  estimatePollutantsFromAqi,
  flattenPlanItems,
} from './utils/impactCalculator.js';
import { sanitizeApiKey, sanitizeProfile } from './utils/sanitize.js';

const DEFAULT_PROFILE = sanitizeProfile({
  city: 'Delhi',
  useSimulation: false,
  simulatedAqi: 385,
  household: {
    children: true,
    elderly: true,
    asthma: false,
    pets: false,
  },
  lifestyle: {
    commute: 'car',
    ventilation: 'natural-windows',
    cooking: 'lpg-gas',
  },
});

export default function App() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [locationSourceLabel, setLocationSourceLabel] = useState('Detecting...');
  const [liveAqiData, setLiveAqiData] = useState(() => {
    const delhi = PRESET_CITIES[0];
    const pollutants = estimatePollutantsFromAqi(delhi.fallbackAqi);
    return {
      city: delhi.name,
      country: delhi.country,
      latitude: delhi.latitude,
      longitude: delhi.longitude,
      aqi: delhi.fallbackAqi,
      pm25: pollutants.pm25,
      pm10: pollutants.pm10,
      no2: pollutants.no2,
      weather: {
        temperatureC: 16,
        humidityPct: 68,
        windSpeedKmh: 5.8,
        condition: 'Winter Haze',
      },
      hourlyTrend: buildInversionProfile(delhi.fallbackAqi),
      source: 'Loading Real-Time Weather & AQI...',
      isSimulated: false,
    };
  });

  const [isFetchingAqi, setIsFetchingAqi] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const activeAqiData = useMemo(() => {
    if (!profile.useSimulation) {
      return liveAqiData;
    }
    const simulatedPollutants = estimatePollutantsFromAqi(profile.simulatedAqi);
    return {
      ...liveAqiData,
      city: profile.city || liveAqiData.city,
      aqi: profile.simulatedAqi,
      pm25: simulatedPollutants.pm25,
      pm10: simulatedPollutants.pm10,
      no2: simulatedPollutants.no2,
      hourlyTrend: buildInversionProfile(profile.simulatedAqi),
      source: 'Winter Smog Simulator (Manual Override)',
      isSimulated: true,
    };
  }, [liveAqiData, profile.useSimulation, profile.simulatedAqi, profile.city]);

  const [actionPlan, setActionPlan] = useState(() =>
    generateFallbackActionPlan({
      aqiData: liveAqiData,
      profile: DEFAULT_PROFILE,
    })
  );

  const [adoptedIds, setAdoptedIds] = useState(() => new Set(['routine-1', 'iaq-1']));

  const handleSelectCity = useCallback(async (cityObj, sourceTag = 'Selected') => {
    setIsFetchingAqi(true);
    setLocationSourceLabel(sourceTag);
    setStatusMessage(`Fetching real-time weather and AQI for ${cityObj.name}...`);
    setProfile((prev) => ({
      ...prev,
      city: cityObj.name,
      useSimulation: false,
    }));

    const telemetry = await fetchLiveAirQuality({
      latitude: cityObj.latitude,
      longitude: cityObj.longitude,
      cityName: cityObj.name,
      country: cityObj.country,
    });
    setLiveAqiData(telemetry);
    setIsFetchingAqi(false);
    setStatusMessage(`Loaded weather and AQI ${telemetry.aqi} for ${telemetry.city}.`);
  }, []);

  const handleDetectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    setStatusMessage('Detecting your city and local weather...');
    const detected = await detectUserLocation();
    if (detected) {
      const tag = detected.method === 'gps' ? 'GPS Detected' : 'Auto-Detected';
      await handleSelectCity(detected, tag);
    } else {
      setStatusMessage('Could not detect location automatically; please search your city.');
    }
    setIsDetectingLocation(false);
  }, [handleSelectCity]);

  // Auto-detect user's city via IP geolocation on initial load (silent, no permission prompt)
  useEffect(() => {
    let active = true;
    async function initLocation() {
      const detected = await detectLocationByIp();
      if (!active) return;

      if (detected) {
        await handleSelectCity(detected, 'Auto-Detected');
      } else {
        const delhi = PRESET_CITIES[0];
        await handleSelectCity(delhi, 'Default');
      }
    }
    initLocation();
    return () => {
      active = false;
    };
  }, [handleSelectCity]);

  const hasEnvGeminiKey = Boolean(sanitizeApiKey(import.meta.env.VITE_GEMINI_API_KEY || ''));

  const refreshActionPlan = useCallback(async () => {
    const cleanProfile = sanitizeProfile(profile);
    if (!hasEnvGeminiKey) {
      setActionPlan(
        generateFallbackActionPlan({
          aqiData: activeAqiData,
          profile: cleanProfile,
        })
      );
      return;
    }

    setIsGeneratingPlan(true);
    const plan = await generateActionPlan({
      aqiData: activeAqiData,
      profile: cleanProfile,
    });
    setActionPlan(plan);
    const allIds = new Set(flattenPlanItems(plan).map((i) => i.id));
    setAdoptedIds((prev) => {
      const kept = [...prev].filter((id) => allIds.has(id));
      if (kept.length > 0) return new Set(kept);
      return new Set(flattenPlanItems(plan).slice(0, 2).map((i) => i.id));
    });
    setIsGeneratingPlan(false);
  }, [activeAqiData, profile, hasEnvGeminiKey]);

  // Keep adaptive plan synced immediately on context change; upgrade via Gemini (debounced) when configured
  useEffect(() => {
    const cleanProfile = sanitizeProfile(profile);
    setActionPlan(
      generateFallbackActionPlan({
        aqiData: activeAqiData,
        profile: cleanProfile,
      })
    );

    if (!hasEnvGeminiKey) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsGeneratingPlan(true);
      const plan = await generateActionPlan({
        aqiData: activeAqiData,
        profile: cleanProfile,
      });
      if (!cancelled) {
        setActionPlan(plan);
        setIsGeneratingPlan(false);
      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeAqiData, profile, hasEnvGeminiKey]);

  const impact = useMemo(
    () => calculateAdoptedImpact(actionPlan, adoptedIds, activeAqiData.pm25, profile.household),
    [actionPlan, adoptedIds, activeAqiData.pm25, profile.household]
  );

  function toggleAdopt(id) {
    setAdoptedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllActions() {
    const allIds = flattenPlanItems(actionPlan).map((item) => item.id);
    setAdoptedIds(new Set(allIds));
  }

  function clearAllActions() {
    setAdoptedIds(new Set());
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Skip Navigation for Keyboard Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-teal-700 focus:text-white focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Clean Header — zero API key prompt exposed */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                  AeroShield AI
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-200">
                  Winter Smog Assistant
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Real-time weather &amp; AQI protection, low-emission routines &amp; WhatsApp alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 inline-flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>Live Weather &amp; AQI</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>{hasEnvGeminiKey ? 'Gemini AI Active' : 'Smart Adaptive AI'}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        <div className="lg:col-span-4 lg:sticky lg:top-20">
          <HouseholdProfiler
            profile={profile}
            onProfileChange={(next) => setProfile(sanitizeProfile(next))}
            onSelectCity={(cityObj) => handleSelectCity(cityObj, 'Selected')}
            onDetectLocation={handleDetectLocation}
            onGeneratePlan={refreshActionPlan}
            isFetchingAqi={isFetchingAqi}
            isDetectingLocation={isDetectingLocation}
            isGeneratingPlan={isGeneratingPlan}
            locationSourceLabel={locationSourceLabel}
          />
        </div>

        <div className="lg:col-span-8 space-y-6">
          <AirQualityTelemetry
            aqiData={activeAqiData}
            household={profile.household}
            isLoading={isFetchingAqi}
          />

          <ImpactDashboard
            impact={impact}
            baselinePm25={activeAqiData.pm25}
            onSelectAllPriority={selectAllActions}
            onClearAll={clearAllActions}
          />

          <ActionPlanSection
            plan={actionPlan}
            aqiData={activeAqiData}
            profile={profile}
            adoptedIds={adoptedIds}
            onToggleAdopt={toggleAdopt}
          />

          <CommunityShareCard
            city={activeAqiData.city}
            aqiData={activeAqiData}
            profile={profile}
            plan={actionPlan}
            impact={impact}
          />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            AeroShield AI — PromptWars [Challenge 6] Urban Air Quality Assistant
          </span>
          <span>
            Real-time Weather &amp; AQI powered by Open-Meteo · WCAG AA Accessible
          </span>
        </div>
      </footer>

      <div className="sr-only" aria-live="polite">
        {statusMessage}
      </div>
    </div>
  );
}
