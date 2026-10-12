import { Music2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, ListMusic } from 'lucide-react';
import { useLocale } from '../i18n/Locale';
import { useMusic } from './MusicContext';
import { tracks } from './music';
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function MusicPlayer() {
  const { t } = useLocale();
  const { track, index, playing, position, duration, volume, error, toggle, next, seek, setVolume, select } = useMusic();
  return <section className="blog-card blog-music" aria-label={t('Music player')} data-playing={playing}>
    <div className="blog-card-top"><span className="blog-eyebrow">{t('STUDY RADIO')} / 10 TRACKS</span><Music2 size={17} /></div>
    <div className="blog-music-now"><div className="blog-vinyl" aria-hidden="true"><img src={track.cover} alt="" /><i /></div><div><span className="blog-music-status">{t(playing ? 'NOW PLAYING' : 'ON THE TURNTABLE')}</span><h2>{track.title}</h2><p><a href="https://purrplecat.itch.io/just-relax" target="_blank" rel="noopener noreferrer">Purrple Cat</a> · Just Relax</p></div></div>
    <div className="blog-music-progress"><input type="range" min="0" max={duration || 1} step=".1" value={Math.min(position, duration || 1)} disabled={!duration} aria-label={t('Playback position')} onChange={event => seek(Number(event.target.value))} /><span>{time(position)}<span>{time(duration)}</span></span></div>
    <div className="blog-music-controls"><div><button onClick={() => next(-1)} aria-label={t('Previous track')}><SkipBack size={17} /></button><button className="blog-music-play" onClick={toggle} aria-label={t(playing ? 'Pause' : 'Play')} aria-pressed={playing}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button><button onClick={() => next(1)} aria-label={t('Next track')}><SkipForward size={17} /></button></div><label className="blog-music-volume">{volume ? <Volume2 size={16} /> : <VolumeX size={16} />}<input type="range" min="0" max="1" step=".05" value={volume} aria-label={t('Volume')} onChange={event => setVolume(Number(event.target.value))} /></label></div>
    <details className="blog-playlist"><summary><ListMusic size={14} />{t('The listening room')}<span>{String(index + 1).padStart(2,'0')} / 10</span></summary><ol>{tracks.map((item, number) => <li key={item.src}><button onClick={() => select(number)} aria-current={number === index ? 'true' : undefined}><span>{String(number + 1).padStart(2,'0')}</span>{item.title}{number === index && <Music2 size={13} />}</button></li>)}</ol><a className="blog-music-license" href="/blog/audio/credits.txt" target="_blank" rel="noopener noreferrer">Purrple Cat · CC BY-SA 4.0 ↗</a></details>
    {error && <p className="blog-stats-note" role="status">{t('Audio unavailable. Try the next track or play again.')}</p>}
  </section>;
}
