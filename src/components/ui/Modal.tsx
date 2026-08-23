import { type ReactNode, useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { closeDialog, openDialog } from '@/lib/motion';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

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
  // Remembers whatever opened the dialog so focus can be handed straight back on close.
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

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
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    const animations = backdrop && dialog ? openDialog(backdrop, dialog) : [];
    dialog?.focus({ preventScroll: true });

    // The dialog claims aria-modal, so Tab must not be able to reach the page behind it.
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { requestClose(); return; }
      if (e.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) { e.preventDefault(); dialog.focus({ preventScroll: true }); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === dialog)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && current === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handler);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handler);
      animations.forEach((animation) => animation.pause());
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open, requestClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div ref={backdropRef} className="absolute inset-0 bg-ink-950/50" onClick={requestClose} />
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn('relative w-full bg-white rounded-dialog shadow-pop max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col origin-center outline-none', sizes[size])}>
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-ink-100">
          <h3 id={titleId} className="text-lg font-semibold text-ink-900">{title}</h3>
          <button aria-label="Close dialog" onClick={requestClose} className="btn-icon -mr-2 text-ink-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

/**
 * Shared confirmation dialog. Replaces `window.confirm`, which is unstyled, cannot be
 * keyboard-themed, and is blocked outright in some embedded browsers — meaning a destructive
 * action could silently do nothing. Built on Modal so it inherits the focus trap and Escape
 * handling rather than re-implementing them per page.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  tone = 'danger',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-6 text-ink-600">{description}</p>
      <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={() => { onConfirm(); onClose(); }} className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
