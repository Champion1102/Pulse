// Shared motion vocabulary so every screen moves the same way.
export const ease = [0.16, 1, 0.3, 1] as const; // out-expo: the signature curve

export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 },
  smooth: { type: 'spring', stiffness: 260, damping: 28 },
  bouncy: { type: 'spring', stiffness: 380, damping: 16 },
  gentle: { type: 'spring', stiffness: 140, damping: 20 },
} as const;

/** Fade-up used for page sections and list items. */
export const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease } },
};

/** Parent that staggers its children's `fadeUp`. */
export const stagger = (step = 0.05, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});
