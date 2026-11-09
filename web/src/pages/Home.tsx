import { ArrowRight, ChalkboardTeacher, DeviceMobile, Lightning } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { DraftDemo } from '../components/home/DraftDemo';
import { ModeSwitcher } from '../components/home/ModeSwitcher';
import { PhoneDemo } from '../components/home/PhoneDemo';
import { OptionTile } from '../components/OptionTile';
import { Button, Logo } from '../components/ui';

const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

function JoinForm() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (clean.length >= 4) navigate(`/play/${clean}`);
  };
  return (
    <form onSubmit={submit} className="flex w-full max-w-md items-center gap-2 rounded-full border border-line bg-card p-1.5 pl-5 shadow-[0_12px_30px_-18px_rgba(20,20,19,0.35)]">
      <label htmlFor="home-code" className="sr-only">
        Room code
      </label>
      <input
        id="home-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="ROOM CODE"
        autoComplete="off"
        inputMode="text"
        className="min-w-0 flex-1 bg-transparent font-mono text-xl font-bold tracking-[0.2em] placeholder:tracking-[0.12em] placeholder:text-ink-2/60 focus:outline-none"
      />
      <Button type="submit" size="md" icon={<ArrowRight weight="bold" />} disabled={code.length < 4}>
        Join
      </Button>
    </form>
  );
}

const TYPES = ['Multiple choice', 'Multi-select', 'True or false', 'Numeric answers', 'Live polls', 'AI-drafted questions'];

export default function Home() {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-x-clip">
      {/* nav */}
      <header className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-6">
          <a href="#how" className="hidden text-sm font-semibold text-ink-2 hover:text-ink sm:inline">
            How it works
          </a>
          <Link to="/app">
            <Button variant="ink" size="sm">
              Start teaching
            </Button>
          </Link>
        </nav>
      </header>

      {/* hero: asymmetric split */}
      <section className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-7xl items-center gap-12 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:pt-10">
        <div className="grid gap-8">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="text-[clamp(3.2rem,9vw,7.5rem)] font-bold leading-[0.92] tracking-[-0.055em]"
          >
            Quizzes with a{' '}
            <span className="relative inline-block text-pulse">
              heartbeat
              <motion.span
                aria-hidden
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.7, ease }}
                className="absolute -bottom-1 left-0 h-[0.09em] w-full origin-left rounded-full bg-pulse"
              />
            </span>
            .
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            className="max-w-[44ch] text-lg leading-relaxed text-ink-2 sm:text-xl"
          >
            Students join from their phones with a room code. You see what the class actually understood.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="grid gap-4 sm:flex sm:items-center"
          >
            <JoinForm />
            <Link to="/app" className="text-sm font-semibold underline decoration-pulse decoration-2 underline-offset-4 sm:ml-2">
              or start teaching
            </Link>
          </motion.div>
        </div>

        <div className="relative">
          {/* tilted answer cards behind the phone: the four answer colours */}
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
            {[
              { i: 0, cls: 'left-[2%] top-[8%] -rotate-12' },
              { i: 1, cls: 'right-[0%] top-[18%] rotate-[9deg]' },
              { i: 2, cls: 'left-[6%] bottom-[10%] rotate-[7deg]' },
              { i: 3, cls: 'right-[4%] bottom-[2%] -rotate-[10deg]' },
            ].map(({ i, cls }) => (
              <motion.div
                key={i}
                className={`absolute w-44 ${cls}`}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.4 + i * 0.08 }}
              >
                <OptionTile index={i} text={['Factory', 'Strategy', 'Observer', 'Adapter'][i]} tabIndex={-1} className="!min-h-16 shadow-xl" />
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 40, rotate: 4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease }}
          >
            <PhoneDemo />
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: -8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.9 }}
            className="absolute -top-2 left-1/2 ml-24 grid size-24 place-items-center rounded-full bg-ink text-center text-[13px] font-bold leading-tight text-paper sm:ml-32"
          >
            No sign-up
            <br />
            for anyone
          </motion.div>
        </div>
      </section>

      {/* tilted marquee: the question types */}
      <section aria-label="Question types" className="relative -rotate-2 bg-pulse py-5 text-pulse-ink">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-4xl font-bold tracking-tight sm:text-5xl">
          {[...TYPES, ...TYPES].map((t, i) => (
            <span key={i} className="flex items-center gap-10">
              {t}
              <Lightning weight="fill" className="text-pulse-ink/60" />
            </span>
          ))}
        </div>
      </section>

      {/* how a class plays: bento, 3 cells */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-10 px-4 py-24 sm:px-6 lg:py-32">
        <Reveal>
          <h2 className="max-w-[16ch] text-4xl font-bold leading-[1.02] tracking-tighter sm:text-6xl">One code. Every phone. Same second.</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:grid-rows-2">
          <Reveal className="lg:row-span-2">
            <div className="grid h-full content-between gap-10 rounded-3xl bg-ink p-7 text-paper sm:p-10">
              <div className="flex items-center gap-3 text-paper/70">
                <ChalkboardTeacher size={28} weight="duotone" />
                <span className="font-semibold">On the projector</span>
              </div>
              <div className="grid items-end gap-8 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-paper/60">Join at pulse with code</p>
                  <p className="font-mono text-6xl font-bold tracking-[0.12em] sm:text-7xl">K7WQ2M</p>
                </div>
                <div className="w-fit rounded-2xl bg-paper p-3">
                  <QRCodeSVG value="https://pulse.example/play/K7WQ2M" size={112} bgColor="transparent" fgColor="#141413" />
                </div>
              </div>
              <p className="max-w-[46ch] text-lg text-paper/80">
                Students scan or type the code. Questions land on every phone at once, with a shared timer.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="grid h-full gap-5 rounded-3xl bg-pulse-soft p-7 sm:p-8">
              <h3 className="text-2xl font-bold tracking-tight">Pick how points work</h3>
              <ModeSwitcher />
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="grid h-full content-between gap-6 rounded-3xl border border-line bg-card p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <DeviceMobile size={28} weight="duotone" className="text-pulse" />
                <h3 className="text-2xl font-bold tracking-tight">Phones stay simple</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['A', 'B', 'C', 'D'].map((l, i) => (
                  <div key={l} className={`grid h-14 place-items-center rounded-2xl font-mono text-xl font-bold ${['bg-opt-a text-white', 'bg-opt-b text-[#1d1500]', 'bg-opt-c text-white', 'bg-opt-d text-white'][i]}`}>
                    {l}
                  </div>
                ))}
              </div>
              <p className="text-ink-2">Big tap targets, a nickname, nothing to install. Dropped Wi-Fi rejoins automatically.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* report: split with real mini report */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 sm:px-6 lg:grid-cols-2 lg:pb-32">
        <Reveal>
          <h2 className="text-4xl font-bold leading-[1.02] tracking-tighter sm:text-6xl">
            Know what to <em className="pb-1 not-italic text-pulse">reteach</em> on Monday.
          </h2>
          <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-ink-2">
            Every question lives in a course, unit and topic. After class, the report shows which ones the room got wrong.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="grid gap-5 rounded-3xl border border-line bg-card p-6 sm:p-8">
            <div className="flex items-baseline justify-between">
              <p className="font-bold">By topic</p>
              <p className="text-xs text-ink-2">sample report</p>
            </div>
            {[
              { t: 'Behavioural patterns', v: 0.42 },
              { t: 'Dependency Inversion', v: 0.58 },
              { t: 'Creational patterns', v: 0.81 },
              { t: 'Liskov & Interface Segregation', v: 0.9 },
            ].map((r, i) => (
              <div key={r.t} className="grid gap-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{r.t}</span>
                  <span className="font-mono font-bold">{Math.round(r.v * 100)}%</span>
                </div>
                <motion.div
                  className={`h-3 origin-left rounded-full ${r.v < 0.6 ? 'bg-pulse' : 'bg-good'}`}
                  style={{ width: `${r.v * 100}%` }}
                  initial={reduce ? false : { scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.1, ease }}
                />
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* AI drafts: centred stack */}
      <section className="border-t border-line bg-paper-2/60 px-4 py-24 sm:px-6 lg:py-32">
        <Reveal className="mx-auto grid max-w-3xl justify-items-center gap-6 text-center">
          <h2 className="text-4xl font-bold leading-[1.02] tracking-tighter sm:text-6xl">The AI drafts. You decide.</h2>
          <p className="max-w-[52ch] text-lg leading-relaxed text-ink-2">
            Paste your lecture notes and get draft questions. Nothing reaches students until you approve it, and grading never uses AI.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-12">
          <DraftDemo />
        </Reveal>
      </section>

      {/* closing CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-pulse px-7 py-14 text-pulse-ink sm:px-14 sm:py-20">
            <div aria-hidden className="absolute -right-10 -top-10 size-64 rounded-full bg-white/10" />
            <div aria-hidden className="absolute -bottom-24 right-40 size-72 rounded-full bg-black/10" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <h2 className="max-w-[14ch] text-5xl font-bold leading-[0.95] tracking-tighter sm:text-7xl">Run your first quiz in a minute.</h2>
              <div className="grid gap-3">
                <Link to="/app">
                  <Button variant="ink" size="lg" icon={<ArrowRight weight="bold" />}>
                    Start teaching
                  </Button>
                </Link>
                <p className="text-sm text-pulse-ink/80">Comes with a sample quiz. No account.</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-8 text-sm text-ink-2 sm:px-6">
        <Logo className="!text-base text-ink" />
        <p>Built by Team Pulse for the SESD capstone.</p>
      </footer>
    </div>
  );
}
