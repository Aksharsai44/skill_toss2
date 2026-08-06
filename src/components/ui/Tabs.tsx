import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Tabs({
  tabs,
  defaultIndex = 0,
}: {
  tabs: { label: string; icon?: ReactNode; content: ReactNode }[];
  defaultIndex?: number;
}) {
  const [active, setActive] = useState(defaultIndex);

  return (
    <div>
      <div className="flex gap-1 border-b border-ink-200 overflow-x-auto no-scrollbar">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
              active === i
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-ink-500 hover:text-ink-800 hover:border-ink-200',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-5">{tabs[active]?.content}</div>
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input appearance-none pr-9 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
    </div>
  );
}
