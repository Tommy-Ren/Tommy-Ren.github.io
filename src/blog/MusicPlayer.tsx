import TrackTitle from './TrackTitle';
import { useState } from 'react';
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, ListMusic, Repeat, Repeat1, Search, Shuffle } from 'lucide-react';
import { useLocale } from '../i18n/Locale';
import { useMusic } from './MusicContext';
import { tracks } from './music';
import type { PlaybackMode } from './playback-queue.mjs';

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function MusicPlayer() {
  const { t, locale } = useLocale();
  const zh = locale === 'zh';
  const { track, index, playing, position, duration, volume, error, mode, changeMode, toggle, next, seek, setVolume, select } = useMusic();
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const visibleTracks = tracks.map((item, number) => ({ item, number })).filter(({ item }) => `${item.title} ${item.artist} ${item.album ?? ''}`.toLocaleLowerCase().includes(search));
  const modes: { value: PlaybackMode; label: string; description: string; Icon: typeof Repeat }[] = [
    { value: 'sequential', label: zh ? '顺序' : 'In order', description: zh ? '按曲目顺序循环播放' : 'Play the playlist in order', Icon: Repeat },
    { value: 'shuffle', label: zh ? '随机' : 'Shuffle', description: zh ? '随机播放，每轮不重复' : 'Shuffle without repeats in each round', Icon: Shuffle },
    { value: 'repeat-one', label: zh ? '单曲' : 'Repeat 1', description: zh ? '循环当前歌曲' : 'Repeat this track', Icon: Repeat1 },
  ];

  return <section className="blog-card blog-music" aria-label={t('Music player')} data-playing={playing}>
    <div className="blog-card-top"><span className="blog-eyebrow">{t('STUDY RADIO')} / {tracks.length} {zh ? '首' : 'TRACKS'}</span><Music2 size={17} /></div>
    <div className="blog-music-now">
      <div className="blog-vinyl" aria-hidden="true"><img src={track.cover} alt="" /><i /></div>
      <div><span className="blog-music-status">{t(playing ? 'NOW PLAYING' : 'ON THE TURNTABLE')}</span><h2><TrackTitle title={track.title} /></h2><p><a href={track.sourceUrl} target="_blank" rel="noopener noreferrer">{track.artist}</a>{track.album && <> · {track.album}</>}</p></div>
    </div>
    <div className="blog-music-progress"><input type="range" min="0" max={duration || 1} step=".1" value={Math.min(position, duration || 1)} disabled={!duration} aria-label={t('Playback position')} onChange={event => seek(Number(event.target.value))} /><span>{time(position)}<span>{time(duration)}</span></span></div>
    <div className="blog-music-controls">
      <div><button onClick={() => next(-1)} aria-label={t('Previous track')}><SkipBack size={17} /></button><button className="blog-music-play" onClick={toggle} aria-label={t(playing ? 'Pause' : 'Play')} aria-pressed={playing}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button><button onClick={() => next(1)} aria-label={t('Next track')}><SkipForward size={17} /></button></div>
      <label className="blog-music-volume">{volume ? <Volume2 size={16} /> : <VolumeX size={16} />}<input type="range" min="0" max="1" step=".05" value={volume} aria-label={t('Volume')} onChange={event => setVolume(Number(event.target.value))} /></label>
    </div>
    <div className="blog-music-modes" role="group" aria-label={zh ? '播放模式' : 'Playback mode'}>{modes.map(({ value, label, description, Icon }) => <button key={value} type="button" aria-pressed={mode === value} title={description} onClick={() => changeMode(value)}><Icon size={13} /><span>{label}</span></button>)}</div>
    <details className="blog-playlist">
      <summary><ListMusic size={14} />{t('The listening room')}<span>{String(index + 1).padStart(2, '0')} / {tracks.length}</span></summary>
      <label className="blog-playlist-search"><Search size={14} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={zh ? '搜索歌曲、音乐人…' : 'Find a track or artist…'} aria-label={zh ? '搜索曲库' : 'Search the music library'} /><span>{visibleTracks.length}</span></label>
      <ol>{visibleTracks.map(({ item, number }) => <li key={item.id}><button onClick={() => select(number)} aria-current={number === index ? 'true' : undefined}><span>{String(number + 1).padStart(2, '0')}</span><span className="blog-playlist-track"><strong>{item.title}</strong><small>{item.artist}</small></span>{number === index && <Music2 size={13} />}</button></li>)}</ol>
      {!visibleTracks.length && <p className="blog-music-empty" role="status">{zh ? '没有找到这首歌，试试其他关键词。' : 'No tracks found. Try another search.'}</p>}
    </details>
    {error && <p className="blog-stats-note" role="status">{t('Audio unavailable. Try the next track or play again.')}</p>}
  </section>;
}
