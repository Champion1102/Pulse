// Haptic feedback on phones that support it (Android Chrome). No-ops elsewhere.
const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* ignore */
  }
};

export const haptic = {
  tap: () => buzz(8),
  select: () => buzz(14),
  success: () => buzz([18, 40, 28]),
  error: () => buzz([40, 30, 40]),
  celebrate: () => buzz([20, 30, 20, 30, 60]),
};
