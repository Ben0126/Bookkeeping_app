/**
 * Small per-device conveniences (e.g. the last account used). Storage can be
 * unavailable in private mode, so failures are ignored.
 */
export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(`studybudget.${key}`);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    localStorage.setItem(`studybudget.${key}`, value);
  } catch {
    // Not worth surfacing: the preference is only a default.
  }
}
