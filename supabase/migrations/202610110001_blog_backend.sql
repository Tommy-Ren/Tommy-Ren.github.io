-- Tommy's Blog: 在 Supabase SQL Editor 中完整运行一次。
-- 表数据和权限一起提交；账号只能由 Dashboard / 受信任的服务器创建。
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.blog_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.blog_admins enable row level security;
revoke all on table private.blog_admins from public, anon, authenticated;
grant select, insert, update, delete on table private.blog_admins to service_role;

create function public.is_blog_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.blog_admins
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_blog_admin() from public;
grant execute on function public.is_blog_admin() to anon, authenticated, service_role;

create function private.touch_blog_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.touch_blog_updated_at() from public, anon, authenticated;

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (char_length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(btrim(title)) between 1 and 160 and title !~ '[[:cntrl:]]'),
  summary text not null default '' check (char_length(summary) <= 400 and summary !~ '[[:cntrl:]]'),
  markdown text not null default '' check (char_length(markdown) <= 200000),
  category text not null default '随笔'
    check (char_length(btrim(category)) between 1 and 60 and category !~ '[[:cntrl:]]'),
  tags text[] not null default '{}'
    check (
      cardinality(tags) <= 12
      and (array_ndims(tags) is null or array_ndims(tags) = 1)
      and array_position(tags, null) is null
      and array_to_string(tags, '') !~ '[[:cntrl:]]'
      and (cardinality(tags) = 0 or (
        array_to_string(tags, E'\n') ~ E'^([^\n]{1,40}\n)*[^\n]{1,40}$'
        and array_to_string(tags, E'\n') !~ E'(^|\n)[[:space:]]*(\n|$)'
      ))
    ),
  cover text not null default ''
    check (
      char_length(cover) <= 2048
      and cover !~ '[[:space:][:cntrl:]<>]'
      and position(chr(92) in cover) = 0
      and (cover = '' or (
        left(cover, 1) = '/' and left(cover, 2) <> '//'
        and cover !~ '(^|/)\.\.(/|$)'
      ) or cover ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#]|$)')
    ),
  published boolean not null default false,
  published_on date not null default current_date
    check (published_on between date '1900-01-01' and date '9999-12-31'),
  reading_minutes integer not null default 1 check (reading_minutes between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_published_body check (not published or char_length(btrim(markdown)) > 0)
);
create index blog_posts_published_date on public.blog_posts(published_on desc, slug) where published;
create trigger blog_posts_updated_at before update on public.blog_posts
  for each row execute function private.touch_blog_updated_at();

create table public.blog_photos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160 and title !~ '[[:cntrl:]]'),
  caption text not null default '' check (char_length(caption) <= 2000),
  image_url text not null
    check (
      char_length(image_url) between 1 and 2048
      and image_url !~ '[[:space:][:cntrl:]<>]'
      and position(chr(92) in image_url) = 0
      and ((left(image_url, 1) = '/' and left(image_url, 2) <> '//'
        and image_url !~ '(^|/)\.\.(/|$)')
        or image_url ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#]|$)')
    ),
  source_url text
    check (source_url is null or (
      char_length(source_url) between 1 and 2048
      and source_url !~ '[[:space:][:cntrl:]<>]'
      and position(chr(92) in source_url) = 0
      and source_url ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#]|$)'
    )),
  credit text not null default '' check (char_length(credit) <= 300 and credit !~ '[[:cntrl:]]'),
  is_own boolean not null default true,
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order between 0 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blog_photos_published_order on public.blog_photos(sort_order, created_at) where published;
create trigger blog_photos_updated_at before update on public.blog_photos
  for each row execute function private.touch_blog_updated_at();

create table public.blog_links (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160 and title !~ '[[:cntrl:]]'),
  kind text not null default 'BOOKMARK'
    check (char_length(btrim(kind)) between 1 and 80 and kind !~ '[[:cntrl:]]'),
  description text not null default '' check (char_length(description) <= 2000),
  href text not null
    check (
      char_length(href) between 1 and 2048
      and href !~ '[[:space:][:cntrl:]<>]'
      and position(chr(92) in href) = 0
      and href ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#]|$)'
    ),
  symbol text not null default '↗'
    check (char_length(btrim(symbol)) between 1 and 12 and symbol !~ '[[:cntrl:]]'),
  color text not null default 'lime' check (color in ('lime', 'lavender', 'blue', 'peach')),
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order between 0 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blog_links_published_order on public.blog_links(sort_order, created_at) where published;
create trigger blog_links_updated_at before update on public.blog_links
  for each row execute function private.touch_blog_updated_at();

create table public.blog_settings (
  id text primary key default 'main' check (id = 'main'),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 80 and display_name !~ '[[:cntrl:]]'),
  home_title text not null
    check (char_length(btrim(home_title)) between 1 and 160
      and char_length(home_title) - char_length(replace(home_title, E'\n', '')) <= 1),
  home_intro text not null
    check (char_length(btrim(home_intro)) between 1 and 600
      and char_length(home_intro) - char_length(replace(home_intro, E'\n', '')) <= 1),
  about_title text not null
    check (char_length(btrim(about_title)) between 1 and 160 and about_title !~ '[[:cntrl:]]'),
  about_bio text not null default '' check (char_length(about_bio) <= 10000),
  contact_email text not null default ''
    check (char_length(contact_email) <= 254
      and (contact_email = '' or contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  github_url text not null default ''
    check (char_length(github_url) <= 2048 and github_url !~ '[[:space:][:cntrl:]<>]'
      and position(chr(92) in github_url) = 0
      and (github_url = '' or github_url ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#]|$)')),
  linkedin_url text not null default ''
    check (char_length(linkedin_url) <= 2048 and linkedin_url !~ '[[:space:][:cntrl:]<>]'
      and position(chr(92) in linkedin_url) = 0
      and (linkedin_url = '' or linkedin_url ~ '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#]|$)')),
  updated_at timestamptz not null default now()
);
create trigger blog_settings_updated_at before update on public.blog_settings
  for each row execute function private.touch_blog_updated_at();

-- 必需的公开设置行在初始化时创建；文章、相册和收藏的 seed 可选。
insert into public.blog_settings (id, display_name, home_title, home_intro, about_title, about_bio, contact_email, github_url, linkedin_url) values
  ('main', 'Tommy Ren', '把好奇心，
写进生活。', '我是 Tommy，在温哥华学习计算机科学。
这里记录代码、探索，以及路上的小发现。', '好奇心一直在线', '我是 Tommy Ren，目前在 Simon Fraser University 就读 Computing Science。我在 BCIT 完成 Computer Systems Technology Diploma 后，继续在 SFU 探索人工智能与统计学。

我喜欢弄清界面背后的系统如何运转，也喜欢把点子变成可以实际使用的东西。后端、Web、应用 AI 和游戏开发，都是我正在探索的方向。

这个博客会留下学习中的思考、解决问题的过程，以及生活里那些值得记住的小发现。', 'rent823242@gmail.com', 'https://github.com/Tommy-Ren', 'https://www.linkedin.com/in/tommy-ren')
on conflict (id) do nothing;

alter table public.blog_posts enable row level security;
alter table public.blog_photos enable row level security;
alter table public.blog_links enable row level security;
alter table public.blog_settings enable row level security;

revoke all on table public.blog_posts, public.blog_photos, public.blog_links, public.blog_settings
  from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.blog_posts, public.blog_photos, public.blog_links, public.blog_settings
  to anon, authenticated;
grant insert, update, delete on table public.blog_posts, public.blog_photos, public.blog_links
  to authenticated;
grant update (display_name, home_title, home_intro, about_title, about_bio, contact_email, github_url, linkedin_url)
  on table public.blog_settings to authenticated;
grant all on table public.blog_posts, public.blog_photos, public.blog_links, public.blog_settings
  to service_role;

create policy blog_posts_public_read on public.blog_posts for select to anon, authenticated
  using (published);
create policy blog_posts_admin_read on public.blog_posts for select to authenticated
  using ((select public.is_blog_admin()));
create policy blog_posts_admin_insert on public.blog_posts for insert to authenticated
  with check ((select public.is_blog_admin()));
create policy blog_posts_admin_update on public.blog_posts for update to authenticated
  using ((select public.is_blog_admin())) with check ((select public.is_blog_admin()));
create policy blog_posts_admin_delete on public.blog_posts for delete to authenticated
  using ((select public.is_blog_admin()));

create policy blog_photos_public_read on public.blog_photos for select to anon, authenticated
  using (published);
create policy blog_photos_admin_read on public.blog_photos for select to authenticated
  using ((select public.is_blog_admin()));
create policy blog_photos_admin_insert on public.blog_photos for insert to authenticated
  with check ((select public.is_blog_admin()));
create policy blog_photos_admin_update on public.blog_photos for update to authenticated
  using ((select public.is_blog_admin())) with check ((select public.is_blog_admin()));
create policy blog_photos_admin_delete on public.blog_photos for delete to authenticated
  using ((select public.is_blog_admin()));

create policy blog_links_public_read on public.blog_links for select to anon, authenticated
  using (published);
create policy blog_links_admin_read on public.blog_links for select to authenticated
  using ((select public.is_blog_admin()));
create policy blog_links_admin_insert on public.blog_links for insert to authenticated
  with check ((select public.is_blog_admin()));
create policy blog_links_admin_update on public.blog_links for update to authenticated
  using ((select public.is_blog_admin())) with check ((select public.is_blog_admin()));
create policy blog_links_admin_delete on public.blog_links for delete to authenticated
  using ((select public.is_blog_admin()));

create policy blog_settings_public_read on public.blog_settings for select to anon, authenticated
  using (true);
create policy blog_settings_admin_update on public.blog_settings for update to authenticated
  using ((select public.is_blog_admin())) with check ((select public.is_blog_admin()));

-- Storage bucket 配置可由 SQL 创建；实际文件的增删一律通过 Storage API。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-media', 'blog-media', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 路径为 <管理员 UID>/<唯一文件名>；上传使用 upsert:false。
create policy blog_media_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'blog-media' and (select public.is_blog_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy blog_media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-media' and (select public.is_blog_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy blog_media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'blog-media' and (select public.is_blog_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 限制其他宽泛的项目 policy，防止未来误授予此 bucket 的写权限。
create policy blog_media_write_admin_guard on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'blog-media' or ((select public.is_blog_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text));
create policy blog_media_update_guard on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id <> 'blog-media') with check (bucket_id <> 'blog-media');
create policy blog_media_delete_admin_guard on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id <> 'blog-media' or ((select public.is_blog_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text));

comment on function public.is_blog_admin() is 'Server-side membership check; no administrator IDs are exposed to clients.';
comment on table public.blog_settings is 'One public settings row. Browser administrators may update its content, never insert or delete it.';
comment on table private.blog_admins is 'Trusted SQL / server provisioned only. Do not add this schema to the Data API exposed schemas.';

commit;
