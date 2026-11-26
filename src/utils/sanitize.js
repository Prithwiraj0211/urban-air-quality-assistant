/**
 * Input sanitization and normalization helpers to ensure safe handling
 * of user-provided city names, phone numbers, API keys, and household profiles.
 */

const VALID_COMMUTES = new Set(['car', 'two-wheeler', 'public-transit', 'wfh']);
const VALID_VENTILATION = new Set([
  'natural-windows',
  'exhaust-only',
  'hepa-purifier',
  'leaky-drafty',
]);
const VALID_COOKING = new Set([
  'lpg-gas',
  'electric-induction',
  'biomass-solid',
  'mixed-low-vent',
]);

/**
 * Strips potentially unsafe characters, collapses whitespace, and caps length.
 * @param {unknown} value - Raw user input.
 * @param {number} [maxLength=100] - Maximum allowed string length.
 * @returns {string} Sanitized plain text.
 */
export function sanitizeText(value, maxLength = 100) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>`"'\\]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Clamps a numeric input into [min, max], returning fallback if non-finite.
 * @param {unknown} value - Raw numeric input.
 * @param {number} min - Minimum allowed value.
 * @param {number} max - Maximum allowed value.
 * @param {number} fallback - Default value if invalid.
 * @returns {number} Clamped number.
 */
export function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

/**
 * Sanitizes an environment Gemini API key string.
 * @param {unknown} rawKey - Raw key string.
 * @returns {string} Trimmed key stripped of whitespace and control chars.
 */
export function sanitizeApiKey(rawKey) {
  if (typeof rawKey !== 'string') return '';
  return rawKey.replace(/[\s\u0000-\u001F\u007F]/g, '').slice(0, 128);
}

/**
 * Normalizes a WhatsApp phone number to E.164 digits-only format (for wa.me links).
 * Strips leading zeros/plus signs/spaces/punctuation and caps at 15 digits.
 * @param {unknown} rawPhone - User-entered phone number (e.g. "+91 98765-43210").
 * @returns {string} Digits-only phone number or empty string.
 */
export function sanitizePhoneNumber(rawPhone) {
  if (typeof rawPhone !== 'string') return '';
  const digits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');
  return digits.slice(0, 15);
}

/**
 * Normalizes and validates the complete household and lifestyle profile.
 * @param {object} profile - Raw profile state.
 * @returns {object} Sanitized profile object.
 */
export function sanitizeProfile(profile = {}) {
  const household = profile.household || {};
  const lifestyle = profile.lifestyle || {};

  return {
    city: sanitizeText(profile.city || 'Delhi', 64) || 'Delhi',
    useSimulation: Boolean(profile.useSimulation),
    simulatedAqi: Math.round(clampNumber(profile.simulatedAqi, 25, 500, 385)),
    household: {
      children: Boolean(household.children),
      elderly: Boolean(household.elderly),
      asthma: Boolean(household.asthma),
      pets: Boolean(household.pets),
    },
    lifestyle: {
      commute: VALID_COMMUTES.has(lifestyle.commute) ? lifestyle.commute : 'car',
      ventilation: VALID_VENTILATION.has(lifestyle.ventilation)
        ? lifestyle.ventilation
        : 'natural-windows',
      cooking: VALID_COOKING.has(lifestyle.cooking) ? lifestyle.cooking : 'lpg-gas',
    },
  };
}
