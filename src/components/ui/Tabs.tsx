import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { moveTabIndicator, switchContent } from '@/lib/motion';

export function Tabs({
  tabs,
  defaultIndex = 0,
  onChange,
  label,
}: {
  tabs: { label: string; icon?: ReactNode; content: ReactNode }[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  /** Names the tab list for assistive technology when the surrounding heading is not adjacent. */
  label?: string;
}) {
  const [active, setActive] = useState(defaultIndex);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Unique per instance so two Tabs on one page cannot claim the same tab/panel ids.
  const baseId = useId();

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

  const select = (index: number) => {
    setActive(index);
    onChange?.(index);
    tabRefs.current[index]?.focus();
  };

  // role="tab" commits to arrow-key navigation with a single tab stop for the whole list.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    if (event.key === 'ArrowRight') { event.preventDefault(); select(active === last ? 0 : active + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); select(active === 0 ? last : active - 1); }
    else if (event.key === 'Home') { event.preventDefault(); select(0); }
    else if (event.key === 'End') { event.preventDefault(); select(last); }
  };

  return (
    <div>
      <div ref={listRef} onKeyDown={handleKeyDown} className="relative flex gap-1 border-b border-ink-200 overflow-x-auto no-scrollbar" role="tablist" aria-label={label}>
        <span ref={indicatorRef} aria-hidden="true" className="absolute bottom-0 h-0.5 bg-primary-600 will-change-transform" />
        {tabs.map((tab, i) => (
          <button
            ref={(element) => { tabRefs.current[i] = element; }}
            key={i}
            id={`${baseId}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-controls={`${baseId}-tabpanel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => { setActive(i); onChange?.(i); }}
            className={cn(
              'relative flex items-center gap-2 px-4 min-h-11 text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40 transition-colors',
              active === i
                ? 'text-primary-700 font-semibold'
                : 'text-ink-500 font-medium hover:text-ink-900',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div ref={panelRef} key={active} id={`${baseId}-tabpanel-${active}`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`} tabIndex={0} className="pt-5 focus-visible:outline-none">{tabs[active]?.content}</div>
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  className,
  label,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  /** What this control selects, e.g. "Report type". Rendered as the accessible name. */
  label?: string;
  /** Pass when a visible <label htmlFor> already names the control. */
  id?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        id={id}
        aria-label={label}
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
