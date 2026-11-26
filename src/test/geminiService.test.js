import { describe, expect, it } from 'vitest';
import {
  generateActionPlan,
  generateFallbackActionPlan,
} from '../services/geminiService.js';
import { sanitizeProfile } from '../utils/sanitize.js';

describe('Offline Smart Logic & Gemini Fallback Engine', () => {
  it('generates structured 3-pillar recommendations tailored to severe smog and biomass cooking', () => {
    const profile = sanitizeProfile({
      city: 'Lahore',
      household: { children: true, elderly: false, asthma: true, pets: true },
      lifestyle: {
        commute: 'two-wheeler',
        ventilation: 'leaky-drafty',
        cooking: 'biomass-solid',
      },
    });

    const plan = generateFallbackActionPlan({
      aqiData: { city: 'Lahore', aqi: 440, pm25: 390, pm10: 510, no2: 88 },
      profile,
    });

    expect(plan.mode).toBe('smart-adaptive-engine');
    expect(plan.routine).toHaveLength(4);
    expect(plan.iaqHacks).toHaveLength(3);
    expect(plan.sustainableSwaps).toHaveLength(3);

    // Checks household & lifestyle personalization
    expect(plan.routine[0].title).toContain('Hold Morning Outdoor Walks');
    expect(plan.routine[1].directImpactLabel).toContain('-55%');
    expect(plan.iaqHacks[2].title).toContain('Foam Weather-Stripping');
    expect(plan.sustainableSwaps[1].priority).toBe('Critical');
    expect(plan.sustainableSwaps[1].pm25ReductionPct).toBe(60);
  });

  it('adapts recommendations when AQI is Moderate and user has HEPA + WFH', () => {
    const profile = sanitizeProfile({
      city: 'Salt Lake City',
      household: { children: false, elderly: false, asthma: false, pets: false },
      lifestyle: {
        commute: 'wfh',
        ventilation: 'hepa-purifier',
        cooking: 'electric-induction',
      },
    });

    const plan = generateFallbackActionPlan({
      aqiData: { city: 'Salt Lake City', aqi: 95, pm25: 33, pm10: 55, no2: 24 },
      profile,
    });

    expect(plan.routine[0].title).toContain('Light Morning Activity');
    expect(plan.iaqHacks[0].title).toContain('Optimize HEPA Placement');
    expect(plan.sustainableSwaps[1].title).toContain('Induction');
  });

  it('uses Offline Smart Logic automatically via generateActionPlan when no API key is given', async () => {
    const profile = sanitizeProfile({ city: 'Delhi' });
    const plan = await generateActionPlan({
      aqiData: { city: 'Delhi', aqi: 360, pm25: 305, pm10: 450, no2: 75 },
      profile,
    });

    expect(plan.mode).toBe('smart-adaptive-engine');
    expect(plan.routine.length).toBeGreaterThanOrEqual(3);
    for (const item of [...plan.routine, ...plan.iaqHacks, ...plan.sustainableSwaps]) {
      expect(item.directImpactLabel.length).toBeGreaterThan(0);
      expect(item.impactExplanation.length).toBeGreaterThan(0);
    }
  });
});
