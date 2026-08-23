import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'primary',
  to,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
  to?: string;
}) {
  const colorMap = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-600', ring: 'ring-primary-100' },
    accent: { bg: 'bg-accent-50', text: 'text-accent-600', ring: 'ring-accent-100' },
    success: { bg: 'bg-success-50', text: 'text-success-600', ring: 'ring-success-100' },
    warning: { bg: 'bg-warning-50', text: 'text-warning-600', ring: 'ring-warning-100' },
    error: { bg: 'bg-error-50', text: 'text-error-600', ring: 'ring-error-100' },
  };
  const c = colorMap[color];

  const content = (
    <div className={cn("card p-5 lg:p-6 h-full", to && "card-hover cursor-pointer")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p data-kpi-value className="text-2xl font-bold font-display text-ink-950 mt-2 leading-none tabular-nums">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2.5 ring-1 ring-inset shrink-0', c.bg, c.ring)}>
          <Icon className={cn('w-5 h-5', c.text)} />
        </div>
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className="mt-3.5 flex items-center gap-1.5 text-xs">
          {trend !== undefined && (
            <span className={cn('font-semibold tabular-nums', trend >= 0 ? 'text-success-600' : 'text-error-600')}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="text-ink-500">{trendLabel}</span>}
        </div>
      )}
    </div>
  );

  // No `focus-ring` here: it pins a white ring-offset, which disappears on the bg-ink-50
  // dashboard pages. The global :focus-visible outline is background-independent.
  return to ? <Link to={to} className="block h-full rounded-card">{content}</Link> : content;
}
