import { createContext, useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { translate } from './messages';
import './locale.css';

// Add a locale here and a dictionary in messages.ts to extend the language menu.
export const locales = { en: { label: 'EN', name: 'English', lang: 'en' }, zh: { label: '中文', name: '简体中文', lang: 'zh-CN' } } as const;
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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const entries = Object.entries(locales) as [Locale, typeof locales[Locale]][];
  const selectedIndex = entries.findIndex(([key]) => key === locale);

  useEffect(() => {
    if (!open) return;
    options.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const closeAndFocus = () => { setOpen(false); trigger.current?.focus(); };
  const showMenu = (index = selectedIndex) => { setActiveIndex(index); setOpen(true); };
  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeAndFocus();
      return;
    }
    let next: number | undefined;
    if (event.key === 'ArrowDown') next = (activeIndex + 1) % entries.length;
    if (event.key === 'ArrowUp') next = (activeIndex - 1 + entries.length) % entries.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = entries.length - 1;
    if (next !== undefined) { event.preventDefault(); setActiveIndex(next); }
  };

  return <div ref={container} className={`language-switch ${className}`} data-open={open || undefined} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} id={`${menuId}-trigger`} type="button" className="language-switch-trigger"
      aria-label={`Language / 语言: ${locales[locale].name}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => open ? setOpen(false) : showMenu()}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          showMenu(event.key === 'ArrowUp' ? entries.length - 1 : selectedIndex);
        }
      }}>
      <Languages size={16} aria-hidden="true" /><span>{locales[locale].label}</span><ChevronDown size={13} className="language-switch-chevron" aria-hidden="true" />
    </button>
    {open && <div className="language-switch-popover">
      <span className="language-switch-heading">{locale === 'en' ? 'Select language' : '选择语言'}</span>
      <div id={menuId} role="menu" aria-labelledby={`${menuId}-trigger`} onKeyDown={onMenuKeyDown}>
        {entries.map(([key, value], index) => <button key={key} ref={element => { options.current[index] = element; }}
          className="language-switch-option" type="button" role="menuitemradio" aria-checked={locale === key}
          lang={value.lang} tabIndex={activeIndex === index ? 0 : -1} onFocus={() => setActiveIndex(index)}
          onClick={() => { setLocale(key); closeAndFocus(); }}>
          <span className="language-switch-code" aria-hidden="true">{value.label}</span><span>{value.name}</span>
          {locale === key && <Check size={14} aria-hidden="true" />}
        </button>)}
      </div>
    </div>}
  </div>;
}
