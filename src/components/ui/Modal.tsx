import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-2xl shadow-pop animate-scale-in max-h-[90vh] flex flex-col', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h3 className="text-lg font-semibold font-display text-ink-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}
