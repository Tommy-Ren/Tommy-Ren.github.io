import { useLocale } from '../../i18n/Locale';
import { studioMessages } from './studio-messages';

const dictionaries = { en: new Map<string, string>(), zh: new Map<string, string>() };
for (const [en, zh] of studioMessages) {
  dictionaries.en.set(zh, en);
  dictionaries.zh.set(en, zh);
}

export function useStudioLocale() {
  const { locale, t: siteText } = useLocale();
  const t = (source: string, values: unknown[] = []) => {
    const text = dictionaries[locale].get(source) ?? siteText(source);
    return text.replace(/\{(\d+)\}/g, (placeholder, index: string) => Number(index) < values.length ? String(values[Number(index)]) : placeholder);
  };
  return { locale, t };
}
