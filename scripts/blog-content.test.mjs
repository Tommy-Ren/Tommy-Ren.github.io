import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { blogPageMetadata, createPageData, escapeJsonForHtml, loadBlogContent, renderMarkdown, resolveBlogRoute } from './blog-content.mjs';
import { buildBlog, buildRss, renderDocument } from './build-blog.mjs';

const template = '<!doctype html><html><head><title>Old title</title><meta name="description" content="Old" /></head><body><div id="blog-root"></div><script id="blog-data" type="application/json">__BLOG_DATA__</script><script type="module" src="/assets/blog.js"></script></body></html>';
const article = (extra = '', body = '## Hello\n\nBody text.') => `---\ntitle: "Example"\ndate: "2026-10-11"\nsummary: "A clear summary"\ntags: [Web]\n${extra}\n---\n${body}\n`;

async function withFixture(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tommy-blog-test-'));
  try { return await callback(directory); } finally {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('tommy-blog-test-'));
    await rm(resolved, { recursive: true, force: true });
  }
}

test('Markdown cannot introduce executable tags, unsafe links, or unescaped code', () => {
  const { html } = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1)) [bad2](data:text/html,x) [bad3](jav&#x61;script:alert)\n\n![bad](data:image/svg+xml,x)\n\n```html\n<img onerror="alert(1)">\n```\n\n[good](https://example.com/?x=1&y=2)');
  assert.doesNotMatch(html, /<(script|img)\b[^>]*(?:alert|onerror)/i);
  assert.doesNotMatch(html, /(?:href|src)="(?:javascript|data|jav&#)/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /href="https:\/\/example.com\/\?x=1&amp;y=2"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('Heading anchors stay unique for repeated headings and colliding suffixes', () => {
  const result = renderMarkdown('## Hello\n\n## Hello\n\n## Hello-2\n\n## 学习 **React**\n\n### Details');
  assert.deepEqual(result.toc.map(item => item.id), ['hello', 'hello-2', 'hello-2-2', '学习-react', 'details']);
  assert.equal(result.toc[3].title, '学习 React');
  assert.match(result.html, /<h2 id="学习-react">/);
});

test('Drafts are excluded from generated pages, metadata validates, and publication order is deterministic', async () => {
  await withFixture(async directory => {
    await writeFile(path.join(directory, 'draft.md'), '---\ndraft: true\n---\nNot public.');
    await writeFile(path.join(directory, 'older.md'), article('slug: older').replace('2026-10-11', '2026-10-10'));
    await writeFile(path.join(directory, 'newer.md'), article('slug: newer'));
    const content = await loadBlogContent({ contentDir: directory });
    assert.deepEqual(content.posts.map(post => post.slug), ['newer', 'older']);
    assert.equal(content.posts[0].readingMinutes, 1);
    assert.equal(content.posts[0].date, '2026-10-11');
    const home = createPageData({ page: 'home' }, content);
    assert.ok(home.content.posts.every(post => post.html === '' && post.toc.length === 0));
    const post = createPageData({ page: 'post', slug: 'newer' }, content);
    assert.match(post.content.posts[0].html, /Body text/);
    assert.equal(post.content.posts[1].html, '');
  });
});

test('Invalid dates, path traversal, duplicate routes, and unsafe cover metadata fail the build', async () => {
  for (const [source, pattern] of [
    [article('slug: ../../outside'), /slug/],
    [article().replace('2026-10-11', '2026-02-30'), /calendar date/],
    [article('cover: "javascript:alert(1)"'), /cover/],
    [article('tags: Web'), /tags/],
    [article('draft: "false"'), /draft/],
    ['---javascript\n({title: "executed"})\n---\nBody', /YAML frontmatter/],
    ['---\ntitle: &cycle [*cycle]\n---\nBody', /plain YAML/],
  ]) {
    await withFixture(async directory => {
      await writeFile(path.join(directory, 'bad.md'), source);
      await assert.rejects(loadBlogContent(directory), pattern);
    });
  }
  await withFixture(async directory => {
    await writeFile(path.join(directory, 'one.md'), article('slug: same'));
    await writeFile(path.join(directory, 'two.md'), article('slug: same'));
    await assert.rejects(loadBlogContent(directory), /duplicate article slug/);
  });
});

test('Unknown article links, malformed URL escapes, and traversal do not resolve to valid routes', () => {
  const posts = [{ slug: 'example' }];
  assert.deepEqual(resolveBlogRoute('/blog/articles/example/', posts), { page: 'post', slug: 'example' });
  assert.deepEqual(resolveBlogRoute('/blog/home', posts), { page: 'home' });
  assert.deepEqual(resolveBlogRoute('/blog/', posts), { page: 'home' });
  for (const pathname of ['/blog/articles/missing/', '/blog/articles/../home/', '/blog/articles/%2e%2e/', '/blog/%ZZ/']) {
    assert.deepEqual(resolveBlogRoute(pathname, posts), { page: 'not-found' });
  }
});

test('Metadata and hydration JSON cannot escape their HTML contexts', () => {
  const dangerous = '</script><script>alert("x")</script> & \u2028';
  const json = escapeJsonForHtml({ value: dangerous });
  assert.doesNotMatch(json, /[<>&\u2028]/);
  assert.equal(JSON.parse(json).value, dangerous);
  const data = { route: { page: 'post', slug: 'example' }, content: { posts: [{ slug: 'example', title: '"><script>alert(1)</script> $& $` $\'', date: '2026-10-11', summary: dangerous, cover: '/images/project-planets.svg', tags: [], html: '', toc: [] }] } };
  const output = renderDocument(template, data, '<article>Safe content</article>');
  assert.equal((output.match(/<script\b/g) ?? []).length, 2);
  assert.match(output, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(output, /\$&amp; \$` \$&#39;/);
  assert.match(output, /<div id="blog-root"><article>Safe content<\/article><\/div>/);
  assert.doesNotMatch(output, /Old title|__BLOG_DATA__/);
});

test('Static build emits real route HTML, canonical links, a real 404, RSS, and a sitemap', async () => {
  await withFixture(async directory => {
    const contentDir = path.join(directory, 'content');
    const outputDir = path.join(directory, 'dist');
    await mkdir(contentDir);
    await mkdir(path.join(outputDir, 'blog', 'home'), { recursive: true });
    await writeFile(path.join(contentDir, 'example.md'), article('slug: example'));
    await writeFile(path.join(outputDir, 'blog', 'home', 'index.html'), template);
    const rendererPath = path.join(directory, 'render.mjs');
    await writeFile(rendererPath, 'export function renderBlog(data) { return `<main><h1>${data.route.page}</h1>${data.content.posts.find(post => post.slug === data.route.slug)?.html ?? ""}</main>`; }');
    const result = await buildBlog({ contentDir, outputDir, rendererPath, database: false });
    assert.deepEqual(result, { pages: 8, posts: 1 });
    for (const page of ['home', 'articles', 'photos', 'collections', 'about', 'admin', '404', 'articles/example']) {
      const html = await readFile(path.join(outputDir, 'blog', page, 'index.html'), 'utf8');
      assert.match(html, /<main>/);
      assert.match(html, new RegExp(`rel="canonical" href="https://tommy-ren.github.io/blog/${page}/"`));
      assert.doesNotMatch(html, /__BLOG_DATA__/);
    }
    const post = await readFile(path.join(outputDir, 'blog', 'articles', 'example', 'index.html'), 'utf8');
    assert.match(post, /<h2 id="hello">Hello<\/h2>/);
    assert.match(await readFile(path.join(outputDir, '404.html'), 'utf8'), /name="robots" content="noindex"/);
    const admin = await readFile(path.join(outputDir, 'blog', 'admin', 'index.html'), 'utf8');
    assert.match(admin, /name="robots" content="noindex"/);
    assert.doesNotMatch(admin, /Body text|A clear summary/);
    assert.match(await readFile(path.join(outputDir, 'blog', 'index.html'), 'utf8'), /href="\/blog\/home\/"/);
    const rss = await readFile(path.join(outputDir, 'blog', 'feed.xml'), 'utf8');
    assert.match(rss, /<guid isPermaLink="true">https:\/\/tommy-ren.github.io\/blog\/articles\/example\/<\/guid>/);
    assert.match(rss, /https:\/\/tommy-ren.github.io\/blog\/feed.xml/);
    assert.match(await readFile(path.join(outputDir, 'sitemap.xml'), 'utf8'), /<lastmod>2026-10-11<\/lastmod>/);
    assert.equal(await readFile(path.join(outputDir, '.nojekyll'), 'utf8'), '');
  });
});

test('Database builds never embed local posts in HTML, RSS, or sitemap', async () => {
  await withFixture(async directory => {
    const contentDir = path.join(directory, 'content');
    const outputDir = path.join(directory, 'dist');
    await mkdir(contentDir);
    await mkdir(path.join(outputDir, 'blog', 'home'), { recursive: true });
    await writeFile(path.join(contentDir, 'seed-only.md'), article('slug: seed-only', 'PRIVATE STALE BODY').replace('Example', 'PRIVATE STALE TITLE'));
    await writeFile(path.join(outputDir, 'blog', 'home', 'index.html'), template);
    const rendererPath = path.join(directory, 'render.mjs');
    await writeFile(rendererPath, 'export function renderBlog(data) { return `<main>${JSON.stringify(data.content)}</main>`; }');
    await buildBlog({ contentDir, outputDir, rendererPath, database: true });
    for (const page of ['home', 'articles', 'photos', 'collections', 'about', 'admin', '404', 'articles/seed-only']) {
      const html = await readFile(path.join(outputDir, 'blog', page, 'index.html'), 'utf8');
      assert.doesNotMatch(html, /PRIVATE STALE|A clear summary/);
      const payload = JSON.parse(html.match(/<script id="blog-data" type="application\/json">(.*?)<\/script>/s)[1]);
      assert.deepEqual(payload.content.posts, []);
      if (page !== 'admin') assert.equal(payload.live.status, 'loading');
    }
    assert.doesNotMatch(await readFile(path.join(outputDir, 'blog', 'feed.xml'), 'utf8'), /seed-only|PRIVATE STALE|<item>/);
    assert.doesNotMatch(await readFile(path.join(outputDir, 'sitemap.xml'), 'utf8'), /seed-only/);
  });
});

test('RSS escapes metadata as XML rather than interpreting article titles', () => {
  const rss = buildRss({ posts: [{ slug: 'example', title: 'A & <B>', summary: '"quote" & <tag>', date: '2026-10-11', category: 'Code & life', tags: ['<safe>'] }] });
  assert.match(rss, /<title>A &amp; &lt;B&gt;<\/title>/);
  assert.match(rss, /<category>&lt;safe&gt;<\/category>/);
  assert.doesNotMatch(rss, /<tag>|<safe>/);
});

test('Social previews use a raster image while article SVG covers remain unchanged', () => {
  const post = { slug: 'example', title: 'Example', summary: 'Summary', date: '2026-10-11', cover: '/images/project-planets.svg' };
  const route = { page: 'post', slug: 'example' };
  const content = { posts: [post] };
  assert.equal(blogPageMetadata(route, content).image, 'https://tommy-ren.github.io/images/social-preview.png');
  assert.equal(blogPageMetadata({ page: 'home' }, content).image, 'https://tommy-ren.github.io/images/social-preview.png');
  assert.equal(post.cover, '/images/project-planets.svg');
  for (const cover of ['/blog/assets/forest.webp', '/blog/assets/photo.PNG', '/blog/assets/photo.jpg', '/blog/assets/photo.jpeg']) {
    assert.equal(blogPageMetadata(route, { posts: [{ ...post, cover }] }).image, `https://tommy-ren.github.io${cover}`);
  }
});
