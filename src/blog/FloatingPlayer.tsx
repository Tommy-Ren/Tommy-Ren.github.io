import { useEffect, useRef, useState, type PointerEvent, type CSSProperties } from 'react';
import { GripVertical, Music2, Pause, Play, X } from 'lucide-react';
import { useLocale } from '../i18n/Locale';
import { useMusic } from './MusicContext';
import MusicPlayer from './MusicPlayer';
import TrackTitle from './TrackTitle';

type Position = {x:number;y:number};
export default function FloatingPlayer({ page }: { page:string }) {
  const {t,locale}=useLocale(), zh=locale==='zh';
  const {track,playing,toggle}=useMusic();
  const [expanded,setExpanded]=useState(false), [position,setPosition]=useState<Position|null>(null);
  const root=useRef<HTMLElement>(null), opener=useRef<HTMLButtonElement>(null), close=useRef<HTMLButtonElement>(null);
  const drag=useRef<{x:number;y:number;origin:Position}|null>(null);
  const clamp=(p:Position)=>({x:Math.max(8,Math.min(window.innerWidth-(root.current?.offsetWidth||240)-8,p.x)),y:Math.max(8,Math.min(window.innerHeight-64,p.y))});
  useEffect(()=>{setExpanded(false);},[page]);
  useEffect(()=>{if(expanded)close.current?.focus();},[expanded]);
  useEffect(()=>{const resize=()=>setPosition(p=>p?clamp(p):null);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  const start=(event:PointerEvent<HTMLButtonElement>)=>{if(event.button!==0)return;const rect=root.current!.getBoundingClientRect();drag.current={x:event.clientX,y:event.clientY,origin:{x:rect.left,y:rect.top}};event.currentTarget.setPointerCapture(event.pointerId);};
  const move=(event:PointerEvent<HTMLButtonElement>)=>{if(!drag.current)return;setPosition(clamp({x:drag.current.origin.x+event.clientX-drag.current.x,y:drag.current.origin.y+event.clientY-drag.current.y}));};
  if(page==='home')return null;
  const collapse=()=>{setExpanded(false);opener.current?.focus();};
  const rect=position || (typeof window!=='undefined'?{x:window.innerWidth-264,y:window.innerHeight-76}:{x:0,y:0});
  const above=typeof window!=='undefined' && rect.y>window.innerHeight/2;
  const panelStyle:CSSProperties & {'--panel-height'?:string}=typeof window==='undefined'?{}:{left:Math.max(8,Math.min(rect.x,window.innerWidth-328)),...(above?{bottom:window.innerHeight-rect.y+12}:{top:rect.y+62}),'--panel-height':`${Math.max(100,above?rect.y-24:window.innerHeight-rect.y-74)}px`};
  return <aside ref={root} className="blog-floating-player" style={position?{left:position.x,top:position.y,right:'auto',bottom:'auto'}:undefined} aria-label={t('Music player')} onKeyDown={e=>{if(e.key==='Escape')collapse();}}>
    {expanded&&<div id="blog-floating-panel" className="blog-floating-panel" style={panelStyle}><button ref={close} className="blog-player-close" aria-label={t('Collapse player')} onClick={collapse}><X size={17}/></button><MusicPlayer/></div>}
    <div className="blog-player-capsule" data-playing={playing}>
      <button className="blog-player-drag" aria-label={zh?'拖动播放器，或用方向键移动':'Drag player or use arrow keys to move'} title={zh?'拖动播放器':'Drag player'} onPointerDown={start} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{const offset:Record<string,[number,number]>={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};if(offset[e.key]){e.preventDefault();const r=root.current!.getBoundingClientRect();setPosition(clamp({x:r.left+offset[e.key][0],y:r.top+offset[e.key][1]}));}}}><GripVertical size={14}/></button>
      <button ref={opener} className="blog-player-open" aria-label={t(expanded?'Collapse player':'Expand player')} aria-expanded={expanded} aria-controls="blog-floating-panel" onClick={()=>setExpanded(v=>!v)}><span className="blog-mini-disc"><Music2 size={16}/></span><span><small>{t(playing?'NOW PLAYING':'STUDY RADIO')}</small><strong><TrackTitle title={track.title}/></strong></span></button>
      <button className="blog-capsule-play" onClick={toggle} aria-label={t(playing?'Pause':'Play')}>{playing?<Pause size={15}/>:<Play size={15}/>}</button>
    </div>
  </aside>;
}
