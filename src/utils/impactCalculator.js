/**
 * Quantified risk classification, exposure reduction scoring,
 * emission savings calculations, and WhatsApp/community advisory formatting.
 */

import { clampNumber, sanitizePhoneNumber } from './sanitize.js';

/**
 * Color-blind-safe AQI severity tiers pairing distinct visual patterns,
 * icons, and WCAG AA accessible contrast palettes.
 */
export const AQI_TIERS = [
  {
    id: 'good',
    max: 50,
    label: 'Good',
    shortLabel: 'LOW RISK',
    patternClass: '',
    badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-400',
    accentBorder: 'border-emerald-500',
    iconName: 'shield-check',
    summary: 'Air quality is clean; standard ventilation is safe throughout the day.',
  },
  {
    id: 'moderate',
    max: 100,
    label: 'Moderate',
    shortLabel: 'MODERATE',
    patternClass: 'aqi-pattern-moderate',
    badgeBg: 'bg-amber-100 text-amber-950 border-amber-500',
    accentBorder: 'border-amber-500',
    iconName: 'info',
    summary: 'Sensitive individuals should limit prolonged outdoor exertion during morning traffic.',
  },
  {
    id: 'sensitive',
    max: 150,
    label: 'Unhealthy for Sensitive Groups',
    shortLabel: 'SENSITIVE ALERT',
    patternClass: 'aqi-pattern-moderate',
    badgeBg: 'bg-orange-100 text-orange-950 border-orange-500',
    accentBorder: 'border-orange-500',
    iconName: 'alert-triangle',
    summary: 'Children, elderly, and asthma-prone residents should reduce peak-hour outdoor exposure.',
  },
  {
    id: 'unhealthy',
    max: 200,
    label: 'Unhealthy',
    shortLabel: 'UNHEALTHY',
    patternClass: 'aqi-pattern-unhealthy',
    badgeBg: 'bg-rose-100 text-rose-950 border-rose-500',
    accentBorder: 'border-rose-600',
    iconName: 'alert-triangle',
    summary: 'Everyone experiences health effects; shift workouts indoors and seal drafty windows.',
  },
  {
    id: 'very-unhealthy',
    max: 300,
    label: 'Very Unhealthy',
    shortLabel: 'SEVERE SMOG',
    patternClass: 'aqi-pattern-unhealthy',
    badgeBg: 'bg-purple-100 text-purple-950 border-purple-600',
    accentBorder: 'border-purple-700',
    iconName: 'alert-octagon',
    summary: 'Thermal inversion trap active. Use N95/FFP2 masks outdoors and run HEPA/DIY filtration.',
  },
  {
    id: 'hazardous',
    max: Infinity,
    label: 'Hazardous',
    shortLabel: 'EMERGENCY SMOG',
    patternClass: 'aqi-pattern-hazardous',
    badgeBg: 'bg-red-950 text-white border-red-700',
    accentBorder: 'border-red-800',
    iconName: 'flame',
    summary: 'Hazardous winter smog emergency. Avoid outdoor exertion, isolate indoor rooms, purify air.',
  },
];

/**
 * Classifies an AQI value into its WCAG AA accessible severity tier.
 * @param {number} aqi - US AQI value (0-500+).
 * @returns {object} AQI tier metadata.
 */
export function classifyAqi(aqi) {
  const safeAqi = clampNumber(aqi, 0, 999, 0);
  return AQI_TIERS.find((tier) => safeAqi <= tier.max) || AQI_TIERS[AQI_TIERS.length - 1];
}

/**
 * Converts a simulated US AQI score into realistic PM2.5, PM10, and NO2 estimates
 * using piecewise-linear US EPA AQI breakpoints for PM2.5.
 * @param {number} aqi - Simulated US AQI (25-500).
 * @returns {{ pm25: number, pm10: number, no2: number }} Estimated pollutant concentrations (µg/m³).
 */
export function estimatePollutantsFromAqi(aqi) {
  const safeAqi = clampNumber(aqi, 0, 500, 150);
  const breakpoints = [
    [0, 50, 0, 12.0],
    [51, 100, 12.1, 35.4],
    [101, 150, 35.5, 55.4],
    [151, 200, 55.5, 150.4],
    [201, 300, 150.5, 250.4],
    [301, 500, 250.5, 500.4],
  ];

  let pm25 = 35;
  for (const [iLow, iHigh, cLow, cHigh] of breakpoints) {
    if (safeAqi <= iHigh) {
      pm25 = cLow + ((safeAqi - iLow) / Math.max(1, iHigh - iLow)) * (cHigh - cLow);
      break;
    }
  }

  return {
    pm25: Number(pm25.toFixed(1)),
    pm10: Number((pm25 * 1.62 + 8).toFixed(1)),
    no2: Number((18 + safeAqi * 0.24).toFixed(1)),
  };
}

/**
 * Computes a household vulnerability multiplier and active sensitivity labels.
 * @param {object} household - Household composition flags.
 * @returns {{ multiplier: number, riskLevel: string, activeGroups: string[] }}
 */
export function calculateVulnerabilityProfile(household = {}) {
  let multiplier = 1.0;
  const activeGroups = [];

  if (household.asthma) {
    multiplier += 0.28;
    activeGroups.push('Asthma / Respiratory Sensitivity');
  }
  if (household.children) {
    multiplier += 0.18;
    activeGroups.push('Infants & Children');
  }
  if (household.elderly) {
    multiplier += 0.16;
    activeGroups.push('Elderly Residents');
  }
  if (household.pets) {
    multiplier += 0.06;
    activeGroups.push('Indoor Pets');
  }

  const capped = Number(Math.min(1.68, multiplier).toFixed(2));
  let riskLevel = 'Standard';
  if (capped >= 1.4) riskLevel = 'Critical Vulnerability';
  else if (capped >= 1.18) riskLevel = 'Elevated Sensitivity';

  return {
    multiplier: capped,
    riskLevel,
    activeGroups,
  };
}

/**
 * Flattens all action-plan sections into a unified list of trackable items.
 * @param {object|null} plan - Structured action plan object.
 * @returns {Array<object>} Flat array of recommendation items.
 */
export function flattenPlanItems(plan) {
  if (!plan) return [];
  return [
    ...(Array.isArray(plan.routine) ? plan.routine : []),
    ...(Array.isArray(plan.iaqHacks) ? plan.iaqHacks : []),
    ...(Array.isArray(plan.sustainableSwaps) ? plan.sustainableSwaps : []),
  ];
}

/**
 * Calculates quantified exposure reduction and community emission savings
 * from the recommendations checked by the user.
 *
 * @param {object|null} plan - Structured action plan.
 * @param {string[]|Set<string>} adoptedIds - Checked recommendation IDs.
 * @param {number} [baselinePm25=120] - Current ambient PM2.5 (µg/m³).
 * @param {object} [household={}] - Household composition flags.
 * @returns {object} Quantified impact metrics.
 */
export function calculateAdoptedImpact(plan, adoptedIds, baselinePm25 = 120, household = {}) {
  const items = flattenPlanItems(plan);
  const selectedSet = adoptedIds instanceof Set ? adoptedIds : new Set(adoptedIds || []);
  const adoptedItems = items.filter((item) => selectedSet.has(item.id));

  let residualFactor = 1.0;
  let dailyCo2SavedKg = 0;
  let dailyNoxSavedGrams = 0;

  for (const item of adoptedItems) {
    const pct = clampNumber(item.pm25ReductionPct, 0, 80, 0) / 100;
    residualFactor *= 1 - pct;
    dailyCo2SavedKg += clampNumber(item.co2SavedKg, 0, 50, 0);
    dailyNoxSavedGrams += clampNumber(item.noxSavedGrams, 0, 500, 0);
  }

  const rawReductionPct = (1 - residualFactor) * 100;
  const exposureReductionScore = Math.round(Math.min(92, rawReductionPct));
  const safePm25 = clampNumber(baselinePm25, 0, 1000, 0);
  const pm25AvoidedUgM3 = Number(((safePm25 * exposureReductionScore) / 100).toFixed(1));
  const vulnerability = calculateVulnerabilityProfile(household);

  return {
    adoptedCount: adoptedItems.length,
    totalCount: items.length,
    adoptionRatePct: items.length > 0 ? Math.round((adoptedItems.length / items.length) * 100) : 0,
    exposureReductionScore,
    pm25AvoidedUgM3,
    effectiveIndoorPm25: Number(Math.max(4, safePm25 - pm25AvoidedUgM3).toFixed(1)),
    dailyCo2SavedKg: Number(dailyCo2SavedKg.toFixed(2)),
    monthlyCo2SavedKg: Number((dailyCo2SavedKg * 30).toFixed(1)),
    dailyNoxSavedGrams: Number(dailyNoxSavedGrams.toFixed(1)),
    vulnerabilityMultiplier: vulnerability.multiplier,
  };
}

/**
 * Formats a personalized WhatsApp / neighborhood air quality advisory
 * incorporating real-time weather, AQI severity, household profile, and impact.
 * @param {object} params - Advisory inputs.
 * @returns {string} Shareable formatted advisory text.
 */
export function formatCommunityAdvisory({
  city,
  aqiData,
  profile,
  plan,
  impact,
  alertMode = 'full-plan',
}) {
  const tier = classifyAqi(aqiData.aqi);
  const weather = aqiData.weather;
  const weatherLine = weather
    ? `Weather: ${weather.condition}, ${weather.temperatureC}°C | Humidity: ${weather.humidityPct}% | Wind: ${weather.windSpeedKmh} km/h`
    : '';

  const topRoutine = (plan?.routine || []).slice(0, alertMode === 'emergency' ? 1 : 2);
  const topHacks = (plan?.iaqHacks || []).slice(0, alertMode === 'emergency' ? 1 : 2);
  const topSwaps = (plan?.sustainableSwaps || []).slice(0, alertMode === 'emergency' ? 1 : 2);

  const modeTitle =
    alertMode === 'emergency'
      ? 'URGENT SMOG HEALTH ALERT'
      : alertMode === 'daily-inversion'
        ? 'DAILY INVERSION & VENTILATION SCHEDULE'
        : 'PERSONALIZED AIR QUALITY & FAMILY PLAN';

  const lines = [
    `*${modeTitle} — ${city.toUpperCase()}*`,
    `US AQI: *${aqiData.aqi} (${tier.label})* | PM2.5: ${aqiData.pm25} µg/m³ | NO2: ${aqiData.no2} µg/m³`,
    ...(weatherLine ? [weatherLine] : []),
    aqiData.isSimulated ? '_[Simulated Winter Smog Scenario]_' : '_[Live Open-Meteo Weather & AQI]_',
    '',
    `Advisory: ${tier.summary}`,
    '',
    '*Recommended Actions:*',
    ...topRoutine.map((item) => `• [${item.timeWindow}] ${item.title} (${item.directImpactLabel})`),
    ...topHacks.map((item) => `• [Indoor Hack] ${item.title} (${item.directImpactLabel})`),
    ...(alertMode !== 'daily-inversion'
      ? topSwaps.map((item) => `• [Clean Swap] ${item.title} (${item.directImpactLabel})`)
      : []),
    '',
  ];

  if (impact && impact.adoptedCount > 0) {
    lines.push(
      `*Expected Household Impact:* -${impact.exposureReductionScore}% PM2.5 exposure | ${impact.dailyCo2SavedKg} kg CO2e & ${impact.dailyNoxSavedGrams}g NOx saved/day.`
    );
  }

  if (profile?.household?.children || profile?.household?.elderly || profile?.household?.asthma) {
    lines.push(
      '*Priority Care:* Keep children, elderly, and asthma-sensitive members indoors during 06:00–10:00 & 19:00–23:00 thermal inversion peaks.'
    );
  }

  lines.push('', '_Sent via AeroShield AI — Urban Air Quality Assistant_');
  return lines.join('\n');
}

/**
 * Builds a safe WhatsApp click-to-send URL (`https://wa.me/...`) for a user-provided phone number.
 * @param {string} rawPhone - User-entered WhatsApp number.
 * @param {string} message - Advisory text to pre-fill.
 * @returns {string | null} Valid wa.me URL or null if phone has fewer than 7 digits.
 */
export function buildWhatsAppLink(rawPhone, message) {
  const digits = sanitizePhoneNumber(rawPhone);
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Evaluates transparent, rule-based contextual decisions for the household
 * based on current AQI, real-time wind/weather, sensitivity flags, and lifestyle.
 *
 * @param {object} params
 * @param {object} params.aqiData - Current or simulated weather & AQI data.
 * @param {object} params.profile - Sanitized household & lifestyle profile.
 * @returns {{ decisionTrace: Array<{ label: string, detail: string }>, quickVerdicts: Array<{ id: string, question: string, status: string, tone: string, answer: string }> }}
 */
export function evaluateContextualDecisions({ aqiData, profile }) {
  const aqi = clampNumber(aqiData?.aqi, 0, 500, 200);
  const wind = Number(aqiData?.weather?.windSpeedKmh ?? 6.5);
  const { household = {}, lifestyle = {} } = profile || {};
  const hasSensitive = Boolean(household.children || household.elderly || household.asthma);
  const vulnerability = calculateVulnerabilityProfile(household);

  const decisionTrace = [
    {
      label: aqi >= 201 ? `Severe AQI ${aqi} + ${wind} km/h Wind` : `AQI ${aqi} (${classifyAqi(aqi).label})`,
      detail:
        aqi >= 201
          ? 'Triggered inversion-lock schedule: outdoor walks paused until 13:30–15:30 thermal lift.'
          : aqi >= 101
            ? 'Triggered peak-hour avoidance around 06:00–10:00 and 19:00–23:00.'
            : 'Standard clean-air routine enabled with roadside idling precaution.',
    },
    {
      label: `${vulnerability.multiplier}x Sensitivity (${vulnerability.riskLevel})`,
      detail:
        vulnerability.activeGroups.length > 0
          ? `Prioritized bedroom clean-zone sealing for: ${vulnerability.activeGroups.join(', ')}.`
          : 'Baseline adult protection threshold applied.',
    },
    {
      label: `Setup: ${lifestyle.commute || 'car'} · ${lifestyle.ventilation || 'natural-windows'} · ${lifestyle.cooking || 'lpg-gas'}`,
      detail:
        lifestyle.ventilation === 'hepa-purifier'
          ? 'Optimized existing HEPA placement rather than recommending new purifier builds.'
          : 'Recommended low-cost Corsi-Rosenthal MERV-13 DIY filtration + wet mopping.',
    },
  ];

  const quickVerdicts = [
    {
      id: 'windows',
      question: 'Open Windows Now?',
      status: aqi <= 100 ? 'SAFE' : aqi <= 200 ? 'BRIEF ONLY' : 'KEEP SEALED',
      tone: aqi <= 100 ? 'emerald' : aqi <= 200 ? 'amber' : 'rose',
      answer:
        aqi <= 100
          ? `Safe to cross-ventilate (AQI ${aqi}), especially away from busy roads.`
          : aqi <= 200
            ? `Limit cross-ventilation to 15–20 minutes during 13:30–15:30 thermal lift.`
            : `Keep windows sealed right now (AQI ${aqi}, wind ${wind} km/h). Purge briefly only between 13:30–15:30.`,
    },
    {
      id: 'outdoors',
      question: hasSensitive ? 'Kids & Seniors Outdoors?' : 'Outdoor Exercise?',
      status: aqi <= 100 && !hasSensitive ? 'SAFE' : aqi <= 150 && !hasSensitive ? 'CAUTION' : 'AVOID',
      tone: aqi <= 100 && !hasSensitive ? 'emerald' : aqi <= 150 ? 'amber' : 'rose',
      answer:
        hasSensitive && aqi > 100
          ? `Avoid outdoor play or walks for ${vulnerability.activeGroups.join(' & ')} at AQI ${aqi}; shift activity indoors.`
          : aqi <= 100
            ? `Safe for outdoor activity; prefer parks over arterial roads.`
            : `Move cardio indoors today (AQI ${aqi}) to avoid deep lung particulate deposition.`,
    },
    {
      id: 'mask',
      question: 'Mask Needed Outside?',
      status: aqi >= 151 || (aqi >= 101 && (hasSensitive || lifestyle.commute === 'two-wheeler')) ? 'N95 / FFP2' : 'OPTIONAL',
      tone: aqi >= 151 ? 'rose' : aqi >= 101 ? 'amber' : 'emerald',
      answer:
        aqi >= 151 || lifestyle.commute === 'two-wheeler'
          ? `Wear a snug N95/KF94 mask outdoors${lifestyle.commute === 'two-wheeler' ? ' (critical on two-wheelers)' : ''}; cloth masks do not block PM2.5.`
          : `Mask optional for healthy adults, recommended for asthma/sensitive commuters near traffic.`,
    },
    {
      id: 'cooking',
      question: 'Indoor Air & Cooking?',
      status: lifestyle.cooking === 'biomass-solid' || lifestyle.ventilation === 'leaky-drafty' ? 'HIGH ALERT' : 'USE EXHAUST',
      tone: lifestyle.cooking === 'biomass-solid' ? 'rose' : 'amber',
      answer:
        lifestyle.cooking === 'biomass-solid'
          ? `Solid-fuel smoke spikes indoor PM2.5 dramatically—switch to LPG/induction and vent outside immediately.`
          : `Run kitchen exhaust hood or cover pots with lids when cooking (${lifestyle.cooking}) so indoor NO2 does not accumulate.`,
    },
  ];

  return { decisionTrace, quickVerdicts };
}
