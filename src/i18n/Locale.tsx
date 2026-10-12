import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { translate } from './messages';
import './locale.css';

// Add a locale here and a dictionary in messages.ts to extend the language menu.
export const locales = { en: { label: 'EN', lang: 'en' }, zh: { label: '中文', lang: 'zh-CN' } } as const;
export type Locale = keyof typeof locales;
const storageKey = 'tommy-language';
const isLocale = (value: string | null): value is Locale => value !== null && Object.hasOwn(locales, value);
const Context = createContext({ locale: 'en' as Locale, setLocale: (_: Locale) => {}, t: (text: string) => translate(text, 'en') });

export function LocaleProvider({ children }: { children: ReactNode }) {
  // The server and the first client render both use English, preserving hydration.
  const [locale, update] = useState<Locale>('en');
  useEffect(() => {
    try { const value = localStorage.getItem(storageKey); if (isLocale(value)) update(value); } catch { /* Storage is optional. */ }
    const sync = (event: StorageEvent) => { if (event.key === storageKey && isLocale(event.newValue)) update(event.newValue); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { document.documentElement.lang = locales[locale].lang; }, [locale]);
  const setLocale = (value: Locale) => {
    update(value);
    try { localStorage.setItem(storageKey, value); } catch { /* Keep this visit's choice. */ }
  };
  return <Context.Provider value={{ locale, setLocale, t: text => translate(text, locale) }}>{children}</Context.Provider>;
}
export const useLocale = () => useContext(Context);
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  return <label className={`language-switch ${className}`}><Languages size={16} aria-hidden="true" /><select aria-label="Language / 语言" value={locale} onChange={event => { if (isLocale(event.target.value)) setLocale(event.target.value); }}>{Object.entries(locales).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>;
}
