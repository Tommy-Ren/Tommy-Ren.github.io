import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUpRight, Globe2, MapPin } from 'lucide-react';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { pathSteps, travelPlaces, type TravelPlace } from '../data/path';
import './MyPath.css';

const PathGlobe = lazy(() => import('./PathGlobe'));
const chapterNames = ['Wuhan', 'BCIT', 'SFU', 'Around the world'];

class GlobeBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function MyPath() {
  const section = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<TravelPlace | null>(null);
  const [loadGlobe, setLoadGlobe] = useState(false);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const [globeReady, setGlobeReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', value => {
    const chapter = Math.min(pathSteps.length - 1, Math.max(0, Math.floor(value * pathSteps.length)));
    setStage(previous => previous === chapter ? previous : chapter);
  });

  useEffect(() => {
    if (!section.current) return;
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setLoadGlobe(true); preload.disconnect(); }
    }, { rootMargin: '900px 0px' });
    const visibility = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    preload.observe(section.current);
    visibility.observe(section.current);
    const onVisibility = () => setTabVisible(!document.hidden);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    document.addEventListener('visibilitychange', onVisibility);
    preference.addEventListener('change', onPreference);
    return () => {
      preload.disconnect(); visibility.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      preference.removeEventListener('change', onPreference);
    };
  }, []);

  useEffect(() => { setSelectedPlace(null); }, [stage]);
  const onGlobeReady = useCallback(() => setGlobeReady(true), []);
  const onUnavailable = useCallback(() => { setUnavailable(true); setGlobeReady(false); }, []);
  const navigateChapter = (index: number) => {
    if (!section.current) return;
    const top = section.current.getBoundingClientRect().top + window.scrollY;
    const distance = section.current.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + distance * ((index + 0.15) / pathSteps.length), behavior: reducedMotion ? 'instant' : 'smooth' });
  };
  const current = pathSteps[stage];
  const location = selectedPlace ?? current;
  const coordinate = `${Math.abs(location.lat).toFixed(2)}°${location.lat >= 0 ? 'N' : 'S'} / ${Math.abs(location.lng).toFixed(2)}°${location.lng >= 0 ? 'E' : 'W'}`;

  return <section ref={section} id="path" className="path-section" aria-labelledby="path-title" data-chapter={current.id} data-globe-loaded={loadGlobe}>
    <div className="path-sticky">
      <div className="path-layout">
        <div className="path-copy">
          <header className="path-heading"><span className="eyebrow">02 / Places that shaped me</span><h2 id="path-title">My Path<span>.</span></h2><p>A story told in places.</p></header>
          <ol className="path-timeline" aria-label="My path chapters">
            {pathSteps.map((chapter, index) => <li key={chapter.id} className={index === stage ? 'is-active' : index < stage ? 'is-past' : ''}>
              <button type="button" onClick={() => navigateChapter(index)} aria-current={index === stage ? 'step' : undefined} aria-controls="path-current">
                <span className="path-node" aria-hidden="true"><span /></span>
                <span className="path-chapter-name"><span className="path-period">{chapter.period}</span><strong>{chapterNames[index]}</strong></span>
                <ArrowUpRight size={16} className="path-chapter-arrow" aria-hidden="true" />
              </button>
            </li>)}
          </ol>
          <div id="path-current" className="path-current" aria-live="polite" aria-atomic="true">
            <span className="path-current-label">{current.eyebrow}</span><h3>{current.title}</h3><p>{current.description}</p>
          </div>
          {stage === 3 && <div className="path-travel-list" aria-label="Places I have visited">
            {travelPlaces.map(place => <button key={place.id} type="button" onClick={() => setSelectedPlace({ ...place })} aria-pressed={selectedPlace?.id === place.id} title={`${place.localName} · ${place.region}`}>
              {place.name}<span aria-hidden="true">↗</span>
            </button>)}
          </div>}
        </div>
        <figure className="path-earth" aria-label="A realistic globe locating my education and travels">
          <div className="path-globe-frame">
            <div className={`path-globe-placeholder${globeReady ? ' is-hidden' : ''}`} aria-hidden="true"><div className="path-static-earth" /><span>{unavailable ? 'A world of places to remember.' : 'Finding my place in the world…'}</span></div>
            {loadGlobe && !unavailable && <GlobeBoundary onUnavailable={onUnavailable}><Suspense fallback={null}>
              <PathGlobe step={current} stage={stage} selectedPlace={selectedPlace} running={inView && tabVisible} reducedMotion={reducedMotion} onReady={onGlobeReady} onUnavailable={onUnavailable} />
            </Suspense></GlobeBoundary>}
          </div>
          <figcaption className="path-location">
            <div><MapPin size={14} aria-hidden="true" /><span>{selectedPlace ? `${selectedPlace.name} · ${selectedPlace.region}` : current.place}</span></div>
            <span className="path-coordinates">{stage === 3 && !selectedPlace ? `${travelPlaces.length} visited places · drag to rotate` : coordinate}</span>
            {stage === 3 && selectedPlace && <button type="button" className="path-reset" onClick={() => setSelectedPlace(null)}><Globe2 size={13} aria-hidden="true" /> World view</button>}
          </figcaption>
        </figure>
      </div>
      <div className="path-bottom"><span><ArrowDown size={13} aria-hidden="true" /> Scroll to follow the journey</span><div className="path-chapter-progress" aria-hidden="true">{pathSteps.map((_, index) => <span key={index} className={index <= stage ? 'is-filled' : ''} />)}</div><span className="path-counter">CHAPTER {String(stage + 1).padStart(2, '0')} / 04</span></div>
    </div>
  </section>;
}
