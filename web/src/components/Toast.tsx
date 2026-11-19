import { CheckCircle, Info, WarningCircle } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { spring } from '../lib/motion';

type Tone = 'info' | 'error' | 'success';
type Toast = { id: number; text: string; tone: Tone };
const Ctx = createContext<(text: string, tone?: Tone) => void>(() => undefined);

const ICON = {
  info: <Info weight="fill" className="text-pulse" />,
  success: <CheckCircle weight="fill" className="text-good" />,
  error: <WarningCircle weight="fill" className="text-bad" />,
};
const LIFE = 3600;

/** Stacked toasts: spring in from the bottom, drag to dismiss, life bar. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (text: string, tone: Tone = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, text, tone }]);
      setTimeout(() => dismiss(id), LIFE);
    },
    [dismiss],
  );
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)]" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              drag="x"
              dragSnapToOrigin
              onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && dismiss(t.id)}
              initial={{ opacity: 0, y: 24, scale: 0.9, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.92, filter: 'blur(4px)', transition: { duration: 0.2 } }}
              transition={spring.smooth}
              className="glass pointer-events-auto relative flex max-w-md cursor-grab items-center gap-2.5 overflow-hidden rounded-2xl border border-line py-3 pl-4 pr-5 text-sm font-semibold text-ink shadow-[var(--shadow-float)] active:cursor-grabbing"
              role={t.tone === 'error' ? 'alert' : 'status'}
            >
              <span className="text-lg">{ICON[t.tone]}</span>
              {t.text}
              <motion.span
                aria-hidden
                className={`absolute bottom-0 left-0 h-[2px] origin-left ${t.tone === 'error' ? 'bg-bad' : t.tone === 'success' ? 'bg-good' : 'bg-pulse'}`}
                style={{ width: '100%' }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: LIFE / 1000, ease: 'linear' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
