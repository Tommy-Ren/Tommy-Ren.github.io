import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { renderMarkdown } from './markdown.mjs';
import { backendConfigProblem } from './config.mjs';
import type { BlogContent, BlogLink, BlogPhoto, BlogPost, BlogSettings } from './types';
import { selectTranslation } from './translations.mjs';

export interface BlogPostRecord {
  id: string; slug: string; title: string; summary: string; markdown: string;
  category: string; tags: string[]; cover: string; published: boolean;
  published_on: string; reading_minutes: number; created_at: string; updated_at: string;
  source_language: 'en' | 'zh'; content_version: string;
}
export interface BlogTranslationRecord {
  post_id: string; locale: 'en' | 'zh'; source_version: string;
  title: string; summary: string; category: string; tags: string[]; markdown?: string;
  provider: 'manual' | 'deepl'; updated_at: string;
}

async function translateContent(database: SupabaseClient, body: { postId?: string; photoId?: string; regenerate: boolean }) {
  const { data, error } = await database.functions.invoke('blog-translate', { body });
  if (error) {
    let message = '翻译服务暂不可用，请检查 blog-translate 是否已部署，再重试。原文已保存。';
    try { const body = await error.context?.json(); if (body?.error) message = body.error; } catch { /* Safe fallback. */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as { status: 'cached' | 'translated'; locale: 'en' | 'zh' };
}
export const translateArticle = (database: SupabaseClient, postId: string, regenerate = false) => translateContent(database, { postId, regenerate });
export const translatePhoto = (database: SupabaseClient, photoId: string, regenerate = false) => translateContent(database, { photoId, regenerate });
export interface PhotoTranslationRecord {
  photo_id: string; locale: 'en' | 'zh'; source_version: string; title: string; caption: string;
  provider: 'manual' | 'deepl'; updated_at: string;
}
export interface BlogPhotoRecord extends BlogPhoto {
  published: boolean; sort_order: number; created_at: string; updated_at: string;
  source_language: 'en' | 'zh'; content_version: string;
}
export interface BlogLinkRecord extends BlogLink {
  published: boolean; sort_order: number; created_at: string; updated_at: string;
}
export interface BlogSettingsRecord extends BlogSettings { id: 'main'; updated_at: string }

const projectUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const publicKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
let client: SupabaseClient | null = null;

export function usesDatabase() { return Boolean(projectUrl || publicKey); }

export function getBackendProblem(): string | null {
  return backendConfigProblem({ url: projectUrl, key: publicKey, allowLocal: import.meta.env.DEV });
}

export function getBlogClient(): SupabaseClient | null {
  if (getBackendProblem() || typeof window === 'undefined') return null;
  if (!client) client = createClient(projectUrl, publicKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
      flowType: 'pkce', storageKey: 'tommy-blog-auth' },
  });
  return client;
}

export function getFeedUrl(): string | undefined {
  if (!usesDatabase()) return '/blog/feed.xml';
  if (!getBackendProblem() && import.meta.env.VITE_BLOG_RSS_ENABLED === 'true') return `${projectUrl}/functions/v1/blog-feed`;
  return undefined;
}
export function getReadingMinutes(markdown: string) {
  const words = (markdown.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length
    + (markdown.match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/gi) || []).length;
  return Math.min(1000, Math.max(1, Math.ceil(words / 300)));
}

export function isPublicUrl(value: string, allowLocal = false): boolean {
  if (!value || value.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(value)) return false;
  if (allowLocal && value.startsWith('/') && !value.startsWith('//')) {
    try { return !decodeURIComponent(value).split('/').includes('..'); } catch { return false; }
  }
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
}

export function validatePostInput(post: Partial<BlogPostRecord>): string | null {
  if (!post.slug || post.slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) return '文章地址只能包含小写英文、数字和单个连字符，最长 100 个字符。';
  for (const [key, label, maximum] of [['title', '标题', 160], ['summary', '摘要', 400], ['category', '分类', 60]] as const) {
    const value = post[key];
    if (typeof value !== 'string' || (key !== 'summary' && !value.trim()) || value.length > maximum || /[\u0000-\u001f\u007f]/.test(value)) return `${label}${key === 'summary' ? '' : '不能为空，'}最长 ${maximum} 个字符。`;
  }
  if (typeof post.markdown !== 'string' || post.markdown.length > 200000 || (post.published !== false && !post.markdown.trim())) return '已发布的正文不能为空；正文最长 200,000 个字符。';
  if (typeof post.cover !== 'string' || (post.cover && !isPublicUrl(post.cover, true))) return '封面须为网站内图片路径或有效的 HTTPS 图片地址，也可以留空。';
  if (!Array.isArray(post.tags) || post.tags.length > 12 || post.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 40 || /[\u0000-\u001f\u007f]/.test(tag))) return '最多 12 个标签，每个标签最长 40 个字符。';
  if (!post.published_on || !/^\d{4}-\d{2}-\d{2}$/.test(post.published_on)) return '请选择有效的发布日期。';
  const parsed = new Date(`${post.published_on}T00:00:00Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== post.published_on) return '请选择有效的发布日期。';
  return null;
}

async function publicRows<T>(table: string, columns: string, order: string): Promise<T[]> {
  const database = getBlogClient();
  if (!database) throw new Error(getBackendProblem() || '数据库没有连接。');
  const rows: T[] = [];
  for (let start = 0; ; start += 200) {
    const result = await database.from(table).select(columns).eq('published', true).order(order, { ascending: table !== 'blog_posts' }).order('id').range(start, start + 199);
    if (result.error) throw result.error;
    rows.push(...(result.data || []) as T[]);
    if (!result.data || result.data.length < 200) return rows;
  }
}

export async function loadPublishedContent(slug?: string, locale: 'en' | 'zh' = 'en'): Promise<BlogContent> {
  const database = getBlogClient();
  if (!database) throw new Error(getBackendProblem() || '数据库没有连接。');
  const metadataColumns = 'id,slug,title,summary,category,tags,cover,published_on,reading_minutes,source_language,content_version';
  const [records, photos, links, settingsResult] = await Promise.all([
    publicRows<Omit<BlogPostRecord, 'markdown'>>( 'blog_posts', metadataColumns, 'published_on'),
    publicRows<BlogPhotoRecord>('blog_photos', 'id,title,caption,image_url,source_url,credit,is_own,sort_order,source_language,content_version', 'sort_order'),
    publicRows<BlogLinkRecord>('blog_links', 'id,title,kind,description,href,symbol,color,sort_order', 'sort_order'),
    database.from('blog_settings').select('*').eq('id', 'main').single(),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  const photoTranslations: PhotoTranslationRecord[] = [];
  for (let start = 0; ; start += 200) {
    const result = await database.from('blog_photo_translations').select('*').eq('locale', locale).order('photo_id').range(start, start + 199);
    if (result.error) break;
    photoTranslations.push(...result.data as PhotoTranslationRecord[]);
    if (result.data.length < 200) break;
  }
  const localizedPhotos = photos.map(photo => {
    const translated = photo.source_language === locale ? null : photoTranslations.find(item => item.photo_id === photo.id && item.source_version === photo.content_version);
    return { ...photo, title: translated?.title ?? photo.title, caption: translated?.caption ?? photo.caption,
      language: translated ? locale : photo.source_language };
  });
  const translations: BlogTranslationRecord[] = [];
  for (let start = 0; ; start += 200) {
    const result = await database.from('blog_post_translations')
      .select('post_id,locale,source_version,title,summary,category,tags,provider,updated_at')
      .eq('locale', locale).order('post_id').range(start, start + 199);
    if (result.error) break; // A temporary translation failure must not hide originals.
    translations.push(...result.data as BlogTranslationRecord[]);
    if (result.data.length < 200) break;
  }
  const toPost = (record: Omit<BlogPostRecord, 'markdown'>, translation: BlogTranslationRecord | null): BlogPost => ({
    slug: record.slug, title: translation?.title ?? record.title, date: record.published_on,
    summary: translation?.summary ?? record.summary, category: translation?.category ?? record.category,
    tags: translation?.tags ?? record.tags, cover: record.cover, readingMinutes: record.reading_minutes,
    sourceLanguage: record.source_language, language: translation ? locale : record.source_language,
    translationProvider: translation?.provider, html: '', toc: [],
  });
  const posts = records.map(record => toPost(record, selectTranslation(record, translations, locale)));
  if (slug) {
    const result = await database.from('blog_posts').select('*').eq('slug', slug).eq('published', true).maybeSingle();
    if (result.error) throw result.error;
    if (result.data) {
      const record = result.data as BlogPostRecord;
      const translated = await database.from('blog_post_translations').select('*').eq('post_id', record.id).eq('locale', locale).maybeSingle();
      const translation = selectTranslation(record, translated.data ? [translated.data] : [], locale);
      const markdown = translation?.markdown ?? record.markdown;
      const rendered = renderMarkdown(markdown);
      const current: BlogPost = { ...toPost(record, translation), readingMinutes: getReadingMinutes(markdown), html: rendered.html, toc: rendered.toc };
      const index = posts.findIndex(item => item.slug === slug);
      if (index >= 0) posts[index] = current;
      else posts.push(current);
    } else {
      const index = posts.findIndex(item => item.slug === slug);
      if (index >= 0) posts.splice(index, 1);
    }
  }
  return { posts, photos: localizedPhotos, links, settings: settingsResult.data as BlogSettingsRecord, source: 'supabase' };
}
