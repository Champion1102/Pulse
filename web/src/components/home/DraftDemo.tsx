import { Check, Sparkle, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button, Chip } from '../ui';

// Interactive: approve or reject AI drafts, exactly like the real workspace.
const DRAFTS = [
  { q: 'A poll question should implement Gradable.', a: 'False' },
  { q: 'Which pattern notifies every screen when a round ends?', a: 'Observer' },
  { q: 'Composite lets the report group results by unit.', a: 'True' },
];

export function DraftDemo() {
  const [i, setI] = useState(0);
  const [approved, setApproved] = useState(0);
  const d = DRAFTS[i % DRAFTS.length];
  const next = (ok: boolean) => {
    if (ok) setApproved((n) => n + 1);
    setI((n) => n + 1);
  };
  return (
    <div className="relative mx-auto grid w-full max-w-xl gap-4">
      <div className="relative h-56">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30, rotate: 2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, x: 120, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="absolute inset-0 grid content-between rounded-3xl border border-line bg-card p-6 text-left"
          >
            <div className="flex items-center gap-2">
              <Chip tone="pulse">
                <Sparkle weight="fill" /> AI draft
              </Chip>
              <Chip>Behavioural patterns</Chip>
            </div>
            <p className="text-xl font-bold leading-snug tracking-tight">{d.q}</p>
            <p className="text-sm text-ink-2">
              Suggested answer: <b className="text-ink">{d.a}</b>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-2">
          {approved} added to your question bank
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
