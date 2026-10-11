import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Includes the fade into the homepage. Change this to adjust the whole opening.
export const INTRO_DURATION_MS = 4000;
const EXIT_DURATION_MS = 550;
const BOOT_DURATION_MS = INTRO_DURATION_MS - EXIT_DURATION_MS;

export function BootIntro({ onComplete }: { onComplete: (skipped: boolean) => void }) {
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const completed = useRef(false);
  const skipButton = useRef<HTMLButtonElement>(null);

  const finish = useCallback((skipped = false) => {
    if (completed.current) return;
    completed.current = true;
    onComplete(skipped || document.activeElement === skipButton.current);
  }, [onComplete]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    skipButton.current?.focus({ preventScroll: true });
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      if (event.matches) finish();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(true);
      }
      // The modal has one control; keep both Tab directions inside it.
      if (event.key === 'Tab') {
        event.preventDefault();
        skipButton.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    motionPreference.addEventListener('change', onMotionPreferenceChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', onKeyDown);
      motionPreference.removeEventListener('change', onMotionPreferenceChange);
    };
  }, [finish]);

  useEffect(() => {
    if (reducedMotion) {
      finish();
      return;
    }
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      // This is an opening sequence, not a network download percentage.
      setProgress(Math.min(100, Math.floor(elapsed / (BOOT_DURATION_MS * 0.92) * 100)));
      if (elapsed >= BOOT_DURATION_MS) finish();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [finish, reducedMotion]);

  const status = progress < 32 ? 'INITIALIZING' : progress < 78 ? 'PREPARING' : 'READY';
  const animationStyle = {
    '--intro-writing-duration': `${BOOT_DURATION_MS * 0.84}ms`,
  } as CSSProperties;

  return <motion.div
    className="boot-intro"
    style={animationStyle}
    initial={false}
    exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.015 }}
    transition={{ duration: reducedMotion ? 0 : EXIT_DURATION_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
    role="dialog"
    aria-modal="true"
    aria-label="Welcome to Tommy Ren's portfolio"
  >
    <div className="boot-monitor">
      <div className="boot-screen">
        <header className="boot-header">
          <span className="boot-os">[ TR//OS v1.0 ]</span>
          <span className="boot-node">TOMMY REN · SOFTWARE & SYSTEMS</span>
          <span className="boot-status"><span aria-hidden="true" />{status}</span>
        </header>

        <div className="boot-greeting">
          <svg className="boot-handwriting" viewBox="35 10 1070 435" role="img" aria-label="hello">
            <path pathLength="1" d="M70 350 C135 317 209 251 244 166 C275 91 259 30 226 45 C188 60 165 202 150 388 C163 319 186 232 225 232 C266 232 263 269 248 326 C228 401 266 416 325 399 C391 381 441 319 442 270 C442 221 411 215 385 240 C339 282 365 389 431 403 C506 419 555 357 591 281 C634 190 661 55 622 46 C577 36 543 249 545 330 C545 389 571 410 615 404 C695 395 733 300 770 186 C796 108 803 53 773 46 C729 34 694 220 692 324 C692 385 717 410 762 405 C816 402 856 357 875 287 C890 237 925 222 955 245 C994 273 983 348 953 382 C922 417 881 399 868 365 C855 330 862 277 885 252 C915 220 948 247 983 254 C1018 261 1045 250 1059 220" />
          </svg>
          <span className="boot-welcome">A LITTLE CURIOSITY. A LOT TO BUILD.</span>
        </div>

        <footer className="boot-footer">
          <div className="boot-console" aria-hidden="true">
            <p>tommy@portfolio:~$ ./init --welcome<span className="boot-cursor">_</span></p>
            <p className={progress >= 22 ? 'boot-line is-visible' : 'boot-line'}><span className="boot-ok">OK</span> software · intelligent systems · creative code</p>
            <p className={progress >= 65 ? 'boot-line is-visible' : 'boot-line'}>NOTICE: a curious builder is ready to say hello.</p>
          </div>
          <button ref={skipButton} className="boot-skip" onClick={() => finish(true)} aria-label="Skip introduction and enter portfolio">SKIP INTRO <span aria-hidden="true">↗</span></button>
          <div className="boot-progress" role="progressbar" aria-label="Introduction progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="boot-progress-track"><div className="boot-progress-fill" style={{ transform: `scaleX(${progress / 100})` }} /></div>
            <span aria-hidden="true">{String(progress).padStart(2, '0')}%</span>
          </div>
        </footer>
      </div>
    </div>
  </motion.div>;
}
