import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { moveTabIndicator, switchContent } from '@/lib/motion';

export function Tabs({
  tabs,
  defaultIndex = 0,
  onChange,
}: {
  tabs: { label: string; icon?: ReactNode; content: ReactNode }[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
}) {
  const [active, setActive] = useState(defaultIndex);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const list = listRef.current;
      const tab = tabRefs.current[active];
      if (!list || !tab) return;
      if (indicatorRef.current) moveTabIndicator(indicatorRef.current, tab.offsetLeft, tab.offsetWidth);
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [active, tabs.length]);

  useLayoutEffect(() => {
    if (!panelRef.current) return;
    const animation = switchContent(panelRef.current);
    return () => { animation.pause(); };
  }, [active]);

  return (
    <div>
      <div ref={listRef} className="relative flex gap-1 border-b border-ink-200 overflow-x-auto no-scrollbar" role="tablist">
        <span ref={indicatorRef} aria-hidden="true" className="absolute bottom-0 h-0.5 bg-primary-600 will-change-transform" />
        {tabs.map((tab, i) => (
          <button
            ref={(element) => { tabRefs.current[i] = element; }}
            key={i}
            id={`tab-${i}`}
            role="tab"
            aria-selected={active === i}
            aria-controls={`tabpanel-${i}`}
            onClick={() => { setActive(i); onChange?.(i); }}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/30',
              active === i
                ? 'text-primary-700'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div ref={panelRef} key={active} id={`tabpanel-${active}`} role="tabpanel" aria-labelledby={`tab-${active}`} className="pt-5">{tabs[active]?.content}</div>
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
        aria-label="Select option"
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
