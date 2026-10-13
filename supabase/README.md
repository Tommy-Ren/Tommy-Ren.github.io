# Supabase 博客接入

个人主页继续使用 GitHub Pages 的 `/`，博客首页是 `/blog/home/`，管理员入口是 `/blog/admin/`。Supabase 提供 PostgreSQL、邮箱／密码登录和图片存储；后台保存内容后，博客从数据库读取，不需要为每次写作推送 Git。

## 1. 创建数据库表和权限

在 Supabase 项目中打开 **SQL Editor → New query**，完整运行 [202610110001_blog_backend.sql](migrations/202610110001_blog_backend.sql)。这是首次初始化 migration，只运行一次；再次运行会因表已存在而停止，事务不会覆盖内容。

初始化包括：

| 对象 | 用途 | 访客读取 | 浏览器写入 |
| --- | --- | --- | --- |
| `public.blog_posts` | Markdown 文章、分类、标签、发布日期 | 仅 `published=true` | 管理员增删改 |
| `public.blog_photos` | 照片、来源与署名 | 仅 `published=true` | 管理员增删改 |
| `public.blog_links` | 收藏链接 | 仅 `published=true` | 管理员增删改 |
| `public.blog_settings` | 主页文案、关于与公开联系方式 | 全部公开 | 管理员更新 `main` 行 |
| `private.blog_admins` | Auth 用户的管理员资格 | 不可读取 | 不可修改，包括管理员 |
| `public.is_blog_admin()` | 根据实际会话检查资格 | 仅返回 true / false | 不修改数据 |

所有内容表均开启 RLS。普通登录用户与匿名访客拥有相同的内容读取范围；登录成功本身不会获得管理员资格。保持 **Data API 的 exposed schemas** 中不包含 `private`。

字段长度、合法 slug、链接协议、标签数量等均由数据库校验，`updated_at` 由触发器生成。初始化同时创建必需的 `main` 设置行，后台可以立即编辑；文章、照片和收藏仍为空。`blog_settings` 的字段都属于公开文案，不用于存储任何凭据。

## 2. 可选：导入初始文章和示例内容

推荐先完成下面的管理员与网页连接设置，再登录 `/blog/admin/`，打开 **模板内容 → 导入并展示模板内容**。它会将 8 张配图上传至 Supabase Storage，并在数据库中发布 3 篇开篇文章、8 张示例照片和 4 个收藏链接。所有文章封面也使用上传后的云端图片地址。

导入只使用当前管理员会话，受现有 RLS 保护。重复导入跳过已有文章、照片与收藏，不改站点设置；网络中断后可以再次点击，已上传的图片会复用。示例内容可在后台继续编辑、撤下或删除。照片保留 Unsplash 来源并标为非个人摄影。

也可以选择 SQL 导入。在项目目录运行：

```powershell
node scripts/export-blog-seed.mjs
```

脚本生成本地 [seed.sql](seed.sql) 和后台使用的 `src/blog/admin/starter-content.json`，不会连接 Supabase。在 SQL Editor 完整运行 SQL，导入当前公开 Markdown 文章、8 张 Unsplash 示例照片、4 个收藏链接和 `main` 设置行。SQL 方式保留本站 `/blog/assets/` 图片地址，不上传图片；需要云端图片时使用后台导入。

`draft: true` 的 Markdown 不会导出。重新运行 seed SQL 时，文章按 slug、照片／收藏按固定 ID、设置按 `main` 检查冲突，已有内容全部 `DO NOTHING`，不会覆盖后台编辑。初始照片已标记 `is_own=false`，不会被描述为 Tommy 的旅行实拍。

接入数据库后，后台是动态内容来源。本地 Markdown 文件仍可作为备份或初始导入材料；修改文件本身不会覆盖已存在的数据库文章。

## 3. 创建你的管理员账号

在 **Authentication → Users** 中使用 Dashboard 的创建用户操作，填写你选择的邮箱和密码。密码仅在 Supabase Dashboard / 登录表单中输入，不写进代码、SQL 或聊天记录。确认账号能使用邮箱／密码登录；如果通过邮件邀请创建，请完成邀请流程。

然后在 SQL Editor 运行以下语句，**先把示例邮箱替换成刚创建账号的实际邮箱**：

```sql
do $$
declare admin_id uuid;
begin
  select id into admin_id from auth.users
  where lower(email) = lower('your-admin@example.com');
  if admin_id is null then
    raise exception '没有找到这个 Auth 用户，请先在 Authentication → Users 创建账号';
  end if;
  insert into private.blog_admins (user_id)
  values (admin_id) on conflict (user_id) do nothing;
end;
$$;
```

到 **Authentication → Sign In / Providers** 的用户注册配置中，关闭 **Allow new users to sign up**；保持 Email 登录启用。无需开启匿名登录，也无需公开注册入口。这样只允许已经创建的账号登录。[Supabase 注册配置说明](https://supabase.com/docs/guides/auth/general-configuration)

在 **Authentication → URL Configuration** 中设置 Site URL 为 `https://tommy-ren.github.io`，Redirect URLs 添加 `https://tommy-ren.github.io/blog/admin/` 和密码恢复地址 `https://tommy-ren.github.io/blog/admin/?mode=recovery`；本地测试时加入实际开发端口的这两个地址。后台使用 PKCE，密码重置邮件须在发起重置的同一浏览器中打开。默认邮件模板使用 Supabase 的确认链接；自定义邮件模板时确保保留 `redirectTo` 的回调地址。[重定向配置说明](https://supabase.com/docs/guides/auth/redirect-urls)

进入 `/blog/admin/` 登录。后台使用真实 Auth 会话，再通过 `is_blog_admin()` 和数据库 RLS 核验权限。新增管理员或取消资格只能通过受信任的 Dashboard SQL / 服务器操作。

## 4. 配置网页连接

在 Supabase 项目 **Connect** 对话框或 **Settings → API Keys** 取得 Project URL 和 **publishable key**。在网站项目根目录创建 `.env.local`：

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

已有旧项目也支持用 `VITE_SUPABASE_ANON_KEY` 配置 legacy anon key；两种公开 key 选一种即可。优先使用 publishable key。

这些公开配置会被打包到浏览器，权限由 RLS 决定。**不要填 `sb_secret_…`、`service_role`、数据库密码或管理员密码**。[Supabase API key 说明](https://supabase.com/docs/guides/getting-started/api-keys)

在网站项目目录运行以下命令，使用固定端口启动本地博客：

```powershell
npm.cmd run dev:blog
```

打开 `http://127.0.0.1:5175/blog/admin/` 登录，博客首页是 `http://127.0.0.1:5175/blog/home/`。保持终端运行，`Ctrl+C` 停止服务。脚本直接指定端口，无需追加 `-- --port` 参数；如果 5175 已被占用，会明确报错而不会自动换端口。修改 `.env.local` 后需重启服务。

GitHub Pages 的构建也需要相同配置，在仓库 **Settings → Secrets and variables → Actions → Variables** 中添加相同名称的公开变量，然后运行部署 workflow。私有凭据不参与前端构建。

## 5. 图片与公开范围

Migration 会创建公开 bucket `blog-media`，最大 **5 MiB / 文件**，仅接受 PNG、JPEG、WebP、AVIF、GIF，拒绝 SVG。后台通过 Storage API 上传，路径为 `<你的 Auth UID>/<唯一文件名>`，使用 `upsert:false`。只能由管理员上传和删除自己 UID 目录中的文件；已有文件不允许直接覆盖。

**公开 bucket 中的图片在上传后即可通过公开 URL 阅读，即使它用于草稿。** RLS 隐藏未发布文章、照片记录与收藏，但不会把公开图片变成私有附件。私密照片应使用独立的私有 bucket 和签名 URL，本博客的 `blog-media` 用于准备公开的素材。

取消文章编辑不会自动删除上传文件。删除文件前先确认其他文章或照片没有引用它；原图和数据库内容应分别备份。实际文件的上传／删除使用 Storage API，不手动删除 `storage.objects` 元数据。[Storage 权限说明](https://supabase.com/docs/guides/storage/security/access-control)、[Storage 数据说明](https://supabase.com/docs/guides/storage/schema/design)

## 6. 可选：动态 RSS

[blog-feed](functions/blog-feed/index.ts) 是公开 Edge Function，用数据库中的最新 100 篇已发布文章生成 RSS。它始终以 `anon` 权限读取标题、摘要等元数据，忽略请求携带的管理员会话，读取不到草稿正文。

安装／使用 Supabase CLI 后，从仓库根目录执行以下命令，将 `YOUR_PROJECT_REF` 替换为实际项目标识：

```powershell
npx supabase login
npx supabase functions deploy blog-feed --project-ref YOUR_PROJECT_REF
```

登录 CLI 时使用自己的 Supabase 授权流程。本项目 [config.toml](config.toml) 只对 `blog-feed` 关闭 JWT 校验，让普通 RSS 阅读器能订阅；其他函数保留默认保护。`project_id = "tommy-ren-blog"` 是本地配置名称，部署项目以 `--project-ref` 为准。

订阅地址是 `https://YOUR_PROJECT_REF.supabase.co/functions/v1/blog-feed`，正文链接为 `https://tommy-ren.github.io/blog/articles/?post=<slug>`。确认函数可访问后，在 `.env.local` 和 GitHub Actions Variables 中增加 `VITE_BLOG_RSS_ENABLED=true`，重新构建部署以显示 RSS 入口。未启用时，数据库模式隐藏该入口；博客核心功能不依赖 RSS。

函数读取平台注入的 `SUPABASE_PUBLISHABLE_KEYS`，兼容旧 `SUPABASE_ANON_KEY`，完全不使用 secret / service_role key。无需为 RSS 复制私有凭据。[Edge Functions 部署](https://supabase.com/docs/guides/functions/deploy)、[运行时环境变量](https://supabase.com/docs/guides/functions/secrets)

## 验证

```powershell
node --test supabase/tests/blog-feed.test.mjs supabase/tests/blog-seed.test.mjs
```

上述测试检查 SQL 安全转义、原始 Markdown 与草稿导出、seed 冲突保护，以及 RSS 的公开身份、方法限制、XML 转义和错误响应；不连接云项目。

[blog_rls.sql](tests/blog_rls.sql) 在事务内创建测试账号／数据，验证匿名、普通用户、管理员的读取／增删改、禁止自行升权和媒体目录权限，最后 `ROLLBACK`。请在已应用 migration 的本地／测试 Supabase 数据库中整段运行，不逐条执行。Storage 夹具只含元数据，不代表实际上传文件。

开发期间，该 migration、seed 与 RLS SQL 已在 PGlite 的 PostgreSQL 18.3 中执行通过；`auth` / `storage` 的表和辅助函数使用测试夹具，PostgreSQL 的角色、权限、约束与 RLS 为真实执行。**云端 Auth 登录、Storage API 的格式／大小限制和 Edge Function 部署，需要项目接入后继续验收。**

## 8. DeepL 文章自动翻译

依次执行基础数据库迁移和 `migrations/20261012020000_blog_translations.sql`。后者为文章增加原文语言与内容版本，并建立独立译文表；不会改写原文。

在项目的 **Edge Functions → Secrets** 添加 `DEEPL_API_KEY`。这是服务端密钥，不能加 `VITE_` 前缀、放入 GitHub Pages 构建变量或提交到仓库。Free API key 的 `:fx` 后缀用于选择 `api-free.deepl.com`；其他 key 使用 `api.deepl.com`。

```powershell
npx supabase functions deploy blog-translate --project-ref gkkofvtqudyvwxtqmnbq
```

函数开启网关 JWT 验证，并通过 `auth.getUser()` 和 `is_blog_admin()` 再次检查用户。仅现有博客管理员可以调用 DeepL，普通读者只读取缓存，不会触发翻译费用。函数使用调用者身份和数据库 RLS，不使用 service-role key。

后台文章编辑器选择原文语言（中文 / English）；默认勾选「发布 / 保存已发布文章时自动翻译」。发布后会生成标题、摘要、分类、标签和 Markdown 正文的另一语言版本。已有文章可点击「生成 / 更新译文」，并展开预览。生成草稿译文会把草稿文字发给 DeepL，应仅用于你准备交给该服务的内容。取消勾选可只保存原文。

读者切换 EN / 中文时，列表、文章、目录和页面标题一同切换。代码块、行内代码、链接目标与图片地址保持原样。译文沿用原文 URL。原文内容改变时版本自动更新；过时译文不再显示。封面或发布日期调整不会使译文失效。缺少译文或 API 异常时保留原文，正文顶部说明当前语言；后台显示可重试错误。

直接在 SQL / Table Editor 改文章不会自动调用 DeepL，需要在博客后台点击更新译文。后台保存期间请等待翻译完成；关闭页面导致中断时可重新点击生成，成功缓存会复用。

验证：`npm run test:backend` 覆盖翻译方向、Markdown 保护、请求分批、额度错误与缓存版本。`tests/translations.sql` 在事务中验证公开/草稿权限及过期写入，最后回滚所有测试数据。

实现依据：[DeepL text translation](https://developers.deepl.com/api-reference/translate/request-translation)、[Supabase function secrets](https://supabase.com/docs/guides/functions/secrets)。

## 9. 照片标题与说明自动翻译

运行 `migrations/20261013000000_photo_translations.sql`，并重新部署 `blog-translate`。继续使用现有 `DEEPL_API_KEY`，无需新密钥。后台相册编辑器支持选择原文语言，公开或保存已公开照片时默认自动生成另一种语言；「补全所有公开照片译文」会补齐现有照片，并复用有效缓存。

只有标题和说明发送给 DeepL；图片、来源链接和摄影署名保持原样。首页精选图片和 Photos 页都读取当前语言的译文。修改标题、说明或原文语言会使旧译文失效；修改图片地址、排序和署名不会。数据库直接编辑后须从后台更新译文。

照片译文采用与文章相同的管理员检查、版本锁和 RLS：读者只能读取已公开照片的最新译文，不能调用翻译或写入译文。`tests/photo-translations.sql` 整段执行后回滚夹具，检查版本、匿名和普通用户权限；`npm run test:backend` 检查双向翻译及异常响应。
