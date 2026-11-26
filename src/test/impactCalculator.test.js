import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppLink,
  calculateAdoptedImpact,
  calculateVulnerabilityProfile,
  classifyAqi,
  estimatePollutantsFromAqi,
  evaluateContextualDecisions,
  formatCommunityAdvisory,
} from '../utils/impactCalculator.js';
import {
  clampNumber,
  sanitizeApiKey,
  sanitizePhoneNumber,
  sanitizeProfile,
  sanitizeText,
} from '../utils/sanitize.js';

describe('AQI Risk Classification', () => {
  it('classifies AQI thresholds into color-blind-safe tiers', () => {
    expect(classifyAqi(35).id).toBe('good');
    expect(classifyAqi(85).id).toBe('moderate');
    expect(classifyAqi(125).id).toBe('sensitive');
    expect(classifyAqi(180).id).toBe('unhealthy');
    expect(classifyAqi(265).id).toBe('very-unhealthy');
    expect(classifyAqi(455).id).toBe('hazardous');
    expect(classifyAqi(455).patternClass).toBe('aqi-pattern-hazardous');
  });

  it('estimates realistic PM2.5, PM10, and NO2 from simulated AQI', () => {
    const moderate = estimatePollutantsFromAqi(120);
    const severe = estimatePollutantsFromAqi(450);

    expect(moderate.pm25).toBeGreaterThan(35);
    expect(moderate.pm25).toBeLessThan(60);
    expect(severe.pm25).toBeGreaterThan(350);
    expect(severe.pm10).toBeGreaterThan(severe.pm25);
    expect(severe.no2).toBeGreaterThan(moderate.no2);
  });
});

describe('Vulnerability & Direct Impact Math', () => {
  it('computes household vulnerability multipliers accurately', () => {
    const base = calculateVulnerabilityProfile({});
    expect(base.multiplier).toBe(1.0);
    expect(base.riskLevel).toBe('Standard');

    const highRisk = calculateVulnerabilityProfile({
      children: true,
      elderly: true,
      asthma: true,
      pets: true,
    });
    expect(highRisk.multiplier).toBeGreaterThanOrEqual(1.6);
    expect(highRisk.riskLevel).toBe('Critical Vulnerability');
    expect(highRisk.activeGroups).toHaveLength(4);
  });

  it('calculates diminishing-returns PM2.5 reduction and daily CO2e/NOx savings', () => {
    const mockPlan = {
      routine: [
        { id: 'r1', pm25ReductionPct: 40, co2SavedKg: 0.5, noxSavedGrams: 2 },
      ],
      iaqHacks: [
        { id: 'h1', pm25ReductionPct: 50, co2SavedKg: 0, noxSavedGrams: 0 },
      ],
      sustainableSwaps: [
        { id: 's1', pm25ReductionPct: 10, co2SavedKg: 2.4, noxSavedGrams: 8.5 },
      ],
    };

    const impact = calculateAdoptedImpact(mockPlan, ['r1', 'h1', 's1'], 200, { asthma: true });
    expect(impact.exposureReductionScore).toBe(73);
    expect(impact.pm25AvoidedUgM3).toBe(146);
    expect(impact.effectiveIndoorPm25).toBe(54);
    expect(impact.dailyCo2SavedKg).toBe(2.9);
    expect(impact.monthlyCo2SavedKg).toBe(87);
    expect(impact.dailyNoxSavedGrams).toBe(10.5);
    expect(impact.adoptedCount).toBe(3);
  });

  it('caps combined exposure reduction at 92% and returns 0 when nothing is adopted', () => {
    const extremePlan = {
      routine: [
        { id: 'a', pm25ReductionPct: 75, co2SavedKg: 0, noxSavedGrams: 0 },
        { id: 'b', pm25ReductionPct: 75, co2SavedKg: 0, noxSavedGrams: 0 },
        { id: 'c', pm25ReductionPct: 75, co2SavedKg: 0, noxSavedGrams: 0 },
      ],
      iaqHacks: [],
      sustainableSwaps: [],
    };
    const capped = calculateAdoptedImpact(extremePlan, ['a', 'b', 'c'], 100);
    expect(capped.exposureReductionScore).toBe(92);

    const empty = calculateAdoptedImpact(extremePlan, [], 100);
    expect(empty.exposureReductionScore).toBe(0);
    expect(empty.dailyCo2SavedKg).toBe(0);
  });
});

describe('Input Sanitization & WhatsApp Advisory Formatting', () => {
  it('sanitizes text, phone numbers, numbers, and API keys', () => {
    expect(sanitizeText('<script>Delhi</script>   NCR', 40)).toBe('scriptDelhi/script NCR');
    expect(clampNumber(999, 25, 500, 100)).toBe(500);
    expect(clampNumber('bad', 25, 500, 100)).toBe(100);
    expect(sanitizeApiKey('  AIzaTestKey \n 123  ')).toBe('AIzaTestKey123');
    expect(sanitizePhoneNumber('+91 98765-43210')).toBe('919876543210');
    expect(sanitizePhoneNumber('0091-1234567890')).toBe('911234567890');
  });

  it('normalizes invalid lifestyle enums back to safe defaults', () => {
    const clean = sanitizeProfile({
      city: '  Lahore  ',
      simulatedAqi: 900,
      lifestyle: { commute: 'jetpack', ventilation: 'invalid', cooking: 'electric-induction' },
    });
    expect(clean.city).toBe('Lahore');
    expect(clean.simulatedAqi).toBe(500);
    expect(clean.lifestyle.commute).toBe('car');
    expect(clean.lifestyle.ventilation).toBe('natural-windows');
    expect(clean.lifestyle.cooking).toBe('electric-induction');
  });

  it('formats a readable WhatsApp advisory with weather and builds wa.me links safely', () => {
    const text = formatCommunityAdvisory({
      city: 'Delhi',
      aqiData: {
        aqi: 420,
        pm25: 380,
        no2: 64,
        isSimulated: true,
        weather: { condition: 'Fog / Winter Haze', temperatureC: 11, humidityPct: 82, windSpeedKmh: 3.5 },
      },
      profile: { household: { children: true } },
      plan: {
        routine: [{ timeWindow: '06:00-10:00', title: 'Stay Indoors', directImpactLabel: '-38% PM2.5' }],
        iaqHacks: [{ title: 'Corsi-Rosenthal Box', directImpactLabel: '-52% indoor PM2.5' }],
        sustainableSwaps: [{ title: 'Metro Commute', directImpactLabel: 'Saves 2.4 kg CO2e/day' }],
      },
      impact: { adoptedCount: 2, exposureReductionScore: 70, dailyCo2SavedKg: 2.4, dailyNoxSavedGrams: 8.5 },
    });

    expect(text).toContain('PERSONALIZED AIR QUALITY & FAMILY PLAN — DELHI');
    expect(text).toContain('US AQI: *420 (Hazardous)*');
    expect(text).toContain('Fog / Winter Haze, 11°C');
    expect(text).toContain('Corsi-Rosenthal Box');
    expect(text).toContain('*Priority Care:*');

    expect(buildWhatsAppLink('+91 98765 43210', 'Hello')).toBe(
      'https://wa.me/919876543210?text=Hello'
    );
    expect(buildWhatsAppLink('123', 'Hello')).toBeNull();
  });

  it('produces logical contextual decisions and family Q&A verdicts', () => {
    const severe = evaluateContextualDecisions({
      aqiData: { aqi: 390, weather: { windSpeedKmh: 4.2 } },
      profile: {
        household: { children: true, asthma: true },
        lifestyle: { commute: 'two-wheeler', ventilation: 'leaky-drafty', cooking: 'biomass-solid' },
      },
    });
    expect(severe.decisionTrace).toHaveLength(3);
    expect(severe.quickVerdicts[0].status).toBe('KEEP SEALED');
    expect(severe.quickVerdicts[1].status).toBe('AVOID');
    expect(severe.quickVerdicts[2].status).toBe('N95 / FFP2');
    expect(severe.quickVerdicts[3].status).toBe('HIGH ALERT');

    const clean = evaluateContextualDecisions({
      aqiData: { aqi: 42, weather: { windSpeedKmh: 14 } },
      profile: {
        household: { children: false, elderly: false, asthma: false },
        lifestyle: { commute: 'wfh', ventilation: 'hepa-purifier', cooking: 'electric-induction' },
      },
    });
    expect(clean.quickVerdicts[0].status).toBe('SAFE');
    expect(clean.quickVerdicts[1].status).toBe('SAFE');
  });
});
