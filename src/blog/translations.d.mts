import type { BlogPostRecord, BlogTranslationRecord } from './backend';
export function selectTranslation(post: Pick<BlogPostRecord, 'id' | 'source_language' | 'content_version'>, translations: BlogTranslationRecord[], locale: string): BlogTranslationRecord | null;
