import { useCallback, useRef } from 'react';

/**
 * Tracks whether a form inside a dialog has unsaved input, so closing it by
 * a stray tap on the backdrop asks first instead of losing what was typed.
 */
export function useDiscardGuard(message: string) {
  const dirty = useRef(false);
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);
  const confirmDiscard = useCallback(() => !dirty.current || window.confirm(message), [message]);
  return { setDirty, confirmDiscard };
}
