import { renderToString } from 'react-dom/server';
import BlogApp from './BlogApp';
import type { BlogPageData } from './types';

export function renderBlog(data: BlogPageData) {
  return renderToString(<BlogApp data={data} />);
}
