import React from 'react';
import { CheckSquare, Leaf, ShieldCheck, Sparkles, Wind } from 'lucide-react';

/**
 * Interactive "Direct Impact" dashboard recalculating Household Exposure Reduction Score
 * and Community Emission Savings as users toggle adopted habits.
 */
export function ImpactDashboard({
  impact,
  baselinePm25,
  onSelectAllPriority,
  onClearAll,
}) {
  return (
    <section
      aria-labelledby="impact-dashboard-heading"
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white rounded-2xl shadow-md p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="impact-dashboard-heading" className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-300" aria-hidden="true" />
            <span>Quantified Direct Impact Simulator</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Check off actions below to simulate your household&apos;s live health &amp; emission gains.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectAllPriority}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Adopt All Plan Actions</span>
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-live="polite">
        {/* Household Exposure Reduction Score */}
        <div className="p-4 rounded-xl bg-white/10 border border-white/15 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>Household Exposure Reduction Score</span>
            </span>
            <span className="text-xs text-slate-300 tabular-nums">
              {impact.adoptedCount}/{impact.totalCount} habits
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-3xl font-black tabular-nums text-white">
              -{impact.exposureReductionScore}%
            </span>
            <span className="text-xs text-teal-200 font-medium tabular-nums">
              Indoor PM2.5: {baselinePm25} → {impact.effectiveIndoorPm25} µg/m³
            </span>
          </div>

          <div
            className="w-full h-3 rounded-full bg-slate-800 overflow-hidden"
            role="progressbar"
            aria-valuenow={impact.exposureReductionScore}
            aria-valuemin={0}
            aria-valuemax={92}
            aria-label="Household PM2.5 exposure reduction percentage"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min(100, impact.exposureReductionScore)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-300">
            Blocks ~{impact.pm25AvoidedUgM3} µg/m³ of fine particulate inhalation using diminishing-returns compounding.
          </p>
        </div>

        {/* Community Emission Savings */}
        <div className="p-4 rounded-xl bg-white/10 border border-white/15 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
              <Leaf className="w-4 h-4" aria-hidden="true" />
              <span>Community Emission Savings</span>
            </span>
            <span className="text-xs text-slate-300 tabular-nums">
              {impact.monthlyCo2SavedKg} kg CO2e / month
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-white/10">
              <div className="text-[11px] text-slate-300">Daily CO2e Saved</div>
              <div className="text-2xl font-extrabold text-emerald-300 tabular-nums">
                {impact.dailyCo2SavedKg}
                <span className="text-xs font-semibold text-slate-300 ml-1">kg/day</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/50 border border-white/10">
              <div className="text-[11px] text-slate-300 flex items-center gap-1">
                <Wind className="w-3 h-3 text-teal-300" aria-hidden="true" />
                <span>NOx Smog Precursor Cut</span>
              </div>
              <div className="text-2xl font-extrabold text-teal-300 tabular-nums">
                {impact.dailyNoxSavedGrams}
                <span className="text-xs font-semibold text-slate-300 ml-1">g/day</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-300">
            If 1,000 neighborhood households adopt these swaps, that prevents ~
            {Math.round(impact.dailyCo2SavedKg * 1000).toLocaleString()} kg CO2e/day locally.
          </p>
        </div>
      </div>
    </section>
  );
}
