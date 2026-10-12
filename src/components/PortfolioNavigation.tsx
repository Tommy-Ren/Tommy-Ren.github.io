import { useLocale } from '../i18n/Locale';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowUpRight, BookOpen, Code2, Compass, Layers, Mail, Menu, UserRound } from 'lucide-react';

const items = [
  { label: 'About', href: '#about', Icon: UserRound },
  { label: 'Path', href: '#path', Icon: Compass },
  { label: 'Expertise', href: '#expertise', Icon: Code2 },
  { label: 'Projects', href: '#projects', Icon: Layers },
  { label: 'Blog', href: '/blog/home/', Icon: BookOpen },
  { label: 'Contact', href: '#contact', Icon: Mail },
];

// One set of links travels between the top edge and the contact section.
// The footer's invisible grid reserves their final layout without duplicate links.
export function NavigationDock() {
  const { t } = useLocale();
  return <div className="navigation-dock" aria-hidden="true">{items.map(item => <span key={item.label} />)}</div>;
}

export default function PortfolioNavigation() {
  const { t } = useLocale();
  const ref = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const nav = ref.current, toggle = trigger.current;
    const dock = document.querySelector<HTMLElement>('.navigation-dock');
    if (!nav || !toggle || !dock) return;
    const links = [...nav.querySelectorAll<HTMLAnchorElement>('a')];
    const slots = [...dock.children];
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let open = false, docked = false, shown = false, initialized = false, frame = 0;
    let previousScroll = window.scrollY;
    let targets: { x: number; y: number; scale: number; opacity: number }[] = [];
    const position = () => {
      frame = 0;
      const bounds = dock.getBoundingClientRect();
      const nextDocked = bounds.top < innerHeight - 35 && bounds.bottom > 35;
      const modeChanged = nextDocked !== docked;
      docked = nextDocked;
      const nextShown = docked || open;
      const visibilityChanged = nextShown !== shown;
      shown = nextShown;
      // Animate in document coordinates when docked. Scrolling then moves only
      // this parent, rather than restarting six in-flight button animations.
      const previousOffset = Number(gsap.getProperty(nav, 'y')) || 0;
      const offset = docked ? -window.scrollY : 0;
      if (modeChanged && initialized) links.forEach(link => {
        const y = Number(gsap.getProperty(link, 'y')) || 0;
        gsap.set(link, { y: y + previousOffset - offset });
      });
      gsap.set(nav, { y: offset });
      nav.dataset.docked = String(docked);
      nav.dataset.visible = String(shown);
      nav.setAttribute('aria-hidden', String(!shown));
      toggle.setAttribute('aria-expanded', String(shown));
      toggle.hidden = docked;
      const size = slots[0].getBoundingClientRect().width;
      const compact = innerWidth < 640;
      const topWidth = Math.min(innerWidth - (compact ? 24 : 240), 610);
      const scale = docked ? 1 : Math.min(.64, (topWidth / 6 - 4) / size);
      links.forEach((link, i) => {
        const slot = slots[i].getBoundingClientRect();
        const x = docked ? slot.left : (innerWidth - topWidth) / 2 + topWidth / 6 * (i + .5) - size / 2;
        const y = docked ? slot.top + window.scrollY : (compact ? 63 : 3) - size * (1 - scale) / 2;
        link.tabIndex = shown ? 0 : -1;
        link.style.pointerEvents = shown ? 'auto' : 'none';
        const target = { x, y, scale, opacity: shown ? 1 : 0 };
        const previous = targets[i];
        if (!modeChanged && previous && Object.keys(target).every(key => Math.abs(target[key as keyof typeof target] - previous[key as keyof typeof target]) < .01)) return;
        targets[i] = target;
        if (!initialized || (!shown && !visibilityChanged)) {
          gsap.killTweensOf(link);
          gsap.set(link, target);
        } else {
          gsap.to(link, {
            ...target,
            duration: preference.matches ? 0 : modeChanged ? .9 : visibilityChanged ? .32 : .16,
            delay: modeChanged && docked && !preference.matches ? i * .045 : 0,
            ease: modeChanged ? 'power3.inOut' : 'power2.out', overwrite: true,
          });
        }
      });
      initialized = true;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(position); };
    const reveal = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || docked) return;
      const inside = event.target instanceof Node && nav.contains(event.target);
      const next = event.clientY < 24 || inside || (open && event.clientY < (innerWidth < 640 ? 145 : 90));
      if (open !== next) { open = next; schedule(); }
    };
    const focus = () => { open = true; schedule(); };
    const focusToggle = () => { if (toggle.matches(':focus-visible')) focus(); };
    const blur = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && (nav.contains(event.relatedTarget) || event.relatedTarget === toggle)) return;
      open = false; schedule();
    };
    const toggleOpen = () => { open = !open; schedule(); };
    const close = () => { open = false; schedule(); };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || docked) return;
      if (nav.contains(document.activeElement)) toggle.focus({ preventScroll: true });
      close();
    };
    const scroll = () => {
      if (Math.abs(window.scrollY - previousScroll) > 2) open = false;
      previousScroll = window.scrollY; schedule();
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(dock); resize.observe(document.documentElement);
    window.addEventListener('pointermove', reveal, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('keydown', key);
    nav.addEventListener('focusin', focus); nav.addEventListener('focusout', blur);
    nav.addEventListener('click', close);
    toggle.addEventListener('focus', focusToggle); toggle.addEventListener('blur', blur);
    toggle.addEventListener('click', toggleOpen);
    preference.addEventListener('change', schedule);
    position();
    return () => {
      cancelAnimationFrame(frame); gsap.killTweensOf([...links, nav]); resize.disconnect();
      window.removeEventListener('pointermove', reveal); window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', schedule); window.removeEventListener('keydown', key);
      nav.removeEventListener('focusin', focus); nav.removeEventListener('focusout', blur); nav.removeEventListener('click', close);
      toggle.removeEventListener('focus', focusToggle); toggle.removeEventListener('blur', blur); toggle.removeEventListener('click', toggleOpen);
      preference.removeEventListener('change', schedule);
    };
  }, []);
  return <>
    <button ref={trigger} className="navigation-reveal" aria-label={t("Show navigation")} aria-controls="portfolio-navigation" aria-expanded="false"><Menu size={19} /></button>
    <nav ref={ref} id="portfolio-navigation" className="portfolio-navigation" aria-label={t("Main navigation")} aria-hidden="true">
      {items.map(({ label, href, Icon }, i) => <a key={href} className="launch-navigation-button" href={href} tabIndex={-1}>
        <span className="launch-button-face"><span className="launch-button-number">0{i + 1}</span><Icon className="launch-button-icon" size={21} aria-hidden="true" /><span className="launch-button-label">{t(label)}</span><ArrowUpRight className="launch-button-arrow" size={12} aria-hidden="true" /></span>
      </a>)}
    </nav>
  </>;
}
