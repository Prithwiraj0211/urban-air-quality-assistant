import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Cpu,
  HelpCircle,
  Home,
  Info,
  Leaf,
  Sparkles,
  Tag,
} from 'lucide-react';
import { evaluateContextualDecisions } from '../utils/impactCalculator.js';

const PILLARS = [
  {
    key: 'routine',
    label: 'Low-Emission Daily Routine',
    shortLabel: 'Daily Routine',
    icon: Clock,
    accent: 'text-sky-800 bg-sky-50 border-sky-200',
  },
  {
    key: 'iaqHacks',
    label: 'DIY & Low-Cost IAQ Hacks',
    shortLabel: 'Indoor Air Hacks',
    icon: Home,
    accent: 'text-teal-800 bg-teal-50 border-teal-200',
  },
  {
    key: 'sustainableSwaps',
    label: 'Sustainable Alternatives',
    shortLabel: 'Clean Swaps',
    icon: Leaf,
    accent: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
];

function priorityBadgeClass(priority) {
  switch ((priority || '').toLowerCase()) {
    case 'critical':
      return 'bg-rose-100 text-rose-950 border-rose-300';
    case 'high':
      return 'bg-amber-100 text-amber-950 border-amber-300';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
}

function verdictToneClass(tone) {
  switch (tone) {
    case 'emerald':
      return 'bg-emerald-100 text-emerald-950 border-emerald-300';
    case 'amber':
      return 'bg-amber-100 text-amber-950 border-amber-300';
    default:
      return 'bg-rose-100 text-rose-950 border-rose-300';
  }
}

/**
 * Displays the structured 3-pillar action plan, transparent context decision logic,
 * interactive quick family verdicts, adoption checkboxes, and Direct Impact Explainers.
 */
export function ActionPlanSection({ plan, aqiData, profile, adoptedIds, onToggleAdopt }) {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedVerdictId, setSelectedVerdictId] = useState('windows');

  const contextDecisions = useMemo(
    () => evaluateContextualDecisions({ aqiData, profile }),
    [aqiData, profile]
  );

  if (!plan) return null;

  const visiblePillars =
    activeTab === 'all' ? PILLARS : PILLARS.filter((p) => p.key === activeTab);

  const activeVerdict =
    contextDecisions.quickVerdicts.find((v) => v.id === selectedVerdictId) ||
    contextDecisions.quickVerdicts[0];

  return (
    <section aria-labelledby="action-plan-heading" className="space-y-4">
      {/* Executive Summary, Contextual Quick Verdicts & Decision Logic Trace */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="action-plan-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-700" aria-hidden="true" />
            <span>2. Personalized Winter Smog Action Plan</span>
          </h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              plan.mode === 'gemini-live'
                ? 'bg-teal-50 text-teal-900 border-teal-300'
                : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            Engine: {plan.modelLabel}
          </span>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed">{plan.executiveSummary}</p>

        {/* Instant Context Q&A Bar */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <HelpCircle className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Instant Family Decision Check (Click a question):</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {contextDecisions.quickVerdicts.map((item) => {
              const selected = activeVerdict?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedVerdictId(item.id)}
                  aria-pressed={selected}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-white border-teal-600 ring-2 ring-teal-100 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-slate-700 leading-tight">
                    {item.question}
                  </div>
                  <span
                    className={`inline-block mt-1 px-1.5 py-0.5 rounded border text-[10px] font-extrabold ${verdictToneClass(
                      item.tone
                    )}`}
                  >
                    {item.status}
                  </span>
                </button>
              );
            })}
          </div>

          {activeVerdict ? (
            <p className="text-xs text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
              <strong className="text-teal-900">{activeVerdict.question}</strong>{' '}
              {activeVerdict.answer}
            </p>
          ) : null}
        </div>

        {/* Transparent Context Logic Applied */}
        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-950">
            <Cpu className="w-4 h-4 text-teal-700" aria-hidden="true" />
            <span>Context Logic Applied:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {contextDecisions.decisionTrace.map((trace) => (
              <div
                key={trace.label}
                className="bg-white/90 rounded-lg border border-teal-200/80 px-2.5 py-2"
              >
                <div className="text-[11px] font-bold text-teal-950">{trace.label}</div>
                <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  {trace.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-950 flex items-start gap-2">
          <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Thermal Inversion Timing:</strong> {plan.inversionWindowAdvice}
          </span>
        </div>

        {/* Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter action plan pillars"
          className="flex flex-wrap gap-2 pt-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Pillars ({(plan.routine?.length || 0) + (plan.iaqHacks?.length || 0) + (plan.sustainableSwaps?.length || 0)})
          </button>
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const count = (plan[pillar.key] || []).length;
            return (
              <button
                key={pillar.key}
                type="button"
                role="tab"
                aria-selected={activeTab === pillar.key}
                onClick={() => setActiveTab(pillar.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === pillar.key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {pillar.shortLabel} ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pillars & Recommendation Cards */}
      <div className="space-y-6">
        {visiblePillars.map((pillar) => {
          const Icon = pillar.icon;
          const items = plan[pillar.key] || [];
          return (
            <div key={pillar.key} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className={`p-1.5 rounded-lg border ${pillar.accent}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <h3 className="text-base font-bold text-slate-900">{pillar.label}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {items.map((item) => {
                  const adopted = adoptedIds.has(item.id);
                  return (
                    <article
                      key={item.id}
                      className={`rounded-2xl border-2 p-4 transition-all flex flex-col justify-between gap-3 bg-white ${
                        adopted
                          ? 'border-teal-600 ring-2 ring-teal-100 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Card Top Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold">
                              {item.timeWindow}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${priorityBadgeClass(
                                item.priority
                              )}`}
                            >
                              {item.priority}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-medium inline-flex items-center gap-1">
                              <Tag className="w-3 h-3" aria-hidden="true" />
                              {item.costTier}
                            </span>
                          </div>

                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={adopted}
                            aria-label={`${adopted ? 'Uncheck' : 'Adopt'} recommendation: ${item.title}`}
                            onClick={() => onToggleAdopt(item.id)}
                            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              adopted
                                ? 'bg-teal-700 text-white border-teal-700'
                                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-teal-50 hover:border-teal-500'
                            }`}
                          >
                            {adopted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Adopted</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Simulate</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Direct Impact Explainer Box */}
                      <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-900">
                            Direct Impact: {item.directImpactLabel}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold tabular-nums">
                            {item.pm25ReductionPct > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-white text-emerald-900 border border-emerald-300">
                                -{item.pm25ReductionPct}% PM2.5
                              </span>
                            )}
                            {item.co2SavedKg > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-white text-teal-900 border border-teal-300">
                                -{item.co2SavedKg} kg CO2e
                              </span>
                            )}
                            {item.noxSavedGrams > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-white text-sky-900 border border-sky-300">
                                -{item.noxSavedGrams}g NOx
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-emerald-950/90 leading-snug">
                          {item.impactExplanation}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
