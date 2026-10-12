import { useCallback, useEffect, useState } from 'react';
import BlogApp from './BlogApp';
import { getBackendProblem, loadPublishedContent, usesDatabase } from './backend';
import { resolveBlogPage, requestedArticleSlug } from './routes';
import type { BlogPageData } from './types';

export default function BlogRuntime({ initialData }: { initialData: BlogPageData }) {
  const [data, setData] = useState(initialData);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (initialData.route.page === 'admin') return;
    if (!usesDatabase()) {
      setData(resolveBlogPage(window.location.pathname, initialData.content, window.location.search));
      return;
    }
    let active = true;
    const empty = { posts: [], photos: [], links: [], source: 'supabase' as const };
    const route = resolveBlogPage(window.location.pathname, empty, window.location.search).route;
    setData({ route, content: empty, live: { status: 'loading' } });
    const problem = getBackendProblem();
    if (problem) {
      setData({ route, content: empty, live: { status: 'error', message: problem } });
      return;
    }
    loadPublishedContent(requestedArticleSlug(window.location.pathname, window.location.search))
      .then(content => {
        if (!active) return;
        const page = resolveBlogPage(window.location.pathname, content, window.location.search);
        setData({ ...page, live: { status: 'ready' } });
        const post = page.route.page === 'post' ? content.posts.find(item => item.slug === page.route.slug) : null;
        const title = post ? `${post.title} · Tommy's Blog` : "Tommy's Blog";
        document.title = title;
        document.querySelector('meta[name="description"]')?.setAttribute('content', post?.summary || '关于代码、好奇心与生活的记录。');
        document.querySelector('link[rel="canonical"]')?.setAttribute('href', post
          ? `https://tommy-ren.github.io/blog/articles/?post=${encodeURIComponent(post.slug)}`
          : `https://tommy-ren.github.io${window.location.pathname}`);
      }).catch(() => {
        if (active) setData({ route, content: empty, live: { status: 'error', message: '博客内容暂时没有加载成功，请稍后再试。' } });
      });
    return () => { active = false; };
  }, [initialData, attempt]);
  return <BlogApp data={data} onRetry={retry} />;
}
