import type { ClassValue } from 'clsx';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'accent';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200/70',
  success: 'bg-success-50 text-success-700 ring-1 ring-inset ring-success-200/70',
  warning: 'bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-200/70',
  error: 'bg-error-50 text-error-700 ring-1 ring-inset ring-error-200/70',
  neutral: 'bg-ink-100 text-ink-700 ring-1 ring-inset ring-ink-200/80',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200/70',
};

const sizes: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-xs',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: ClassValue;
}) {
  return (
    <span className={cn('badge', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    active: 'success', paid: 'success', delivered: 'success', ready: 'success', approved: 'success', safe: 'success', completed: 'success', graded: 'success',
    pending: 'warning', queued: 'warning', processing: 'warning', 'on-leave': 'warning', trial: 'warning', late: 'warning', 'in-progress': 'warning',
    overdue: 'error', failed: 'error', rejected: 'error', churned: 'error', inactive: 'error', 'at-risk': 'error', absent: 'error', cancelled: 'error',
    closed: 'neutral', new: 'primary', contacted: 'primary', 'demo-scheduled': 'primary', open: 'primary', scheduled: 'primary', submitted: 'primary', 'not-started': 'neutral', excused: 'neutral',
    live: 'error', present: 'success', assignment: 'primary', exam: 'accent', fees: 'warning', class: 'primary', academic: 'primary', announcement: 'neutral', resource: 'success', attendance: 'warning',
  };
  const label = status.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  return <Badge variant={map[status] || 'neutral'}>{label}</Badge>;
}
