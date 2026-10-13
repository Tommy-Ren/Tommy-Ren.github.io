import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { escapeHtml, renderMarkdown, safeUrl } from '../src/blog/markdown.mjs';
export { escapeHtml, renderMarkdown } from '../src/blog/markdown.mjs';

export const SITE_URL = 'https://tommy-ren.github.io';
export const BLOG_TITLE = "Tommy's Blog";
export const BLOG_DESCRIPTION = 'Notes on code, curiosity, and everyday discoveries. A personal blog by Tommy Ren.';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const defaultContentDir = path.join(projectRoot, 'content', 'blog');
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// A JSON script is an HTML raw-text element: escaping quotes alone is insufficient.
export function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029',
  })[character]);
}

function textField(value, name, file, maxLength, fallback) {
  const candidate = value ?? fallback;
  if (typeof candidate !== 'string' || !candidate.trim() || candidate.length > maxLength
    || /[\u0000-\u001f\u007f]/.test(candidate)) {
    throw new Error(`${file}: ${name} must be a nonempty single-line string (maximum ${maxLength} characters).`);
  }
  return candidate.trim();
}

function validDate(value, file) {
  const candidate = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (typeof candidate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    throw new Error(`${file}: date must use YYYY-MM-DD.`);
  }
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== candidate) {
    throw new Error(`${file}: date is not a valid calendar date.`);
  }
  return candidate;
}

export async function loadBlogContent(options = {}) {
  const contentDir = typeof options === 'string' ? options : options.contentDir ?? defaultContentDir;
  const files = (await readdir(contentDir, { withFileTypes: true }))
    .filter(file => file.isFile() && /\.md$/i.test(file.name)).map(file => file.name).sort();
  const posts = [];
  const slugs = new Set();
  for (const file of files) {
    const source = (await readFile(path.join(contentDir, file), 'utf8')).replace(/^\uFEFF/, '');
    if (Buffer.byteLength(source, 'utf8') > 2 * 1024 * 1024) throw new Error(`${file}: article exceeds the 2 MiB source limit.`);
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontmatter) {
      throw new Error(`${file}: begin with YAML frontmatter delimited by standalone --- lines.`);
    }
    const data = parseYaml(frontmatter[1], { maxAliasCount: 20, uniqueKeys: true, strict: true });
    const content = source.slice(frontmatter[0].length);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${file}: frontmatter must be a YAML mapping.`);
    assertPlainYaml(data, file);
    if (data.draft !== undefined && typeof data.draft !== 'boolean') throw new Error(`${file}: draft must be true or false.`);
    if (data.draft) continue;
    const slug = data.slug ?? path.basename(file, path.extname(file));
    if (typeof slug !== 'string' || slug.length > 100 || !slugPattern.test(slug)) {
      throw new Error(`${file}: slug must use lowercase letters, digits, and single hyphens.`);
    }
    if (slugs.has(slug)) throw new Error(`${file}: duplicate article slug "${slug}".`);
    slugs.add(slug);
    const title = textField(data.title, 'title', file, 160);
    const summary = textField(data.summary, 'summary', file, 400);
    const category = textField(data.category, 'category', file, 60, '随笔');
    const tags = data.tags ?? [];
    if (!Array.isArray(tags) || tags.length > 12 || tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 40 || /[\u0000-\u001f\u007f]/.test(tag))) {
      throw new Error(`${file}: tags must be an array of up to 12 short strings.`);
    }
    const cover = data.cover ?? '/images/project-planets.svg';
    if (typeof cover !== 'string' || !cover.startsWith('/') || cover.startsWith('//')
      || !safeUrl(cover, { image: true }) || /(^|\/)\.\.(\/|$)/.test(cover) || /[?#]/.test(cover)) {
      throw new Error(`${file}: cover must be a root-relative public asset path.`);
    }
    if (!content.trim()) throw new Error(`${file}: published articles need a Markdown body.`);
    const { html, toc } = renderMarkdown(content);
    const words = (content.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) ?? []).length
      + (content.match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/gi) ?? []).length;
    posts.push({ slug, title, date: validDate(data.date, file), summary, category,
      tags: [...new Set(tags.map(tag => tag.trim()))], cover,
      readingMinutes: Math.max(1, Math.ceil(words / 300)), html, toc });
  }
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return { posts };
}

function assertPlainYaml(value, file, parents = new Set(), depth = 0) {
  if (depth > 12) throw new Error(`${file}: frontmatter is nested too deeply.`);
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return;
  if (typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)
    || parents.has(value)) throw new Error(`${file}: frontmatter must contain plain YAML values without cycles.`);
  parents.add(value);
  for (const child of Object.values(value)) assertPlainYaml(child, file, parents, depth + 1);
  parents.delete(value);
}

export function resolveBlogRoute(pathname, posts = []) {
  let normalized;
  try { normalized = decodeURI(pathname).replace(/\/+$/, '') || '/'; } catch { return { page: 'not-found' }; }
  if (normalized === '/blog') return { page: 'home' };
  for (const page of ['home', 'articles', 'photos', 'collections', 'about']) {
    if (normalized === `/blog/${page}`) return { page };
  }
  const match = normalized.match(/^\/blog\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (match && posts.some(post => post.slug === match[1])) return { page: 'post', slug: match[1] };
  return { page: 'not-found' };
}

export function createPageData(route, content) {
  return { route, content: { posts: content.posts.map(post => ({ ...post,
    html: route.page === 'post' && route.slug === post.slug ? post.html : '',
    toc: route.page === 'post' && route.slug === post.slug ? post.toc : [],
  })) } };
}

export function blogPageMetadata(route, content) {
  const labels = { home: 'Home', articles: 'Articles', photos: 'Photos', collections: 'Bookmarks', about: 'About', admin: 'Admin', studio: 'Writing studio', account: 'Account', 'not-found': 'Page not found' };
  const post = route.page === 'post' ? content.posts.find(item => item.slug === route.slug) : null;
  const relativeUrl = post ? `/blog/articles/${post.slug}/` : route.page === 'post' && route.slug
    ? `/blog/articles/?post=${encodeURIComponent(route.slug)}` : `/blog/${route.page === 'not-found' ? '404' : route.page}/`;
  const socialImage = post?.cover && /\.(?:png|jpe?g|webp)$/i.test(post.cover)
    ? post.cover : '/images/social-preview.png';
  return {
    title: post ? `${post.title} · ${BLOG_TITLE}` : `${labels[route.page] ?? 'Home'} · ${BLOG_TITLE}`,
    description: post?.summary ?? BLOG_DESCRIPTION,
    canonical: `${SITE_URL}${relativeUrl}`,
    image: `${SITE_URL}${socialImage}`,
    type: post ? 'article' : 'website',
    date: post?.date,
  };
}
