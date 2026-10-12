export function selectTranslation(post, translations, locale) {
  if (post.source_language === locale) return null;
  return translations.find(item => item.post_id === post.id && item.locale === locale && item.source_version === post.content_version) || null;
}
