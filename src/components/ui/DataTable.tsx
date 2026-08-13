import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Col<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No records found',
}: {
  columns: Col<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto scrollbar-thin" role="region" aria-label="Data table" tabIndex={0}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50/70 text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn('py-2.5 px-4 font-semibold text-ink-600 text-[11px] uppercase tracking-[0.08em] whitespace-nowrap', col.className)}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-ink-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => {
                  if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn('border-b border-ink-100 last:border-0 table-row-hover focus-visible:outline-none focus-visible:bg-primary-50/60', onRowClick && 'cursor-pointer')}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('py-3 px-4 text-ink-700 whitespace-nowrap align-middle', col.className)}>
                    {col.render ? col.render(row) : (row as Record<string, ReactNode>)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
