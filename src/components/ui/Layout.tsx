import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 lg:mb-7">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-[1.75rem] leading-tight font-bold font-display text-ink-950">{title}</h1>
        {subtitle && <p className="text-sm leading-6 text-ink-500 mt-1 max-w-3xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={cn('card', hover && 'card-hover', className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-ink-100">
      <div className="min-w-0">
        <h3 className="font-semibold font-display text-ink-900 leading-6">{title}</h3>
        {subtitle && <p className="text-xs leading-5 text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 sm:py-16 text-center">
      <div className="rounded-2xl bg-ink-50 border border-ink-100 p-3.5 mb-4">
        <Icon className="w-7 h-7 text-ink-400" />
      </div>
      <h3 className="font-semibold text-ink-700">{title}</h3>
      {description && <p className="text-sm leading-6 text-ink-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
