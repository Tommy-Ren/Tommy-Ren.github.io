const SITE_URL = 'https://tommy-ren.github.io';
const BLOG_TITLE = "Tommy's Blog";
const BLOG_DESCRIPTION = '关于代码、好奇心与生活的记录。Tommy Ren 的个人博客。';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'accept, apikey, authorization, content-type',
  'X-Content-Type-Options': 'nosniff',
};

type FeedPost = {
  slug: string; title: string; summary: string; published_on: string;
  category: string; tags: string[];
};
type FeedDependencies = {
  env: (name: string) => string | undefined;
  fetch?: typeof globalThis.fetch;
};

export function escapeXml(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
    .replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
}

export function renderFeed(posts: FeedPost[], feedUrl: string) {
  const items = posts.map(post => {
    const url = `${SITE_URL}/blog/articles/?post=${encodeURIComponent(post.slug)}`;
    const date = new Date(`${post.published_on}T00:00:00Z`).toUTCString();
    return `    <item>\n      <title>${escapeXml(post.title)}</title>\n      <link>${escapeXml(url)}</link>\n      <guid isPermaLink="true">${escapeXml(url)}</guid>\n      <pubDate>${date}</pubDate>\n      <description>${escapeXml(post.summary)}</description>\n      ${[post.category, ...post.tags].map(tag => `<category>${escapeXml(tag)}</category>`).join('\n      ')}\n    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${escapeXml(BLOG_TITLE)}</title>\n    <link>${SITE_URL}/blog/home/</link>\n    <description>${escapeXml(BLOG_DESCRIPTION)}</description>\n    <language>zh-CN</language>\n    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />\n${items}\n  </channel>\n</rss>\n`;
}

function validPosts(value: unknown): value is FeedPost[] {
  return Array.isArray(value) && value.length <= 100 && value.every(post => {
    if (!post || typeof post !== 'object') return false;
    const { slug, title, summary, published_on: date, category, tags } = post;
    return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 100
      && typeof title === 'string' && title.length <= 160
      && typeof summary === 'string' && summary.length <= 400
      && typeof category === 'string' && category.length <= 60
      && Array.isArray(tags) && tags.length <= 12 && tags.every(tag => typeof tag === 'string' && tag.length <= 40)
      && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
      && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  });
}

export function createFeedHandler(dependencies: FeedDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'GET') return new Response('Method not allowed', {
      status: 405, headers: { ...corsHeaders, Allow: 'GET, OPTIONS', 'Cache-Control': 'no-store' },
    });
    const fail = () => new Response(JSON.stringify({ error: 'RSS 暂时无法读取，请稍后重试。' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
    try {
      const projectUrl = dependencies.env('SUPABASE_URL');
      const publishableKeys = dependencies.env('SUPABASE_PUBLISHABLE_KEYS');
      let publicKey: string | undefined;
      let legacyKey = false;
      if (publishableKeys) {
        const keys: unknown = JSON.parse(publishableKeys);
        if (!keys || typeof keys !== 'object' || Array.isArray(keys)) return fail();
        const values = keys as Record<string, unknown>;
        const candidate = values.default ?? Object.values(values).find(value => typeof value === 'string' && value.startsWith('sb_publishable_'));
        if (typeof candidate !== 'string' || !candidate.startsWith('sb_publishable_')) return fail();
        publicKey = candidate;
      } else {
        publicKey = dependencies.env('SUPABASE_ANON_KEY');
        legacyKey = true;
      }
      if (!projectUrl || !publicKey || publicKey.startsWith('sb_secret_')) return fail();
      const base = new URL(projectUrl);
      if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) return fail();
      const endpoint = new URL('/rest/v1/blog_posts', base);
      endpoint.searchParams.set('select', 'slug,title,summary,published_on,category,tags');
      endpoint.searchParams.set('published', 'eq.true');
      endpoint.searchParams.set('order', 'published_on.desc,slug.asc');
      endpoint.searchParams.set('limit', '100');
      // 忽略请求方的登录令牌。公开 feed 永远以 anon 身份读取，RLS 隐藏所有草稿。
      const result = await (dependencies.fetch ?? globalThis.fetch)(endpoint, {
        method: 'GET', headers: { apikey: publicKey, ...(legacyKey ? { Authorization: `Bearer ${publicKey}` } : {}), Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!result.ok) return fail();
      const posts: unknown = await result.json();
      if (!validPosts(posts)) return fail();
      const feedUrl = new URL('/functions/v1/blog-feed', base).href;
      return new Response(renderFeed(posts, feedUrl), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=60, s-maxage=300' },
      });
    } catch {
      return fail();
    }
  };
}
