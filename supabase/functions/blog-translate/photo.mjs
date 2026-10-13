// Only descriptive text goes to DeepL; image URLs and photographer credits stay intact.
export async function translatePhotoText(photo, apiKey, signal, fetcher = fetch) {
  const fields = ['title', ...(photo.caption.trim() ? ['caption'] : [])];
  const response = await fetcher(`https://${apiKey.endsWith(':fx') ? 'api-free' : 'api'}.deepl.com/v2/translate`, {
    method: 'POST', signal,
    headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: fields.map(field => photo[field]), source_lang: photo.source_language === 'en' ? 'EN' : 'ZH',
      target_lang: photo.source_language === 'en' ? 'ZH-HANS' : 'EN-US', preserve_formatting: true }),
  });
  if (!response.ok) throw new Error(response.status === 456 ? 'DeepL 翻译额度已用完。' : response.status === 403 ? 'DeepL 密钥未通过验证。' : 'DeepL 暂时无法翻译，请稍后重试。');
  const data = await response.json();
  if (!data || !Array.isArray(data.translations) || data.translations.length !== fields.length || data.translations.some(item => !item || typeof item.text !== 'string' || !item.text.trim())) throw new Error('DeepL 返回的照片译文不完整，请重试。');
  return { title: data.translations[0].text, caption: fields.length === 2 ? data.translations[1].text : '' };
}
