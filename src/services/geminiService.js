/**
 * GenAI Action Plan Service using Google Gemini (`gemini-2.5-flash`) with
 * strict JSON Schema output when configured via environment variables,
 * paired with a deterministic Smart Adaptive Logic Engine out of the box.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { classifyAqi } from '../utils/impactCalculator.js';
import { clampNumber, sanitizeApiKey, sanitizeText } from '../utils/sanitize.js';

const MODEL_NAME = 'gemini-2.5-flash';

const RECOMMENDATION_ITEM_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    id: { type: SchemaType.STRING },
    title: { type: SchemaType.STRING },
    timeWindow: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    directImpactLabel: { type: SchemaType.STRING },
    impactExplanation: { type: SchemaType.STRING },
    pm25ReductionPct: { type: SchemaType.NUMBER },
    co2SavedKg: { type: SchemaType.NUMBER },
    noxSavedGrams: { type: SchemaType.NUMBER },
    costTier: { type: SchemaType.STRING },
    priority: { type: SchemaType.STRING },
  },
  required: [
    'id',
    'title',
    'timeWindow',
    'description',
    'directImpactLabel',
    'impactExplanation',
    'pm25ReductionPct',
    'co2SavedKg',
    'noxSavedGrams',
    'costTier',
    'priority',
  ],
};

const ACTION_PLAN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    executiveSummary: { type: SchemaType.STRING },
    inversionWindowAdvice: { type: SchemaType.STRING },
    routine: {
      type: SchemaType.ARRAY,
      items: RECOMMENDATION_ITEM_SCHEMA,
    },
    iaqHacks: {
      type: SchemaType.ARRAY,
      items: RECOMMENDATION_ITEM_SCHEMA,
    },
    sustainableSwaps: {
      type: SchemaType.ARRAY,
      items: RECOMMENDATION_ITEM_SCHEMA,
    },
  },
  required: [
    'executiveSummary',
    'inversionWindowAdvice',
    'routine',
    'iaqHacks',
    'sustainableSwaps',
  ],
};

function normalizeItem(item, prefix, idx) {
  return {
    id: sanitizeText(item?.id || `${prefix}-${idx + 1}`, 32) || `${prefix}-${idx + 1}`,
    title: sanitizeText(item?.title || 'Protective Air Action', 90),
    timeWindow: sanitizeText(item?.timeWindow || 'All Day', 40),
    description: sanitizeText(item?.description || '', 320),
    directImpactLabel: sanitizeText(item?.directImpactLabel || 'Reduces PM2.5 exposure', 80),
    impactExplanation: sanitizeText(item?.impactExplanation || '', 220),
    pm25ReductionPct: Math.round(clampNumber(item?.pm25ReductionPct, 0, 75, 10)),
    co2SavedKg: Number(clampNumber(item?.co2SavedKg, 0, 30, 0).toFixed(2)),
    noxSavedGrams: Number(clampNumber(item?.noxSavedGrams, 0, 250, 0).toFixed(1)),
    costTier: sanitizeText(item?.costTier || 'Free', 24),
    priority: sanitizeText(item?.priority || 'High', 20),
  };
}

/**
 * Generates a deterministic, weather- and context-aware action plan when running
 * without an external Gemini API key.
 *
 * @param {object} context
 * @param {object} context.aqiData - Current/simulated AQI, pollutants & weather readings.
 * @param {object} context.profile - Sanitized household & lifestyle profile.
 * @returns {object} Structured action plan matching the Gemini JSON schema.
 */
export function generateFallbackActionPlan({ aqiData, profile }) {
  const aqi = clampNumber(aqiData?.aqi, 0, 500, 250);
  const tier = classifyAqi(aqi);
  const city = sanitizeText(aqiData?.city || profile?.city || 'Your City', 48);
  const weather = aqiData?.weather || {};
  const wind = Number(weather.windSpeedKmh ?? 6.5);
  const temp = weather.temperatureC ?? 16;
  const { household, lifestyle } = profile;

  const isSevere = aqi >= 201;
  const isElevated = aqi >= 101;
  const hasSensitive = household.children || household.elderly || household.asthma;
  const stagnantAir = wind < 8;

  const routine = [
    {
      id: 'routine-1',
      title: isElevated
        ? 'Hold Morning Outdoor Walks Until Thermal Lift'
        : 'Light Morning Activity Away From Arterial Roads',
      timeWindow: '06:00 – 10:00 (Peak Inversion)',
      description: isSevere
        ? `Morning thermal inversion${stagnantAir ? ` with calm ${wind} km/h winds` : ''} traps cold exhaust near ground level in ${city} (AQI ${aqi}). Keep ${hasSensitive ? 'children, elderly, and asthma-sensitive members' : 'the family'} indoors and circulate filtered air.`
        : `Avoid jogging or school-gate idling along main roads during morning rush hour when NO2 and PM2.5 spike.`,
      directImpactLabel: isSevere
        ? '-38% morning PM2.5 inhalation'
        : '-22% peak-hour particulate exposure',
      impactExplanation:
        'Bypassing the 06:00–10:00 boundary-layer trap prevents inhaling concentrated cold-start diesel and wood-smoke aerosols.',
      pm25ReductionPct: isSevere ? 38 : 22,
      co2SavedKg: 0,
      noxSavedGrams: 0,
      costTier: 'Free',
      priority: 'Critical',
    },
    {
      id: 'routine-2',
      title:
        lifestyle.commute === 'wfh'
          ? 'Batch Midday Errands Into Single Warm-Hour Trip'
          : 'Shift Commute & Seal Cabin Recirculation Mode',
      timeWindow: '10:00 – 13:00 (Commute)',
      description:
        lifestyle.commute === 'car'
          ? 'Set car HVAC to internal recirculation (closed-cabin mode) on congested corridors and combine errands into one trip.'
          : lifestyle.commute === 'two-wheeler'
            ? 'Wear a fit-tested N95/KF94 mask under helmet and take low-traffic residential side streets away from diesel buses.'
            : lifestyle.commute === 'public-transit'
              ? 'Use metro or closed-window electric transit where possible, wearing an N95 mask on open platforms.'
              : 'Consolidate grocery and pharmacy pickups into a single trip after midday solar warming lifts surface smog.',
      directImpactLabel:
        lifestyle.commute === 'two-wheeler'
          ? '-55% roadside PM2.5 inhaled'
          : '-30% transit NO2 & soot exposure',
      impactExplanation:
        'Recirculation or N95 filtration blocks ultrafine traffic particles (PM0.1–PM2.5) elevated along urban roadways.',
      pm25ReductionPct: lifestyle.commute === 'two-wheeler' ? 55 : 30,
      co2SavedKg: lifestyle.commute === 'wfh' ? 1.4 : 0.6,
      noxSavedGrams: lifestyle.commute === 'wfh' ? 5.2 : 2.1,
      costTier: lifestyle.commute === 'two-wheeler' ? 'Low Cost' : 'Free',
      priority: 'High',
    },
    {
      id: 'routine-3',
      title: isSevere
        ? 'Controlled 15-Min Cross-Ventilation Window'
        : 'Afternoon Fresh-Air Purge & Outdoor Play Window',
      timeWindow: '13:30 – 15:30 (Thermal Lift)',
      description: isSevere
        ? `Brief afternoon sunlight (${temp}°C) thins the inversion layer. Open opposite windows for 15 minutes only to flush indoor CO2, then reseal before evening cooling.`
        : `Plan outdoor errands, gentle senior walks, or supervised kids play during the afternoon dispersion trough when AQI is lowest.`,
      directImpactLabel: '-18% indoor CO2 & stagnant VOCs',
      impactExplanation:
        'Ventilating strictly during the afternoon mixing height peak exchanges stale indoor air while minimizing net PM2.5 ingress.',
      pm25ReductionPct: 18,
      co2SavedKg: 0.2,
      noxSavedGrams: 0,
      costTier: 'Free',
      priority: 'Medium',
    },
    {
      id: 'routine-4',
      title: hasSensitive
        ? 'Evening Clean-Room Sanctuary & Saline/Hydration Routine'
        : 'Pre-Inversion Window Seal & Low-Particulate Dinner Prep',
      timeWindow: '18:30 – 22:30 (Evening Lock)',
      description: `Close exterior windows before 18:00 as ground temperatures drop. ${household.asthma ? 'Keep rescue inhalers accessible and set bedroom filtration on medium-high.' : 'Run kitchen exhaust during dinner prep and keep pets indoors after dusk.'}`,
      directImpactLabel: '-32% overnight PM2.5 accumulation',
      impactExplanation:
        'Pre-sealing bedrooms before evening biomass/traffic plumes settle protects 8 hours of deep respiratory recovery.',
      pm25ReductionPct: 32,
      co2SavedKg: 0,
      noxSavedGrams: 0,
      costTier: 'Free',
      priority: 'Critical',
    },
  ];

  const iaqHacks = [
    {
      id: 'iaq-1',
      title:
        lifestyle.ventilation === 'hepa-purifier'
          ? 'Optimize HEPA Placement & Clean Pre-Filters Weekly'
          : 'Build a DIY Corsi-Rosenthal Box Air Purifier',
      timeWindow: 'Indoor Filtration',
      description:
        lifestyle.ventilation === 'hepa-purifier'
          ? 'Position purifier 1 meter from walls in the primary sleeping room, run continuously on medium, and vacuum mesh pre-filters weekly.'
          : 'Tape four MERV-13 furnace filters into a cube with a standard box fan on top—delivers clean-air delivery rates rivaling commercial purifiers at ~20% of the cost.',
      directImpactLabel:
        lifestyle.ventilation === 'hepa-purifier'
          ? '-48% bedroom PM2.5 concentration'
          : '-52% indoor PM2.5 for under $45',
      impactExplanation:
        'High-CADR MERV-13 or True HEPA recirculation scrubs 0.3–2.5 µm soot particles out of closed living spaces every 12–15 minutes.',
      pm25ReductionPct: lifestyle.ventilation === 'hepa-purifier' ? 48 : 52,
      co2SavedKg: 0,
      noxSavedGrams: 0,
      costTier: lifestyle.ventilation === 'hepa-purifier' ? 'Free' : 'Low Cost',
      priority: 'Critical',
    },
    {
      id: 'iaq-2',
      title: 'Wet-Mop Floors & Microfiber Dusting (Zero Dry Sweeping)',
      timeWindow: 'Daily Housekeeping',
      description: `Dry brooms and vacuum cleaners without HEPA filters kick settled heavy-metal dust and ${household.pets ? 'pet dander' : 'soot'} back into breathing height. Use damp microfiber mops instead.`,
      directImpactLabel: '-24% resuspended coarse & fine dust',
      impactExplanation:
        'Wet cleaning captures settled PM10 and PM2.5 bound to floor dust without aerosolizing particles back into the room.',
      pm25ReductionPct: 24,
      co2SavedKg: 0,
      noxSavedGrams: 0,
      costTier: 'Free',
      priority: 'High',
    },
    {
      id: 'iaq-3',
      title:
        lifestyle.ventilation === 'leaky-drafty'
          ? 'DIY Foam Weather-Stripping & Damp Towel Door Seals'
          : 'Create a Positive-Barrier Clean Sleeping Zone',
      timeWindow: 'Room Sealing',
      description:
        lifestyle.ventilation === 'leaky-drafty'
          ? 'Apply inexpensive adhesive EPDM foam tape around loose window frames and place rolled damp towels under exterior door gaps during smog peaks.'
          : 'Keep one bedroom tightly sealed with footwear left at the entrance and wet coats stored in a hallway closet.',
      directImpactLabel: '-28% outdoor smog infiltration',
      impactExplanation:
        'Reducing uncontrolled air-changes-per-hour (ACH) through window cracks cuts passive winter smog leakage indoors.',
      pm25ReductionPct: 28,
      co2SavedKg: 0.35,
      noxSavedGrams: 0,
      costTier: 'Low Cost',
      priority: 'High',
    },
  ];

  const sustainableSwaps = [
    {
      id: 'swap-1',
      title:
        lifestyle.commute === 'car'
          ? 'Switch 3 Days/Week to Metro, Bus, or Carpool'
          : lifestyle.commute === 'two-wheeler'
            ? 'Replace Short Solo Rides With Transit or E-Cycle + Mask'
            : 'Zero-Idling School & Market Drop-Off Pledge',
      timeWindow: 'Mobility Swap',
      description:
        lifestyle.commute === 'car'
          ? 'Shifting an average 14 km urban car commute to shared transit or carpooling cuts tailpipe NOx and tire/brake particulate emissions directly inside your neighborhood.'
          : 'Eliminate engine idling at traffic lights (>15 sec) and school gates—cold winter engines emit 3x more unburned hydrocarbons.',
      directImpactLabel:
        lifestyle.commute === 'car'
          ? 'Saves 2.4 kg CO2e & 8.5g NOx/day'
          : 'Saves 0.9 kg CO2e & 3.8g NOx/day',
      impactExplanation:
        'Cutting urban vehicle-kilometers lowers local ground-level NO2, a primary precursor to secondary winter nitrate smog.',
      pm25ReductionPct: lifestyle.commute === 'car' ? 12 : 8,
      co2SavedKg: lifestyle.commute === 'car' ? 2.4 : 0.9,
      noxSavedGrams: lifestyle.commute === 'car' ? 8.5 : 3.8,
      costTier: 'Cost-Saving',
      priority: 'High',
    },
    {
      id: 'swap-2',
      title:
        lifestyle.cooking === 'electric-induction'
          ? 'Lid-On Induction Simmering & Exhaust Hood Boost'
          : lifestyle.cooking === 'biomass-solid'
            ? 'Urgent Transition to LPG/Induction & Clean Briquettes'
            : 'Shift Slow-Cooked Meals to Electric Kettle / Induction',
      timeWindow: 'Clean Cooking Swap',
      description:
        lifestyle.cooking === 'biomass-solid'
          ? 'Indoor solid-fuel burning multiplies indoor PM2.5 up to 10x ambient levels. Shift primary cooking to clean LPG/electric induction and always vent smoke outside.'
          : 'Gas burners emit indoor NO2 and ultrafine aerosols. Use an induction cooktop or electric pressure cooker with lids on, plus kitchen exhaust during frying.',
      directImpactLabel:
        lifestyle.cooking === 'biomass-solid'
          ? '-60% indoor PM2.5 | -3.1 kg CO2e/day'
          : '-26% indoor NO2 | -0.85 kg CO2e/day',
      impactExplanation:
        'Electrifying or covering high-heat cooking eliminates indoor combustion plumes that otherwise linger for hours in sealed winter homes.',
      pm25ReductionPct: lifestyle.cooking === 'biomass-solid' ? 60 : 26,
      co2SavedKg: lifestyle.cooking === 'biomass-solid' ? 3.1 : 0.85,
      noxSavedGrams: lifestyle.cooking === 'biomass-solid' ? 14.0 : 4.6,
      costTier: lifestyle.cooking === 'biomass-solid' ? 'Moderate' : 'Low Cost',
      priority: lifestyle.cooking === 'biomass-solid' ? 'Critical' : 'High',
    },
    {
      id: 'swap-3',
      title: 'Zero Trash/Leaf Burning & Electric Space-Heating Discipline',
      timeWindow: 'Community Habit',
      description:
        'Never burn garden leaves, cardboard, or coal outdoors during winter evenings; compost dry waste and layer thermal clothing to drop indoor heater thermostat by 2°C.',
      directImpactLabel: 'Saves 1.6 kg CO2e & 6.2g NOx/day',
      impactExplanation:
        'Preventing open low-temperature burning stops toxic dioxin and black-carbon spikes across an entire city block.',
      pm25ReductionPct: 14,
      co2SavedKg: 1.6,
      noxSavedGrams: 6.2,
      costTier: 'Cost-Saving',
      priority: 'Medium',
    },
  ];

  const sensitiveNote = hasSensitive
    ? ' Heightened protection is enabled for vulnerable household members.'
    : '';

  return {
    mode: 'smart-adaptive-engine',
    modelLabel: 'AeroShield Smart Adaptive Engine',
    executiveSummary: `${city} is experiencing ${tier.label} air quality (US AQI ${aqi}, PM2.5 ${aqiData?.pm25 ?? '—'} µg/m³) at ${temp}°C with ${wind} km/h winds.${sensitiveNote} Following this inversion-aligned plan cuts household PM2.5 inhalation while lowering neighborhood combustion emissions.`,
    inversionWindowAdvice: `Best brief ventilation window: 13:30–15:30 (${stagnantAir ? 'calm winds trap smog outside this window' : 'moderate wind helps afternoon dispersion'}). Highest smog trap: 06:00–10:00 and 18:30–23:00.`,
    routine,
    iaqHacks,
    sustainableSwaps,
  };
}

/**
 * Generates a personalized action plan via Google Gemini 2.5 Flash when
 * `VITE_GEMINI_API_KEY` is provided in the build/environment, or uses the
 * deterministic Smart Adaptive Engine seamlessly when no key is configured.
 *
 * @param {object} params
 * @param {object} params.aqiData - Air quality & weather metrics.
 * @param {object} params.profile - Sanitized household & lifestyle profile.
 * @returns {Promise<object>} Structured action plan + generation metadata.
 */
export async function generateActionPlan({ aqiData, profile }) {
  const activeKey = sanitizeApiKey(import.meta.env.VITE_GEMINI_API_KEY || '');

  if (!activeKey) {
    return generateFallbackActionPlan({ aqiData, profile });
  }

  try {
    const genAI = new GoogleGenerativeAI(activeKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: ACTION_PLAN_SCHEMA,
        temperature: 0.4,
      },
    });

    const weather = aqiData.weather || {};
    const prompt = [
      'You are AeroShield AI, an urban environmental health and air quality engineer.',
      'Generate a practical, empathetic, science-backed winter smog action plan in JSON.',
      '',
      `Location: ${aqiData.city}${aqiData.country ? `, ${aqiData.country}` : ''}`,
      `Real-Time Weather: ${weather.condition || 'Haze'}, Temp=${weather.temperatureC ?? 16}C, Humidity=${weather.humidityPct ?? 65}%, Wind=${weather.windSpeedKmh ?? 6} km/h`,
      `Air Quality: US AQI ${aqiData.aqi} (${classifyAqi(aqiData.aqi).label}), PM2.5=${aqiData.pm25} ug/m3, PM10=${aqiData.pm10} ug/m3, NO2=${aqiData.no2} ug/m3`,
      `Scenario Type: ${aqiData.isSimulated ? 'Simulated Winter Smog Scenario' : 'Live Telemetry'}`,
      `Household Vulnerabilities: children=${profile.household.children}, elderly=${profile.household.elderly}, asthma=${profile.household.asthma}, pets=${profile.household.pets}`,
      `Lifestyle: commute=${profile.lifestyle.commute}, ventilation=${profile.lifestyle.ventilation}, cooking=${profile.lifestyle.cooking}`,
      '',
      'Requirements:',
      '- routine: exactly 4 time-blocked items covering Morning Peak, Commute, Afternoon Lift Window, and Evening Lock.',
      '- iaqHacks: exactly 3 low-cost/DIY indoor air quality hacks tailored to the ventilation & household profile.',
      '- sustainableSwaps: exactly 3 actionable low-emission swaps tailored to commute & cooking profile.',
      '- Every item MUST include realistic quantified numbers: pm25ReductionPct (0-65), co2SavedKg (0-5), noxSavedGrams (0-25), a concise directImpactLabel (e.g. "-45% indoor PM2.5"), impactExplanation, costTier (Free, Low Cost, Cost-Saving, Moderate), and priority (Critical, High, Medium).',
      '- Use plain, non-alarmist, actionable language.',
    ].join('\n');

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const parsed = JSON.parse(rawText);

    return {
      mode: 'gemini-live',
      modelLabel: 'Gemini 2.5 Flash AI',
      executiveSummary: sanitizeText(parsed.executiveSummary, 400),
      inversionWindowAdvice: sanitizeText(parsed.inversionWindowAdvice, 220),
      routine: (parsed.routine || []).slice(0, 5).map((item, i) => normalizeItem(item, 'routine', i)),
      iaqHacks: (parsed.iaqHacks || []).slice(0, 4).map((item, i) => normalizeItem(item, 'iaq', i)),
      sustainableSwaps: (parsed.sustainableSwaps || [])
        .slice(0, 4)
        .map((item, i) => normalizeItem(item, 'swap', i)),
    };
  } catch {
    return generateFallbackActionPlan({ aqiData, profile });
  }
}
