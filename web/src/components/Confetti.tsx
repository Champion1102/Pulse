import { useEffect, useRef } from 'react';

const COLORS = ['#5b46f6', '#a07bff', '#3d74f5', '#f2a41f', '#0fa892', '#e0468d', '#f0712c', '#ffffff'];

interface Piece { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string; life: number; shape: 0 | 1 }

/**
 * Lightweight canvas confetti (no dependency). Fires a burst whenever `fire` changes to a new truthy value.
 * `origin` is 0..1 of the viewport. Respects prefers-reduced-motion.
 */
export function Confetti({ fire, origin = { x: 0.5, y: 0.35 }, count = 160 }: { fire: unknown; origin?: { x: number; y: number }; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
    };
    size();
    window.addEventListener('resize', size);
    const ox = origin.x * innerWidth;
    const oy = origin.y * innerHeight;
    const pieces: Piece[] = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2;
      const s = 6 + Math.random() * 11;
      return {
        x: ox, y: oy,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 7,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1, shape: Math.random() > 0.7 ? 1 : 0,
      };
    });
    let raf = 0;
    const step = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      for (const p of pieces) {
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.32;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.life -= 0.0065;
        if (p.life <= 0 || p.y > innerHeight + 40) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.6);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, Math.cos(p.r * 2.2));
        ctx.fillStyle = p.c;
        if (p.shape) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(step);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[65] h-full w-full" />;
}
