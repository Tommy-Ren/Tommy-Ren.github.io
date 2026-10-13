export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  category: string;
  tags: string[];
  cover: string;
  readingMinutes: number;
  html: string;
  toc: { id: string; title: string; level: number }[];
  sourceLanguage?: 'en' | 'zh';
  language?: 'en' | 'zh';
  translationProvider?: 'manual' | 'deepl';
}

export interface BlogContent {
  posts: BlogPost[];
  photos?: BlogPhoto[];
  links?: BlogLink[];
  settings?: BlogSettings;
  source?: 'local' | 'supabase';
}

export interface BlogPhoto {
  language?: 'en' | 'zh';
  id: string;
  title: string;
  caption: string;
  image_url: string;
  source_url: string | null;
  credit: string;
  is_own: boolean;
}

export interface BlogLink {
  id: string;
  title: string;
  kind: string;
  description: string;
  href: string;
  symbol: string;
  color: 'lime' | 'lavender' | 'blue' | 'peach';
}

export interface BlogSettings {
  display_name: string;
  home_title: string;
  home_intro: string;
  about_title: string;
  about_bio: string;
  contact_email: string;
  github_url: string;
  linkedin_url: string;
}

export type BlogPage = 'home' | 'articles' | 'photos' | 'collections' | 'about' | 'post' | 'admin' | 'not-found';

export interface BlogPageData {
  route: { page: BlogPage; slug?: string };
  content: BlogContent;
  live?: { status: 'loading' | 'ready' | 'error'; message?: string };
}
