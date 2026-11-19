import { Check, Sparkle, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { spring } from '../../lib/motion';
import { AnimatedNumber, Button, Chip } from '../ui';

// Interactive: approve or reject AI drafts, exactly like the real workspace.
const DRAFTS = [
  { q: 'A poll question should implement Gradable.', a: 'False' },
  { q: 'Which pattern notifies every screen when a round ends?', a: 'Observer' },
  { q: 'Composite lets the report group results by unit.', a: 'True' },
];

export function DraftDemo() {
  const [i, setI] = useState(0);
  const [approved, setApproved] = useState(0);
  const [dir, setDir] = useState(1);
  const d = DRAFTS[i % DRAFTS.length];
  const next = (ok: boolean) => {
    setDir(ok ? 1 : -1);
    if (ok) setApproved((n) => n + 1);
    setI((n) => n + 1);
  };
  return (
    <div className="relative mx-auto grid w-full max-w-xl gap-5">
      <div className="relative h-60">
        {/* stacked cards behind */}
        <div aria-hidden className="absolute inset-x-6 -bottom-3 top-6 rounded-[22px] border border-line bg-card/60" />
        <div aria-hidden className="absolute inset-x-3 -bottom-1.5 top-3 rounded-[22px] border border-line bg-card/80" />
        <AnimatePresence mode="popLayout" custom={dir}>
          <motion.div
            key={i}
            custom={dir}
            variants={{
              enter: { opacity: 0, y: 24, scale: 0.96 },
              center: { opacity: 1, y: 0, scale: 1, rotate: 0 },
              exit: (dd: number) => ({ opacity: 0, x: dd * 140, rotate: dd * 8, transition: { duration: 0.35 } }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring.smooth}
            className="absolute inset-0 grid content-between rounded-[22px] border border-line bg-raised p-6 text-left shadow-[var(--shadow-lift)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="pulse">
                <Sparkle weight="fill" /> AI draft
              </Chip>
              <Chip>Behavioural patterns</Chip>
            </div>
            <p className="text-xl font-semibold leading-snug tracking-[-0.02em]">{d.q}</p>
            <p className="text-sm text-ink-2">
              Suggested answer: <b className="font-semibold text-ink">{d.a}</b>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-ink-2">
          <AnimatedNumber value={approved} className="font-mono font-semibold text-ink" /> added to your question bank
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<X weight="bold" />} onClick={() => next(false)}>
            Reject
          </Button>
          <Button variant="ink" size="sm" icon={<Check weight="bold" />} onClick={() => next(true)}>
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
