import { CheckCircle, Fire } from '@phosphor-icons/react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { OptionTile } from '../OptionTile';

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
const DURATION: Record<Phase, number> = { question: 1800, tapped: 1100, reveal: 1700, board: 2600 };

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
    <div className="relative mx-auto w-[300px] sm:w-[330px]">
      <div className="rounded-[2.75rem] border border-line bg-ink p-2.5 shadow-[0_40px_80px_-30px_rgba(20,20,19,0.45)]">
        <div className="relative h-[560px] overflow-hidden rounded-[2.25rem] bg-paper p-4">
          <div className="mx-auto mb-4 h-5 w-24 rounded-full bg-ink" />
          <AnimatePresence mode="wait">
            {phase !== 'board' ? (
              <motion.div
                key="q"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="grid gap-3"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-ink-2">
                  <span>Question 3 of 8</span>
                  <span className="font-mono">0:{phase === 'question' ? '12' : '09'}</span>
                </div>
                <p className="text-lg font-bold leading-snug tracking-tight">{QUESTION}</p>
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
                      initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                      animate={{ opacity: 1, scale: 1, rotate: -4 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                      className="absolute bottom-6 right-5 flex items-center gap-1.5 rounded-full bg-good px-4 py-2 font-bold text-white shadow-lg"
                    >
                      <CheckCircle weight="fill" /> +940
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-2">
                <p className="mb-2 text-lg font-bold tracking-tight">Leaderboard</p>
                <LayoutGroup>
                  {board.map((p, i) => (
                    <motion.div
                      layout
                      key={p.name}
                      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${p.name === 'You' ? 'bg-pulse text-pulse-ink' : 'bg-card'}`}
                    >
                      <span className="w-5 font-mono text-sm font-bold">{i + 1}</span>
                      <span className="flex-1 font-semibold">{p.name}</span>
                      {p.name === 'You' && <Fire weight="fill" />}
                      <span className="font-mono text-sm font-bold">{p.total}</span>
                    </motion.div>
                  ))}
                </LayoutGroup>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
