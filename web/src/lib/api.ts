import { getWorkspace } from './workspace';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Fetch wrapper: JSON in/out, attaches the workspace key, throws ApiError with the server's message. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown; key?: string } = {}): Promise<T> {
  const key = opts.key ?? getWorkspace()?.key;
  const res = await fetch('/api' + path, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(key ? { 'x-workspace-key': key } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? res.statusText, res.status);
  return data as T;
}

/** Downloads an authenticated file (export) without exposing the key in a URL. */
export async function download(path: string): Promise<void> {
  const key = getWorkspace()?.key;
  const res = await fetch('/api' + path, { headers: key ? { 'x-workspace-key': key } : {} });
  if (!res.ok) throw new ApiError('Download failed', res.status);
  const name = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] ?? 'pulse-export';
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
