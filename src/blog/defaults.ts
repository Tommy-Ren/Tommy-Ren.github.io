import { profile } from '../data/portfolio';
import type { BlogLink, BlogPhoto, BlogSettings } from './types';

export const defaultBlogSettings: BlogSettings = {
  display_name: 'Tommy Ren',
  home_title: '把好奇心，\n写进生活。',
  home_intro: '我是 Tommy，在温哥华学习计算机科学。\n这里记录代码、探索，以及路上的小发现。',
  about_title: '好奇心一直在线',
  about_bio: '我是 Tommy Ren，目前在 Simon Fraser University 就读 Computing Science。我在 BCIT 完成 Computer Systems Technology Diploma 后，继续在 SFU 探索人工智能与统计学。\n\n我喜欢弄清界面背后的系统如何运转，也喜欢把点子变成可以实际使用的东西。后端、Web、应用 AI 和游戏开发，都是我正在探索的方向。\n\n这个博客会留下学习中的思考、解决问题的过程，以及生活里那些值得记住的小发现。',
  contact_email: profile.email, github_url: profile.github, linkedin_url: profile.linkedin,
};
export const defaultBlogPhotos: BlogPhoto[] = [
  { id: 'forest', title: '走进绿色里', caption: '留一段树影，给忙碌的日常。', image_url: '/blog/assets/forest.webp', source_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', credit: 'Unsplash · 示例素材', is_own: false },
  { id: 'coast', title: '海风来信', caption: '在海与天之间，把视线放远一点。', image_url: '/blog/assets/coast.webp', source_url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b', credit: 'Unsplash · 示例素材', is_own: false },
  { id: 'road', title: '下一站，远方', caption: '山的轮廓，总会让人想继续出发。', image_url: '/blog/assets/road.webp', source_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', credit: 'Unsplash · 示例素材', is_own: false },
];
export const defaultBlogLinks: BlogLink[] = [
  { id: 'mdn', title: 'MDN Web Docs', kind: 'WEB / DOCUMENTATION', description: '从一个 API 的细节开始，理解 Web 是如何工作的。', href: 'https://developer.mozilla.org/zh-CN/', symbol: 'M', color: 'lime' },
  { id: 'three', title: 'Three.js', kind: 'CREATIVE / GRAPHICS', description: '把想象放进浏览器：光、材质、空间与交互。', href: 'https://threejs.org/', symbol: '3', color: 'lavender' },
  { id: 'react', title: 'React', kind: 'UI / DEVELOPMENT', description: '构建交互界面，也练习把复杂问题拆成小部分。', href: 'https://react.dev/', symbol: 'R', color: 'blue' },
  { id: 'semester', title: 'The Missing Semester', kind: 'TOOLS / LEARNING', description: '补上开发工具这一课，让日常工作更顺手。', href: 'https://missing.csail.mit.edu/', symbol: '>_', color: 'peach' },
];
