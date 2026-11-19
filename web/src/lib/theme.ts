import { useCallback, useEffect, useSyncExternalStore } from 'react';

// Theme preference: 'system' follows the OS; resolved to data-theme on <html>.
export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'pulse:theme';
const listeners = new Set<() => void>();

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function resolve(pref: ThemePref): 'light' | 'dark' {
  return pref === 'system' ? (media().matches ? 'dark' : 'light') : pref;
}

function apply(pref: ThemePref) {
  const t = resolve(pref);
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#09090b' : '#f7f7f5');
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* private mode */
  }
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduce) doc.startViewTransition(() => apply(pref));
  else apply(pref);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const m = media();
  const onChange = () => {
    if (readPref() === 'system') apply('system');
    cb();
  };
  m.addEventListener('change', onChange);
  return () => {
    listeners.delete(cb);
    m.removeEventListener('change', onChange);
  };
}

export function useTheme() {
  const pref = useSyncExternalStore(subscribe, readPref, () => 'system' as ThemePref);
  const resolved = useSyncExternalStore(subscribe, () => resolve(readPref()), () => 'light' as const);
  useEffect(() => apply(pref), [pref]);
  const cycle = useCallback(() => {
    const order: ThemePref[] = ['system', 'light', 'dark'];
    setThemePref(order[(order.indexOf(readPref()) + 1) % order.length]);
  }, []);
  return { pref, resolved, setPref: setThemePref, cycle };
}
