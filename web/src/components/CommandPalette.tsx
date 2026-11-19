import {
  ArrowRight,
  BookOpen,
  ChartBar,
  Desktop,
  DeviceMobile,
  GearSix,
  House,
  Lightning,
  LinkSimple,
  MagnifyingGlass,
  Moon,
  Sparkle,
  SpeakerHigh,
  Sun,
  UploadSimple,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { spring } from '../lib/motion';
import { setSound, soundOn } from '../lib/sfx';
import { setThemePref } from '../lib/theme';
import { getWorkspace, workspaceLink } from '../lib/workspace';
import { useToast } from './Toast';
import { cx, Kbd } from './ui';

interface Command { id: string; group: string; label: string; hint?: string; icon: ReactNode; keywords?: string; run: () => void }

/** Open the palette from anywhere: window.dispatchEvent(new Event('pulse:palette')). */
export const openPalette = () => window.dispatchEvent(new Event('pulse:palette'));

/** Global ⌘K command palette: navigation, join-by-code, theme, sound, private link. */
export function CommandPalette() {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pulse:palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pulse:palette', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => navigate(to);
    const ws = getWorkspace();
    const list: Command[] = [
      { id: 'home', group: 'Navigate', label: 'Home', icon: <House weight="duotone" />, run: go('/') },
      { id: 'play', group: 'Navigate', label: 'Join a room', hint: 'Student view', icon: <DeviceMobile weight="duotone" />, keywords: 'student code play', run: go('/play') },
      { id: 'quizzes', group: 'Workspace', label: 'Quizzes', icon: <Lightning weight="duotone" />, keywords: 'go live host', run: go('/app') },
      { id: 'library', group: 'Workspace', label: 'Question bank', icon: <BookOpen weight="duotone" />, keywords: 'library topics questions', run: go('/app/library') },
      { id: 'drafts', group: 'Workspace', label: 'AI drafts', icon: <Sparkle weight="duotone" />, keywords: 'generate ai claude', run: go('/app/drafts') },
      { id: 'import', group: 'Workspace', label: 'Import questions', icon: <UploadSimple weight="duotone" />, keywords: 'csv google forms', run: go('/app/import') },
      { id: 'reports', group: 'Workspace', label: 'Reports', icon: <ChartBar weight="duotone" />, keywords: 'results analytics', run: go('/app/reports') },
      { id: 'settings', group: 'Workspace', label: 'Settings', icon: <GearSix weight="duotone" />, run: go('/app/settings') },
      { id: 't-light', group: 'Preferences', label: 'Light theme', icon: <Sun weight="duotone" />, keywords: 'appearance', run: () => setThemePref('light') },
      { id: 't-dark', group: 'Preferences', label: 'Dark theme', icon: <Moon weight="duotone" />, keywords: 'appearance', run: () => setThemePref('dark') },
      { id: 't-sys', group: 'Preferences', label: 'Match system theme', icon: <Desktop weight="duotone" />, keywords: 'appearance auto', run: () => setThemePref('system') },
      {
        id: 'sound', group: 'Preferences', label: soundOn() ? 'Mute sound effects' : 'Turn sound effects on', icon: <SpeakerHigh weight="duotone" />, keywords: 'audio',
        run: () => { setSound(!soundOn()); },
      },
    ];
    if (ws) {
      list.push({
        id: 'link', group: 'Workspace', label: 'Copy private workspace link', icon: <LinkSimple weight="duotone" />, keywords: 'share login',
        run: () => void navigator.clipboard?.writeText(workspaceLink(ws.key)).then(() => toast('Private link copied', 'success')),
      });
    }
    return list;
  }, [navigate, toast, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const code = q.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const out = term
      ? commands.filter((c) => (c.label + ' ' + (c.keywords ?? '') + ' ' + c.group).toLowerCase().includes(term))
      : [...commands];
    if (code.length >= 4 && code.length <= 6 && /\d/.test(code)) {
      out.unshift({ id: 'join-code', group: 'Join', label: `Join room ${code}`, icon: <ArrowRight weight="bold" />, run: () => navigate(`/play/${code}`) });
    }
    return out;
  }, [q, commands, navigate]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (c?: Command) => {
    if (!c) return;
    setOpen(false);
    c.run();
  };

  let lastGroup = '';
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/35 px-4 pt-[14vh] backdrop-blur-[4px]"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.96, y: -8, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={spring.snappy}
            className="w-full max-w-xl overflow-hidden rounded-[22px] border border-line bg-raised shadow-[var(--shadow-float)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <MagnifyingGlass weight="bold" className="text-ink-3" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                  else if (e.key === 'Enter') { e.preventDefault(); run(results[active]); }
                  else if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="Search or type a room code…"
                aria-label="Search commands"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
              />
              <Kbd>esc</Kbd>
            </div>
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
              {results.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-3">No results for “{q}”</p>}
              {results.map((c, i) => {
                const header = c.group !== lastGroup ? (lastGroup = c.group) : null;
                return (
                  <div key={c.id}>
                    {header && <p className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{header}</p>}
                    <button
                      data-idx={i}
                      role="option"
                      aria-selected={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(c)}
                      className={cx('relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium', i === active ? 'text-ink' : 'text-ink-2')}
                    >
                      {i === active && <motion.span layoutId="palette-active" transition={spring.snappy} className="absolute inset-0 rounded-xl bg-paper-2" />}
                      <span className={cx('relative text-lg', i === active ? 'text-pulse' : 'text-ink-3')}>{c.icon}</span>
                      <span className="relative flex-1">{c.label}</span>
                      {c.hint && <span className="relative text-xs text-ink-3">{c.hint}</span>}
                      {i === active && <ArrowRight weight="bold" className="relative text-ink-3" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-[11px] text-ink-3">
              <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
              <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> open</span>
              <span className="ml-auto flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>K</Kbd> toggle</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
