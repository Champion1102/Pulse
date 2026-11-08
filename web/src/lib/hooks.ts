import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Meta, TopicNode } from './types';

/** Loads data on mount (and on reload()); exposes loading + error states. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}

let metaCache: Promise<Meta> | null = null;
export function useMeta(): Meta | null {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    metaCache ??= api<Meta>('/meta');
    metaCache.then(setMeta).catch(() => (metaCache = null));
  }, []);
  return meta;
}

export interface FlatTopic { id: string; name: string; path: string }

/** All leaf topics with their "Course / Unit / Topic" path, for pickers. */
export function flattenTopics(tree: TopicNode[]): FlatTopic[] {
  const out: FlatTopic[] = [];
  const walk = (n: TopicNode, trail: string[]) => {
    const path = [...trail, n.name];
    if (n.level === 'topic') out.push({ id: n.id, name: n.name, path: path.join(' / ') });
    n.children.forEach((c) => walk(c, path));
  };
  tree.forEach((n) => walk(n, []));
  return out;
}

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, []);
  return [copied, copy];
}
