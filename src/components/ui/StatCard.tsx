import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'primary',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
}) {
  const colorMap = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-600', ring: 'ring-primary-100' },
    accent: { bg: 'bg-accent-50', text: 'text-accent-600', ring: 'ring-accent-100' },
    success: { bg: 'bg-success-50', text: 'text-success-600', ring: 'ring-success-100' },
    warning: { bg: 'bg-warning-50', text: 'text-warning-600', ring: 'ring-warning-100' },
    error: { bg: 'bg-error-50', text: 'text-error-600', ring: 'ring-error-100' },
  };
  const c = colorMap[color];

  return (
    <div className="card card-hover p-5 lg:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-ink-500 font-semibold">{label}</p>
          <p data-kpi-value className="text-2xl font-bold font-display text-ink-950 mt-1.5 leading-none tabular-nums">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2.5 ring-1 ring-inset', c.bg, c.ring)}>
          <Icon className={cn('w-5 h-5', c.text)} />
        </div>
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trend !== undefined && (
            <span className={cn('font-semibold', trend >= 0 ? 'text-success-600' : 'text-error-600')}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="text-ink-400">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
