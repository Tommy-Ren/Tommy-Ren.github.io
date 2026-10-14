import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Compass, Link2, Wrench, Layers } from 'lucide-react';
import { useLocale } from '../i18n/Locale';
import type { BlogLink } from './types';
import { bookmarkCategories, bookmarkCategory, bookmarkCategoryLabel, bookmarkUrl } from './bookmarks';
import './bookmarks.css';

export default function BookmarksNav({ resources, active }: { resources: BlogLink[]; active: boolean }) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const selected = active && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('category') || '' : '';
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  function keyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); toggle.current?.focus(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const focusLink = () => {
      const links = Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('.blog-bookmark-dropdown a') || []);
      const current = links.indexOf(document.activeElement as HTMLAnchorElement);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : current < 0 ? (event.key === 'ArrowUp' ? links.length - 1 : 0) : (current + (event.key === 'ArrowUp' ? -1 : 1) + links.length) % links.length;
      links[index]?.focus();
    };
    if (!open) { setOpen(true); requestAnimationFrame(focusLink); } else focusLink();
  }
  return <div className="blog-bookmark-nav" ref={root} onKeyDown={keyDown} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <a href={bookmarkUrl()} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>{t('收集')}</a>
    <button ref={toggle} className="blog-bookmark-toggle" aria-label={locale === 'en' ? 'Bookmark categories' : '收集分类'} aria-expanded={open} aria-controls="bookmark-categories" onClick={() => setOpen(value => !value)}><ChevronDown size={14} /></button>
    {open && <div id="bookmark-categories" className="blog-bookmark-dropdown">
      <a href={bookmarkUrl()} onClick={() => setOpen(false)} aria-current={active && !selected ? 'page' : undefined}><Layers size={16} /><span>{locale === 'en' ? 'All bookmarks' : '全部收集'}</span><small>{resources.length}</small></a>
      {bookmarkCategories(resources).map(category => {
        const Icon = category === 'tools' ? Wrench : category === 'leisure' ? Compass : Link2;
        return <a key={category} href={bookmarkUrl(category)} onClick={() => setOpen(false)} aria-current={active && selected === category ? 'page' : undefined}><Icon size={16} /><span>{bookmarkCategoryLabel(category, locale)}</span><small>{resources.filter(resource => bookmarkCategory(resource.kind) === category).length}</small></a>;
      })}
    </div>}
  </div>;
}
