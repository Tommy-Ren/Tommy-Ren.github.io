import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { loadBlogContent } from './blog-content.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const defaultContentDirectory = path.join(projectRoot, 'content', 'blog');

// 初始公开值复制自 BlogApp / portfolio，导入一次后由数据库后台管理。
// 固定 ID + DO NOTHING 保证重新导入不会覆盖后台修改。
const initialPhotos = [
  { id: '6e7d2011-1010-4000-8000-000000000001', title: '走进绿色里', caption: '留一段树影，给忙碌的日常。', image_url: '/blog/assets/forest.webp', source_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', credit: 'Unsplash · 示例素材', is_own: false, published: true, sort_order: 0 },
  { id: '6e7d2011-1010-4000-8000-000000000002', title: '海风来信', caption: '在海与天之间，把视线放远一点。', image_url: '/blog/assets/coast.webp', source_url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b', credit: 'Unsplash · 示例素材', is_own: false, published: true, sort_order: 1 },
  { id: '6e7d2011-1010-4000-8000-000000000003', title: '下一站，远方', caption: '山的轮廓，总会让人想继续出发。', image_url: '/blog/assets/road.webp', source_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', credit: 'Unsplash · 示例素材', is_own: false, published: true, sort_order: 2 },
  { id: '6e7d2011-1010-4000-8000-000000000004', title: '山间的风', caption: '山与湖，把这一刻留在相框里。', image_url: '/blog/assets/mountain.webp', source_url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e', credit: 'Unsplash · 示例素材', is_own: false, published: true, sort_order: 3 },
  { id: '6e7d2011-1010-4000-8000-000000000005', title: '日光漫游', caption: '在路上，慢一点也很好。', image_url: '/blog/assets/sunlight.webp', source_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', credit: 'Unsplash · 示例素材', is_own: false, published: true, sort_order: 4 },
  { id: '6e7d2011-1010-4000-8000-000000000006', title: '花开的季节', caption: '一小束颜色，一整天的好心情。', image_url: '/blog/assets/flowers.webp', source_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946', credit: 'Unsplash · 示例素材', is_own: false, published: true, sort_order: 5 },
  { id: '6e7d2011-1010-4000-8000-000000000007', title: '午后一杯', caption: '为今天按一下暂停，给思绪留一点空间。', image_url: '/blog/assets/coffee.webp', source_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31', credit: 'Unsplash · 示例素材', is_own: false, published: true, sort_order: 6 },
  { id: '6e7d2011-1010-4000-8000-000000000008', title: '城市的夜晚', caption: '路灯亮起，故事还在继续。', image_url: '/blog/assets/city.webp', source_url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390', credit: 'Unsplash · 示例素材', is_own: false, published: true, sort_order: 7 },
];
const initialLinks = [
  { id: '6e7d2011-1010-4000-8000-000000000101', title: 'MDN Web Docs', kind: 'WEB / DOCUMENTATION', description: '从一个 API 的细节开始，理解 Web 是如何工作的。', href: 'https://developer.mozilla.org/zh-CN/', symbol: 'M', color: 'lime', published: true, sort_order: 0 },
  { id: '6e7d2011-1010-4000-8000-000000000102', title: 'Three.js', kind: 'CREATIVE / GRAPHICS', description: '把想象放进浏览器：光、材质、空间与交互。', href: 'https://threejs.org/', symbol: '3', color: 'lavender', published: true, sort_order: 1 },
  { id: '6e7d2011-1010-4000-8000-000000000103', title: 'React', kind: 'UI / DEVELOPMENT', description: '构建交互界面，也练习把复杂问题拆成小部分。', href: 'https://react.dev/', symbol: 'R', color: 'blue', published: true, sort_order: 2 },
  { id: '6e7d2011-1010-4000-8000-000000000104', title: 'The Missing Semester', kind: 'TOOLS / LEARNING', description: '补上开发工具这一课，让日常工作更顺手。', href: 'https://missing.csail.mit.edu/', symbol: '>_', color: 'peach', published: true, sort_order: 3 },
];
const initialSettings = {
  id: 'main',
  display_name: 'Tommy Ren',
  home_title: '把好奇心，\n写进生活。',
  home_intro: '我是 Tommy，在温哥华学习计算机科学。\n这里记录代码、探索，以及路上的小发现。',
  about_title: '好奇心一直在线',
  about_bio: '我是 Tommy Ren，目前在 Simon Fraser University 就读 Computing Science。我在 BCIT 完成 Computer Systems Technology Diploma 后，继续在 SFU 探索人工智能与统计学。\n\n我喜欢弄清界面背后的系统如何运转，也喜欢把点子变成可以实际使用的东西。后端、Web、应用 AI 和游戏开发，都是我正在探索的方向。\n\n这个博客会留下学习中的思考、解决问题的过程，以及生活里那些值得记住的小发现。',
  contact_email: 'rent823242@gmail.com',
  github_url: 'https://github.com/Tommy-Ren',
  linkedin_url: 'https://www.linkedin.com/in/tommy-ren',
};

export function sqlLiteral(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('SQL seed numbers must be safe integers.');
    return String(value);
  }
  if (Array.isArray(value)) return `array[${value.map(sqlLiteral).join(', ')}]::text[]`;
  if (typeof value !== 'string' || value.includes('\0')) throw new Error('SQL seed values must be text without NUL.');
  // The transaction explicitly enables standard_conforming_strings.
  return `'${value.replaceAll("'", "''")}'`;
}

function insertRows(table, rows, conflictColumn) {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  return `insert into public.${table} (${columns.join(', ')}) values\n${rows.map(row => `  (${columns.map(column => sqlLiteral(row[column])).join(', ')})`).join(',\n')}\non conflict (${conflictColumn}) do nothing;\n`;
}

export async function buildSeedData({ contentDirectory = defaultContentDirectory } = {}) {
  const content = await loadBlogContent({ contentDir: contentDirectory });
  const bodies = new Map();
  const filenames = (await readdir(contentDirectory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /\.md$/i.test(entry.name)).map(entry => entry.name).sort();
  for (const filename of filenames) {
    const source = (await readFile(path.join(contentDirectory, filename), 'utf8')).replace(/^\uFEFF/, '');
    const header = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!header) throw new Error(`${filename}: missing frontmatter.`);
    const data = parseYaml(header[1], { maxAliasCount: 20, uniqueKeys: true, strict: true });
    if (data.draft === true) continue;
    const slug = data.slug ?? path.basename(filename, path.extname(filename));
    const body = source.slice(header[0].length).trim();
    if ([...body].length > 200000) throw new Error(`${filename}: Markdown exceeds the database's 200,000 character limit.`);
    bodies.set(slug, body);
  }
  const posts = content.posts.map(post => {
    const markdown = bodies.get(post.slug);
    if (!markdown) throw new Error(`Cannot find Markdown for ${post.slug}.`);
    return { slug: post.slug, title: post.title, summary: post.summary, markdown,
      category: post.category, tags: post.tags, cover: post.cover,
      published: true, published_on: post.date, reading_minutes: post.readingMinutes };
  });
  return { version: 1, posts, photos: initialPhotos, links: initialLinks };
}

export async function buildSeedSql(options = {}) {
  const { posts, photos, links } = await buildSeedData(options);
  return [
    '-- 自动生成的博客初始化数据；先运行 migrations/202610110001_blog_backend.sql。',
    '-- 无密码、管理员名单或密钥。已有文章 / 照片 / 收藏 / 设置不会被覆盖。',
    '-- Markdown 中 draft:true 的文件不会导出。',
    'begin;',
    'set local standard_conforming_strings = on;',
    '',
    insertRows('blog_posts', posts, 'slug'),
    insertRows('blog_photos', photos, 'id'),
    insertRows('blog_links', links, 'id'),
    insertRows('blog_settings', [initialSettings], 'id'),
    'commit;',
    '',
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/export-blog-seed.mjs [--output <file.sql>|-]\nDefault: supabase/seed.sql. Writes only local SQL; never connects to Supabase.');
    return;
  }
  if (args.length && (args.length !== 2 || args[0] !== '--output')) throw new Error('Expected --output <file.sql>|-.');
  const sql = await buildSeedSql();
  if (args[1] === '-') {
    process.stdout.write(sql);
    return;
  }
  const destination = path.resolve(projectRoot, args[1] ?? 'supabase/seed.sql');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, sql, 'utf8');
  if (!args.length) {
    await writeFile(path.join(projectRoot, 'src/blog/admin/starter-content.json'), JSON.stringify(await buildSeedData(), null, 2) + '\n', 'utf8');
  }
  console.log(`博客初始化 SQL 已生成：${destination}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
