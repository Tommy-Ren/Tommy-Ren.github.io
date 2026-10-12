---
title: "用 Markdown 写下第一篇文章"
slug: writing-with-markdown
date: "2026-10-11"
summary: "一份可编辑的写作示例：从文章信息到标题、图片和代码块，了解这个博客的内容格式。"
category: 写作手记
tags: [Markdown, 写作, 博客]
cover: /blog/assets/coffee.webp
draft: false
---

接入 Supabase 后，可以在 `/blog/admin/` 的创作工作台写文章：填写标题、文章地址、摘要、分类和标签，用 Markdown 编辑正文，再切换到预览检查排版。保存草稿时内容只对管理员可见，点击发布后才会出现在博客中。

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
const idea = 'Keep writing';
console.log(idea);
```

引用文字以 `>` 开头：

> 先写一个清楚的段落，再把它扩展成一篇完整的文章。

## 发布前，读一遍

检查标题和摘要是否准确，图片是否可以访问，以及示例代码是否说明了上下文。数据库模式在后台预览后直接发布；仓库模式则提交 Markdown 并重新构建。

这篇文章可以保留作格式参考，也可以改写成你自己的 Markdown 使用笔记。
