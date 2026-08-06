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
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('py-3 px-4 font-semibold text-ink-500 text-xs uppercase tracking-wider whitespace-nowrap', col.className)}
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
                className={cn('border-b border-ink-50 table-row-hover', onRowClick && 'cursor-pointer')}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('py-3 px-4 text-ink-700 whitespace-nowrap', col.className)}>
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
