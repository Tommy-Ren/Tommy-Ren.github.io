import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { tracks } from './music';

function usePlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const wantPlay = useRef(false);
  const generation = useRef(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(.4);
  const [error, setError] = useState(false);
  const track = tracks[index];
  const play = async () => {
    const ticket = generation.current;
    try { await audio.current?.play(); if (ticket === generation.current) setError(false); }
    catch (reason) { if (ticket === generation.current && wantPlay.current && !(reason instanceof DOMException && reason.name === 'AbortError')) { setError(true); wantPlay.current = false; } }
  };
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    generation.current++;
    element.load(); setPosition(0); setDuration(0); setError(false);
    if (wantPlay.current) void play();
    return () => { generation.current++; element.pause(); };
  }, [index]);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  const toggle = () => {
    if (!audio.current) return;
    wantPlay.current = audio.current.paused;
    if (wantPlay.current) void play(); else audio.current.pause();
  };
  const select = (value: number) => {
    wantPlay.current = true;
    if (value === index) void play(); else setIndex(value);
  };
  const next = (direction: number) => setIndex(value => (value + direction + tracks.length) % tracks.length);
  const seek = (value: number) => { if (audio.current) audio.current.currentTime = value; setPosition(value); };
  return { audio, wantPlay, index, playing, position, duration, volume, error, track, setPlaying, setPosition, setDuration, setVolume, setError, toggle, select, next, seek };
}
const MusicContext = createContext<ReturnType<typeof usePlayer> | null>(null);
export function MusicProvider({ children }: { children: ReactNode }) {
  const player = usePlayer();
  return <MusicContext.Provider value={player}>{children}
    <audio ref={player.audio} src={player.track.src} preload="metadata" data-blog-audio
      onPlay={() => player.setPlaying(true)} onPause={() => player.setPlaying(false)}
      onTimeUpdate={event => player.setPosition(event.currentTarget.currentTime)}
      onLoadedMetadata={event => player.setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onEnded={() => { player.wantPlay.current = true; player.next(1); }}
      onError={() => { player.setError(true); player.setPlaying(false); }} />
  </MusicContext.Provider>;
}
export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error('MusicProvider is required');
  return context;
}
