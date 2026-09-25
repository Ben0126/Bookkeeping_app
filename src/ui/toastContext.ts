import { createContext, useContext } from 'react';

export interface ToastOptions {
  message: string;
  /** E.g. "Undo"; the toast closes once it runs. */
  action?: { label: string; run: () => Promise<void> | void };
}

export const ToastContext = createContext<(toast: ToastOptions) => void>(() => {});

/** Shows a short message at the bottom of the screen, replacing any earlier one. */
export function useToast() {
  return useContext(ToastContext);
}
