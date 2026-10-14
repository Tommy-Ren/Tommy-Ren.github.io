import type { BlogLink } from './types';

// Existing records used these values as card eyebrows. Preserve their contents
// while grouping them into the new navigation categories.
const aliases: Record<string, string> = {
  tools: 'tools', '工具': 'tools', 'creative / graphics': 'tools',
  'ui / development': 'tools', 'tools / learning': 'tools',
  links: 'links', '链接': 'links', 'web / documentation': 'links',
  'learning / resource': 'links', leisure: 'leisure', '休闲': 'leisure',
};
export const bookmarkGroups = ['tools', 'links', 'leisure'] as const;
const labels = {
  tools: { en: 'Tools', zh: '工具' },
  links: { en: 'Links', zh: '链接' },
  leisure: { en: 'Leisure', zh: '休闲' },
};
export function bookmarkCategory(kind: string): string {
  const key = kind.trim();
  const normalized = key.toLocaleLowerCase();
  return Object.hasOwn(aliases, normalized) ? aliases[normalized] : (key || 'links');
}
export function bookmarkCategoryLabel(category: string, locale: 'en' | 'zh'): string {
  return labels[category as keyof typeof labels]?.[locale] ?? category;
}
export function bookmarkCategories(resources: Pick<BlogLink, 'kind'>[]): string[] {
  return [...new Set<string>([...bookmarkGroups, ...resources.map(item => bookmarkCategory(item.kind))])];
}
export const bookmarkUrl = (category = '') => '/blog/collections/' + (category ? '?category=' + encodeURIComponent(category) : '');
