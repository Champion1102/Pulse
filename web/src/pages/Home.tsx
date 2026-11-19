import {
  ArrowRight,
  ArrowUpRight,
  ChalkboardTeacher,
  ChartBar,
  Command,
  DeviceMobile,
  QrCode,
  Sparkle,
  Target,
  WifiHigh,
} from '@phosphor-icons/react';
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { FormEvent, MouseEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { openPalette } from '../components/CommandPalette';
import { DraftDemo } from '../components/home/DraftDemo';
import { ModeSwitcher } from '../components/home/ModeSwitcher';
import { PhoneDemo } from '../components/home/PhoneDemo';
import { OptionTile } from '../components/OptionTile';
import { AnimatedNumber, Button, Chip, cx, Kbd, Logo, OPTION_COLORS, OPTION_SHAPES, OPTION_TEXT, ThemeToggle, useSpotlight } from '../components/ui';
import { ease, spring } from '../lib/motion';

/* ------------------------------------------------------------------ helpers */

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Splits text into words that blur-rise in sequence. */
function WordReveal({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className={cx('inline-block', className)}
            initial={reduce ? false : { y: '100%', opacity: 0, filter: 'blur(8px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: delay + i * 0.07, ease }}
          >
            {w}
            {' '}
          </motion.span>
        </span>
      ))}
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-pulse">{children}</p>;
}

function SpotCard({ className, children }: { className?: string; children: ReactNode }) {
  const onMove = useSpotlight<HTMLDivElement>();
  return (
    <div onMouseMove={onMove} className={cx('spotlight h-full rounded-[28px] border border-line bg-card shadow-[var(--shadow-soft)]', className)}>
      {children}
    </div>
  );
}

/** Counts up from 0 the first time it scrolls into view. */
function CountOnView({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  return (
    <span ref={ref}>
      <AnimatedNumber value={seen ? to : 0} className={className} />
    </span>
  );
}

/* ------------------------------------------------------------------ nav */

function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => scrollY.on('change', (y) => setScrolled(y > 24)), [scrollY]);
  const mac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <motion.div
        animate={{ maxWidth: scrolled ? 920 : 1280, paddingLeft: scrolled ? 14 : 8, paddingRight: scrolled ? 8 : 8 }}
        transition={spring.smooth}
        className={cx(
          'mx-auto flex h-14 items-center justify-between rounded-full transition-[background-color,box-shadow,border-color] duration-500',
          scrolled ? 'glass border border-line shadow-[var(--shadow-lift)]' : 'border border-transparent',
        )}
      >
        <Link to="/" aria-label="Pulse home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className="hidden rounded-full px-3 py-2 text-[13.5px] font-medium text-ink-2 transition hover:text-ink md:inline">
            How it works
          </a>
          <a href="#features" className="hidden rounded-full px-3 py-2 text-[13.5px] font-medium text-ink-2 transition hover:text-ink md:inline">
            Features
          </a>
          <Link to="/play" className="hidden rounded-full px-3 py-2 text-[13.5px] font-medium text-ink-2 transition hover:text-ink sm:inline">
            Join a room
          </Link>
          <button
            onClick={openPalette}
            aria-label="Open command palette"
            className="hidden h-9 items-center gap-1.5 rounded-full px-2.5 text-ink-3 ring-1 ring-inset ring-line transition hover:text-ink hover:ring-line-strong sm:inline-flex"
          >
            <Command weight="bold" size={14} />
            <Kbd className="!h-4 !min-w-4 !border-0 !bg-transparent !px-0">{mac ? 'K' : 'Ctrl K'}</Kbd>
          </button>
          <ThemeToggle />
          <Link to="/app">
            <Button variant="ink" size="sm" iconRight={<ArrowRight weight="bold" />}>
              Start teaching
            </Button>
          </Link>
        </nav>
      </motion.div>
    </header>
  );
}

/* ------------------------------------------------------------------ hero */

function JoinForm() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (clean.length >= 4) navigate(`/play/${clean}`);
  };
  return (
    <form
      onSubmit={submit}
      className={cx(
        'flex w-full max-w-[460px] items-center gap-2 rounded-[22px] border bg-card p-2 transition-[box-shadow,border-color] duration-300',
        focus
          ? 'border-pulse shadow-[0_0_0_5px_color-mix(in_oklab,var(--color-pulse)_14%,transparent),var(--shadow-lift)]'
          : 'border-line shadow-[var(--shadow-lift)]',
      )}
    >
      <label htmlFor="home-code" className="sr-only">
        Room code
      </label>
      <div className="relative flex-1 cursor-text" onClick={() => inputRef.current?.focus()}>
        <div aria-hidden className="flex gap-1.5">
          {Array.from({ length: 6 }, (_, i) => {
            const ch = code[i];
            const caret = focus && i === Math.min(code.length, 5) && code.length < 6;
            return (
              <div
                key={i}
                className={cx(
                  'relative grid h-12 flex-1 place-items-center rounded-xl font-mono text-xl font-semibold transition-colors duration-200 sm:text-2xl',
                  ch ? 'bg-paper-2 text-ink' : 'bg-paper-2/60 text-ink-3',
                  caret && 'ring-2 ring-pulse/60',
                )}
              >
                {ch ? (
                  <motion.span key={ch + i} initial={{ y: 8, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={spring.bouncy}>
                    {ch}
                  </motion.span>
                ) : caret ? (
                  <motion.span className="h-6 w-[2px] rounded bg-pulse" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                ) : (
                  <span className="size-1 rounded-full bg-ink-3/50" />
                )}
              </div>
            );
          })}
        </div>
        <input
          ref={inputRef}
          id="home-code"
          value={code}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6))}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Room code"
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0"
        />
      </div>
      <Button type="submit" size="lg" className="!h-12 !rounded-[14px] !px-5" iconRight={<ArrowRight weight="bold" />} disabled={code.length < 4}>
        Join
      </Button>
    </form>
  );
}

const FLOATERS = [
  { i: 0, text: 'Factory', cls: 'left-[-4%] top-[10%] -rotate-[10deg]', dur: 6.5 },
  { i: 1, text: 'Strategy', cls: 'right-[-6%] top-[22%] rotate-[8deg]', dur: 7.2 },
  { i: 2, text: 'Observer', cls: 'left-[0%] bottom-[14%] rotate-[6deg]', dur: 5.8 },
  { i: 3, text: 'Adapter', cls: 'right-[-2%] bottom-[4%] -rotate-[9deg]', dur: 6.9 },
];

function HeroVisual() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 120, damping: 18 });
  const px = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 18]), { stiffness: 90, damping: 20 });
  const py = useSpring(useTransform(my, [-0.5, 0.5], [-14, 14]), { stiffness: 90, damping: 20 });
  const glowX = useTransform(mx, [-0.5, 0.5], ['35%', '65%']);
  const glowY = useTransform(my, [-0.5, 0.5], ['35%', '65%']);
  const glow = useMotionTemplate`radial-gradient(40% 40% at ${glowX} ${glowY}, color-mix(in oklab, var(--color-pulse) 35%, transparent), transparent 70%)`;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div className="relative py-6 [perspective:1400px]" onMouseMove={onMove} onMouseLeave={onLeave}>
      <motion.div aria-hidden className="absolute inset-[-10%] rounded-full blur-3xl" style={{ background: glow }} />
      <motion.div aria-hidden style={{ x: px, y: py }} className="pointer-events-none absolute inset-0 hidden sm:block">
        {FLOATERS.map(({ i, text, cls, dur }) => (
          <motion.div
            key={i}
            className={`absolute w-40 ${cls}`}
            initial={reduce ? false : { opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.6 + i * 0.1 }}
          >
            <motion.div animate={reduce ? undefined : { y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: dur, ease: 'easeInOut' }}>
              <OptionTile index={i} text={text} tabIndex={-1} aria-hidden className="!min-h-14 !rounded-2xl !p-3 !text-base" />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
      <motion.div
        style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        initial={reduce ? false : { opacity: 0, y: 50, rotate: 3 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 1.1, delay: 0.25, ease }}
      >
        <PhoneDemo />
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1, rotate: -8 }}
        transition={{ ...spring.bouncy, delay: 1.1 }}
        className="absolute left-1/2 top-0 ml-20 sm:ml-28"
      >
        <div className="relative grid size-24 place-items-center rounded-full bg-ink text-center text-[12px] font-semibold leading-tight text-paper shadow-[var(--shadow-float)]">
          <svg viewBox="0 0 100 100" className={cx('absolute inset-0', !reduce && 'animate-spin-slow')} aria-hidden>
            <defs>
              <path id="ring" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
            </defs>
            <text fontSize="8.4" fill="currentColor" letterSpacing="2.4" className="opacity-60">
              <textPath href="#ring">NO SIGN-UP · FOR ANYONE · NO SIGN-UP · FOR ANYONE ·</textPath>
            </text>
          </svg>
          <Sparkle weight="fill" size={22} className="text-pulse-2" />
        </div>
      </motion.div>
    </div>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  const fade = (d: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.8, delay: d, ease },
  });
  return (
    <section className="relative">
      {/* backdrop: dotted grid + aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-[780px] overflow-hidden">
        <div className="bg-grid absolute inset-0" />
        <motion.div
          className="absolute -top-40 left-[8%] size-[520px] rounded-full bg-pulse/25 blur-[120px]"
          animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -top-20 right-[4%] size-[460px] rounded-full bg-pulse-2/20 blur-[120px]"
          animate={reduce ? undefined : { x: [0, -50, 0], y: [0, 60, 0] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }}
        />
        <div className="absolute left-1/3 top-40 size-[300px] rounded-full bg-[#ff7a9c]/10 blur-[110px]" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-14 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.12fr_1fr] lg:gap-8">
        <div className="grid gap-8">
          <motion.div {...fade(0)}>
            <Link to="/play" className="group inline-flex items-center gap-2 rounded-full border border-line bg-card/70 py-1 pl-1 pr-3 text-[13px] font-medium text-ink-2 shadow-[var(--shadow-soft)] backdrop-blur transition hover:border-line-strong hover:text-ink">
              <Chip tone="pulse" dot>Live</Chip>
              Real-time classroom quizzes
              <ArrowRight weight="bold" size={12} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
          <h1 className="text-[clamp(3rem,8.4vw,6.9rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
            <WordReveal text="Quizzes with a" />
            <span className="relative inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span
                className="text-gradient inline-block"
                initial={reduce ? false : { y: '100%', opacity: 0, filter: 'blur(8px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.9, delay: 0.25, ease }}
              >
                heartbeat.
              </motion.span>
            </span>
          </h1>
          <motion.p {...fade(0.35)} className="max-w-[44ch] text-lg leading-relaxed text-ink-2 sm:text-xl">
            Students join from their phones with a room code. You see, topic by topic, what the class actually understood.
          </motion.p>
          <motion.div {...fade(0.5)} className="grid gap-4">
            <JoinForm />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-3">
              <Link to="/app" className="group inline-flex items-center gap-1 font-semibold text-ink">
                or start teaching
                <ArrowUpRight weight="bold" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <span className="hidden h-3 w-px bg-line-strong sm:block" />
              <span className="inline-flex items-center gap-1.5"><DeviceMobile weight="bold" /> Any phone</span>
              <span className="inline-flex items-center gap-1.5"><WifiHigh weight="bold" /> Auto-rejoin</span>
              <span className="inline-flex items-center gap-1.5"><Target weight="bold" /> Topic reports</span>
            </div>
          </motion.div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ sections */

const TYPES = ['Multiple choice', 'Multi-select', 'True or false', 'Numeric answers', 'Live polls', 'AI-drafted questions'];

function Marquee() {
  return (
    <section aria-label="Question types" className="border-y border-line bg-card/50 py-6">
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap hover:[animation-play-state:paused]">
          {[...TYPES, ...TYPES].map((t, i) => {
            const Shape = OPTION_SHAPES[i % 6];
            return (
              <span key={i} className="flex items-center gap-3 text-2xl font-medium tracking-[-0.03em] text-ink-2 sm:text-3xl">
                <span className={cx('grid size-8 place-items-center rounded-lg', OPTION_COLORS[i % 6], OPTION_TEXT[i % 6])}>
                  <Shape weight="fill" size={14} />
                </span>
                {t}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', icon: ChalkboardTeacher, title: 'Pick a quiz', body: 'From your topic-organised question bank, or from AI drafts you approved.' },
  { n: '02', icon: QrCode, title: 'Students join', body: 'They scan the QR or type the six-character code. No app, no account.' },
  { n: '03', icon: ChartBar, title: 'See what stuck', body: 'Live leaderboard during class, a topic-by-topic report after it.' },
];

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6 lg:py-32">
      <Reveal className="max-w-2xl">
        <SectionLabel>How it works</SectionLabel>
        <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.045em]">One code. Every phone. Same second.</h2>
      </Reveal>
      <div className="relative mt-14 grid gap-4 md:grid-cols-3">
        <div aria-hidden className="absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-line-strong to-transparent md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.1}>
            <SpotCard className="relative grid gap-5 p-7">
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-pulse to-pulse-2 text-white shadow-[var(--shadow-glow)]">
                  <s.icon weight="duotone" size={24} />
                </span>
                <span className="font-mono text-sm text-ink-3">{s.n}</span>
              </div>
              <h3 className="text-xl font-semibold tracking-[-0.025em]">{s.title}</h3>
              <p className="leading-relaxed text-ink-2">{s.body}</p>
            </SpotCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Bento() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-24 sm:px-6 lg:pb-32">
      <Reveal className="max-w-2xl">
        <SectionLabel>Built for the room</SectionLabel>
        <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.045em]">A projector, a phone, and nothing in between.</h2>
      </Reveal>
      <div className="mt-12 grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:grid-rows-2">
        <Reveal className="lg:row-span-2">
          <div className="relative grid h-full content-between gap-10 overflow-hidden rounded-[28px] bg-[#0c0c0e] p-7 text-white shadow-[var(--shadow-float)] sm:p-10">
            <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-pulse/40 blur-[90px]" />
            <div aria-hidden className="absolute -bottom-32 left-10 size-72 rounded-full bg-pulse-2/25 blur-[100px]" />
            <div className="relative flex items-center gap-3 text-white/60">
              <ChalkboardTeacher size={22} weight="duotone" />
              <span className="text-sm font-medium">On the projector</span>
              <Chip className="ml-auto !bg-white/10 !text-white" dot>
                Lobby open
              </Chip>
            </div>
            <div className="relative grid items-end gap-8 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-white/50">Join at pulse with code</p>
                <p className="font-mono text-[clamp(3rem,8vw,5.2rem)] font-semibold tracking-[0.1em]">K7WQ2M</p>
              </div>
              <div className="w-fit rounded-2xl bg-white p-3 shadow-[0_20px_40px_-15px_rgb(0_0_0/0.6)]">
                <QRCodeSVG value="https://pulse.example/play/K7WQ2M" size={112} bgColor="transparent" fgColor="#0c0c0e" />
              </div>
            </div>
            <div className="relative grid gap-5">
              <div className="flex -space-x-2">
                {['Ananya', 'Kabir', 'Meher', 'Riya', 'Dev', 'Sara'].map((n, i) => (
                  <motion.span
                    key={n}
                    initial={{ opacity: 0, scale: 0.4 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ ...spring.bouncy, delay: 0.3 + i * 0.08 }}
                    className={cx('grid size-9 place-items-center rounded-full text-sm font-semibold ring-2 ring-[#0c0c0e]', OPTION_COLORS[i], OPTION_TEXT[i])}
                  >
                    {n[0]}
                  </motion.span>
                ))}
                <span className="grid h-9 place-items-center rounded-full bg-white/10 px-3 text-xs font-semibold ring-2 ring-[#0c0c0e]">+24</span>
              </div>
              <p className="max-w-[46ch] text-lg text-white/70">Students scan or type the code. Questions land on every phone at once, with a shared timer.</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <SpotCard className="grid gap-5 p-7 sm:p-8">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em]">Pick how points work</h3>
              <p className="mt-1 text-sm text-ink-2">Same answers, three scoring strategies.</p>
            </div>
            <ModeSwitcher />
          </SpotCard>
        </Reveal>
        <Reveal delay={0.16}>
          <SpotCard className="grid content-between gap-6 p-7 sm:p-8">
            <div className="flex items-center gap-3">
              <DeviceMobile size={26} weight="duotone" className="text-pulse" />
              <h3 className="text-2xl font-semibold tracking-[-0.03em]">Phones stay simple</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['A', 'B', 'C', 'D'].map((l, i) => {
                const Shape = OPTION_SHAPES[i];
                return (
                  <motion.div
                    key={l}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    transition={spring.snappy}
                    className={cx('flex h-14 items-center justify-between rounded-2xl px-4 font-mono text-xl font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]', OPTION_COLORS[i], OPTION_TEXT[i])}
                  >
                    {l}
                    <Shape weight="fill" size={16} className="opacity-70" />
                  </motion.div>
                );
              })}
            </div>
            <p className="text-ink-2">Big tap targets, a nickname, nothing to install. Dropped Wi-Fi rejoins automatically.</p>
          </SpotCard>
        </Reveal>
      </div>
    </section>
  );
}

const FACTS = [
  { n: 5, label: 'question types', sub: 'MCQ, multi-select, true/false, numeric, polls' },
  { n: 3, label: 'scoring strategies', sub: 'Accuracy, speed bonus, streaks' },
  { n: 3, label: 'report levels', sub: 'Course, unit and topic' },
  { n: 0, label: 'accounts needed', sub: 'For students and instructors' },
];

function Facts() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:pb-32">
      <div className="grid grid-cols-2 overflow-hidden rounded-[28px] border border-line bg-card shadow-[var(--shadow-soft)] lg:grid-cols-4">
        {FACTS.map((f, i) => (
          <Reveal key={f.label} delay={i * 0.06} className={cx('grid gap-1 p-6 sm:p-8', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line lg:border-t-0', i === 2 && 'lg:border-l')}>
            <p className="text-[clamp(2.6rem,5vw,3.6rem)] font-semibold leading-none tracking-[-0.05em]">
              <CountOnView to={f.n} />
            </p>
            <p className="mt-2 font-semibold">{f.label}</p>
            <p className="text-sm text-ink-3">{f.sub}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const SAMPLE = [
  { t: 'Behavioural patterns', v: 0.42 },
  { t: 'Dependency Inversion', v: 0.58 },
  { t: 'Creational patterns', v: 0.81 },
  { t: 'Liskov & Interface Segregation', v: 0.9 },
];

function ReportSection() {
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 sm:px-6 lg:grid-cols-2 lg:pb-32">
      <Reveal>
        <SectionLabel>Topic reports</SectionLabel>
        <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
          Know what to <span className="text-gradient">reteach</span> on Monday.
        </h2>
        <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-2">
          Every question lives in a course, unit and topic. After class, the report shows which ones the room got wrong. Export as CSV or JSON.
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <SpotCard className="grid gap-6 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold tracking-[-0.02em]">Results by topic</p>
              <p className="text-xs text-ink-3">Sample report · 32 players</p>
            </div>
            <Chip tone="bad">2 to reteach</Chip>
          </div>
          {SAMPLE.map((r, i) => (
            <div key={r.t} className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{r.t}</span>
                <span className={cx('font-mono font-semibold', r.v < 0.6 ? 'text-bad' : 'text-good')}>
                  <CountOnView to={Math.round(r.v * 100)} />%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper-2">
                <motion.div
                  className={cx('h-full origin-left rounded-full', r.v < 0.6 ? 'bg-gradient-to-r from-bad to-[#ff8a7a]' : 'bg-gradient-to-r from-good to-[#4fd894]')}
                  style={{ width: `${r.v * 100}%` }}
                  initial={reduce ? false : { scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, delay: 0.15 + i * 0.1, ease }}
                />
              </div>
            </div>
          ))}
        </SpotCard>
      </Reveal>
    </section>
  );
}

function AISection() {
  return (
    <section className="relative overflow-hidden border-y border-line bg-card/40 px-4 py-24 sm:px-6 lg:py-32">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pulse/15 blur-[120px]" />
      <Reveal className="relative mx-auto grid max-w-3xl justify-items-center gap-6 text-center">
        <Chip tone="pulse">
          <Sparkle weight="fill" /> AI drafts
        </Chip>
        <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.045em]">The AI drafts. You decide.</h2>
        <p className="max-w-[52ch] text-lg leading-relaxed text-ink-2">
          Paste your lecture notes and get draft questions. Nothing reaches students until you approve it, and grading never uses AI.
        </p>
      </Reveal>
      <Reveal delay={0.1} className="relative mt-14">
        <DraftDemo />
      </Reveal>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[36px] bg-[#0c0c0e] px-7 py-16 text-white shadow-[var(--shadow-float)] sm:px-14 sm:py-24">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_85%_0%,color-mix(in_oklab,var(--color-pulse)_70%,transparent),transparent_60%),radial-gradient(50%_70%_at_0%_100%,color-mix(in_oklab,var(--color-pulse-2)_45%,transparent),transparent_60%)]" />
          <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)]" />
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <h2 className="max-w-[14ch] text-[clamp(2.6rem,6.5vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.05em]">Run your first quiz in a minute.</h2>
            <div className="grid gap-3">
              <Link to="/app">
                <Button size="xl" className="!bg-white !text-[#0c0c0e] !shadow-[0_20px_40px_-12px_rgb(255_255_255/0.35)]" iconRight={<ArrowRight weight="bold" />}>
                  Start teaching
                </Button>
              </Link>
              <p className="text-sm text-white/60">Comes with a sample quiz. No account.</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-6 border-t border-line pt-8 text-sm text-ink-3">
        <div className="grid gap-2">
          <Logo className="!text-base text-ink" />
          <p>Built by Team Pulse for the SESD capstone.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-5">
          <Link to="/play" className="transition hover:text-ink">Join a room</Link>
          <Link to="/app" className="transition hover:text-ink">Workspace</Link>
          <a href="#how" className="transition hover:text-ink">How it works</a>
          <ThemeToggle />
        </nav>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="grain overflow-x-clip">
      <Nav />
      <Hero />
      <Marquee />
      <HowItWorks />
      <Bento />
      <Facts />
      <ReportSection />
      <AISection />
      <CTA />
      <Footer />
    </div>
  );
}
