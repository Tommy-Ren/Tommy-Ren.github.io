-- 在已应用 migration 的本地 / 测试 Supabase 数据库中整段运行。
-- 所有账号、内容与 Storage 元数据都是事务内的测试夹具，最后 ROLLBACK。
-- 仅验证数据库策略；实际上传 MIME / 5 MiB 校验还需通过 Storage API 验收。
begin;

insert into auth.users (id, email) values
  ('b10a0000-0000-4000-8000-000000000001', 'blog-admin-rls@example.invalid'),
  ('b10a0000-0000-4000-8000-000000000002', 'blog-member-rls@example.invalid');
insert into private.blog_admins (user_id) values ('b10a0000-0000-4000-8000-000000000001');

insert into public.blog_posts (id, slug, title, markdown, published) values
  ('b10b0000-0000-4000-8000-000000000001', 'rls-test-published', '公开夹具', '正文', true),
  ('b10b0000-0000-4000-8000-000000000002', 'rls-test-private', '草稿夹具', '私密正文', false);
insert into public.blog_photos (id, title, image_url, published) values
  ('b10c0000-0000-4000-8000-000000000001', '公开照片', '/blog/assets/forest.webp', true),
  ('b10c0000-0000-4000-8000-000000000002', '草稿照片', '/blog/assets/coast.webp', false);
insert into public.blog_links (id, title, href, published) values
  ('b10d0000-0000-4000-8000-000000000001', '公开收藏', 'https://example.com/', true),
  ('b10d0000-0000-4000-8000-000000000002', '草稿收藏', 'https://example.com/draft', false);
insert into public.blog_settings (id, display_name, home_title, home_intro, about_title)
values ('main', 'RLS 夹具', '测试首页', '介绍', '关于') on conflict (id) do nothing;
insert into storage.objects (bucket_id, name) values
  ('blog-media', 'b10a0000-0000-4000-8000-000000000001/rls-existing.webp'),
  ('blog-media', 'b10a0000-0000-4000-8000-000000000002/rls-other-existing.webp');
-- 模拟项目中另有过于宽泛的 policy，restrictive guard 仍应拦住此 bucket 的越权写入。
create policy blog_rls_test_overbroad_storage on storage.objects for all to anon, authenticated
  using (true) with check (true);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
do $$
declare affected integer;
begin
  if public.is_blog_admin() then raise exception '匿名访客被误判为管理员'; end if;
  if (select count(*) from public.blog_posts where id::text like 'b10b%') <> 1
    or (select count(*) from public.blog_photos where id::text like 'b10c%') <> 1
    or (select count(*) from public.blog_links where id::text like 'b10d%') <> 1
    then raise exception '匿名访客未能恰好读取公开夹具'; end if;
  if exists (select 1 from public.blog_posts where slug = 'rls-test-private')
    or exists (select 1 from public.blog_photos where id = 'b10c0000-0000-4000-8000-000000000002')
    or exists (select 1 from public.blog_links where id = 'b10d0000-0000-4000-8000-000000000002')
    then raise exception '匿名访客读取了草稿'; end if;
  if not exists (select 1 from public.blog_settings where id = 'main')
    then raise exception '匿名访客无法读取公开设置'; end if;
  if has_table_privilege('anon', 'public.blog_posts', 'INSERT')
    or has_table_privilege('anon', 'public.blog_posts', 'UPDATE')
    or has_table_privilege('anon', 'public.blog_posts', 'DELETE')
    or has_table_privilege('anon', 'public.blog_photos', 'INSERT')
    or has_table_privilege('anon', 'public.blog_photos', 'UPDATE')
    or has_table_privilege('anon', 'public.blog_photos', 'DELETE')
    or has_table_privilege('anon', 'public.blog_links', 'INSERT')
    or has_table_privilege('anon', 'public.blog_links', 'UPDATE')
    or has_table_privilege('anon', 'public.blog_links', 'DELETE')
    then raise exception '匿名访客持有内容表写权限'; end if;
  begin
    insert into public.blog_posts (slug, title) values ('rls-anon-write', '禁止');
    raise exception '匿名访客成功创建文章';
  exception when insufficient_privilege then null; end;
  begin
    update public.blog_posts set title = '禁止' where slug = 'rls-test-published';
    raise exception '匿名访客成功更新文章';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.blog_posts where slug = 'rls-test-published';
    raise exception '匿名访客成功删除文章';
  exception when insufficient_privilege then null; end;
  begin
    update public.blog_settings set display_name = '禁止' where id = 'main';
    raise exception '匿名访客成功修改设置';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from private.blog_admins;
    raise exception '匿名访客成功读取管理员名单';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name)
    values ('blog-media', 'b10a0000-0000-4000-8000-000000000001/rls-anon-denied.webp');
    raise exception '匿名访客通过宽泛 policy 上传了图片';
  exception when insufficient_privilege then null; end;
  delete from storage.objects where bucket_id = 'blog-media' and name like '%rls-existing.webp';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '匿名访客通过宽泛 policy 删除了图片'; end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"b10a0000-0000-4000-8000-000000000002"}', true);
select set_config('request.jwt.claim.sub', 'b10a0000-0000-4000-8000-000000000002', true);
do $$
declare affected integer;
begin
  if public.is_blog_admin() then raise exception '普通登录用户被误判为管理员'; end if;
  if (select count(*) from public.blog_posts where id::text like 'b10b%') <> 1
    or (select count(*) from public.blog_photos where id::text like 'b10c%') <> 1
    or (select count(*) from public.blog_links where id::text like 'b10d%') <> 1
    then raise exception '普通登录用户的公开读取不正确'; end if;
  begin
    insert into public.blog_posts (slug, title) values ('rls-member-write', '禁止');
    raise exception '普通登录用户成功创建文章';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.blog_photos (title, image_url) values ('禁止', '/test.webp');
    raise exception '普通登录用户成功创建照片';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.blog_links (title, href) values ('禁止', 'https://example.com/');
    raise exception '普通登录用户成功创建收藏';
  exception when insufficient_privilege then null; end;
  update public.blog_posts set title = '禁止' where slug = 'rls-test-published';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '普通登录用户成功更新文章'; end if;
  delete from public.blog_posts where slug = 'rls-test-published';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '普通登录用户成功删除文章'; end if;
  update public.blog_photos set title = '禁止' where id = 'b10c0000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '普通登录用户成功更新照片'; end if;
  delete from public.blog_photos where id = 'b10c0000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '普通登录用户成功删除照片'; end if;
  update public.blog_links set title = '禁止' where id = 'b10d0000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '普通登录用户成功更新收藏'; end if;
  delete from public.blog_links where id = 'b10d0000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '普通登录用户成功删除收藏'; end if;
  update public.blog_settings set display_name = '禁止' where id = 'main';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '普通登录用户成功修改设置'; end if;
  begin
    insert into private.blog_admins (user_id) values ('b10a0000-0000-4000-8000-000000000002');
    raise exception '普通登录用户成功自行升权';
  exception when insufficient_privilege then null; end;
  if public.is_blog_admin() then raise exception '管理员身份可由客户端伪造'; end if;
  begin
    insert into storage.objects (bucket_id, name)
    values ('blog-media', 'b10a0000-0000-4000-8000-000000000002/rls-denied.webp');
    raise exception '普通登录用户成功上传图片';
  exception when insufficient_privilege then null; end;
  update storage.objects set name = 'b10a0000-0000-4000-8000-000000000002/rls-bad-update.webp'
  where bucket_id = 'blog-media' and name = 'b10a0000-0000-4000-8000-000000000002/rls-other-existing.webp';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '普通登录用户通过宽泛 policy 修改了图片'; end if;
  delete from storage.objects where bucket_id = 'blog-media'
    and name = 'b10a0000-0000-4000-8000-000000000002/rls-other-existing.webp';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '普通登录用户通过宽泛 policy 删除了图片'; end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"b10a0000-0000-4000-8000-000000000001"}', true);
select set_config('request.jwt.claim.sub', 'b10a0000-0000-4000-8000-000000000001', true);
do $$
declare affected integer;
begin
  if not public.is_blog_admin() then raise exception '管理员未被识别'; end if;
  if (select count(*) from public.blog_posts where id::text like 'b10b%') <> 2
    or (select count(*) from public.blog_photos where id::text like 'b10c%') <> 2
    or (select count(*) from public.blog_links where id::text like 'b10d%') <> 2
    then raise exception '管理员无法读取草稿和公开内容'; end if;
  insert into public.blog_posts (slug, title) values ('rls-admin-write', '管理员新草稿');
  update public.blog_posts set markdown = '发布正文', published = true where slug = 'rls-admin-write';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '管理员更新 / 发布文章失败'; end if;
  delete from public.blog_posts where slug = 'rls-admin-write';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '管理员删除文章失败'; end if;
  insert into public.blog_photos (id, title, image_url)
  values ('b10c0000-0000-4000-8000-000000000003', '新增照片', '/new.webp');
  update public.blog_photos set caption = '照片说明', published = true
  where id = 'b10c0000-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '管理员更新照片失败'; end if;
  delete from public.blog_photos where id = 'b10c0000-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '管理员删除照片失败'; end if;
  insert into public.blog_links (id, title, href)
  values ('b10d0000-0000-4000-8000-000000000003', '新增收藏', 'https://example.com/new');
  update public.blog_links set description = '收藏说明', published = true
  where id = 'b10d0000-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '管理员更新收藏失败'; end if;
  delete from public.blog_links where id = 'b10d0000-0000-4000-8000-000000000003';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '管理员删除收藏失败'; end if;
  update public.blog_settings set display_name = '管理员可更新' where id = 'main';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '管理员更新公开设置失败'; end if;
  begin
    insert into public.blog_settings (id, display_name, home_title, home_intro, about_title)
    values ('other', '禁止', '禁止', '禁止', '禁止');
    raise exception '管理员通过浏览器插入了设置';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.blog_settings where id = 'main';
    raise exception '管理员通过浏览器删除了设置';
  exception when insufficient_privilege then null; end;
  begin
    insert into private.blog_admins (user_id) values ('b10a0000-0000-4000-8000-000000000002');
    raise exception '管理员通过浏览器扩大了管理员名单';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.blog_posts (slug, title) values ('INVALID/SLUG', '坏路径');
    raise exception '文章接受了非法 slug';
  exception when check_violation then null; end;
  begin
    insert into public.blog_links (title, href) values ('坏链接', 'javascript:alert(1)');
    raise exception '收藏接受了危险 URL';
  exception when check_violation then null; end;
  begin
    insert into public.blog_posts (slug, title, tags) values ('rls-bad-tag', '标签', array[repeat('x', 41)]);
    raise exception '文章接受了超长标签';
  exception when check_violation then null; end;
  insert into storage.objects (bucket_id, name)
  values ('blog-media', 'b10a0000-0000-4000-8000-000000000001/rls-own.webp');
  if not exists (select 1 from storage.objects where bucket_id = 'blog-media'
    and name = 'b10a0000-0000-4000-8000-000000000001/rls-own.webp')
    then raise exception '管理员无法列出自己的媒体'; end if;
  begin
    insert into storage.objects (bucket_id, name)
    values ('blog-media', 'b10a0000-0000-4000-8000-000000000002/rls-other.webp');
    raise exception '管理员能上传到别人的 UID 文件夹';
  exception when insufficient_privilege then null; end;
  delete from storage.objects where bucket_id = 'blog-media'
    and name = 'b10a0000-0000-4000-8000-000000000002/rls-other-existing.webp';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '管理员通过宽泛 policy 删除了其他 UID 目录中的图片'; end if;
  update storage.objects set name = 'b10a0000-0000-4000-8000-000000000001/rls-renamed.webp'
  where bucket_id = 'blog-media' and name = 'b10a0000-0000-4000-8000-000000000001/rls-own.webp';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '已存在图片可被覆盖 / 改名'; end if;
  delete from storage.objects where bucket_id = 'blog-media'
    and name = 'b10a0000-0000-4000-8000-000000000001/rls-own.webp';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '管理员无法删除自己的媒体'; end if;
end;
$$;

reset role;
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'blog-media' and public
    and file_size_limit = 5242880
    and allowed_mime_types @> array['image/png','image/jpeg','image/webp','image/avif','image/gif']
    and not ('image/svg+xml' = any(allowed_mime_types)))
    then raise exception 'Storage bucket 大小 / MIME / 公开配置不正确'; end if;
end;
$$;
select 'PASS: blog content / settings / membership / storage RLS' as result;
rollback;
