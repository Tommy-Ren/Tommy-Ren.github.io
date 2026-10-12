import { useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, X } from 'lucide-react';
import { useLocale } from '../i18n/Locale';
import { useMusic } from './MusicContext';
import MusicPlayer from './MusicPlayer';

export default function FloatingPlayer({ page }: { page: string }) {
  const { t } = useLocale();
  const { track, playing, toggle } = useMusic();
  const [expanded, setExpanded] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { setExpanded(false); }, [page]);
  useEffect(() => { if (expanded) close.current?.focus(); }, [expanded]);
  if (page === 'home' || page === 'admin') return null;
  const collapse = () => { setExpanded(false); opener.current?.focus(); };
  return <aside className="blog-floating-player" aria-label={t('Music player')} onKeyDown={event => { if (event.key === 'Escape') collapse(); }}>
    {expanded && <div id="blog-floating-panel" className="blog-floating-panel"><button ref={close} className="blog-player-close" aria-label={t('Collapse player')} onClick={collapse}><X size={17} /></button><MusicPlayer /></div>}
    <div className="blog-player-capsule" data-playing={playing}>
      <button ref={opener} className="blog-player-open" aria-label={t(expanded ? 'Collapse player' : 'Expand player')} aria-expanded={expanded} aria-controls="blog-floating-panel" onClick={() => setExpanded(value => !value)}><span className="blog-mini-disc"><Music2 size={18} /></span><span><small>{t(playing ? 'NOW PLAYING' : 'STUDY RADIO')}</small><strong>{track.title}</strong></span><span className="blog-equalizer" aria-hidden="true"><i /><i /><i /></span></button>
      <button className="blog-capsule-play" onClick={toggle} aria-label={t(playing ? 'Pause' : 'Play')}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
    </div>
  </aside>;
}
