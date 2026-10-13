import { useEffect, useRef, useState, type CSSProperties } from 'react';
export default function TrackTitle({ title }: { title:string }) {
  const box=useRef<HTMLSpanElement>(null), text=useRef<HTMLSpanElement>(null);
  const [overflow,setOverflow]=useState(0);
  useEffect(()=>{const measure=()=>setOverflow(Math.max(0,(text.current?.scrollWidth||0)-(box.current?.clientWidth||0)));const observer=new ResizeObserver(measure);if(box.current)observer.observe(box.current);if(text.current)observer.observe(text.current);measure();return()=>observer.disconnect();},[title]);
  return <span className="blog-track-title" ref={box} title={title} style={{'--title-travel':`-${overflow}px`,'--title-duration':`${Math.max(5,overflow/22)}s`} as CSSProperties}><span ref={text} className={overflow>0?'is-overflowing':''}>{title}</span></span>;
}
