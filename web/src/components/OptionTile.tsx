import { Check } from '@phosphor-icons/react';
import { ComponentPropsWithoutRef } from 'react';
import { cx, letter, OPTION_COLORS } from './ui';

type Props = ComponentPropsWithoutRef<'button'> & {
  index: number;
  text: string;
  selected?: boolean;
  dim?: boolean;
  correct?: boolean;
  big?: boolean;
};

/** A coloured answer tile. Colour is always paired with a letter (not colour-only). */
export function OptionTile({ index, text, selected, dim, correct, big, className, ...rest }: Props) {
  const darkText = index % 6 === 1; // amber tile needs dark text for contrast
  return (
    <button
      type="button"
      className={cx(
        'group relative flex w-full items-center gap-4 rounded-3xl p-4 text-left font-semibold transition duration-200 active:scale-[0.98] sm:p-5',
        OPTION_COLORS[index % 6],
        darkText ? 'text-[#1d1500]' : 'text-white',
        big ? 'min-h-28 text-2xl lg:min-h-36 lg:text-3xl' : 'min-h-20 text-lg',
        selected && 'ring-4 ring-ink ring-offset-2 ring-offset-paper',
        dim && 'opacity-30',
        className,
      )}
      {...rest}
    >
      <span
        className={cx(
          'grid size-10 shrink-0 place-items-center rounded-full font-mono text-base font-bold',
          darkText ? 'bg-black/10' : 'bg-white/20',
          big && 'lg:size-14 lg:text-2xl',
        )}
      >
        {letter(index)}
      </span>
      <span className="min-w-0 flex-1 break-words leading-snug">{text}</span>
      {correct && (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-good">
          <Check weight="bold" />
        </span>
      )}
    </button>
  );
}
