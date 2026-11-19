import { CheckCircle, Fire } from '@phosphor-icons/react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { spring } from '../../lib/motion';
import { OptionTile } from '../OptionTile';
import { Avatar, cx } from '../ui';

// A real, running miniature of the student screen (built from the same components the app uses).
const QUESTION = 'Which pattern swaps the scoring mode per session?';
const OPTIONS = ['Factory', 'Strategy', 'Observer', 'Adapter'];
const PLAYERS = [
  { name: 'Ananya', base: 2310 },
  { name: 'Kabir', base: 2480 },
  { name: 'You', base: 1720 },
  { name: 'Meher', base: 1960 },
];

type Phase = 'question' | 'tapped' | 'reveal' | 'board';
const ORDER: Phase[] = ['question', 'tapped', 'reveal', 'board'];
const DURATION: Record<Phase, number> = { question: 2000, tapped: 1100, reveal: 1800, board: 2800 };

export function PhoneDemo() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduce ? 'reveal' : 'question');

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setPhase(ORDER[(ORDER.indexOf(phase) + 1) % ORDER.length]), DURATION[phase]);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  const scored = phase === 'board';
  const board = PLAYERS.map((p) => ({ ...p, total: p.base + (p.name === 'You' && scored ? 940 : 0) })).sort((a, b) => b.total - a.total);

  return (
    <div className="relative mx-auto w-[292px] sm:w-[320px]">
      {/* side buttons */}
      <span aria-hidden className="absolute -left-[3px] top-28 h-10 w-[3px] rounded-l bg-[#2a2a30]" />
      <span aria-hidden className="absolute -left-[3px] top-44 h-16 w-[3px] rounded-l bg-[#2a2a30]" />
      <span aria-hidden className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-[#2a2a30]" />
      <div className="rounded-[3rem] bg-gradient-to-b from-[#3a3a42] to-[#141418] p-[3px] shadow-[0_50px_100px_-30px_rgb(0_0_0/0.55),0_30px_60px_-30px_color-mix(in_oklab,var(--color-pulse)_45%,transparent)]">
        <div className="rounded-[2.85rem] bg-[#0b0b0d] p-2.5">
          <div className="relative h-[560px] overflow-hidden rounded-[2.3rem] bg-paper p-4">
            <div className="mx-auto mb-4 flex h-6 w-24 items-center justify-end rounded-full bg-black pr-2">
              <span className="size-2 rounded-full bg-[#1b1b2a] ring-1 ring-[#2a2a40]" />
            </div>
            <AnimatePresence mode="wait">
              {phase !== 'board' ? (
                <motion.div
                  key="q"
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                  transition={{ duration: 0.4 }}
                  className="grid gap-3"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-ink-3">
                    <span>Question 3 of 8</span>
                    <span className={cx('rounded-full px-2 py-0.5 font-mono', phase === 'question' ? 'bg-paper-2 text-ink' : 'bg-pulse-soft text-pulse')}>
                      0:{phase === 'question' ? '12' : '09'}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-paper-2">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-pulse to-pulse-2" animate={{ width: phase === 'question' ? '62%' : '46%' }} transition={{ duration: 1.2 }} />
                  </div>
                  <p className="text-[17px] font-semibold leading-snug tracking-[-0.02em]">{QUESTION}</p>
                  <div className="grid gap-2.5">
                    {OPTIONS.map((o, i) => (
                      <OptionTile
                        key={o}
                        index={i}
                        text={o}
                        tabIndex={-1}
                        aria-hidden
                        className="!min-h-14 !rounded-2xl !p-3 !text-base"
                        selected={phase !== 'question' && i === 1}
                        dim={phase === 'reveal' && i !== 1}
                        correct={phase === 'reveal' && i === 1}
                      />
                    ))}
                  </div>
                  <AnimatePresence>
                    {phase === 'reveal' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: -3 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={spring.bouncy}
                        className="absolute bottom-6 right-5 flex items-center gap-1.5 rounded-full bg-good px-4 py-2 font-semibold text-white shadow-[0_10px_30px_-8px_var(--color-good)]"
                      >
                        <CheckCircle weight="fill" /> +940
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-2">
                  <p className="mb-2 text-lg font-semibold tracking-[-0.02em]">Leaderboard</p>
                  <LayoutGroup>
                    {board.map((p, i) => (
                      <motion.div
                        layout
                        key={p.name}
                        transition={spring.smooth}
                        className={cx(
                          'flex items-center gap-3 rounded-2xl px-3 py-2.5',
                          p.name === 'You' ? 'bg-gradient-to-r from-pulse to-pulse-2 text-white shadow-[var(--shadow-glow)]' : 'border border-line bg-card',
                        )}
                      >
                        <span className="w-4 font-mono text-xs font-semibold opacity-70">{i + 1}</span>
                        <Avatar name={p.name} size="sm" />
                        <span className="flex-1 text-sm font-semibold">{p.name}</span>
                        {p.name === 'You' && <Fire weight="fill" />}
                        <span className="font-mono text-sm font-semibold">{p.total}</span>
                      </motion.div>
                    ))}
                  </LayoutGroup>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute inset-x-0 bottom-2 mx-auto h-1 w-28 rounded-full bg-ink/25" />
          </div>
        </div>
      </div>
    </div>
  );
}
