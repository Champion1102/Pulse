import { motion } from 'motion/react';
import { useState } from 'react';
import { cx } from '../ui';

// Interactive: shows how the same answers score under each Strategy.
const MODES = [
  { id: 'accuracy', label: 'Accuracy', rows: [1000, 1000, 0], note: 'Right is right. Speed does not matter.' },
  { id: 'speed', label: 'Speed bonus', rows: [960, 640, 0], note: 'Fast correct answers earn up to double.' },
  { id: 'streak', label: 'Streaks', rows: [1300, 1000, 0], note: 'Each correct answer in a row adds a bonus.' },
];
const WHO = ['Answered in 2s, 4th correct in a row', 'Answered in 14s, first correct', 'Wrong answer'];

export function ModeSwitcher() {
  const [mode, setMode] = useState(MODES[1]);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={m.id === mode.id}
            onClick={() => setMode(m)}
            className={cx(
              'relative rounded-full px-4 py-2 text-sm font-semibold transition',
              m.id === mode.id ? 'text-paper' : 'text-ink ring-1 ring-inset ring-ink/20 hover:bg-ink/5',
            )}
          >
            {m.id === mode.id && (
              <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
            )}
            <span className="relative">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-2">
        {WHO.map((w, i) => (
          <div key={w} className="flex items-center justify-between gap-4 rounded-2xl bg-white/60 px-4 py-3 dark:bg-black/20">
            <span className="text-sm">{w}</span>
            <motion.span key={mode.id + i} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-mono font-bold">
              +{mode.rows[i]}
            </motion.span>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink-2">{mode.note}</p>
    </div>
  );
}
