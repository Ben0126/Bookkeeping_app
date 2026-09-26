import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ToastContext, type ToastOptions } from './toastContext';

/** Long enough to reach "Undo" after reading the message. */
const TOAST_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const show = useCallback((next: ToastOptions) => setToast({ ...next, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-6"
      >
        {toast && (
          // Inverted colours stand out in both light and dark mode.
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-900 py-2.5 pr-2 pl-4 text-sm text-slate-50 shadow-lg"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="shrink-0 rounded-lg px-3 py-1.5 font-semibold text-indigo-300 hover:bg-white/10"
                onClick={() => {
                  const { run } = toast.action!;
                  setToast(null);
                  void run();
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}
