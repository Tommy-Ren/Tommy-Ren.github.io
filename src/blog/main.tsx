import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import BlogRuntime from './BlogRuntime';
import { resolveBlogPage } from './routes';
import { usesDatabase } from './backend';
import type { BlogPageData } from './types';
import './blog.css';

async function start() {
  const root = document.getElementById('blog-root')!;
  const embedded = document.getElementById('blog-data')?.textContent?.trim();
  if (embedded && embedded !== '__BLOG_DATA__') {
    const data: BlogPageData = JSON.parse(embedded);
    hydrateRoot(root, <StrictMode><BlogRuntime initialData={data} /></StrictMode>);
  } else if (import.meta.env.DEV) {
    const content = usesDatabase()
      ? { posts: [], photos: [], links: [], source: 'supabase' as const }
      : (await import('virtual:blog-content')).content;
    const data = resolveBlogPage(window.location.pathname, content, window.location.search);
    if (usesDatabase() && data.route.page !== 'admin') data.live = { status: 'loading' };
    createRoot(root).render(<StrictMode><BlogRuntime initialData={data} /></StrictMode>);
  }
}

void start();
