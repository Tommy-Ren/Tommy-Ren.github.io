export type PointerPosition = { x: number; y: number; target: Element };

// Hide the native cursor only after a real mouse event, with a visible replacement.
// Inputs, embedded canvases, touch, keyboard navigation and reduced motion keep it.
export function trackPointer(
  layer: HTMLElement,
  className: string,
  move: (point: PointerPosition, first: boolean) => void,
  stop: () => void,
) {
  const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)');
  let visible = false;
  let last: { x: number; y: number } | null = null;
  const hide = () => {
    visible = false;
    layer.dataset.active = 'false';
    layer.dataset.pressed = 'false';
    document.documentElement.classList.remove(className);
    stop();
  };
  const update = (point: PointerPosition) => {
    if (!media.matches || document.hidden || point.target.closest('input, textarea, select, option, [contenteditable]:not([contenteditable="false"]), [role="textbox"], iframe, canvas, [data-native-cursor], :disabled')) {
      hide(); return;
    }
    const first = !visible;
    move(point, first);
    visible = true;
    layer.dataset.active = 'true';
    document.documentElement.classList.add(className);
  };
  const pointer = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') { last = null; hide(); return; }
    if (!(event.target instanceof Element)) return;
    last = { x: event.clientX, y: event.clientY };
    update({ ...last, target: event.target });
  };
  const leave = () => { last = null; hide(); };
  const key = (event: KeyboardEvent) => { if (event.key === 'Tab') leave(); };
  const refresh = () => {
    if (!last || !visible) return;
    const target = document.elementFromPoint(last.x, last.y);
    if (target) update({ ...last, target }); else leave();
  };
  const press = () => { layer.dataset.pressed = 'true'; };
  const release = () => { layer.dataset.pressed = 'false'; };
  const visibility = () => { if (document.hidden) leave(); };
  window.addEventListener('pointermove', pointer, { passive: true });
  window.addEventListener('pointerdown', pointer, { passive: true });
  window.addEventListener('pointerdown', press, { passive: true });
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('blur', leave);
  window.addEventListener('keydown', key);
  window.addEventListener('resize', refresh, { passive: true });
  document.addEventListener('scroll', refresh, { passive: true, capture: true });
  document.addEventListener('pointerleave', leave);
  document.addEventListener('pointercancel', leave);
  document.addEventListener('visibilitychange', visibility);
  media.addEventListener('change', leave);
  return () => {
    leave();
    window.removeEventListener('pointermove', pointer);
    window.removeEventListener('pointerdown', pointer);
    window.removeEventListener('pointerdown', press);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('blur', leave);
    window.removeEventListener('keydown', key);
    window.removeEventListener('resize', refresh);
    document.removeEventListener('scroll', refresh, true);
    document.removeEventListener('pointerleave', leave);
    document.removeEventListener('pointercancel', leave);
    document.removeEventListener('visibilitychange', visibility);
    media.removeEventListener('change', leave);
  };
}
