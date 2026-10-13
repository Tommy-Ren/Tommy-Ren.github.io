import { useCallback, useEffect, useState } from 'react';
import BlogApp from './BlogApp';
import { getBackendProblem, loadPublishedContent, usesDatabase } from './backend';
import { resolveBlogPage, requestedArticleSlug } from './routes';
import type { BlogPageData } from './types';
import { useLocale } from '../i18n/Locale';

export default function BlogRuntime({ initialData }: { initialData: BlogPageData }) {
  const { locale } = useLocale();
  const [data, setData] = useState(initialData);
  const [attempt, setAttempt] = useState(0);
  const [address, setAddress] = useState(() => window.location.pathname + window.location.search);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    const update = () => setAddress(window.location.pathname + window.location.search);
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!anchor || anchor.hasAttribute('download') || anchor.target && anchor.target !== '_self') return;
      const url = new URL(anchor.href);
      const publicBlog = (path: string) => /^\/blog\/?$/.test(path) || /^\/blog\/(home|articles|photos|collections|about|studio|account|admin)(\/|$)/.test(path);
      if (url.origin !== location.origin || !publicBlog(url.pathname) || !publicBlog(location.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      event.preventDefault();
      if (url.href === location.href) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      history.pushState(null, '', url);
      update();
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    document.addEventListener('click', navigate);
    window.addEventListener('popstate', update);
    return () => { document.removeEventListener('click', navigate); window.removeEventListener('popstate', update); };
  }, []);
  useEffect(() => {
    const post = data.route.page === 'post' ? data.content.posts.find(item => item.slug === data.route.slug) : null;
    const name = locale === 'en' ? "Tommy's Blog" : 'Tommy 的博客';
    document.title = post ? `${post.title} · ${name}` : name;
    document.querySelector('meta[name="description"]')?.setAttribute('content', post?.summary || (locale === 'en' ? 'Notes on code, curiosity, and everyday discoveries. A personal blog by Tommy Ren.' : '关于代码、好奇心与生活的记录。Tommy Ren 的个人博客。'));
  }, [data, locale]);
  useEffect(() => {
    let active = true;
    const pathname = window.location.pathname;
    const search = window.location.search;
    const workspace = resolveBlogPage(pathname, {posts:[]}, search);
    if (['admin','studio','account'].includes(workspace.route.page)) {
      setData(previous => ({route:workspace.route,content:previous.content}));
      return;
    }
    if (!usesDatabase()) {
      // Direct links stay pre-rendered; internal navigation fetches their content
      // without replacing the document or its persistent audio element.
      const readLocal = async () => {
        if (import.meta.env.DEV) return resolveBlogPage(pathname, (await import('virtual:blog-content')).content, search);
        const response = await fetch(address);
        if (!response.ok) throw new Error('Page unavailable');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        return JSON.parse(doc.getElementById('blog-data')?.textContent || '{}') as BlogPageData;
      };
      void readLocal().then(page => { if (active) setData(page); }).catch(() => {
        if (active) setData({ ...initialData, live: { status: 'error' } });
      });
      return () => { active = false; };
    }
    const empty = { posts: [], photos: [], links: [], source: 'supabase' as const };
    const route = resolveBlogPage(pathname, empty, search).route;
    setData({ route, content: empty, live: { status: 'loading' } });
    const problem = getBackendProblem();
    if (problem) {
      setData({ route, content: empty, live: { status: 'error', message: problem } });
      return;
    }
    loadPublishedContent(requestedArticleSlug(pathname, search), locale)
      .then(content => {
        if (!active) return;
        const page = resolveBlogPage(pathname, content, search);
        setData({ ...page, live: { status: 'ready' } });
        const post = page.route.page === 'post' ? content.posts.find(item => item.slug === page.route.slug) : null;
        document.querySelector('link[rel="canonical"]')?.setAttribute('href', post
          ? `https://tommy-ren.github.io/blog/articles/?post=${encodeURIComponent(post.slug)}`
          : `https://tommy-ren.github.io${pathname}`);
      }).catch(() => {
        if (active) setData({ route, content: empty, live: { status: 'error', message: '博客内容暂时没有加载成功，请稍后再试。' } });
      });
    return () => { active = false; };
  }, [initialData, attempt, address, locale]);
  return <BlogApp data={data} onRetry={retry} />;
}
