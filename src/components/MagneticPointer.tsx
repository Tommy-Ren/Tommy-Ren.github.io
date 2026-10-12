import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
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
    const corners = [...frame.querySelectorAll('i')];
    const followX = gsap.quickTo(frame, 'x', { duration: .28, ease: 'power3.out' });
    const followY = gsap.quickTo(frame, 'y', { duration: .28, ease: 'power3.out' });
    const shape = corners.map(corner => ({
      x: gsap.quickTo(corner, 'x', { duration: .38, ease: 'power3.out' }),
      y: gsap.quickTo(corner, 'y', { duration: .38, ease: 'power3.out' }),
    }));
    const dotX = gsap.quickSetter(dot, 'x', 'px');
    const dotY = gsap.quickSetter(dot, 'y', 'px');
    const stop = () => {
      followX.tween.pause(); followY.tween.pause();
      shape.forEach(corner => { corner.x.tween.pause(); corner.y.tween.pause(); });
    };
    const move = ({ x, y, target }: PointerPosition, first: boolean) => {
      const bounds = target.closest('a[href], button, [role="button"], [data-magnetic]')?.getBoundingClientRect();
      const attached = !!bounds && bounds.width > 0 && bounds.width < window.innerWidth * .85 && bounds.height < 180;
      layer.dataset.attached = String(attached);
      const halfW = attached ? bounds.width / 2 + 7 : 14;
      const halfH = attached ? bounds.height / 2 + 7 : 14;
      const cx = attached ? bounds.left + bounds.width / 2 : x;
      const cy = attached ? bounds.top + bounds.height / 2 : y;
      const fx = cx + (x - cx) * .08, fy = cy + (y - cy) * .08;
      // Reusable tweens move only transforms; no width/height writes per frame.
      if (first) { stop(); followX(fx, fx); followY(fy, fy); }
      else { followX(fx); followY(fy); }
      shape.forEach((corner, i) => {
        const cornerX = i % 2 ? halfW - 10 : -halfW;
        const cornerY = i > 1 ? halfH - 10 : -halfH;
        if (first) { corner.x(cornerX, cornerX); corner.y(cornerY, cornerY); }
        else { corner.x(cornerX); corner.y(cornerY); }
      });
      dotX(x); dotY(y);
    };
    const untrack = trackPointer(layer, 'has-magnetic-pointer', move, stop);
    return () => { untrack(); gsap.killTweensOf([frame, dot, ...corners]); };
  }, []);
  return <div ref={ref} className="magnetic-pointer" data-active="false" aria-hidden="true"><span className="magnetic-pointer-frame"><i /><i /><i /><i /></span><span className="magnetic-pointer-dot" /></div>;
}
