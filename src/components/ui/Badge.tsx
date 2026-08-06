import { clsx, type ClassValue } from 'clsx';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'accent';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  error: 'bg-error-100 text-error-700',
  neutral: 'bg-ink-100 text-ink-600',
  accent: 'bg-accent-100 text-accent-700',
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
    <span className={clsx('badge', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, Variant> = {
    active: 'success', paid: 'success', delivered: 'success', ready: 'success', approved: 'success',
    pending: 'warning', queued: 'warning', processing: 'warning', 'on-leave': 'warning', trial: 'warning',
    overdue: 'error', failed: 'error', rejected: 'error', churned: 'error', inactive: 'error',
    closed: 'neutral', new: 'primary', contacted: 'primary', 'demo-scheduled': 'primary', open: 'primary',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant={map[status] || 'neutral'}>{label}</Badge>;
}
