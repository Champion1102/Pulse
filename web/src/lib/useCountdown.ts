import { useEffect, useState } from 'react';

/** Seconds left until `endsAt` (server time), corrected for clock skew. */
export function useCountdown(endsAt: number | null, serverNow: number | null): number {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt || !serverNow) return;
    const skew = Date.now() - serverNow;
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt + skew - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt, serverNow]);
  return left;
}
