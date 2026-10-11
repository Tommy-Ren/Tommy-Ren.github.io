import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { AVATAR_POSTER_URL, loadAvatarScene } from './avatarAsset';
import type { AvatarSceneProps } from './AvatarScene';
import './Avatar.css';

export default function Avatar() {
  const host = useRef<HTMLDivElement>(null);
  const [Scene, setScene] = useState<ComponentType<AvatarSceneProps>>();
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const handleUnavailable = useCallback(() => { setReady(false); setUnavailable(true); }, []);

  useEffect(() => {
    if (!host.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setSeen(true);
    });
    observer.observe(host.current);
    const visibility = () => setPageVisible(!document.hidden);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReduced(preference.matches);
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', updatePreference);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      preference.removeEventListener('change', updatePreference);
    };
  }, []);

  useEffect(() => {
    if (!seen) return;
    let cancelled = false;
    loadAvatarScene().then(module => {
      if (!cancelled) setScene(() => module.default);
    }).catch(() => { if (!cancelled) handleUnavailable(); });
    return () => { cancelled = true; };
  }, [seen, handleUnavailable]);

  return <div ref={host} className="avatar" role="img" aria-label="Tommy's 3D avatar, with black hair and glasses"
    data-avatar-state={unavailable ? 'poster' : ready ? 'ready' : 'loading'}>
    <img className="avatar-poster" src={AVATAR_POSTER_URL} width="1000" height="1080" alt="" fetchPriority="high" />
    {Scene && !unavailable && <Scene running={visible && pageVisible} reducedMotion={reduced} onReady={handleReady} onUnavailable={handleUnavailable} />}
  </div>;
}
