import { useLocale, LanguageSwitch } from '../i18n/Locale';
import { useEffect, useRef, useState, type ReactNode, type ComponentType } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen,
  ChevronLeft, ChevronRight, Code2, Github, Globe2, Mail, MapPin,
  Moon, Search, Sparkles, Sun, X,
} from 'lucide-react';
import { profile } from '../data/portfolio';
import type { BlogPageData, BlogPost, BlogPhoto, BlogLink, BlogSettings } from './types';
import { defaultBlogLinks, defaultBlogPhotos, defaultBlogSettings } from './defaults';
import { getFeedUrl, usesDatabase } from './backend';
import NeonPointer from './NeonPointer';
import MusicPlayer from './MusicPlayer';
import { MusicProvider } from './MusicContext';
import FloatingPlayer from './FloatingPlayer';
import StatisticsCard from './StatisticsCard';
import { loadStatistics } from './statistics';
import './blog.css';
import './home-widgets.css';

const navigation = [
  ['home', '首页'], ['articles', '文章'], ['photos', '相册'],
  ['collections', '收集'], ['about', '关于'],
] as const;
const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const articleUrl = (post: BlogPost) => usesDatabase() ? `/blog/articles/?post=${encodeURIComponent(post.slug)}` : `/blog/articles/${encodeURIComponent(post.slug)}/`;
const dateLabel = (date: string) => date.slice(0, 10).replaceAll('-', '.');

function ArrowLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  const { t, locale } = useLocale();
  return <a className={`blog-arrow-link ${className}`} href={href}>{children}<ArrowUpRight size={15} aria-hidden="true" /></a>;
}
function useVancouverTime() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 15000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
function vancouverDate(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}
function ClockCard({ now }: { now: Date | null }) {
  const { t, locale } = useLocale();
  const time = now ? new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).split(':') : ['--', '--'];
  const date = now ? vancouverDate(now) : null;
  const zone = now ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/Vancouver', timeZoneName: 'short' }).formatToParts(now).find((part) => part.type === 'timeZoneName')?.value : 'PACIFIC TIME';
  return <section className="blog-card blog-clock" aria-label={t("温哥华当地时间")}>
    <div className="blog-card-top"><span className="blog-eyebrow">{t("LOCAL TIME / VANCOUVER")}</span><Globe2 size={19} aria-hidden="true" /></div>
    <div className="blog-clock-digits" aria-live="off">{time[0]}<span>:</span>{time[1]}</div>
    <p className="blog-clock-date">{date ? `${date.year}.${String(date.month).padStart(2, '0')}.${String(date.day).padStart(2, '0')}` : t('此刻，在太平洋沿岸')}<span>·</span>{now ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-CA', { timeZone: 'America/Vancouver', weekday: 'short' }).format(now) : t('加拿大')}</p>
    <div className="blog-clock-zone"><i />{zone}<span>{t("49° N · 123° W")}</span></div>
  </section>;
}
function CalendarCard({ now }: { now: Date | null }) {
  const { t, locale } = useLocale();
  const [offset, setOffset] = useState(0);
  const date = now ? vancouverDate(now) : null;
  const cursor = date ? new Date(Date.UTC(date.year, date.month - 1 + offset, 1)) : null;
  const year = cursor?.getUTCFullYear();
  const month = cursor?.getUTCMonth();
  const blanks = cursor ? (cursor.getUTCDay() + 6) % 7 : 0;
  const days: (number | null)[] = cursor && month !== undefined && year !== undefined ? [...Array<null>(blanks).fill(null), ...Array.from({ length: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() }, (_, index) => index + 1)] : Array<null>(35).fill(null);
  return <section className="blog-card blog-calendar" aria-label={t("日历")}>
    <div className="blog-calendar-top"><div><h2>{month !== undefined ? locale === 'zh' ? monthNames[month] : new Intl.DateTimeFormat('en', {month:'long', timeZone:'UTC'}).format(cursor!) : t('日历')}</h2><span className="blog-eyebrow">{cursor ? new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(cursor).toUpperCase() : 'ONE DAY AT A TIME'}</span></div><div className="blog-month-controls"><button aria-label={t("上个月")} onClick={() => setOffset((value) => value - 1)} disabled={!now}><ChevronLeft size={17} /></button><span>{year ?? '—'}</span><button aria-label={t("下个月")} onClick={() => setOffset((value) => value + 1)} disabled={!now}><ChevronRight size={17} /></button></div></div>
    <div className="blog-calendar-grid">{(locale === 'zh' ? ['一', '二', '三', '四', '五', '六', '日'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']).map((day, index) => <span className="blog-weekday" key={`${day}-${index}`}>{day}</span>)}{days.map((day, index) => <span key={index} className={offset === 0 && day !== null && day === date?.day ? 'blog-today' : ''} aria-current={offset === 0 && day !== null && day === date?.day ? 'date' : undefined}>{day ?? <span aria-hidden="true">{"\u00a0"}</span>}</span>)}</div>
    <button className="blog-calendar-footer" onClick={() => setOffset(0)} disabled={!now}><i />{t(offset ? '回到今天' : '今天也适合开始。')}</button>
  </section>;
}
function Home({ posts, photos, resources, settings }: { posts: BlogPost[]; photos: BlogPhoto[]; resources: BlogLink[]; settings: BlogSettings }) {
  const { t, locale } = useLocale();
  const now = useVancouverTime();
  const featured = posts[0];
  const homeTitle = t(settings.home_title);
  const compactHero = homeTitle.split('\n').every(line => Array.from(line).length <= (locale === 'en' ? 18 : 8)) && t(settings.home_intro).length <= 165;
  return <div className="blog-bento">
    <div className="blog-bento-row blog-top-row">
      <section className={`blog-card blog-hero${compactHero ? '' : ' blog-hero-long'}`}>
        <span className="blog-eyebrow">{t("CODE · CURIOSITY · EVERYDAY")}</span>
        <h1>{homeTitle.split('\n').map((line, index) => <span key={index}>{index > 0 && <br />}{/[。.！!？?]$/.test(line) ? <>{line.slice(0, -1)}<b className="blog-hero-dot">{line.slice(-1)}</b></> : line}</span>)}</h1>
        <p className="blog-multiline">{t(settings.home_intro)}</p>
        <a className="blog-button blog-hero-button" href="/blog/about/">{t("认识我")}<ArrowUpRight size={16} aria-hidden="true" /></a>
        <a className="blog-hero-avatar" href="/blog/about/" aria-label={t("认识 Tommy")}><img src="/images/tommy-avatar.webp" alt={t("Tommy 的卡通头像")} width="1000" height="1080" /><span className="blog-orbit" aria-hidden="true"><i /><Sparkles size={24} /></span></a>
        <div className="blog-socials blog-hero-socials">{settings.github_url && <a href={settings.github_url} target="_blank" rel="noopener noreferrer"><Github size={16} />{t("GitHub")}</a>}{settings.linkedin_url && <a href={settings.linkedin_url} target="_blank" rel="noopener noreferrer">{t("LinkedIn")}<ArrowUpRight size={13} /></a>}<a href="/">{t("Portfolio")}<ArrowUpRight size={13} /></a>{settings.contact_email && <a href={`mailto:${settings.contact_email}`} aria-label={t('Email')}><Mail size={15} /><span>{t('Email')}</span></a>}</div><span className="blog-hero-side-note" aria-hidden="true">{t("A Little More Curious")}</span><span className="blog-hero-bottom-note">{t("A PERSONAL SPACE / TOMMY REN")}</span>
      </section>
      <a className="blog-card blog-photo-feature" href="/blog/photos/">
        {photos[0] ? <><img src={photos[0].image_url} alt={(photos[0].language ? photos[0].caption : t(photos[0].caption))} width="800" height="600" /><span className="blog-photo-label">{photos[0].is_own ? t('原创拍摄') : t(photos[0].credit)}</span><div className="blog-photo-caption"><div><h2>{(photos[0].language ? photos[0].title : t(photos[0].title))}</h2><span>{t("A LITTLE MOMENT")}</span></div><span className="blog-round-arrow"><ArrowUpRight size={22} aria-hidden="true" /></span></div></> : <div className="blog-photo-empty"><Sparkles size={36} /><h2>{t("日常的瞬间。")}</h2><p>{t("喜欢的画面，慢慢留下。")}</p></div>}
      </a>
      <ClockCard now={now} />
    </div>
    <div className="blog-bento-row blog-middle-row">
      <section className="blog-card blog-featured">
        <div className="blog-card-top"><span className="blog-eyebrow">{t("01 / FEATURED NOTE")}</span><ArrowLink href="/blog/articles/">{t("查看文章")}</ArrowLink></div>
        {featured ? <a className="blog-featured-link" href={articleUrl(featured)}><div className="blog-featured-heading"><h2>{featured.title}</h2><span>{featured.category}</span></div><p>{featured.summary}</p><div className="blog-note-window"><div className="blog-note-toolbar"><span><i /><i /><i /></span><span>{t("~/thoughts/")}{featured.slug}{t(".md")}</span><BookOpen size={13} /></div><div className="blog-note-content"><div className="blog-note-number" aria-hidden="true">01<br />02<br />03<br />04</div><div><span className="blog-note-comment">{t("// 从一个想法开始")}</span><strong>{featured.title}</strong><span className="blog-note-line">{featured.toc[0]?.title || t('把正在发生的事，慢慢写下来。')}</span><span className="blog-note-meta">{dateLabel(featured.date)} <span>·</span> {t("阅读约 ")}{featured.readingMinutes} {t("分钟 ")}<ArrowUpRight size={15} /></span></div></div></div></a> : <p className="blog-muted">{t("第一篇文字，正在酝酿中。")}</p>}
      </section>
      <section className="blog-card blog-recent"><div className="blog-card-top"><h2>{t("最近写下的")}</h2><ArrowLink href="/blog/articles/">{t("全部")}</ArrowLink></div><div className="blog-recent-list">{posts.slice(0, 3).map((post) => <a href={articleUrl(post)} key={post.slug}><img src={post.cover || photos[0]?.image_url || '/images/project-planets.svg'} alt="" width="140" height="100" loading="lazy" /><div><h3>{post.title}</h3><p>{post.summary}</p><span>{dateLabel(post.date)}</span></div></a>)}</div><p className="blog-card-footnote">{posts.length} {t("篇随笔，慢慢积累。")}</p></section>
      <CalendarCard now={now} />
    </div>
    <div className="blog-bento-row blog-bottom-row">
      <StatisticsCard />
      <section className="blog-card blog-home-collection"><div className="blog-card-top"><h2>{t("最近收集")}</h2><ArrowLink href="/blog/collections/">{t("全部")}</ArrowLink></div><div className="blog-resource-previews">{resources.slice(0, 2).map((resource) => <a className={`blog-resource-cover ${resource.color}`} href={resource.href} target="_blank" rel="noopener noreferrer" key={resource.id}><span>{resource.kind.split(' / ')[0]}</span><strong>{t(resource.title)}</strong><ArrowUpRight size={16} aria-hidden="true" /></a>)}</div><strong className="blog-collection-caption">{t("一些值得留下的灵感。")}</strong><p className="blog-card-footnote"><i />{t("文档 ")}<span>·</span>{t("工具 ")}<span>·</span>{t("学习")}</p></section>
      <MusicPlayer />
    </div>
  </div>;
}
function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  const { t, locale } = useLocale();
  return <div className="blog-page-heading"><div><span className="blog-eyebrow">{eyebrow}</span><h1>{title}<span>.</span></h1><p>{description}</p></div>{children}</div>;
}
function Articles({ posts }: { posts: BlogPost[] }) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部');
  const categories = ['全部', ...new Set(posts.map((post) => post.category))];
  const tags = ['全部', ...new Set(posts.flatMap((post) => post.tags))];
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = posts.filter((post) => (category === '全部' || post.category === category) && (tag === '全部' || post.tags.includes(tag)) && terms.every((term) => `${post.title} ${post.summary} ${post.category} ${post.tags.join(' ')}`.toLocaleLowerCase().includes(term)));
  const clear = () => { setQuery(''); setCategory('全部'); setTag('全部'); };
  useEffect(() => { setCategory('全部'); setTag('全部'); }, [locale]);
  return <>
    <PageHeading eyebrow={t("WORDS / NOTES / LITTLE DISCOVERIES")} title={t("最近写下的")} description={t("留下那些还在生长的想法。关于代码，也关于生活。")}><span className="blog-page-count"><strong>{posts.length.toString().padStart(2, '0')}</strong>{t("篇文字")}</span></PageHeading>
    <section className="blog-card blog-filters" aria-label={t("文章筛选")}><div className="blog-search"><Search size={18} aria-hidden="true" /><label className="blog-visually-hidden" htmlFor="blog-search">{t("搜索文章标题、摘要和标签")}</label><input id="blog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("搜索文章、想法或关键词…")} type="search" />{query && <button onClick={() => setQuery('')} aria-label={t("清除搜索")}><X size={17} /></button>}</div><div className="blog-filter-row"><span>{t("分类")}</span><div>{categories.map((item) => <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item}>{t(item)}</button>)}</div></div>{tags.length > 1 && <div className="blog-filter-row blog-tag-row"><span>{t("标签")}</span><div>{tags.map((item) => <button key={item} onClick={() => setTag(item)} aria-pressed={tag === item}>{item === '全部' ? t('全部') : `# ${item}`}</button>)}</div></div>}</section>
    <div className="blog-results-count" role="status">{filtered.length === posts.length ? t('全部文章') : locale === 'en' ? `${filtered.length} notes found` : `找到 ${filtered.length} 篇文章`}<span>{query || category !== '全部' || tag !== '全部' ? <button onClick={clear}>{t("重置筛选")}<X size={13} /></button> : t('从最新一篇开始。')}</span></div>
    {filtered.length ? <div className="blog-article-grid">{filtered.map((post, index) => <a href={articleUrl(post)} className="blog-card blog-article-card" key={post.slug}><div className="blog-article-cover"><img src={post.cover || '/images/project-planets.svg'} alt="" width="800" height="500" loading={index > 2 ? 'lazy' : 'eager'} /><span>{post.category}</span><i><ArrowUpRight size={20} aria-hidden="true" /></i></div><div className="blog-article-copy"><span className="blog-eyebrow">{dateLabel(post.date)}<span> / </span>{post.readingMinutes} {t("MIN READ")}</span><h2>{post.title}</h2><p>{post.summary}</p><div className="blog-post-tags">{post.tags.map((item) => <span key={item}># {item}</span>)}</div></div></a>)}</div> : <div className="blog-card blog-empty"><Search size={28} /><h2>{t("还没有找到这篇文字。")}</h2><p>{t("换个关键词，或清除筛选后看看其他文章。")}</p><button className="blog-button" onClick={clear}>{t("查看全部文章")}<ArrowRight size={16} /></button></div>}
  </>;
}
function Post({ post, posts, settings }: { post: BlogPost; posts: BlogPost[]; settings: BlogSettings }) {
  const { t, locale } = useLocale();
  const article = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState('');
  const index = posts.findIndex((item) => item.slug === post.slug);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const container = article.current;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      const available = Math.max(1, bounds.height - window.innerHeight + 150);
      setProgress(Math.round(Math.max(0, Math.min(1, (150 - bounds.top) / available)) * 100));
      const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id], h4[id]'));
      setActiveHeading(headings.filter((heading) => heading.getBoundingClientRect().top <= 180).at(-1)?.id || headings[0]?.id || '');
    };
    const queue = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => { window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); window.cancelAnimationFrame(frame); };
  }, [post.slug, post.html]);
  return <>
    <div className="blog-reading-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
    <a className="blog-back-link" href="/blog/articles/"><ArrowLeft size={16} />{t("全部文章")}</a>
    <div className="blog-reading-layout">
      <article className="blog-card blog-post" lang={post.language === 'zh' ? 'zh-CN' : post.language}>
        <header className="blog-post-header"><span className="blog-eyebrow">{post.category} / {dateLabel(post.date)}</span><h1>{post.title}</h1><p className="blog-post-summary">{post.summary}</p><div className="blog-author"><img src="/images/tommy-avatar.webp" alt="" width="44" height="44" /><span><strong>{settings.display_name}</strong><span>{t("阅读约 ")}{post.readingMinutes} {t("分钟")}</span></span><div className="blog-post-tags">{post.tags.map((tag) => <span key={tag}># {tag}</span>)}</div></div></header>
        {post.translationProvider && <p className="blog-translation-note" lang={locale}>{locale === 'en' ? (post.translationProvider === 'deepl' ? 'Translated from Chinese with DeepL.' : 'English translation · Original in Chinese.') : (post.translationProvider === 'deepl' ? '由 DeepL 从英文翻译。' : '中文译文 · 原文为英文')}{' '}{locale === 'en' ? 'Switch to 中文 to read the original.' : '切换 EN 可阅读原文。'}</p>}
        {post.language && post.language !== locale && <p className="blog-translation-note" lang={locale}>{locale === 'en' ? 'An English translation is not available yet. Showing the Chinese original.' : '中文译文尚未就绪，当前显示英文原文。'}</p>}
        {post.cover && <img className="blog-post-cover" src={post.cover} alt={t("文章封面")} width="1000" height="550" />}
        <div ref={article} className="blog-prose" dangerouslySetInnerHTML={{ __html: post.html }} />
        <div className="blog-post-end"><Sparkles size={18} /><p>{t("感谢读到这里。下一个想法，再见。")}</p>{settings.contact_email && <a href={`mailto:${settings.contact_email}?subject=${encodeURIComponent(`关于文章：${post.title}`)}`}>{t("与我聊聊")}<ArrowUpRight size={15} /></a>}</div>
        <nav className="blog-adjacent-posts" aria-label={t("相邻文章")}>{posts[index + 1] ? <a href={articleUrl(posts[index + 1])}><span><ArrowLeft size={14} />{t("上一篇")}</span><strong>{posts[index + 1].title}</strong></a> : <div />} {posts[index - 1] ? <a href={articleUrl(posts[index - 1])}><span>{t("下一篇")}<ArrowRight size={14} /></span><strong>{posts[index - 1].title}</strong></a> : <div />}</nav>
      </article>
      <aside className="blog-reading-sidebar"><div className="blog-card blog-toc"><span className="blog-eyebrow">{t("ON THIS PAGE")}</span><h2>{t("这一页")}</h2>{post.toc.length ? <nav aria-label={t("文章目录")}>{post.toc.map((heading) => <a className={heading.level >= 3 ? `blog-toc-child blog-toc-level-${heading.level}` : ''} href={`#${heading.id}`} key={heading.id} aria-current={activeHeading === heading.id ? 'location' : undefined}>{heading.title}</a>)}</nav> : <p className="blog-muted">{t("一篇短短的随笔。")}</p>}<div className="blog-toc-progress"><span>{t("阅读进度")}</span><span>{progress}%</span></div><a className="blog-toc-top" href="#blog-main"><ArrowUp size={14} />{t("回到顶部")}</a></div><div className="blog-reading-note"><span className="blog-eyebrow">{t("A NOTE TO MYSELF")}</span><p>{t("写下来，")}<br />{t("也是一次重新理解。")}</p></div></aside>
    </div>
  </>;
}
function Photos({ photos, local }: { photos: BlogPhoto[]; local: boolean }) {
  const { t, locale } = useLocale();
  return <><PageHeading eyebrow={t("VISUAL INSPIRATION / A LITTLE MOMENT")} title={t("日常的灵感")} description={t("先留一些喜欢的画面。树影、海风、山的轮廓。")} />{local ? <p className="blog-photo-disclosure">{t("这里暂时展示来自 Unsplash 的精选示例素材，并非我的旅行实拍。")}<a href="/blog/assets/sources.json" target="_blank" rel="noopener noreferrer">{t("查看素材来源")}<ArrowUpRight size={14} /></a></p> : photos.some(photo => !photo.is_own) && <p className="blog-photo-disclosure">{t("参考素材保留来源署名，原创照片单独标记。")}</p>}<div className="blog-album">{photos.map((photo, index) => <figure className="blog-card blog-album-tile" key={photo.id}><a href={photo.source_url || photo.image_url} target="_blank" rel="noopener noreferrer" aria-label={locale === 'en' ? `View ${photo.title}${photo.source_url ? ' image source' : ''}` : `查看「${photo.title}」的图片${photo.source_url ? '来源' : ''}`}><img src={photo.image_url} alt={(photo.language ? photo.caption : t(photo.caption))} width="900" height="1100" /><span className="blog-album-badge">{String(index + 1).padStart(2, '0')} / {photo.is_own ? 'MY PHOTO' : 'INSPIRATION'}</span><span className="blog-round-arrow"><ArrowUpRight size={23} /></span></a><figcaption lang={photo.language === 'zh' ? 'zh-CN' : photo.language}><h2>{(photo.language ? photo.title : t(photo.title))}</h2><p>{(photo.language ? photo.caption : t(photo.caption))}</p><span>{photo.is_own ? t('原创拍摄') : t(photo.credit)}</span></figcaption></figure>)}</div>{!photos.length && <div className="blog-card blog-empty"><Sparkles size={28} /><h2>{t("照片，慢慢积累。")}</h2><p>{t("有了新的画面，会在这里与你分享。")}</p></div>}<div className="blog-album-note"><MapPin size={19} /><p>{t("属于我的旅途故事，在")}<a href="/#path"> {t("My Path ")}</a>{t("里继续。")}</p><ArrowLink href="/#path">{t("去看看")}</ArrowLink></div></>;
}
function Collections({ resources }: { resources: BlogLink[] }) {
  const { t, locale } = useLocale();
  return <><PageHeading eyebrow={t("LINKS / TOOLS / INSPIRATION")} title={t("一些值得留下的")} description={t("给好奇心准备一个书签。喜欢的工具、文档，以及想继续探索的方向。")} /><div className="blog-collection-grid">{resources.map((resource, index) => <a className="blog-card blog-resource" href={resource.href} target="_blank" rel="noopener noreferrer" key={resource.id}><div className={`blog-resource-art ${resource.color}`}><span className="blog-eyebrow">{resource.kind}</span><strong>{resource.symbol}</strong><span className="blog-resource-art-bottom">{t("KEEP EXPLORING ")}<ArrowUpRight size={22} /></span></div><div className="blog-resource-copy"><span className="blog-eyebrow">0{index + 1} {t("/ BOOKMARK")}</span><h2>{t(resource.title)}<ArrowUpRight size={19} /></h2><p>{t(resource.description)}</p><span className="blog-resource-domain">{new URL(resource.href).hostname}</span></div></a>)}</div><div className="blog-card blog-collection-note"><Sparkles size={21} /><div><h2>{t("还在慢慢收集。")}</h2><p>{t("遇到一个好工具，读懂一个新概念，都值得留下来。")}</p></div></div></>;
}
function About({ settings }: { settings: BlogSettings }) {
  const { t, locale } = useLocale();
  return <><PageHeading eyebrow={t("HELLO / THIS IS TOMMY")} title={t(settings.about_title)} description={t("写代码，也喜欢看看世界。很高兴你来到这个小小的空间。")} /><div className="blog-about-layout"><section className="blog-card blog-about-intro"><div className="blog-about-portrait"><img src="/images/tommy-avatar.webp" alt={t("Tommy 的卡通头像")} width="1000" height="1080" /><span><i />{t("BURNABY, BC")}</span></div><div><span className="blog-eyebrow">{t("STUDENT · DEVELOPER · EXPLORER")}</span><h2>{t("Hi, I’m ")}{settings.display_name}<span>.</span></h2>{t(settings.about_bio).split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p className="blog-multiline" key={index}>{paragraph}</p>)}<div className="blog-about-links"><a className="blog-button" href="/">{t("我的个人主页")}<ArrowUpRight size={15} /></a>{settings.contact_email && <a className="blog-outline-button blog-button" href={`mailto:${settings.contact_email}`}>{t("打个招呼")}<Mail size={15} /></a>}</div></div></section><section className="blog-card blog-about-education"><span className="blog-eyebrow">{t("LEARNING / STILL IN PROGRESS")}</span><h2>{t("我的学习路径")}</h2>{profile.education.map((education) => <div className="blog-education-item" key={education.school}><span>{t(education.period)}</span><h3>{t(education.school)}</h3><strong>{t(education.degree)}</strong><p>{t(education.detail)}</p></div>)}<ArrowLink href="/#path">{t("更完整的旅程")}</ArrowLink></section><section className="blog-card blog-about-interests"><span className="blog-eyebrow">{t("THINGS I LIKE TO BUILD")}</span><h2>{t("把好奇心变成实践。")}</h2><div>{[['Backend & Systems', '理解接口、数据与系统的连接。'], ['Applied AI', '让模型走进可以使用的工作流。'], ['Web & Interactive', '做有意思、也好用的交互。'], ['Games & Graphics', '让代码变得可见、可玩。']].map(([title, detail]) => <div key={title}><Code2 size={19} /><h3>{t(title)}</h3><p>{t(detail)}</p></div>)}</div></section></div></>;
}
function NotFound() {
  const { t, locale } = useLocale();
  return <div className="blog-card blog-empty blog-not-found"><span className="blog-eyebrow">{t("404 / A SMALL DETOUR")}</span><h1>{t("这一页，还没写下。")}</h1><p>{t("也许链接走岔了。回到首页，继续探索吧。")}</p><a className="blog-button" href="/blog/home/">{t("回到博客首页")}<ArrowRight size={16} /></a></div>;
}

function AdminLoader() {
  const { t, locale } = useLocale();
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    import('./admin/AdminApp').then(module => { if (active) setComponent(() => module.default); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (Component) return <Component />;
  return <div className="blog-card blog-empty" role="status"><h1>{t(failed ? '后台暂时没有打开。' : '正在打开管理后台。')}</h1><p>{t(failed ? '请刷新后重试。' : '稍等片刻。')}</p>{failed && <button className="blog-button" onClick={() => window.location.reload()}>{t("重新加载")}</button>}</div>;
}

export default function BlogApp({ data, onRetry }: { data: BlogPageData; onRetry?: () => void }) {
  return <MusicProvider><BlogShell data={data} onRetry={onRetry} /></MusicProvider>;
}
function BlogShell({ data, onRetry }: { data: BlogPageData; onRetry?: () => void }) {
  const { t, locale } = useLocale();
  const settings = data.content.settings ?? defaultBlogSettings;
  const photos = data.content.photos ?? defaultBlogPhotos;
  const resources = data.content.links ?? defaultBlogLinks;
  const feedUrl = getFeedUrl();
  const [theme, setTheme] = useState<'midnight' | 'fresh'>('midnight');
  const page = data.route.page;
  useEffect(() => { if (page !== 'admin' && usesDatabase()) void loadStatistics().catch(() => {}); }, [page]);
  const post = page === 'post' ? data.content.posts.find((item) => item.slug === data.route.slug) : undefined;
  useEffect(() => {
    try { const saved = localStorage.getItem('tommy-blog-theme'); if (saved === 'midnight' || saved === 'fresh') setTheme(saved); } catch { /* The default palette also works without storage. */ }
  }, []);
  const toggleTheme = () => {
    const next = theme === 'midnight' ? 'fresh' : 'midnight';
    setTheme(next);
    try { localStorage.setItem('tommy-blog-theme', next); } catch { /* Keep the current theme for this visit. */ }
  };
  return <div className="blog-root" data-theme={theme}>
    <NeonPointer />
    <FloatingPlayer page={page} />
    <a className="blog-skip-link" href="#blog-main">{t("跳到页面内容")}</a>
    <div className="blog-shell"><header className="blog-header"><a className="blog-brand" href="/blog/home/" aria-label={t("Tommy 博客首页")}>{t("tommy")}<span>.</span><small>{t("THE BLOG")}</small></a><nav aria-label={t("博客导航")}>{navigation.map(([key, label]) => <a href={`/blog/${key}/`} key={key} aria-current={page === key || key === 'articles' && page === 'post' ? 'page' : undefined}>{t(label)}</a>)}</nav><div className="blog-header-actions"><LanguageSwitch /><span className="blog-location"><i />{t("VANCOUVER, CA")}</span><button className="blog-theme-toggle" aria-label={t(theme === 'midnight' ? '切换到清新浅色主题' : '切换到午夜紫色主题')} onClick={toggleTheme}>{theme === 'midnight' ? <Sun size={17} /> : <Moon size={17} />}</button><a className="blog-portfolio-link" href="/">{t("个人主页")}<ArrowUpRight size={15} aria-hidden="true" /></a></div></header>
      <main id="blog-main" tabIndex={-1} className={`blog-main blog-page-${page}`}>{page !== 'admin' && data.live?.status === 'loading' ? <div className="blog-card blog-empty blog-live-status" role="status"><Sparkles size={28} /><h1>{t("正在打开博客。")}</h1><p>{t("稍等片刻，文字即将到来。")}</p></div> : page !== 'admin' && data.live?.status === 'error' ? <div className="blog-card blog-empty blog-live-status" role="alert"><h1>{t("稍后再读。")}</h1><p>{t(data.live.message || '博客内容暂时没有加载成功，请稍后再试。')}</p><button className="blog-button" onClick={onRetry}>{t("重新加载")}<ArrowRight size={16} /></button></div> : page === 'admin' ? <AdminLoader /> : page === 'home' ? <Home posts={data.content.posts} photos={photos} resources={resources} settings={settings} /> : page === 'articles' ? <Articles posts={data.content.posts} /> : page === 'post' && post ? <Post post={post} posts={data.content.posts} settings={settings} /> : page === 'photos' ? <Photos photos={photos} local={data.content.source !== 'supabase'} /> : page === 'collections' ? <Collections resources={resources} /> : page === 'about' ? <About settings={settings} /> : <NotFound />}</main>
      <footer className="blog-footer"><span>© {settings.display_name} <span className="blog-footer-divider">/</span> {t("好奇心，慢慢生长。")}</span><div><a href="/blog/credits.html">{t("素材说明")}</a><a href="/blog/admin/">{t("管理")}</a>{feedUrl && <a href={feedUrl} aria-label={t("订阅博客 RSS")}>{t("RSS")}</a>}<a href="https://github.com/snowhejia/momo-blog" target="_blank" rel="noopener noreferrer">{t("Inspired by momo-blog")}<ArrowUpRight size={12} /></a><span className="blog-footer-star" aria-hidden="true">✳</span></div></footer>
    </div>
  </div>;
}
