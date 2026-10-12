import { useEffect, useRef } from 'react';

type Point = { x: number; y: number; dx: number; dy: number; vx: number; vy: number; distance: number; nx: number; ny: number };

// Spring forces adapted from 016-wavy-lines-main, JIEJOE (MIT).
// /licenses/wavy-lines-MIT.txt. Canvas adds radial waves without SVG path churn.
export default function RippleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, frame = 0, lastTime = 0, elapsed = 0, visible = false;
    let lines: Point[][] = [];
    const mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
    const draw = (dt = 1) => {
      context.clearRect(0, 0, width, height);
      context.lineWidth = .7;
      context.strokeStyle = 'rgba(181, 180, 205, .36)';
      context.beginPath();
      for (const points of lines) {
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const distance = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          const force = Math.max(0, 1 - distance / 170);
          p.vx = (p.vx + mouse.vx * force * .055 * dt - p.dx * .014 * dt) * Math.pow(.88, dt);
          p.vy = (p.vy + mouse.vy * force * .055 * dt - p.dy * .014 * dt) * Math.pow(.88, dt);
          p.dx = Math.max(-60, Math.min(60, p.dx + p.vx * dt));
          p.dy = Math.max(-60, Math.min(60, p.dy + p.vy * dt));
          const phase = p.distance / 39 - elapsed * 1.4;
          const wave = Math.sin(phase) * 17 * Math.min(1, p.distance / 90) * Math.exp(-p.distance / (width * .8));
          const sway = Math.sin(p.y / 160 + elapsed * .18 + p.x / 230) * 5;
          const x = p.x + p.nx * wave + sway + p.dx;
          const y = p.y + p.ny * wave + p.dy;
          if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
      }
      context.stroke();
      mouse.vx *= Math.pow(.8, dt); mouse.vy *= Math.pow(.8, dt);
    };
    const tick = (time: number) => {
      frame = 0;
      if (!visible || document.hidden || reduced.matches) return;
      if (time - lastTime >= 1000 / 30) {
        const delta = Math.min((time - (lastTime || time - 33.3)) / 1000, .05);
        lastTime = time; elapsed += delta;
        draw(delta * 60);
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame); frame = 0; lastTime = 0;
      if (reduced.matches) { mouse.vx = mouse.vy = 0; draw(0); }
      else if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      lines = [];
      const gap = Math.max(10, width / 150);
      for (let x = -30; x <= width + 30; x += gap) {
        const points: Point[] = [];
        for (let y = -30; y <= height + 30; y += 18) {
          const dx = x - width * .5, dy = y - height * .53;
          const distance = Math.hypot(dx, dy);
          points.push({ x, y, dx: 0, dy: 0, vx: 0, vy: 0, distance, nx: dx / (distance || 1), ny: dy / (distance || 1) });
        }
        lines.push(points);
      }
      draw(0);
    };
    const move = (event: PointerEvent) => {
      if (!visible || reduced.matches || event.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      mouse.vx = Math.max(-45, Math.min(45, x - mouse.x));
      mouse.vy = Math.max(-45, Math.min(45, y - mouse.y));
      mouse.x = x; mouse.y = y;
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    const sizeObserver = new ResizeObserver(resize);
    observer.observe(canvas); sizeObserver.observe(canvas);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    resize();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); sizeObserver.disconnect();
      window.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
    };
  }, []);
  return <canvas ref={ref} className="hero-ripple-field" aria-hidden="true" />;
}
