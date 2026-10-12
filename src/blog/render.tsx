import { renderToString } from 'react-dom/server';
import BlogApp from './BlogApp';
import { LocaleProvider } from '../i18n/Locale';
import type { BlogPageData } from './types';

export function renderBlog(data: BlogPageData) {
  return renderToString(<LocaleProvider><BlogApp data={data} /></LocaleProvider>);
}
