// Login-less instructor identity: a secret workspace key kept in this browser.
const STORAGE = 'pulse:workspace';

export interface StoredWorkspace { id: string; name: string; key: string }

export function getWorkspace(): StoredWorkspace | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as StoredWorkspace) : null;
  } catch {
    return null;
  }
}

export function saveWorkspace(ws: StoredWorkspace): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(ws));
  } catch {
    /* private mode: the session still works until the tab closes */
  }
}

export function forgetWorkspace(): void {
  try {
    localStorage.removeItem(STORAGE);
  } catch {
    /* ignore */
  }
}

/** The private link. The key lives in the URL hash so it never reaches server logs. */
export function workspaceLink(key: string): string {
  return `${location.origin}/app#k=${encodeURIComponent(key)}`;
}

/** Reads a key from `#k=...` (opening a private link) and removes it from the address bar. */
export function takeKeyFromHash(): string | null {
  const m = location.hash.match(/k=([^&]+)/);
  if (!m) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return decodeURIComponent(m[1]);
}

// Host keys: which live rooms this browser controls.
export const hostKeyStore = {
  get(code: string): string | null {
    try { return localStorage.getItem(`pulse:host:${code.toUpperCase()}`); } catch { return null; }
  },
  set(code: string, key: string): void {
    try { localStorage.setItem(`pulse:host:${code.toUpperCase()}`, key); } catch { /* ignore */ }
  },
  clear(code: string): void {
    try { localStorage.removeItem(`pulse:host:${code.toUpperCase()}`); } catch { /* ignore */ }
  },
};
