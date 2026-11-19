import { Check } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { ComponentPropsWithoutRef } from 'react';
import { spring } from '../lib/motion';
import { cx, letter, OPTION_COLORS, OPTION_SHAPES, OPTION_TEXT } from './ui';

type Props = Omit<ComponentPropsWithoutRef<'button'>, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'> & {
  index: number;
  text: string;
  selected?: boolean;
  dim?: boolean;
  correct?: boolean;
  big?: boolean;
};

/**
 * A coloured answer tile. Colour is always paired with a letter AND a shape (never colour-only).
 * Glossy top light, lift on hover, spring press, animated selection ring + correct badge.
 */
export function OptionTile({ index, text, selected, dim, correct, big, className, disabled, ...rest }: Props) {
  const i = index % 6;
  const Shape = OPTION_SHAPES[i];
  const darkText = i === 1;
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      animate={{ opacity: dim ? 0.28 : 1, scale: dim ? 0.985 : 1, filter: dim ? 'saturate(0.4)' : 'saturate(1)' }}
      transition={spring.snappy}
      disabled={disabled}
      className={cx(
        'group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-[20px] p-4 text-left font-semibold tracking-[-0.01em] sm:p-5',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.28),inset_0_-2px_0_rgb(0_0_0/0.12),0_10px_24px_-14px_rgb(0_0_0/0.55)]',
        OPTION_COLORS[i],
        OPTION_TEXT[i],
        big ? 'min-h-28 text-2xl lg:min-h-36 lg:text-[2rem]' : 'min-h-20 text-lg',
        className,
      )}
      {...(rest as object)}
    >
      {/* gloss */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1/2 bg-gradient-to-b from-white/18 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 -z-10 size-28 rounded-full bg-white/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 sm:opacity-60" />

      <span
        className={cx(
          'relative grid size-10 shrink-0 place-items-center rounded-[12px] font-mono text-base font-bold',
          darkText ? 'bg-black/10' : 'bg-white/20',
          big && 'lg:size-14 lg:rounded-2xl lg:text-2xl',
        )}
      >
        {letter(index)}
        <Shape weight="fill" size={big ? 14 : 10} className="absolute -bottom-1 -right-1 opacity-80" />
      </span>
      <span className="min-w-0 flex-1 break-words leading-snug">{text}</span>

      <AnimatePresence>
        {correct && (
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={spring.bouncy}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-good shadow-lg"
          >
            <Check weight="bold" />
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <motion.span
            aria-hidden
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={spring.snappy}
            className="pointer-events-none absolute inset-0 rounded-[20px] ring-4 ring-inset ring-white/85"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}
