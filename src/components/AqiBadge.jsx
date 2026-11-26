import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { classifyAqi } from '../utils/impactCalculator.js';

const ICON_MAP = {
  'shield-check': ShieldCheck,
  info: Info,
  'alert-triangle': AlertTriangle,
  'alert-octagon': AlertOctagon,
  flame: Flame,
};

/**
 * Color-blind-safe AQI severity badge combining high-contrast colors,
 * background stripe patterns, icon indicators, and explicit text labels.
 */
export function AqiBadge({ aqi, size = 'md' }) {
  const tier = classifyAqi(aqi);
  const Icon = ICON_MAP[tier.iconName] || AlertTriangle;

  const sizeClasses =
    size === 'lg'
      ? 'px-3.5 py-1.5 text-sm gap-2'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wide rounded-full border-2 ${tier.badgeBg} ${tier.patternClass} ${sizeClasses}`}
      role="status"
      aria-label={`Air quality status: ${tier.label}, AQI ${aqi}`}
    >
      <Icon className={size === 'lg' ? 'w-4 h-4 shrink-0' : 'w-3.5 h-3.5 shrink-0'} aria-hidden="true" />
      <span>{tier.shortLabel}</span>
      <span className="opacity-75 font-semibold">({tier.label})</span>
    </span>
  );
}
