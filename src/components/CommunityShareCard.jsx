import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Megaphone,
  MessageCircle,
  Phone,
  Send,
  Share2,
} from 'lucide-react';
import {
  buildWhatsAppLink,
  classifyAqi,
  formatCommunityAdvisory,
} from '../utils/impactCalculator.js';
import { sanitizePhoneNumber } from '../utils/sanitize.js';
import { AqiBadge } from './AqiBadge.jsx';

const ALERT_MODES = [
  { value: 'full-plan', label: 'Full Personalized Family Advice' },
  { value: 'daily-inversion', label: 'Daily Inversion & Ventilation Schedule' },
  { value: 'emergency', label: 'Urgent Smog Alert Summary' },
];

/**
 * WhatsApp Personal Advisory & Community Smog Bulletin enabling users to
 * enter their WhatsApp number to receive tailored weather/AQI advice directly,
 * or copy a shareable summary for family & neighborhood groups.
 */
export function CommunityShareCard({ city, aqiData, profile, plan, impact }) {
  const [phoneInput, setPhoneInput] = useState('');
  const [alertMode, setAlertMode] = useState('full-plan');
  const [copied, setCopied] = useState(false);
  const [phoneFeedback, setPhoneFeedback] = useState('');

  const advisoryText = useMemo(
    () => formatCommunityAdvisory({ city, aqiData, profile, plan, impact, alertMode }),
    [city, aqiData, profile, plan, impact, alertMode]
  );

  const tier = classifyAqi(aqiData.aqi);
  const cleanDigits = sanitizePhoneNumber(phoneInput);
  const whatsAppUrl = buildWhatsAppLink(phoneInput, advisoryText);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(advisoryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  function handleSendWhatsApp(e) {
    e.preventDefault();
    if (!whatsAppUrl) {
      setPhoneFeedback('Please enter a valid WhatsApp number with country code (e.g., +91 9876543210).');
      return;
    }
    setPhoneFeedback(`Opening WhatsApp advisory for +${cleanDigits}...`);
    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <section
      aria-labelledby="community-alert-heading"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="community-alert-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-teal-700" aria-hidden="true" />
            <span>3. WhatsApp Personal Advice &amp; Community Alert</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Enter your WhatsApp number to receive tailored weather, AQI &amp; protection advice directly.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Copied Advisory!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" aria-hidden="true" />
              <span>Copy Advisory Text</span>
            </>
          )}
        </button>
      </div>

      {/* WhatsApp Direct Dispatch Form */}
      <form
        onSubmit={handleSendWhatsApp}
        className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-950">
          <MessageCircle className="w-4 h-4 text-emerald-700" aria-hidden="true" />
          <span>Get Personalized Advice on WhatsApp</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="whatsapp-number-input"
              className="block text-xs font-semibold text-slate-800 mb-1"
            >
              WhatsApp Number (with country code)
            </label>
            <div className="relative">
              <Phone
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="whatsapp-number-input"
                type="tel"
                inputMode="tel"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  setPhoneFeedback('');
                }}
                placeholder="e.g., +91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="whatsapp-mode-select"
              className="block text-xs font-semibold text-slate-800 mb-1"
            >
              Advisory Format
            </label>
            <select
              id="whatsapp-mode-select"
              value={alertMode}
              onChange={(e) => setAlertMode(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900"
            >
              {ALERT_MODES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Send to WhatsApp</span>
            </button>
          </div>
        </div>

        {phoneFeedback ? (
          <p
            role="status"
            className={`text-xs font-medium ${
              whatsAppUrl ? 'text-emerald-900' : 'text-rose-800'
            }`}
          >
            {phoneFeedback}
          </p>
        ) : (
          <p className="text-[11px] text-emerald-900/80">
            Generates a customized message for {city} ({aqiData.weather?.temperatureC ?? 16}°C, AQI{' '}
            {aqiData.aqi}) matched to your household profile and opens WhatsApp directly.
          </p>
        )}
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Visual Neighborhood Card */}
        <div className={`rounded-xl border-2 ${tier.accentBorder} bg-slate-50 p-4 space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>Neighborhood Smog Bulletin</span>
            </span>
            <AqiBadge aqi={aqiData.aqi} />
          </div>

          <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
            <div>
              <div className="text-lg font-black text-slate-900">{city}</div>
              <div className="text-xs text-slate-600">
                PM2.5: {aqiData.pm25} µg/m³ · {aqiData.weather?.temperatureC ?? 16}°C · Wind{' '}
                {aqiData.weather?.windSpeedKmh ?? 6.5} km/h
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 tabular-nums">
                AQI {aqiData.aqi}
              </div>
              <div className="text-[11px] font-semibold text-teal-800">
                Safe Window: 13:30–15:30
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-800 font-medium">{tier.summary}</p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <div className="text-[11px] text-slate-500">Exposure Cut</div>
              <div className="font-extrabold text-teal-800 tabular-nums">
                -{impact.exposureReductionScore}% PM2.5
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <div className="text-[11px] text-slate-500">Community Savings</div>
              <div className="font-extrabold text-emerald-800 tabular-nums">
                {impact.dailyCo2SavedKg} kg CO2e/day
              </div>
            </div>
          </div>
        </div>

        {/* Plain-text WhatsApp Preview */}
        <div className="flex flex-col">
          <label
            htmlFor="advisory-text-preview"
            className="text-xs font-semibold text-slate-700 mb-1"
          >
            WhatsApp Message Preview
          </label>
          <textarea
            id="advisory-text-preview"
            readOnly
            value={advisoryText}
            rows={8}
            className="w-full flex-1 rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-mono text-slate-800 leading-relaxed resize-none"
          />
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {copied ? 'Neighborhood air quality advisory copied to clipboard.' : ''}
      </div>
    </section>
  );
}
