import { Fire, Lightning, Target } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { ease } from '../../lib/motion';
import { AnimatedNumber, Segmented } from '../ui';

// Interactive: shows how the same answers score under each Strategy.
const MODES = [
  { id: 'accuracy', label: 'Accuracy', icon: <Target weight="bold" />, rows: [1000, 1000, 0], note: 'Right is right. Speed does not matter.' },
  { id: 'speed', label: 'Speed bonus', icon: <Lightning weight="bold" />, rows: [960, 640, 0], note: 'Fast correct answers earn up to double.' },
  { id: 'streak', label: 'Streaks', icon: <Fire weight="bold" />, rows: [1300, 1000, 0], note: 'Each correct answer in a row adds a bonus.' },
] as const;
type ModeId = (typeof MODES)[number]['id'];
const WHO = ['Answered in 2s, 4th correct in a row', 'Answered in 14s, first correct', 'Wrong answer'];
const MAX = 1300;

export function ModeSwitcher() {
  const [id, setId] = useState<ModeId>('speed');
  const mode = MODES.find((m) => m.id === id)!;
  return (
    <div className="grid gap-5">
      <Segmented<ModeId> value={id} onChange={setId} size="sm" className="w-fit flex-wrap" options={MODES.map((m) => ({ value: m.id, label: m.label, icon: m.icon }))} />
      <div className="grid gap-2">
        {WHO.map((w, i) => (
          <div key={w} className="relative overflow-hidden rounded-2xl border border-line bg-card px-4 py-3">
            <motion.div
              aria-hidden
              className="absolute inset-y-0 left-0 bg-pulse/8"
              animate={{ width: `${(mode.rows[i] / MAX) * 100}%` }}
              transition={{ duration: 0.7, ease }}
            />
            <div className="relative flex items-center justify-between gap-4">
              <span className="text-[13px] text-ink-2">{w}</span>
              <span className={`font-mono text-sm font-semibold ${mode.rows[i] ? 'text-ink' : 'text-ink-3'}`}>
                +<AnimatedNumber value={mode.rows[i]} />
              </span>
            </div>
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }} className="text-[13px] text-ink-2">
          {mode.note}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
