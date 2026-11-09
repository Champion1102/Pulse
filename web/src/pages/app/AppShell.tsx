import { BookOpen, ChartBar, Copy, Check, GearSix, Lightning, Sparkle, UploadSimple } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useToast } from '../../components/Toast';
import { Button, cx, Field, Input, Logo, Skeleton } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { useCopy } from '../../lib/hooks';
import { forgetWorkspace, getWorkspace, saveWorkspace, StoredWorkspace, takeKeyFromHash, workspaceLink } from '../../lib/workspace';

export interface AppContext {
  workspace: StoredWorkspace;
  setWorkspace: (w: StoredWorkspace | null) => void;
}

const NAV = [
  { to: '/app', label: 'Quizzes', icon: Lightning, end: true },
  { to: '/app/library', label: 'Question bank', icon: BookOpen },
  { to: '/app/drafts', label: 'AI drafts', icon: Sparkle },
  { to: '/app/import', label: 'Import', icon: UploadSimple },
  { to: '/app/reports', label: 'Reports', icon: ChartBar },
  { to: '/app/settings', label: 'Settings', icon: GearSix },
];

export default function AppShell() {
  const toast = useToast();
  const [workspace, setWorkspace] = useState<StoredWorkspace | null>(null);
  const [checking, setChecking] = useState(true);
  const [justCreated, setJustCreated] = useState(false);

  // Resolve identity: private link in the URL hash > this browser's saved workspace.
  useEffect(() => {
    (async () => {
      const key = takeKeyFromHash() ?? getWorkspace()?.key;
      if (!key) return setChecking(false);
      try {
        const w = await api<{ id: string; name: string }>('/workspace', { key });
        const stored = { ...w, key };
        saveWorkspace(stored);
        setWorkspace(stored);
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          forgetWorkspace(); // stale key (e.g. server data was reset): start fresh
          toast('That workspace link is not valid any more', 'error');
        }
        else toast((e as Error).message, 'error');
      } finally {
        setChecking(false);
      }
    })();
  }, [toast]);

  if (checking) {
    return (
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <Onboarding
        onReady={(w, created) => {
          saveWorkspace(w);
          setWorkspace(w);
          setJustCreated(created);
        }}
      />
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/"><Logo className="!text-lg" /></Link>
          <span className="truncate text-sm font-semibold text-ink-2">{workspace.name}</span>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-5" aria-label="Workspace">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                  isActive ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink',
                )
              }
            >
              <Icon weight="bold" /> {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet context={{ workspace, setWorkspace } satisfies AppContext} />
      </main>
      <AnimatePresence>{justCreated && <SaveLinkDialog workspace={workspace} onClose={() => setJustCreated(false)} />}</AnimatePresence>
    </div>
  );
}

function Onboarding({ onReady }: { onReady: (w: StoredWorkspace, created: boolean) => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const w = await api<StoredWorkspace>('/workspaces', { method: 'POST', body: { name } });
      onReady(w, true);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const open = async (e: FormEvent) => {
    e.preventDefault();
    const key = link.match(/k=([^&\s]+)/)?.[1] ?? link.trim();
    try {
      const w = await api<{ id: string; name: string }>('/workspace', { key: decodeURIComponent(key) });
      onReady({ ...w, key: decodeURIComponent(key) }, false);
    } catch {
      toast('That link does not match any workspace', 'error');
    }
  };

  return (
    <div className="min-h-[100dvh]">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <Link to="/"><Logo /></Link>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-10 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.1fr_1fr] lg:py-0">
        <div className="grid gap-6">
          <h1 className="text-5xl font-bold leading-[0.95] tracking-tighter sm:text-7xl">
            Your classroom. <span className="text-pulse">No account.</span>
          </h1>
          <p className="max-w-[46ch] text-lg leading-relaxed text-ink-2">
            Pulse gives you a private workspace link instead of a login. Keep the link, and you can open your quizzes from any laptop.
          </p>
        </div>
        <div className="grid gap-6">
          <form onSubmit={create} className="grid gap-5 rounded-3xl border border-line bg-card p-6 sm:p-8">
            <Field label="Classroom name" hint="For example, SESD Section B. You can change it later.">
              {(id) => <Input id={id} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Button type="submit" size="lg" loading={busy}>Start teaching</Button>
            <p className="text-sm text-ink-2">Includes a sample course and a ready-to-run quiz.</p>
          </form>
          <form onSubmit={open} className="grid gap-3 px-1">
            <Field label="Already have a private link?">
              {(id) => (
                <div className="flex gap-2">
                  <Input id={id} value={link} onChange={(e) => setLink(e.target.value)} />
                  <Button type="submit" variant="ghost" disabled={!link.trim()}>Open</Button>
                </div>
              )}
            </Field>
          </form>
        </div>
      </main>
    </div>
  );
}

function SaveLinkDialog({ workspace, onClose }: { workspace: StoredWorkspace; onClose: () => void }) {
  const [copied, copy] = useCopy();
  const link = workspaceLink(workspace.key);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-link-title"
        initial={{ y: 30, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="grid w-full max-w-lg gap-5 rounded-3xl bg-card p-6 shadow-2xl sm:p-8"
      >
        <h2 id="save-link-title" className="text-3xl font-bold tracking-tighter">Save your private link</h2>
        <p className="text-ink-2">
          This link is your login. Bookmark it or keep it somewhere safe. Anyone with it can edit this workspace, and without it you can't get back in from another device.
        </p>
        <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-paper-2 p-2 pl-4">
          <code className="min-w-0 flex-1 truncate font-mono text-sm">{link}</code>
          <Button size="sm" variant="ink" icon={copied ? <Check weight="bold" /> : <Copy weight="bold" />} onClick={() => copy(link)}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <Button size="lg" onClick={onClose}>I've saved it</Button>
      </motion.div>
    </motion.div>
  );
}
