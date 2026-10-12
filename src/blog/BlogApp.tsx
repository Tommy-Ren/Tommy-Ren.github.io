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
import './blog.css';

const navigation = [
  ['home', '首页'], ['articles', '文章'], ['photos', '相册'],
  ['collections', '收集'], ['about', '关于'],
] as const;
const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const articleUrl = (post: BlogPost) => usesDatabase() ? `/blog/articles/?post=${encodeURIComponent(post.slug)}` : `/blog/articles/${encodeURIComponent(post.slug)}/`;
const dateLabel = (date: string) => date.slice(0, 10).replaceAll('-', '.');

function ArrowLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
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
  const time = now ? new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).split(':') : ['--', '--'];
  const date = now ? vancouverDate(now) : null;
  const zone = now ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/Vancouver', timeZoneName: 'short' }).formatToParts(now).find((part) => part.type === 'timeZoneName')?.value : 'PACIFIC TIME';
  return <section className="blog-card blog-clock" aria-label="温哥华当地时间">
    <div className="blog-card-top"><span className="blog-eyebrow">LOCAL TIME / VANCOUVER</span><Globe2 size={19} aria-hidden="true" /></div>
    <div className="blog-clock-digits" aria-live="off">{time[0]}<span>:</span>{time[1]}</div>
    <p className="blog-clock-date">{date ? `${date.year}.${String(date.month).padStart(2, '0')}.${String(date.day).padStart(2, '0')}` : '此刻，在太平洋沿岸'}<span>·</span>{now ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Vancouver', weekday: 'short' }).format(now) : '加拿大'}</p>
    <div className="blog-clock-zone"><i />{zone}<span>49° N · 123° W</span></div>
  </section>;
}
function CalendarCard({ now }: { now: Date | null }) {
  const [offset, setOffset] = useState(0);
  const date = now ? vancouverDate(now) : null;
  const cursor = date ? new Date(Date.UTC(date.year, date.month - 1 + offset, 1)) : null;
  const year = cursor?.getUTCFullYear();
  const month = cursor?.getUTCMonth();
  const blanks = cursor ? (cursor.getUTCDay() + 6) % 7 : 0;
  const days: (number | null)[] = cursor && month !== undefined && year !== undefined ? [...Array<null>(blanks).fill(null), ...Array.from({ length: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() }, (_, index) => index + 1)] : Array<null>(35).fill(null);
  return <section className="blog-card blog-calendar" aria-label="日历">
    <div className="blog-calendar-top"><div><h2>{month !== undefined ? monthNames[month] : '日历'}</h2><span className="blog-eyebrow">{cursor ? new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(cursor).toUpperCase() : 'ONE DAY AT A TIME'}</span></div><div className="blog-month-controls"><button aria-label="上个月" onClick={() => setOffset((value) => value - 1)} disabled={!now}><ChevronLeft size={17} /></button><span>{year ?? '—'}</span><button aria-label="下个月" onClick={() => setOffset((value) => value + 1)} disabled={!now}><ChevronRight size={17} /></button></div></div>
    <div className="blog-calendar-grid">{['一', '二', '三', '四', '五', '六', '日'].map((day) => <span className="blog-weekday" key={day}>{day}</span>)}{days.map((day, index) => <span key={index} className={offset === 0 && day !== null && day === date?.day ? 'blog-today' : ''} aria-current={offset === 0 && day !== null && day === date?.day ? 'date' : undefined}>{day ?? <span aria-hidden="true">&nbsp;</span>}</span>)}</div>
    <button className="blog-calendar-footer" onClick={() => setOffset(0)} disabled={!now}><i />{offset ? '回到今天' : '今天也适合开始。'}</button>
  </section>;
}
function Home({ posts, photos, resources, settings }: { posts: BlogPost[]; photos: BlogPhoto[]; resources: BlogLink[]; settings: BlogSettings }) {
  const now = useVancouverTime();
  const featured = posts[0];
  const compactHero = settings.home_title.split('\n').every(line => Array.from(line).length <= 8) && settings.home_intro.length <= 85;
  return <div className="blog-bento">
    <div className="blog-bento-row blog-top-row">
      <section className={`blog-card blog-hero${compactHero ? '' : ' blog-hero-long'}`}>
        <span className="blog-eyebrow">CODE · CURIOSITY · EVERYDAY</span>
        <h1>{settings.home_title.split('\n').map((line, index) => <span key={index}>{index > 0 && <br />}{/[。.！!？?]$/.test(line) ? <>{line.slice(0, -1)}<b className="blog-hero-dot">{line.slice(-1)}</b></> : line}</span>)}</h1>
        <p className="blog-multiline">{settings.home_intro}</p>
        <a className="blog-button blog-hero-button" href="/blog/about/">认识我<ArrowUpRight size={16} aria-hidden="true" /></a>
        <a className="blog-hero-avatar" href="/blog/about/" aria-label="认识 Tommy"><img src="/images/tommy-avatar.webp" alt="Tommy 的卡通头像" width="1000" height="1080" /><span className="blog-orbit" aria-hidden="true"><i /><Sparkles size={24} /></span></a>
        <span className="blog-hero-side-note" aria-hidden="true">A Little More Curious</span><span className="blog-hero-bottom-note">A PERSONAL SPACE / TOMMY REN</span>
      </section>
      <a className="blog-card blog-photo-feature" href="/blog/photos/">
        {photos[0] ? <><img src={photos[0].image_url} alt={photos[0].caption} width="800" height="600" /><span className="blog-photo-label">{photos[0].is_own ? '原创拍摄' : photos[0].credit}</span><div className="blog-photo-caption"><div><h2>{photos[0].title}</h2><span>A LITTLE MOMENT</span></div><span className="blog-round-arrow"><ArrowUpRight size={22} aria-hidden="true" /></span></div></> : <div className="blog-photo-empty"><Sparkles size={36} /><h2>日常的瞬间。</h2><p>喜欢的画面，慢慢留下。</p></div>}
      </a>
      <ClockCard now={now} />
    </div>
    <div className="blog-bento-row blog-middle-row">
      <section className="blog-card blog-featured">
        <div className="blog-card-top"><span className="blog-eyebrow">01 / FEATURED NOTE</span><ArrowLink href="/blog/articles/">查看文章</ArrowLink></div>
        {featured ? <a className="blog-featured-link" href={articleUrl(featured)}><div className="blog-featured-heading"><h2>{featured.title}</h2><span>{featured.category}</span></div><p>{featured.summary}</p><div className="blog-note-window"><div className="blog-note-toolbar"><span><i /><i /><i /></span><span>~/thoughts/{featured.slug}.md</span><BookOpen size={13} /></div><div className="blog-note-content"><div className="blog-note-number" aria-hidden="true">01<br />02<br />03<br />04</div><div><span className="blog-note-comment">// 从一个想法开始</span><strong>{featured.title}</strong><span className="blog-note-line">{featured.toc[0]?.title || '把正在发生的事，慢慢写下来。'}</span><span className="blog-note-meta">{dateLabel(featured.date)} <span>·</span> 阅读约 {featured.readingMinutes} 分钟 <ArrowUpRight size={15} /></span></div></div></div></a> : <p className="blog-muted">第一篇文字，正在酝酿中。</p>}
      </section>
      <section className="blog-card blog-recent"><div className="blog-card-top"><h2>最近写下的</h2><ArrowLink href="/blog/articles/">全部</ArrowLink></div><div className="blog-recent-list">{posts.slice(0, 3).map((post) => <a href={articleUrl(post)} key={post.slug}><img src={post.cover || photos[0]?.image_url || '/images/project-planets.svg'} alt="" width="140" height="100" loading="lazy" /><div><h3>{post.title}</h3><p>{post.summary}</p><span>{dateLabel(post.date)}</span></div></a>)}</div><p className="blog-card-footnote">{posts.length} 篇随笔，慢慢积累。</p></section>
      <CalendarCard now={now} />
    </div>
    <div className="blog-bento-row blog-bottom-row">
      <section className="blog-card blog-journey"><span className="blog-eyebrow">SOMEWHERE ALONG THE WAY</span><h2>从武汉，走向更大的世界。</h2><p>一段跨越太平洋的学习旅程，也是一段持续探索的过程。</p><div className="blog-journey-stops"><div><span>01 / 出发</span><strong>Wuhan</strong><small>武汉外校</small></div><ArrowRight size={17} aria-hidden="true" /><div><span>02 / 探索</span><strong>BCIT</strong><small>CST Diploma</small></div><ArrowRight size={17} aria-hidden="true" /><div><span>03 / 继续</span><strong>SFU</strong><small>Computing Science</small></div></div><ArrowLink href="/#path">我的完整路径</ArrowLink></section>
      <section className="blog-card blog-home-collection"><div className="blog-card-top"><h2>最近收集</h2><ArrowLink href="/blog/collections/">全部</ArrowLink></div><div className="blog-resource-previews">{resources.slice(0, 2).map((resource) => <a className={`blog-resource-cover ${resource.color}`} href={resource.href} target="_blank" rel="noopener noreferrer" key={resource.title}><span>{resource.kind.split(' / ')[0]}</span><strong>{resource.title}</strong><ArrowUpRight size={16} aria-hidden="true" /></a>)}</div><strong className="blog-collection-caption">一些值得留下的灵感。</strong><p className="blog-card-footnote"><i />文档 <span>·</span>工具 <span>·</span>学习</p></section>
      <section className="blog-card blog-hello"><div className="blog-card-top"><span className="blog-eyebrow">LET'S CONNECT</span><Sparkles size={21} aria-hidden="true" /></div><h2>很高兴，在这里遇见你。</h2><p>聊聊代码，分享一个点子，<br />或只是打声招呼。</p>{settings.contact_email && <a className="blog-button blog-outline-button" href={`mailto:${settings.contact_email}`}>写封邮件<Mail size={15} aria-hidden="true" /></a>}<div className="blog-socials">{settings.github_url && <a href={settings.github_url} target="_blank" rel="noopener noreferrer"><Github size={16} />GitHub</a>}{settings.linkedin_url && <a href={settings.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn<ArrowUpRight size={13} /></a>}<a href="/">Portfolio<ArrowUpRight size={13} /></a></div></section>
    </div>
  </div>;
}
function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <div className="blog-page-heading"><div><span className="blog-eyebrow">{eyebrow}</span><h1>{title}<span>.</span></h1><p>{description}</p></div>{children}</div>;
}
function Articles({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部');
  const categories = ['全部', ...new Set(posts.map((post) => post.category))];
  const tags = ['全部', ...new Set(posts.flatMap((post) => post.tags))];
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = posts.filter((post) => (category === '全部' || post.category === category) && (tag === '全部' || post.tags.includes(tag)) && terms.every((term) => `${post.title} ${post.summary} ${post.category} ${post.tags.join(' ')}`.toLocaleLowerCase().includes(term)));
  const clear = () => { setQuery(''); setCategory('全部'); setTag('全部'); };
  return <>
    <PageHeading eyebrow="WORDS / NOTES / LITTLE DISCOVERIES" title="最近写下的" description="留下那些还在生长的想法。关于代码，也关于生活。"><span className="blog-page-count"><strong>{posts.length.toString().padStart(2, '0')}</strong>篇文字</span></PageHeading>
    <section className="blog-card blog-filters" aria-label="文章筛选"><div className="blog-search"><Search size={18} aria-hidden="true" /><label className="blog-visually-hidden" htmlFor="blog-search">搜索文章标题、摘要和标签</label><input id="blog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文章、想法或关键词…" type="search" />{query && <button onClick={() => setQuery('')} aria-label="清除搜索"><X size={17} /></button>}</div><div className="blog-filter-row"><span>分类</span><div>{categories.map((item) => <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</button>)}</div></div>{tags.length > 1 && <div className="blog-filter-row blog-tag-row"><span>标签</span><div>{tags.map((item) => <button key={item} onClick={() => setTag(item)} aria-pressed={tag === item}>{item === '全部' ? '全部' : `# ${item}`}</button>)}</div></div>}</section>
    <div className="blog-results-count" role="status">{filtered.length === posts.length ? '全部文章' : `找到 ${filtered.length} 篇文章`}<span>{query || category !== '全部' || tag !== '全部' ? <button onClick={clear}>重置筛选<X size={13} /></button> : '从最新一篇开始。'}</span></div>
    {filtered.length ? <div className="blog-article-grid">{filtered.map((post, index) => <a href={articleUrl(post)} className="blog-card blog-article-card" key={post.slug}><div className="blog-article-cover"><img src={post.cover || '/images/project-planets.svg'} alt="" width="800" height="500" loading={index > 2 ? 'lazy' : 'eager'} /><span>{post.category}</span><i><ArrowUpRight size={20} aria-hidden="true" /></i></div><div className="blog-article-copy"><span className="blog-eyebrow">{dateLabel(post.date)}<span> / </span>{post.readingMinutes} MIN READ</span><h2>{post.title}</h2><p>{post.summary}</p><div className="blog-post-tags">{post.tags.map((item) => <span key={item}># {item}</span>)}</div></div></a>)}</div> : <div className="blog-card blog-empty"><Search size={28} /><h2>还没有找到这篇文字。</h2><p>换个关键词，或清除筛选后看看其他文章。</p><button className="blog-button" onClick={clear}>查看全部文章<ArrowRight size={16} /></button></div>}
  </>;
}
function Post({ post, posts, settings }: { post: BlogPost; posts: BlogPost[]; settings: BlogSettings }) {
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
  }, [post.slug]);
  return <>
    <div className="blog-reading-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
    <a className="blog-back-link" href="/blog/articles/"><ArrowLeft size={16} />全部文章</a>
    <div className="blog-reading-layout">
      <article className="blog-card blog-post">
        <header className="blog-post-header"><span className="blog-eyebrow">{post.category} / {dateLabel(post.date)}</span><h1>{post.title}</h1><p className="blog-post-summary">{post.summary}</p><div className="blog-author"><img src="/images/tommy-avatar.webp" alt="" width="44" height="44" /><span><strong>{settings.display_name}</strong><span>阅读约 {post.readingMinutes} 分钟</span></span><div className="blog-post-tags">{post.tags.map((tag) => <span key={tag}># {tag}</span>)}</div></div></header>
        {post.cover && <img className="blog-post-cover" src={post.cover} alt="文章封面" width="1000" height="550" />}
        <div ref={article} className="blog-prose" dangerouslySetInnerHTML={{ __html: post.html }} />
        <div className="blog-post-end"><Sparkles size={18} /><p>感谢读到这里。下一个想法，再见。</p>{settings.contact_email && <a href={`mailto:${settings.contact_email}?subject=${encodeURIComponent(`关于文章：${post.title}`)}`}>与我聊聊<ArrowUpRight size={15} /></a>}</div>
        <nav className="blog-adjacent-posts" aria-label="相邻文章">{posts[index + 1] ? <a href={articleUrl(posts[index + 1])}><span><ArrowLeft size={14} />上一篇</span><strong>{posts[index + 1].title}</strong></a> : <div />} {posts[index - 1] ? <a href={articleUrl(posts[index - 1])}><span>下一篇<ArrowRight size={14} /></span><strong>{posts[index - 1].title}</strong></a> : <div />}</nav>
      </article>
      <aside className="blog-reading-sidebar"><div className="blog-card blog-toc"><span className="blog-eyebrow">ON THIS PAGE</span><h2>这一页</h2>{post.toc.length ? <nav aria-label="文章目录">{post.toc.map((heading) => <a className={heading.level >= 3 ? `blog-toc-child blog-toc-level-${heading.level}` : ''} href={`#${heading.id}`} key={heading.id} aria-current={activeHeading === heading.id ? 'location' : undefined}>{heading.title}</a>)}</nav> : <p className="blog-muted">一篇短短的随笔。</p>}<div className="blog-toc-progress"><span>阅读进度</span><span>{progress}%</span></div><a className="blog-toc-top" href="#blog-main"><ArrowUp size={14} />回到顶部</a></div><div className="blog-reading-note"><span className="blog-eyebrow">A NOTE TO MYSELF</span><p>写下来，<br />也是一次重新理解。</p></div></aside>
    </div>
  </>;
}
function Photos({ photos, local }: { photos: BlogPhoto[]; local: boolean }) {
  return <><PageHeading eyebrow="VISUAL INSPIRATION / A LITTLE MOMENT" title="日常的灵感" description="先留一些喜欢的画面。树影、海风、山的轮廓。" />{local ? <p className="blog-photo-disclosure">这里暂时展示来自 Unsplash 的精选示例素材，并非我的旅行实拍。<a href="/blog/assets/sources.json" target="_blank" rel="noopener noreferrer">查看素材来源<ArrowUpRight size={14} /></a></p> : photos.some(photo => !photo.is_own) && <p className="blog-photo-disclosure">参考素材保留来源署名，原创照片单独标记。</p>}<div className="blog-album">{photos.map((photo, index) => <figure className="blog-card blog-album-tile" key={photo.id}><a href={photo.source_url || photo.image_url} target="_blank" rel="noopener noreferrer" aria-label={`查看「${photo.title}」的图片${photo.source_url ? '来源' : ''}`}><img src={photo.image_url} alt={photo.caption} width="900" height="1100" /><span className="blog-album-badge">{String(index + 1).padStart(2, '0')} / {photo.is_own ? 'MY PHOTO' : 'INSPIRATION'}</span><span className="blog-round-arrow"><ArrowUpRight size={23} /></span></a><figcaption><h2>{photo.title}</h2><p>{photo.caption}</p><span>{photo.is_own ? '原创拍摄' : photo.credit}</span></figcaption></figure>)}</div>{!photos.length && <div className="blog-card blog-empty"><Sparkles size={28} /><h2>照片，慢慢积累。</h2><p>有了新的画面，会在这里与你分享。</p></div>}<div className="blog-album-note"><MapPin size={19} /><p>属于我的旅途故事，在<a href="/#path"> My Path </a>里继续。</p><ArrowLink href="/#path">去看看</ArrowLink></div></>;
}
function Collections({ resources }: { resources: BlogLink[] }) {
  return <><PageHeading eyebrow="LINKS / TOOLS / INSPIRATION" title="一些值得留下的" description="给好奇心准备一个书签。喜欢的工具、文档，以及想继续探索的方向。" /><div className="blog-collection-grid">{resources.map((resource, index) => <a className="blog-card blog-resource" href={resource.href} target="_blank" rel="noopener noreferrer" key={resource.title}><div className={`blog-resource-art ${resource.color}`}><span className="blog-eyebrow">{resource.kind}</span><strong>{resource.symbol}</strong><span className="blog-resource-art-bottom">KEEP EXPLORING <ArrowUpRight size={22} /></span></div><div className="blog-resource-copy"><span className="blog-eyebrow">0{index + 1} / BOOKMARK</span><h2>{resource.title}<ArrowUpRight size={19} /></h2><p>{resource.description}</p><span className="blog-resource-domain">{new URL(resource.href).hostname}</span></div></a>)}</div><div className="blog-card blog-collection-note"><Sparkles size={21} /><div><h2>还在慢慢收集。</h2><p>遇到一个好工具，读懂一个新概念，都值得留下来。</p></div></div></>;
}
function About({ settings }: { settings: BlogSettings }) {
  return <><PageHeading eyebrow="HELLO / THIS IS TOMMY" title={settings.about_title} description="写代码，也喜欢看看世界。很高兴你来到这个小小的空间。" /><div className="blog-about-layout"><section className="blog-card blog-about-intro"><div className="blog-about-portrait"><img src="/images/tommy-avatar.webp" alt="Tommy 的卡通头像" width="1000" height="1080" /><span><i />BURNABY, BC</span></div><div><span className="blog-eyebrow">STUDENT · DEVELOPER · EXPLORER</span><h2>Hi, I’m {settings.display_name}<span>.</span></h2>{settings.about_bio.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p className="blog-multiline" key={index}>{paragraph}</p>)}<div className="blog-about-links"><a className="blog-button" href="/">我的个人主页<ArrowUpRight size={15} /></a>{settings.contact_email && <a className="blog-outline-button blog-button" href={`mailto:${settings.contact_email}`}>打个招呼<Mail size={15} /></a>}</div></div></section><section className="blog-card blog-about-education"><span className="blog-eyebrow">LEARNING / STILL IN PROGRESS</span><h2>我的学习路径</h2>{profile.education.map((education) => <div className="blog-education-item" key={education.school}><span>{education.period}</span><h3>{education.school}</h3><strong>{education.degree}</strong><p>{education.detail}</p></div>)}<ArrowLink href="/#path">更完整的旅程</ArrowLink></section><section className="blog-card blog-about-interests"><span className="blog-eyebrow">THINGS I LIKE TO BUILD</span><h2>把好奇心变成实践。</h2><div>{[['Backend & Systems', '理解接口、数据与系统的连接。'], ['Applied AI', '让模型走进可以使用的工作流。'], ['Web & Interactive', '做有意思、也好用的交互。'], ['Games & Graphics', '让代码变得可见、可玩。']].map(([title, detail]) => <div key={title}><Code2 size={19} /><h3>{title}</h3><p>{detail}</p></div>)}</div></section></div></>;
}
function NotFound() {
  return <div className="blog-card blog-empty blog-not-found"><span className="blog-eyebrow">404 / A SMALL DETOUR</span><h1>这一页，还没写下。</h1><p>也许链接走岔了。回到首页，继续探索吧。</p><a className="blog-button" href="/blog/home/">回到博客首页<ArrowRight size={16} /></a></div>;
}

function AdminLoader() {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    import('./admin/AdminApp').then(module => { if (active) setComponent(() => module.default); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (Component) return <Component />;
  return <div className="blog-card blog-empty" role="status"><h1>{failed ? '后台暂时没有打开。' : '正在打开管理后台。'}</h1><p>{failed ? '请刷新后重试。' : '稍等片刻。'}</p>{failed && <button className="blog-button" onClick={() => window.location.reload()}>重新加载</button>}</div>;
}

export default function BlogApp({ data, onRetry }: { data: BlogPageData; onRetry?: () => void }) {
  const settings = data.content.settings ?? defaultBlogSettings;
  const photos = data.content.photos ?? defaultBlogPhotos;
  const resources = data.content.links ?? defaultBlogLinks;
  const feedUrl = getFeedUrl();
  const [theme, setTheme] = useState<'midnight' | 'fresh'>('midnight');
  const page = data.route.page;
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
    <a className="blog-skip-link" href="#blog-main">跳到页面内容</a>
    <div className="blog-shell"><header className="blog-header"><a className="blog-brand" href="/blog/home/" aria-label="Tommy 博客首页">tommy<span>.</span><small>THE BLOG</small></a><nav aria-label="博客导航">{navigation.map(([key, label]) => <a href={`/blog/${key}/`} key={key} aria-current={page === key || key === 'articles' && page === 'post' ? 'page' : undefined}>{label}</a>)}</nav><div className="blog-header-actions"><span className="blog-location"><i />VANCOUVER, CA</span><button className="blog-theme-toggle" aria-label={theme === 'midnight' ? '切换到清新浅色主题' : '切换到午夜紫色主题'} onClick={toggleTheme}>{theme === 'midnight' ? <Sun size={17} /> : <Moon size={17} />}</button><a className="blog-portfolio-link" href="/">个人主页<ArrowUpRight size={15} aria-hidden="true" /></a></div></header>
      <main id="blog-main" tabIndex={-1} className={`blog-main blog-page-${page}`}>{page !== 'admin' && data.live?.status === 'loading' ? <div className="blog-card blog-empty blog-live-status" role="status"><Sparkles size={28} /><h1>正在打开博客。</h1><p>稍等片刻，文字即将到来。</p></div> : page !== 'admin' && data.live?.status === 'error' ? <div className="blog-card blog-empty blog-live-status" role="alert"><h1>稍后再读。</h1><p>{data.live.message}</p><button className="blog-button" onClick={onRetry}>重新加载<ArrowRight size={16} /></button></div> : page === 'admin' ? <AdminLoader /> : page === 'home' ? <Home posts={data.content.posts} photos={photos} resources={resources} settings={settings} /> : page === 'articles' ? <Articles posts={data.content.posts} /> : page === 'post' && post ? <Post post={post} posts={data.content.posts} settings={settings} /> : page === 'photos' ? <Photos photos={photos} local={data.content.source !== 'supabase'} /> : page === 'collections' ? <Collections resources={resources} /> : page === 'about' ? <About settings={settings} /> : <NotFound />}</main>
      <footer className="blog-footer"><span>© {settings.display_name} <span className="blog-footer-divider">/</span> 好奇心，慢慢生长。</span><div><a href="/blog/assets/sources.json">素材说明</a><a href="/blog/admin/">管理</a>{feedUrl && <a href={feedUrl} aria-label="订阅博客 RSS">RSS</a>}<a href="https://github.com/snowhejia/momo-blog" target="_blank" rel="noopener noreferrer">Inspired by momo-blog<ArrowUpRight size={12} /></a><span className="blog-footer-star" aria-hidden="true">✳</span></div></footer>
    </div>
  </div>;
}
