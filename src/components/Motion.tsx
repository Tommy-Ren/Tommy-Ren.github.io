import { useEffect, useRef, type PropsWithChildren } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';

type FadeProps = PropsWithChildren<{ className?: string; delay?: number; duration?: number; x?: number; y?: number }>;

export function FadeIn({ children, className, delay = 0, duration = 0.7, x = 0, y = 30 }: FadeProps) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, x, y }} whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once: true, margin: '50px', amount: 0 }} transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}>{children}</motion.div>;
}

export function Magnet({ children, className, padding = 150, strength = 3 }: PropsWithChildren<{ className?: string; padding?: number; strength?: number }>) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(0, { stiffness: 100, damping: 20 });
  const y = useSpring(0, { stiffness: 100, damping: 20 });
  useEffect(() => {
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const move = (event: PointerEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const active = event.clientX > rect.left - padding && event.clientX < rect.right + padding && event.clientY > rect.top - padding && event.clientY < rect.bottom + padding;
      x.set(active ? (event.clientX - rect.left - rect.width / 2) / strength : 0);
      y.set(active ? (event.clientY - rect.top - rect.height / 2) / strength : 0);
    };
    const reset = () => { x.set(0); y.set(0); };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', reset);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', reset); };
  }, [padding, strength, reduced, x, y]);
  return <div ref={ref} className={className}><motion.div style={{ x, y, willChange: reduced ? undefined : 'transform' }}>{children}</motion.div></div>;
}

function Character({ value, index, length, progress, reduced }: { value: string; index: number; length: number; progress: MotionValue<number>; reduced: boolean }) {
  const opacity = useTransform(progress, [index / length, Math.min(1, (index + 8) / length)], [0.2, 1]);
  return <motion.span style={{ opacity: reduced ? 1 : opacity }}>{value}</motion.span>;
}

export function AnimatedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.2'] });
  let index = 0;
  return <p ref={ref} className={className}>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true">{text.split(' ').map((word, wordIndex) => {
      const start = index; index += word.length + 1;
      return <span key={wordIndex}><span className="reveal-word">{[...word].map((char, i) => <Character key={i} value={char} index={start + i} length={text.length} progress={scrollYProgress} reduced={reduced} />)}</span>{' '}</span>;
    })}</span>
  </p>;
}
