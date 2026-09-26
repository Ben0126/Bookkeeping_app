import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, readTheme, setTheme, watchSystemTheme } from './theme';

function stubSystemDark(dark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: dark,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    change(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

const isDark = () => document.documentElement.classList.contains('dark');

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove('dark');
});

describe('theme', () => {
  it('follows the system until a choice is made, and remembers it', () => {
    const system = stubSystemDark(true);
    expect(readTheme()).toBe('system');
    applyTheme();
    expect(isDark()).toBe(true);

    const stop = watchSystemTheme();
    system.change(false);
    expect(isDark()).toBe(false);

    setTheme('dark');
    expect(readTheme()).toBe('dark');
    system.change(false);
    expect(isDark()).toBe(true);
    stop();

    setTheme('light');
    expect(isDark()).toBe(false);
    localStorage.setItem('studybudget.theme', 'purple');
    expect(readTheme()).toBe('system');
  });
});
