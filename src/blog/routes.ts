import type { BlogContent, BlogPageData } from './types';

function pageData(route: BlogPageData['route'], content: BlogContent): BlogPageData {
  return { route, content: { ...content, posts: content.posts.map(post => ({
    ...post,
    html: route.page === 'post' && route.slug === post.slug ? post.html : '',
    toc: route.page === 'post' && route.slug === post.slug ? post.toc : [],
  })) } };
}

export function requestedArticleSlug(pathname: string, search = ''): string | undefined {
  const selected = new URLSearchParams(search).get('post');
  if (/^\/blog\/articles\/?(?:index\.html)?$/.test(pathname) && selected && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(selected) && selected.length <= 100) return selected;
  const match = pathname.match(/^\/blog\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/index\.html|\/)?$/);
  return match?.[1];
}

export function resolveBlogPage(pathname: string, content: BlogContent, search = ''): BlogPageData {
  let path: string;
  try { path = decodeURI(pathname).replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/'; }
  catch { return pageData({ page: 'not-found' }, content); }
  const pages = ['home', 'articles', 'photos', 'collections', 'about', 'admin', 'studio', 'account'] as const;
  const selected = requestedArticleSlug(pathname, search);
  if (selected && content.posts.some(post => post.slug === selected)) return pageData({ page: 'post', slug: selected }, content);
  if (new URLSearchParams(search).has('post') && path === '/blog/articles') return pageData({ page: 'not-found' }, content);
  const page = pages.find(name => path === `/blog/${name}`);
  if (page) return pageData({ page }, content);
  if (path === '/blog') return pageData({ page: 'home' }, content);
  const match = path.match(/^\/blog\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (match && content.posts.some(post => post.slug === match[1])) {
    return pageData({ page: 'post', slug: match[1] }, content);
  }
  return pageData({ page: 'not-found' }, content);
}
