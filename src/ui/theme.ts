import { readPreference, writePreference } from './preferences';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Per device, like the language; index.html reads the same key before the first paint. */
const THEME = 'theme';

export function readTheme(): Theme {
  const saved = readPreference(THEME);
  return THEMES.find((theme) => theme === saved) ?? 'system';
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(theme: Theme = readTheme()): void {
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

export function setTheme(theme: Theme): void {
  writePreference(THEME, theme);
  applyTheme(theme);
}

/** Keeps following the system while the choice is "system". Returns a function that stops. */
export function watchSystemTheme(): () => void {
  if (typeof matchMedia !== 'function') return () => {};
  const query = matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => applyTheme();
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
