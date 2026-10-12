-- 自动生成的博客初始化数据；先运行 migrations/202610110001_blog_backend.sql。
-- 无密码、管理员名单或密钥。已有文章 / 照片 / 收藏 / 设置不会被覆盖。
-- Markdown 中 draft:true 的文件不会导出。
begin;
set local standard_conforming_strings = on;

insert into public.blog_posts (slug, title, summary, markdown, category, tags, cover, published, published_on, reading_minutes) values
  ('static-blog-routes', '一个链接，为什么也需要自己的 HTML？', '建站笔记的初始示例：理解静态博客如何处理文章链接、刷新页面和 GitHub Pages 部署。', '在浏览器里点开一篇文章很容易。更容易被忽略的问题是：把它的地址发给朋友，对方直接打开，能否看到同一篇文章？

下面先记录仓库 Markdown 模式的做法。这个博客也支持数据库模式：页面仍由 GitHub Pages 托管，文章内容从 Supabase 读取。

## 浏览器地址与文件之间的关系

GitHub Pages 发布的是静态文件。访问 `/blog/articles/my-post/` 时，需要有对应的页面文件可以返回。

构建结果可以采用这样的目录：

```text
dist/
├── index.html
└── blog/
    ├── home/index.html
    └── articles/
        └── my-post/index.html
```

首页继续放在 `/`，博客首页放在 `/blog/home/`，文章有自己的目录。这些地址也就有了实际可以读取的 HTML。

## 为什么只切换 React 组件还不够

客户端路由可以在页面已经加载后切换组件。但是直接打开某个深层地址时，浏览器首先请求服务器上的文件；JavaScript 还没有机会运行。

如果托管环境没有配置所有路径回退到同一个入口，地址可能返回 404。因此，静态博客在构建阶段生成每篇文章的页面，会更符合 GitHub Pages 的工作方式。

## 先生成内容，再加入交互

每篇文章的标题、正文和链接都写进 HTML。页面加载后，React 再接管搜索、主题切换等交互。

这样既能直接访问文章，也能在关闭 JavaScript 时读到正文。文章还可以拥有独立的标题、摘要、分享信息和规范链接。

## 发布流程

1. 在仓库中添加或修改 Markdown 文章。
2. 构建时读取元数据，生成目录与文章页面。
3. 将构建产物交给 GitHub Pages。
4. 检查一篇文章的直接访问与刷新，而不只检查首页跳转。

文中的 `my-post` 是目录结构示例。这个博客的真实文章路径会根据每篇 Markdown 的 `slug` 生成。

## 文章来自数据库时

如果希望在后台写作后直接发布，可以把内容交给 Supabase。新文章使用 `/blog/articles/?post=my-post`：浏览器先取得已有的文章入口 HTML，再根据查询参数读取已发布的文章。这样直接访问和刷新都能取得实际存在的页面，新文章也不需要重新构建整个网站。

这种模式需要 JavaScript 和数据库连接。文章标题与正文在浏览器中加载，分享平台未必会执行这些脚本，因此不能把它当作每篇文章都已经生成完整 HTML 的方案。草稿是否能读取，则由数据库权限决定。', '工程笔记', array['Web', 'GitHub Pages', '静态网站']::text[], '/blog/assets/city.webp', true, '2026-10-11', 3),
  ('welcome-to-my-blog', '你好，这里是 Tommy 的写作空间', '一篇可以随时改写的开篇：给代码、想法和生活里的小发现留一个位置。', '这里是我的个人博客。主页介绍我在做什么，博客则用来慢慢记录：一个问题怎样被解决，一段代码为什么这样写，还有那些值得留下的小发现。

## 为什么想开始写

写下来，会迫使一个模糊的想法变得具体。把「我好像懂了」变成别人也能看懂的解释，也是检验理解的一种方式。

不必等到做出一个很大的项目才开始。一个清楚的例子、一次有用的排查、一条还没想明白的问题，都可以是一篇文章的起点。

## 这里会记录什么

- **代码与工程**：实现思路、工具使用，以及解决问题的过程。
- **学习与探索**：计算机科学、AI 和我感兴趣的话题。
- **生活里的观察**：旅行、照片和日常中值得记住的片段。

文章会尽量说明背景、选择和结果。遇到尚未验证的想法，也会清楚标注。

## 从一篇小文章开始

这个博客的第一版，先给写作留出一个安静的空间。内容可以慢慢增加，表达也可以不断修改。

> 把好奇心写下来，让下一次探索有迹可循。

这篇开篇是站点初始化示例。接入数据库后，可以在管理后台把它换成自己的故事；本地 Markdown 文件也可以留作写作和导入材料。', '随笔', array['博客', '生活', '开始']::text[], '/blog/assets/mountain.webp', true, '2026-10-11', 2),
  ('writing-with-markdown', '用 Markdown 写下第一篇文章', '一份可编辑的写作示例：从文章信息到标题、图片和代码块，了解这个博客的内容格式。', '接入 Supabase 后，可以在 `/blog/admin/` 的创作工作台写文章：填写标题、文章地址、摘要、分类和标签，用 Markdown 编辑正文，再切换到预览检查排版。保存草稿时内容只对管理员可见，点击发布后才会出现在博客中。

新文章地址为 `/blog/articles/?post=my-first-post`。文章地址使用英文小写、数字和短横线，发布后尽量保持不变。后台还能上传图片并复制公开图片地址；图片上传后就能被访问，草稿权限不会隐藏图片。

如果使用仓库 Markdown 模式，文章则存放在 `content/blog/` 中。每篇都是一个 `.md` 文件，可以用文本编辑器或 GitHub 网页编辑；下面的文件格式也可用作首次导入数据库的材料。

## 先填写文章信息

文件最上面的两行 `---` 之间是 YAML 元数据：

```yaml
---
title: "我的第一篇文章"
slug: my-first-post
date: "2026-10-11"
summary: "用一句话说明这篇文章讲什么。"
category: 随笔
tags: [学习, 生活]
cover: /images/project-planets.svg
draft: true
---
```

`slug` 决定文章地址，例如 `/blog/articles/my-first-post/`。使用英文小写、数字和短横线；发布后尽量保持不变，避免旧链接失效。

`draft: true` 的文章不会出现在网站中。写好后改成 `false`，提交并构建，文章就会加入列表。

## 用标题组织思路

正文中使用 `##` 标记二级标题，使用 `###` 标记更小的章节。文章标题已经由页面显示，不需要在正文里再写一次一级标题。

二级到四级标题会自动加入右侧目录。相同的标题会得到不同的锚点，点击目录能够定位到对应章节。

### 图片与链接

把自己的图片放到 `public/blog/assets/`，再用根路径引用：

```markdown
![图片说明](/blog/assets/my-photo.webp)

[返回个人主页](/)
```

描述图片内容的替代文字，有助于阅读辅助工具和图片加载失败时的理解。封面路径也应指向仓库中真实存在的公开图片。

### 代码与引用

三个反引号可以包围代码，后面写上语言名称：

```typescript
const idea = ''Keep writing'';
console.log(idea);
```

引用文字以 `>` 开头：

> 先写一个清楚的段落，再把它扩展成一篇完整的文章。

## 发布前，读一遍

检查标题和摘要是否准确，图片是否可以访问，以及示例代码是否说明了上下文。数据库模式在后台预览后直接发布；仓库模式则提交 Markdown 并重新构建。

这篇文章可以保留作格式参考，也可以改写成你自己的 Markdown 使用笔记。', '写作手记', array['Markdown', '写作', '博客']::text[], '/blog/assets/coffee.webp', true, '2026-10-11', 3)
on conflict (slug) do nothing;

insert into public.blog_photos (id, title, caption, image_url, source_url, credit, is_own, published, sort_order) values
  ('6e7d2011-1010-4000-8000-000000000001', '走进绿色里', '留一段树影，给忙碌的日常。', '/blog/assets/forest.webp', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', 'Unsplash · 示例素材', false, true, 0),
  ('6e7d2011-1010-4000-8000-000000000002', '海风来信', '在海与天之间，把视线放远一点。', '/blog/assets/coast.webp', 'https://images.unsplash.com/photo-1518837695005-2083093ee35b', 'Unsplash · 示例素材', false, true, 1),
  ('6e7d2011-1010-4000-8000-000000000003', '下一站，远方', '山的轮廓，总会让人想继续出发。', '/blog/assets/road.webp', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', 'Unsplash · 示例素材', false, true, 2),
  ('6e7d2011-1010-4000-8000-000000000004', '山间的风', '山与湖，把这一刻留在相框里。', '/blog/assets/mountain.webp', 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e', 'Unsplash · 示例素材', false, true, 3),
  ('6e7d2011-1010-4000-8000-000000000005', '日光漫游', '在路上，慢一点也很好。', '/blog/assets/sunlight.webp', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', 'Unsplash · 示例素材', false, true, 4),
  ('6e7d2011-1010-4000-8000-000000000006', '花开的季节', '一小束颜色，一整天的好心情。', '/blog/assets/flowers.webp', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946', 'Unsplash · 示例素材', false, true, 5),
  ('6e7d2011-1010-4000-8000-000000000007', '午后一杯', '为今天按一下暂停，给思绪留一点空间。', '/blog/assets/coffee.webp', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31', 'Unsplash · 示例素材', false, true, 6),
  ('6e7d2011-1010-4000-8000-000000000008', '城市的夜晚', '路灯亮起，故事还在继续。', '/blog/assets/city.webp', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390', 'Unsplash · 示例素材', false, true, 7)
on conflict (id) do nothing;

insert into public.blog_links (id, title, kind, description, href, symbol, color, published, sort_order) values
  ('6e7d2011-1010-4000-8000-000000000101', 'MDN Web Docs', 'WEB / DOCUMENTATION', '从一个 API 的细节开始，理解 Web 是如何工作的。', 'https://developer.mozilla.org/zh-CN/', 'M', 'lime', true, 0),
  ('6e7d2011-1010-4000-8000-000000000102', 'Three.js', 'CREATIVE / GRAPHICS', '把想象放进浏览器：光、材质、空间与交互。', 'https://threejs.org/', '3', 'lavender', true, 1),
  ('6e7d2011-1010-4000-8000-000000000103', 'React', 'UI / DEVELOPMENT', '构建交互界面，也练习把复杂问题拆成小部分。', 'https://react.dev/', 'R', 'blue', true, 2),
  ('6e7d2011-1010-4000-8000-000000000104', 'The Missing Semester', 'TOOLS / LEARNING', '补上开发工具这一课，让日常工作更顺手。', 'https://missing.csail.mit.edu/', '>_', 'peach', true, 3)
on conflict (id) do nothing;

insert into public.blog_settings (id, display_name, home_title, home_intro, about_title, about_bio, contact_email, github_url, linkedin_url) values
  ('main', 'Tommy Ren', '把好奇心，
写进生活。', '我是 Tommy，在温哥华学习计算机科学。
这里记录代码、探索，以及路上的小发现。', '好奇心一直在线', '我是 Tommy Ren，目前在 Simon Fraser University 就读 Computing Science。我在 BCIT 完成 Computer Systems Technology Diploma 后，继续在 SFU 探索人工智能与统计学。

我喜欢弄清界面背后的系统如何运转，也喜欢把点子变成可以实际使用的东西。后端、Web、应用 AI 和游戏开发，都是我正在探索的方向。

这个博客会留下学习中的思考、解决问题的过程，以及生活里那些值得记住的小发现。', 'rent823242@gmail.com', 'https://github.com/Tommy-Ren', 'https://www.linkedin.com/in/tommy-ren')
on conflict (id) do nothing;

commit;
