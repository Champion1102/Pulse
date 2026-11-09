import { ComponentPropsWithoutRef, forwardRef, ReactNode, useId } from 'react';
import { CaretDown, CircleNotch } from '@phosphor-icons/react';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');
export { cx };

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'ink' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
};

/** Pill button. Tactile press via active:scale. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  const styles = {
    primary: 'bg-pulse text-pulse-ink hover:brightness-110',
    ink: 'bg-ink text-paper hover:opacity-90',
    ghost: 'bg-transparent text-ink ring-1 ring-inset ring-line hover:bg-paper-2',
    danger: 'bg-transparent text-bad ring-1 ring-inset ring-bad/40 hover:bg-bad/10',
  }[variant];
  const sizes = { sm: 'h-9 px-4 text-sm gap-1.5', md: 'h-11 px-5 text-[15px] gap-2', lg: 'h-14 px-7 text-lg gap-2.5' }[size];
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-semibold transition duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        styles,
        sizes,
        className,
      )}
      {...rest}
    >
      {loading ? <CircleNotch className="animate-spin" weight="bold" /> : icon}
      {children}
    </button>
  );
});

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="text-sm text-ink-2">{hint}</p>}
      {error && <p className="text-sm font-medium text-bad">{error}</p>}
    </div>
  );
}

const inputBase =
  'w-full rounded-2xl border border-line bg-card px-4 text-ink placeholder:text-ink-2/70 transition focus:border-ink focus:outline-none';

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputBase, 'h-12', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<'textarea'>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(inputBase, 'min-h-32 py-3 leading-relaxed', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<'select'>>(function Select({ className, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cx(inputBase, 'h-12 appearance-none pr-10', className)} {...rest} />
      <CaretDown weight="bold" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-2" />
    </div>
  );
});

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-3xl border border-line bg-card p-5 sm:p-6', className)}>{children}</div>;
}

export function Chip({ tone = 'plain', children }: { tone?: 'plain' | 'good' | 'bad' | 'pulse'; children: ReactNode }) {
  const t = {
    plain: 'bg-paper-2 text-ink-2',
    good: 'bg-good/12 text-good',
    bad: 'bg-bad/12 text-bad',
    pulse: 'bg-pulse-soft text-pulse',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', t)}>{children}</span>;
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-12 text-center">
      <div className="text-3xl text-ink-2">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="max-w-[42ch] text-sm text-ink-2">{body}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-2xl bg-paper-2', className)} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2 text-xl font-bold tracking-tight', className)}>
      <img src="/favicon.svg" alt="" className="size-7" />
      pulse
    </span>
  );
}

export const OPTION_COLORS = ['bg-opt-a', 'bg-opt-b', 'bg-opt-c', 'bg-opt-d', 'bg-opt-e', 'bg-opt-f'];
export const OPTION_TEXT = ['text-white', 'text-ink-dark', 'text-white', 'text-white', 'text-white', 'text-white'];
export const letter = (i: number) => String.fromCharCode(65 + i);
export const pct = (x: number | null | undefined) => (x === null || x === undefined ? '-' : `${Math.round(x * 100)}%`);
