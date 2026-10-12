import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { BLOG_DESCRIPTION, BLOG_TITLE, SITE_URL, blogPageMetadata, createPageData, escapeHtml,
  escapeJsonForHtml, loadBlogContent } from './blog-content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

export function renderDocument(template, data, markup, feedUrl = '/blog/feed.xml') {
  if (!/<div\s+id=["']blog-root["']\s*>\s*<\/div>/.test(template) || !template.includes('__BLOG_DATA__')) {
    throw new Error('Blog template must include an empty #blog-root and a __BLOG_DATA__ JSON placeholder.');
  }
  const meta = blogPageMetadata(data.route, data.content);
  const head = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    ...(feedUrl ? [`<link rel="alternate" type="application/rss+xml" title="${escapeHtml(BLOG_TITLE)}" href="${escapeHtml(feedUrl)}" />`] : []),
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    '<meta property="og:locale" content="en_CA" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    ...(meta.date ? [`<meta property="article:published_time" content="${meta.date}T00:00:00Z" />`] : []),
    ...(['not-found', 'admin'].includes(data.route.page) ? ['<meta name="robots" content="noindex" />'] : []),
  ].join('\n    ');
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\b[^>]*(?:name=["'](?:description|twitter:card)["']|property=["'](?:og:[^"']+|article:published_time)["'])[^>]*>\s*/gi, '')
    .replace(/<link\b[^>]*rel=["'](?:canonical|alternate)["'][^>]*>\s*/gi, '')
    .replace('</head>', () => `    ${head}\n  </head>`)
    .replace(/<div\s+id=["']blog-root["']\s*>\s*<\/div>/, () => `<div id="blog-root">${markup}</div>`)
    .replace('__BLOG_DATA__', () => escapeJsonForHtml(data));
}

export function buildRss(content) {
  const items = content.posts.map(post => {
    const url = `${SITE_URL}/blog/articles/${post.slug}/`;
    return `    <item>\n      <title>${escapeHtml(post.title)}</title>\n      <link>${url}</link>\n      <guid isPermaLink="true">${url}</guid>\n      <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>\n      <description>${escapeHtml(post.summary)}</description>\n      ${[post.category, ...post.tags].map(tag => `<category>${escapeHtml(tag)}</category>`).join('\n      ')}\n    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${escapeHtml(BLOG_TITLE)}</title>\n    <link>${SITE_URL}/blog/home/</link>\n    <description>${escapeHtml(BLOG_DESCRIPTION)}</description>\n    <language>zh-CN</language>\n    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />\n${items}\n  </channel>\n</rss>\n`;
}

export function buildSitemap(content) {
  const pages = ['/', '/blog/home/', '/blog/articles/', '/blog/photos/', '/blog/collections/', '/blog/about/'];
  const urls = pages.map(url => `  <url><loc>${SITE_URL}${url}</loc></url>`);
  urls.push(...content.posts.map(post => `  <url><loc>${SITE_URL}/blog/articles/${post.slug}/</loc><lastmod>${post.date}</lastmod></url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export async function buildBlog({ outputDir = path.join(root, 'dist'), contentDir,
  rendererPath = path.join(root, '.preview', 'blog-ssr', 'render.js'), database } = {}) {
  const environment = { ...loadEnv('production', root, 'VITE_'), ...process.env };
  const cloud = database ?? Boolean(environment.VITE_SUPABASE_URL || environment.VITE_SUPABASE_PUBLISHABLE_KEY || environment.VITE_SUPABASE_ANON_KEY);
  const feedUrl = cloud ? environment.VITE_BLOG_RSS_ENABLED === 'true' && environment.VITE_SUPABASE_URL
    ? `${environment.VITE_SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/blog-feed` : null : '/blog/feed.xml';
  const content = await loadBlogContent(contentDir ? { contentDir } : undefined);
  const { renderBlog } = await import(pathToFileURL(rendererPath).href);
  const template = await readFile(path.join(outputDir, 'blog', 'home', 'index.html'), 'utf8');
  const routes = ['home', 'articles', 'photos', 'collections', 'about', 'admin'].map(page => ({ page }));
  routes.push(...content.posts.map(post => ({ page: 'post', slug: post.slug })), { page: 'not-found' });
  for (const route of routes) {
    const directory = route.page === 'post' ? `articles/${route.slug}` : route.page === 'not-found' ? '404' : route.page;
    const destination = path.join(outputDir, 'blog', directory);
    await mkdir(destination, { recursive: true });
    const data = createPageData(route, cloud || route.page === 'admin' ? { posts: [], source: cloud ? 'supabase' : 'local' } : content);
    if (cloud && route.page !== 'admin') data.live = { status: 'loading' };
    const document = renderDocument(template, data, renderBlog(data), feedUrl);
    await writeFile(path.join(destination, 'index.html'), document, 'utf8');
    if (route.page === 'not-found') await writeFile(path.join(outputDir, '404.html'), document, 'utf8');
  }
  await writeFile(path.join(outputDir, 'blog', 'index.html'), `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(BLOG_TITLE)}</title><link rel="canonical" href="${SITE_URL}/blog/home/" /><meta http-equiv="refresh" content="0;url=/blog/home/" /></head><body><p>Continue to <a href="/blog/home/">the blog</a>.</p></body></html>\n`, 'utf8');
  await writeFile(path.join(outputDir, 'blog', 'feed.xml'), buildRss(cloud ? { posts: [] } : content), 'utf8');
  await writeFile(path.join(outputDir, 'sitemap.xml'), buildSitemap(cloud ? { posts: [] } : content), 'utf8');
  await writeFile(path.join(outputDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, 'utf8');
  // Required for a built Vite site served directly by GitHub Pages.
  await writeFile(path.join(outputDir, '.nojekyll'), '', 'utf8');
  return { pages: routes.length, posts: content.posts.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildBlog();
  console.log(`Blog generated: ${result.posts} articles, ${result.pages} static pages, RSS, and sitemap.`);
}
