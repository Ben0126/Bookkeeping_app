import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from './icons';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A bottom sheet on phones and a centered dialog on larger screens. Content
 * should end with a ModalFooter (or its own bottom padding).
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 px-5 pt-4 pb-3">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="-mr-2 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon />
          </button>
        </div>
        {/* Content scrolls; a form can pin its actions with `sticky bottom-0` (see ModalFooter). */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Actions pinned to the bottom of a Modal so they stay reachable in long forms. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 space-y-2 border-t border-slate-200 bg-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
