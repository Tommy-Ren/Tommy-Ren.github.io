import { useEffect, useRef } from 'react';
import { trackPointer } from '../components/pointerRuntime';
import './NeonPointer.css';

export default function NeonPointer() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const core = layer.querySelector<HTMLElement>('.neon-pointer-core')!;
    const ring = layer.querySelector<HTMLElement>('.neon-pointer-ring')!;
    const trails = Array.from(layer.querySelectorAll<HTMLElement>('.neon-pointer-trail'));
    let raf = 0, previousTime = 0, movedAt = 0;
    let pointer = { x: 0, y: 0 }, halo = { ...pointer };
    const points = trails.map(() => ({ ...pointer }));
    const place = (element: HTMLElement, point: { x: number; y: number }) => { element.style.transform = `translate3d(${point.x}px,${point.y}px,0)`; };
    const tick = (time: number) => {
      const delta = Math.min(40, time - (previousTime || time - 16.7));
      previousTime = time;
      const fade = Math.max(0, 1 - (time - movedAt) / 180);
      const follow = 1 - Math.exp(-delta / 42);
      halo.x += (pointer.x - halo.x) * follow;
      halo.y += (pointer.y - halo.y) * follow;
      place(ring, halo);
      let leader = pointer;
      points.forEach((point, index) => {
        point.x += (leader.x - point.x) * .5;
        point.y += (leader.y - point.y) * .5;
        const distance = Math.hypot(pointer.x - point.x, pointer.y - point.y);
        trails[index].style.opacity = String(Math.min(1, distance / 18) * fade * (.24 - index * .028));
        place(trails[index], point);
        leader = point;
      });
      if (fade > 0 || Math.hypot(pointer.x - halo.x, pointer.y - halo.y) > .1) raf = requestAnimationFrame(tick);
      else { trails.forEach(trail => { trail.style.opacity = '0'; }); raf = 0; previousTime = 0; }
    };
    return trackPointer(layer, 'has-neon-pointer', ({ x, y, target }, first) => {
      if (first) { halo = { x, y }; points.forEach(point => { point.x = x; point.y = y; }); place(ring, halo); }
      if (x !== pointer.x || y !== pointer.y) movedAt = performance.now();
      pointer = { x, y };
      place(core, pointer);
      layer.dataset.hover = target.closest('a[href], button, [role="button"]') ? 'true' : 'false';
      if (!raf) raf = requestAnimationFrame(tick);
    }, () => { cancelAnimationFrame(raf); raf = 0; previousTime = 0; trails.forEach(trail => { trail.style.opacity = '0'; }); });
  }, []);
  return <div ref={ref} className="neon-pointer" data-active="false" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span className="neon-pointer-trail" key={index} />)}<span className="neon-pointer-ring"><i /></span><span className="neon-pointer-core"><i /></span></div>;
}
