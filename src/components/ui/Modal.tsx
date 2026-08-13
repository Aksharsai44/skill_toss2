import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { closeDialog, openDialog } from '@/lib/motion';

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
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    if (!backdrop || !dialog) { onCloseRef.current(); return; }
    closingRef.current = true;
    closeDialog(backdrop, dialog, () => { closingRef.current = false; onCloseRef.current(); });
  }, []);

  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    const animations = backdrop && dialog ? openDialog(backdrop, dialog) : [];
    dialog?.focus({ preventScroll: true });
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); animations.forEach((animation) => animation.pause()); };
  }, [open, requestClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div ref={backdropRef} className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={requestClose} />
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title" className={cn('relative w-full bg-white rounded-dialog shadow-pop max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col origin-center outline-none', sizes[size])}>
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-ink-100">
          <h3 id="modal-title" className="text-lg font-semibold font-display text-ink-900">{title}</h3>
          <button aria-label="Close dialog" onClick={requestClose} className="btn-ghost p-2 -mr-2 rounded-lg text-ink-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}
