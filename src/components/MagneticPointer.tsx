import { useEffect, useRef } from 'react';
import { trackPointer, type PointerPosition } from './pointerRuntime';
import './MagneticPointer.css';

// Adapted from JIEJOE's 018-magnetic-pointer-main (MIT).
// License: /licenses/magnetic-pointer-MIT.txt
export default function MagneticPointer() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const frame = layer.querySelector<HTMLElement>('.magnetic-pointer-frame')!;
    const dot = layer.querySelector<HTMLElement>('.magnetic-pointer-dot')!;
    let raf = 0, previousTime = 0;
    let target = { x: 0, y: 0, width: 34, height: 34 };
    let current = { ...target };
    const paint = () => {
      frame.style.transform = `translate3d(${current.x - current.width / 2}px,${current.y - current.height / 2}px,0)`;
      frame.style.width = `${current.width}px`;
      frame.style.height = `${current.height}px`;
    };
    const tick = (time: number) => {
      const delta = Math.min(50, time - (previousTime || time - 16.7));
      previousTime = time;
      const amount = 1 - Math.exp(-delta / 55);
      let distance = 0;
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        current[key] += (target[key] - current[key]) * amount;
        distance += Math.abs(target[key] - current[key]);
      }
      paint();
      if (distance > .15) raf = requestAnimationFrame(tick);
      else { current = { ...target }; paint(); raf = 0; previousTime = 0; }
    };
    const move = ({ x, y, target: element }: PointerPosition, first: boolean) => {
      const link = element.closest('a[href], button, [role="button"], [data-magnetic]');
      const bounds = link?.getBoundingClientRect();
      const attached = bounds && bounds.width > 0 && bounds.width < window.innerWidth * .85 && bounds.height < 180;
      layer.dataset.attached = attached ? 'true' : 'false';
      if (attached) {
        const centerX = bounds.left + bounds.width / 2, centerY = bounds.top + bounds.height / 2;
        const padding = Math.min(24, Math.max(14, window.innerWidth / 50));
        target = { x: centerX + (x - centerX) * .1, y: centerY + (y - centerY) * .1, width: bounds.width + padding, height: bounds.height + padding };
      } else target = { x, y, width: 34, height: 34 };
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      if (first) { current = { ...target }; paint(); }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    return trackPointer(layer, 'has-magnetic-pointer', move, () => { cancelAnimationFrame(raf); raf = 0; previousTime = 0; });
  }, []);
  return <div ref={ref} className="magnetic-pointer" data-active="false" aria-hidden="true"><span className="magnetic-pointer-frame"><i /><i /><i /><i /></span><span className="magnetic-pointer-dot" /></div>;
}
