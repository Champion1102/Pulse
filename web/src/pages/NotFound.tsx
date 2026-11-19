import { ArrowLeft, DeviceMobile } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router';
import { Button, Logo, ThemeToggle } from '../components/ui';
import { ease } from '../lib/motion';

export default function NotFound() {
  const reduce = useReducedMotion();
  const rise = (d: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.8, delay: d, ease },
  });
  return (
    <div className="grain relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute left-1/2 top-1/3 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pulse/20 blur-[120px]" />
      </div>
      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/"><Logo /></Link>
        <ThemeToggle />
      </header>
      <main className="relative mx-auto grid w-full max-w-3xl flex-1 place-items-center px-4 pb-20 text-center">
        <div className="grid justify-items-center gap-6">
          <motion.p {...rise(0)} className="text-gradient select-none text-[clamp(7rem,26vw,15rem)] font-semibold leading-none tracking-[-0.07em]">
            404
          </motion.p>
          <motion.h1 {...rise(0.12)} className="text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.04em]">
            This page skipped a beat.
          </motion.h1>
          <motion.p {...rise(0.2)} className="max-w-[40ch] text-ink-2">
            That page does not exist. Maybe the link was mistyped, or the room has closed.
          </motion.p>
          <motion.div {...rise(0.3)} className="flex flex-wrap justify-center gap-3">
            <Link to="/">
              <Button variant="ink" icon={<ArrowLeft weight="bold" />}>Back home</Button>
            </Link>
            <Link to="/play">
              <Button variant="ghost" icon={<DeviceMobile weight="bold" />}>Join a room</Button>
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
