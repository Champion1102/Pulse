import {
  ArrowRight,
  BookOpen,
  ChartBar,
  Check,
  Copy,
  GearSix,
  Lightning,
  LinkSimple,
  MagnifyingGlass,
  ShieldCheck,
  Sparkle,
  UploadSimple,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { openPalette } from '../../components/CommandPalette';
import { useToast } from '../../components/Toast';
import { Avatar, Button, cx, Dialog, Field, Input, Kbd, Logo, LogoMark, Skeleton, SoundToggle, ThemeToggle } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { useCopy } from '../../lib/hooks';
import { ease, spring } from '../../lib/motion';
import { forgetWorkspace, getWorkspace, saveWorkspace, StoredWorkspace, takeKeyFromHash, workspaceLink } from '../../lib/workspace';

export interface AppContext {
  workspace: StoredWorkspace;
  setWorkspace: (w: StoredWorkspace | null) => void;
}

const NAV = [
  { to: '/app', label: 'Quizzes', short: 'Quizzes', icon: Lightning, end: true, key: 'q' },
  { to: '/app/library', label: 'Question bank', short: 'Bank', icon: BookOpen, key: 'b' },
  { to: '/app/drafts', label: 'AI drafts', short: 'Drafts', icon: Sparkle, key: 'd' },
  { to: '/app/import', label: 'Import', short: 'Import', icon: UploadSimple, key: 'i' },
  { to: '/app/reports', label: 'Reports', short: 'Reports', icon: ChartBar, key: 'r' },
  { to: '/app/settings', label: 'Settings', short: 'Settings', icon: GearSix, key: 's' },
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
      <div className="flex min-h-[100dvh]">
        <div className="hidden w-[248px] shrink-0 border-r border-line p-4 lg:block">
          <Skeleton className="h-8 w-28 !rounded-xl" />
          <Skeleton className="mt-6 h-14 !rounded-2xl" />
          <div className="mt-6 grid gap-2">{NAV.map((n) => <Skeleton key={n.to} className="h-9 !rounded-xl" />)}</div>
        </div>
        <div className="mx-auto grid w-full max-w-5xl content-start gap-4 px-4 py-10 sm:px-8">
          <Skeleton className="h-10 w-56 !rounded-xl" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
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
    <>
      <Workspace workspace={workspace} setWorkspace={setWorkspace} />
      <AnimatePresence>{justCreated && <SaveLinkDialog workspace={workspace} onClose={() => setJustCreated(false)} />}</AnimatePresence>
    </>
  );
}

function Workspace({ workspace, setWorkspace }: AppContext) {
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // "g" then a letter jumps between sections (Linear-style).
  useEffect(() => {
    let armed = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'g') {
        armed = Date.now();
        return;
      }
      if (Date.now() - armed < 900) {
        const hit = NAV.find((n) => n.key === e.key.toLowerCase());
        armed = 0;
        if (hit) navigate(hit.to);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const section = location.pathname.split('/').slice(0, 3).join('/');

  return (
    <div className="min-h-[100dvh] lg:pl-[248px]">
      {/* desktop sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line px-3 pb-3 pt-5 lg:flex">
        <Link to="/" className="mb-5 px-2.5">
          <Logo className="!text-[17px]" />
        </Link>

        <Link
          to="/app/settings"
          className="group mb-3 flex items-center gap-3 rounded-2xl border border-line bg-card p-2.5 shadow-[var(--shadow-soft)] transition hover:border-line-strong"
        >
          <Avatar name={workspace.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold leading-tight">{workspace.name}</p>
            <p className="flex items-center gap-1 text-[11.5px] text-ink-3">
              <ShieldCheck weight="fill" className="text-good" /> Private workspace
            </p>
          </div>
        </Link>

        <button
          onClick={openPalette}
          className="mb-4 flex h-9 items-center gap-2 rounded-xl border border-line bg-paper-2/60 px-3 text-[13px] text-ink-3 transition hover:border-line-strong hover:text-ink-2"
        >
          <MagnifyingGlass weight="bold" />
          <span className="flex-1 text-left">Search</span>
          <Kbd>⌘K</Kbd>
        </button>

        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Workspace</p>
        <nav className="grid gap-0.5" aria-label="Workspace">
          {NAV.map(({ to, label, icon: Icon, end, key }) => (
            <NavLink key={to} to={to} end={end} className="group relative">
              {({ isActive }) => (
                <span className={cx('relative flex h-9 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors', isActive ? 'text-ink' : 'text-ink-2 hover:text-ink')}>
                  {isActive && (
                    <motion.span
                      layoutId="side-active"
                      transition={spring.snappy}
                      className="absolute inset-0 rounded-xl border border-line bg-card shadow-[var(--shadow-soft)]"
                    />
                  )}
                  {!isActive && <span className="absolute inset-0 rounded-xl bg-paper-2 opacity-0 transition-opacity group-hover:opacity-100" />}
                  <Icon weight={isActive ? 'fill' : 'regular'} size={17} className={cx('relative', isActive && 'text-pulse')} />
                  <span className="relative flex-1">{label}</span>
                  <span className="relative hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 xl:flex">
                    <Kbd className="!h-4 !min-w-4 !text-[10px]">G</Kbd>
                    <Kbd className="!h-4 !min-w-4 !text-[10px]">{key.toUpperCase()}</Kbd>
                  </span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto grid gap-3">
          <Link
            to="/play"
            className="group relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-pulse-soft to-card p-3.5 transition hover:border-line-strong"
          >
            <p className="text-[13px] font-semibold">Student view</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink-2">See what students see when they join.</p>
            <ArrowRight weight="bold" className="absolute right-3.5 top-3.5 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-pulse" />
          </Link>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-0.5">
              <ThemeToggle />
              <SoundToggle />
            </div>
            <span className="text-[11px] text-ink-3">v2</span>
          </div>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line px-4 lg:hidden">
        <Link to="/" aria-label="Pulse home"><LogoMark /></Link>
        <span className="ml-1 min-w-0 flex-1 truncate text-sm font-semibold">{workspace.name}</span>
        <button onClick={openPalette} aria-label="Search" className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-paper-2">
          <MagnifyingGlass weight="bold" />
        </button>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-4 pb-32 pt-6 sm:px-8 sm:pt-10 lg:pb-16">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={section}
            initial={reduce ? false : { opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? undefined : { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.15 } }}
            transition={{ duration: 0.45, ease }}
          >
            <Outlet context={{ workspace, setWorkspace } satisfies AppContext} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* mobile tab bar */}
      <nav
        aria-label="Workspace"
        className="glass fixed inset-x-3 bottom-3 z-30 flex justify-between rounded-[22px] border border-line p-1.5 shadow-[var(--shadow-float)] lg:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.slice(0, 5).map(({ to, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="relative flex-1">
            {({ isActive }) => (
              <span className={cx('relative grid justify-items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-semibold transition-colors', isActive ? 'text-pulse' : 'text-ink-3')}>
                {isActive && <motion.span layoutId="tab-active" transition={spring.snappy} className="absolute inset-0 rounded-2xl bg-pulse-soft" />}
                <Icon weight={isActive ? 'fill' : 'regular'} size={20} className="relative" />
                <span className="relative">{short}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Onboarding({ onReady }: { onReady: (w: StoredWorkspace, created: boolean) => void }) {
  const toast = useToast();
  const reduce = useReducedMotion();
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

  const steps = [
    { t: 'Name your classroom', b: 'We create a private workspace with a sample course and quiz.' },
    { t: 'Keep your private link', b: 'It is your login. No passwords, no email.' },
    { t: 'Go live', b: 'Students join from their phones with a six-character code.' },
  ];
  const up = (d: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.7, ease, delay: d },
  });

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-pulse)_22%,transparent),transparent)] blur-2xl" />
      <header className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/"><Logo /></Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </header>
      <main className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-10 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.1fr_1fr] lg:py-0">
        <div className="grid gap-8">
          <motion.p {...up(0)} className="w-fit rounded-full border border-line bg-card/70 px-3 py-1 text-[12px] font-semibold text-ink-2 shadow-[var(--shadow-soft)]">
            <span className="text-pulse">●</span> No account needed
          </motion.p>
          <motion.h1 {...up(0.05)} className="text-[clamp(2.8rem,6.4vw,5rem)] font-semibold leading-[0.98] tracking-[-0.045em]">
            Your classroom.
            <br />
            <span className="text-gradient">Ready in seconds.</span>
          </motion.h1>
          <motion.p {...up(0.12)} className="max-w-[46ch] text-lg leading-relaxed text-ink-2">
            Pulse gives you a private workspace link instead of a login. Keep the link, and you can open your quizzes from any laptop.
          </motion.p>
          <motion.ol {...up(0.2)} className="grid gap-4">
            {steps.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-card font-mono text-[13px] font-semibold text-pulse shadow-[var(--shadow-soft)]">{i + 1}</span>
                <div>
                  <p className="font-semibold">{s.t}</p>
                  <p className="text-sm text-ink-2">{s.b}</p>
                </div>
              </li>
            ))}
          </motion.ol>
        </div>
        <motion.div {...up(0.15)} className="grid gap-5">
          <form onSubmit={create} className="grid gap-5 rounded-[28px] border border-line bg-card/90 p-6 shadow-[var(--shadow-float)] backdrop-blur sm:p-8">
            <div>
              <p className="text-xl font-semibold tracking-tight">Create a workspace</p>
              <p className="mt-1 text-sm text-ink-2">Includes a sample course and a ready-to-run quiz.</p>
            </div>
            <Field label="Classroom name" hint="For example, SESD Section B. You can change it later.">
              {(id) => <Input id={id} value={name} maxLength={60} autoFocus placeholder="SESD Section B" onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Button type="submit" size="lg" loading={busy} iconRight={<ArrowRight weight="bold" />}>Start teaching</Button>
          </form>
          <form onSubmit={open} className="grid gap-3 rounded-[22px] border border-dashed border-line-strong p-5">
            <Field label="Already have a private link?">
              {(id) => (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkSimple weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
                    <Input id={id} value={link} placeholder="Paste your /app#k=… link" onChange={(e) => setLink(e.target.value)} className="!pl-10" />
                  </div>
                  <Button type="submit" variant="ghost" size="lg" className="!h-12" disabled={!link.trim()}>Open</Button>
                </div>
              )}
            </Field>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

function SaveLinkDialog({ workspace, onClose }: { workspace: StoredWorkspace; onClose: () => void }) {
  const [copied, copy] = useCopy();
  const link = workspaceLink(workspace.key);
  return (
    <Dialog onClose={onClose} labelledBy="save-link-title">
      <div className="grid gap-5">
        <div className="grid size-12 place-items-center rounded-2xl bg-pulse-soft text-2xl text-pulse">
          <ShieldCheck weight="duotone" />
        </div>
        <div className="grid gap-2">
          <h2 id="save-link-title" className="text-2xl font-semibold tracking-[-0.03em]">Save your private link</h2>
          <p className="leading-relaxed text-ink-2">
            This link is your login. Bookmark it or keep it somewhere safe. Anyone with it can edit this workspace, and without it you can't get back in from another device.
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-line bg-paper-2 p-1.5 pl-4">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-2">{link}</code>
          <Button size="sm" variant={copied ? 'soft' : 'ink'} icon={copied ? <Check weight="bold" className="text-good" /> : <Copy weight="bold" />} onClick={() => copy(link)}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <Button size="lg" onClick={onClose}>I've saved it</Button>
      </div>
    </Dialog>
  );
}
