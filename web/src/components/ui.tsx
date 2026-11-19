import {
  CaretDown,
  Circle,
  CircleNotch,
  Desktop,
  Diamond,
  Hexagon,
  Moon,
  Square,
  SpeakerHigh,
  SpeakerSlash,
  Star,
  Sun,
  Triangle,
  X,
} from '@phosphor-icons/react';
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import {
  ComponentPropsWithoutRef,
  forwardRef,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react';
import { ease, spring } from '../lib/motion';
import { useSound } from '../lib/sfx';
import { ThemePref, useTheme } from '../lib/theme';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');
export { cx };

/* ------------------------------------------------------------------ buttons */

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'ink' | 'ghost' | 'soft' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

/** Pill button: soft shadow, sheen sweep on hover, spring press, crossfading spinner. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, iconRight, className, children, disabled, ...rest },
  ref,
) {
  const styles = {
    primary:
      'sheen bg-pulse text-pulse-ink shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_6px_20px_-8px_var(--color-pulse)] hover:shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_10px_28px_-8px_var(--color-pulse)] hover:-translate-y-px',
    ink: 'sheen bg-ink text-paper shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,var(--shadow-soft)] hover:-translate-y-px hover:shadow-[var(--shadow-lift)]',
    ghost: 'bg-transparent text-ink ring-1 ring-inset ring-line-strong hover:bg-paper-2 hover:ring-ink-3/50',
    soft: 'bg-paper-2 text-ink hover:bg-line',
    danger: 'bg-transparent text-bad ring-1 ring-inset ring-bad/35 hover:bg-bad-soft',
    glass: 'glass text-ink ring-1 ring-inset ring-line hover:ring-line-strong',
  }[variant];
  const sizes = {
    sm: 'h-9 px-3.5 text-[13px] gap-1.5',
    md: 'h-11 px-5 text-[14.5px] gap-2',
    lg: 'h-13 px-6 text-base gap-2.5',
    xl: 'h-15 px-8 text-lg gap-3',
  }[size];
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-semibold tracking-[-0.01em] transition-[transform,box-shadow,background-color,color,opacity] duration-300 ease-[var(--ease-out-expo)] active:scale-[0.965] active:duration-100 disabled:pointer-events-none disabled:opacity-45',
        styles,
        sizes,
        className,
      )}
      {...rest}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {loading ? (
          <motion.span key="l" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="inline-flex">
            <CircleNotch className="animate-spin" weight="bold" />
          </motion.span>
        ) : icon ? (
          <motion.span key="i" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="inline-flex">
            {icon}
          </motion.span>
        ) : null}
      </AnimatePresence>
      {children}
      {iconRight && <span className="inline-flex transition-transform duration-300 group-hover:translate-x-0.5">{iconRight}</span>}
    </button>
  );
});

type IconButtonProps = ComponentPropsWithoutRef<'button'> & { label: string; size?: 'sm' | 'md'; tone?: 'plain' | 'danger' };

/** Round icon-only button with an accessible label and a hover tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', tone = 'plain', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      className={cx(
        'group/ib relative grid shrink-0 place-items-center rounded-full text-ink-2 transition duration-200 active:scale-90',
        size === 'sm' ? 'size-8' : 'size-10',
        tone === 'danger' ? 'hover:bg-bad-soft hover:text-bad' : 'hover:bg-paper-2 hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-paper opacity-0 shadow-lg transition delay-0 duration-200 group-hover/ib:translate-y-0 group-hover/ib:opacity-100 group-hover/ib:delay-300">
        {label}
      </span>
    </button>
  );
});

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong border-b-2 bg-card px-1.5 font-mono text-[11px] font-semibold text-ink-2',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* ------------------------------------------------------------------ forms */

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="text-[13px] leading-relaxed text-ink-3">{hint}</p>}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[13px] font-medium text-bad">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputBase =
  'w-full rounded-[14px] border border-line bg-card px-4 text-ink shadow-[0_1px_2px_rgb(0_0_0/0.03)] placeholder:text-ink-3 transition duration-200 hover:border-line-strong focus:border-pulse focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-pulse)_16%,transparent)] focus:outline-none';

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputBase, 'h-12', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<'textarea'>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(inputBase, 'min-h-32 py-3 leading-relaxed', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<'select'>>(function Select({ className, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cx(inputBase, 'h-12 cursor-pointer appearance-none pr-10', className)} {...rest} />
      <CaretDown weight="bold" size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-3" />
    </div>
  );
});

/** iOS-style switch. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-pulse' : 'bg-line-strong')}
    >
      <motion.span
        layout
        transition={spring.snappy}
        className={cx('absolute top-1 size-5 rounded-full bg-white shadow-md', checked ? 'right-1' : 'left-1')}
      />
    </button>
  );
}

/** Segmented control with a sliding pill. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: ReactNode; icon?: ReactNode }>;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const id = useId();
  return (
    <div role="tablist" className={cx('inline-flex rounded-full bg-paper-2 p-1 ring-1 ring-inset ring-line', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative inline-flex items-center gap-1.5 rounded-full font-semibold capitalize transition-colors duration-200',
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-4 text-[13px]',
              on ? 'text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            {on && <motion.span layoutId={`seg-${id}`} transition={spring.snappy} className="absolute inset-0 rounded-full bg-card shadow-[var(--shadow-soft)] ring-1 ring-line" />}
            <span className="relative inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ surfaces */

/** Tracks the cursor into --mx/--my for the .spotlight border glow. */
export function useSpotlight<T extends HTMLElement>() {
  return useCallback((e: ReactMouseEvent<T>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, []);
}

export function Panel({ className, children, spotlight }: { className?: string; children: ReactNode; spotlight?: boolean }) {
  const onMove = useSpotlight<HTMLDivElement>();
  return (
    <div
      onMouseMove={spotlight ? onMove : undefined}
      className={cx('rounded-[var(--radius-surface)] border border-line bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6', spotlight && 'spotlight', className)}
    >
      {children}
    </div>
  );
}

export function Chip({ tone = 'plain', dot, children, className }: { tone?: 'plain' | 'good' | 'bad' | 'pulse' | 'outline' | 'warn'; dot?: boolean; children: ReactNode; className?: string }) {
  const t = {
    plain: 'bg-paper-2 text-ink-2',
    good: 'bg-good-soft text-good',
    bad: 'bg-bad-soft text-bad',
    pulse: 'bg-pulse-soft text-pulse',
    outline: 'ring-1 ring-inset ring-line-strong text-ink-2',
    warn: 'bg-warn/12 text-warn',
  }[tone];
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold', t, className)}>
      {dot && (
        <span className="relative flex size-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="relative grid justify-items-center gap-3 overflow-hidden rounded-[var(--radius-surface)] border border-dashed border-line-strong px-6 py-14 text-center"
    >
      <div className="relative mb-1 grid size-16 place-items-center">
        <span className="absolute inset-0 rounded-2xl bg-pulse/10 blur-xl" />
        <span className="relative grid size-14 place-items-center rounded-2xl border border-line bg-card text-2xl text-pulse shadow-[var(--shadow-soft)]">{icon}</span>
      </div>
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="max-w-[42ch] text-sm leading-relaxed text-ink-2">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('shimmer rounded-[var(--radius-surface)]', className)} />;
}

/** Page title block used across the workspace. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease }}
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
    >
      <div className="grid min-w-0 gap-2">
        {eyebrow && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pulse">{eyebrow}</p>}
        <h1 className="text-[clamp(1.9rem,3.4vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.035em]">{title}</h1>
        {description && <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/** Modal dialog: blurred backdrop, spring-in sheet, Esc + backdrop close. Wrap in <AnimatePresence>. */
export function Dialog({ onClose, labelledBy, children, className }: { onClose: () => void; labelledBy: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-[6px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        initial={{ y: 24, scale: 0.96, opacity: 0, filter: 'blur(6px)' }}
        animate={{ y: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ y: 12, scale: 0.98, opacity: 0 }}
        transition={spring.smooth}
        className={cx('relative w-full max-w-lg rounded-[28px] border border-line bg-raised p-6 shadow-[var(--shadow-float)] outline-none sm:p-8', className)}
      >
        <IconButton label="Close" size="sm" className="!absolute right-4 top-4" onClick={onClose}>
          <X weight="bold" />
        </IconButton>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ data display */

/** Number that springs to its new value. */
export function AnimatedNumber({ value, className, format = (n) => Math.round(n).toLocaleString() }: { value: number; className?: string; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.9, ease });
    return () => c.stop();
  }, [value, mv, reduce]);
  return <motion.span className={cx('tabular', className)}>{text}</motion.span>;
}

/** Circular progress ring. `value` 0..1. */
export function ProgressRing({ value, size = 64, stroke = 6, tone = 'var(--color-pulse)', children, className }: {
  value: number; size?: number; stroke?: number; tone?: string; children?: ReactNode; className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cx('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, value))) }}
          transition={{ duration: 0.5, ease }}
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

const AVATAR_TONES = ['from-[#5b46f6] to-[#a07bff]', 'from-[#0fa892] to-[#3dd6b5]', 'from-[#f0712c] to-[#f6b04a]', 'from-[#e0468d] to-[#ff8db5]', 'from-[#3d74f5] to-[#7fb0ff]', 'from-[#6d9f2b] to-[#a7d266]'];
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Initial on a deterministic gradient. */
export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const s = { sm: 'size-7 text-xs', md: 'size-9 text-sm', lg: 'size-12 text-lg', xl: 'size-28 text-4xl' }[size];
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]', AVATAR_TONES[hash(name) % AVATAR_TONES.length], s, className)}>
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ brand */

export function LogoMark({ className, animated = true }: { className?: string; animated?: boolean }) {
  const reduce = useReducedMotion();
  const gid = useId();
  return (
    <svg viewBox="0 0 32 32" className={cx('size-7 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-pulse)" />
          <stop offset="1" stopColor="var(--color-pulse-2)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke="white" strokeOpacity="0.18" />
      <motion.path
        d="M5 17h5l3-7 5 13 3-6h6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animated && !reduce ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease, delay: 0.15 }}
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('group inline-flex items-center gap-2.5 text-[19px] font-semibold tracking-[-0.03em]', className)}>
      <LogoMark className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-105" />
      pulse
    </span>
  );
}

/* ------------------------------------------------------------------ preferences */

const THEME_ICON: Record<ThemePref, ReactNode> = {
  system: <Desktop weight="bold" />,
  light: <Sun weight="bold" />,
  dark: <Moon weight="bold" />,
};

/** Cycles system → light → dark with a rotating icon swap. */
export function ThemeToggle({ className }: { className?: string }) {
  const { pref, cycle } = useTheme();
  return (
    <IconButton label={`Theme: ${pref}`} onClick={cycle} className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={pref} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.4, opacity: 0 }} transition={spring.snappy} className="inline-flex">
          {THEME_ICON[pref]}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}

export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useSound();
  return (
    <IconButton label={on ? 'Mute sounds' : 'Turn sounds on'} onClick={() => setOn(!on)} className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={String(on)} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={spring.snappy} className="inline-flex">
          {on ? <SpeakerHigh weight="bold" /> : <SpeakerSlash weight="bold" />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
}

/* ------------------------------------------------------------------ answer system */

export const OPTION_COLORS = ['bg-opt-a', 'bg-opt-b', 'bg-opt-c', 'bg-opt-d', 'bg-opt-e', 'bg-opt-f'];
export const OPTION_TEXT = ['text-white', 'text-[#231600]', 'text-white', 'text-white', 'text-white', 'text-white'];
/** Shapes pair with colours so answers never rely on colour alone. */
export const OPTION_SHAPES = [Triangle, Diamond, Circle, Square, Hexagon, Star];
export const letter = (i: number) => String.fromCharCode(65 + i);
export const pct = (x: number | null | undefined) => (x === null || x === undefined ? '-' : `${Math.round(x * 100)}%`);
