-- Run in SQL Editor. Every test row/change rolls back.
begin;
do $$
declare p public.blog_posts; admin_id uuid; old_version uuid;
begin
  admin_id := (select user_id from private.blog_admins limit 1);
  if admin_id is null then raise exception 'Create a blog admin before running tests'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  insert into public.blog_posts(slug,title,markdown,category,published,source_language)
    values ('translation-test-' || replace(gen_random_uuid()::text,'-',''), 'Test', 'Original', 'Notes', true, 'en') returning * into p;
  perform public.save_blog_translation(p.id,'zh',p.content_version,'测试','','译文','笔记','{}','manual');
  if not exists(select 1 from public.blog_post_translations where post_id=p.id) then raise exception 'Missing translation'; end if;
  old_version := p.content_version;
  update public.blog_posts set cover='/images/test.webp' where id=p.id returning * into p;
  if p.content_version <> old_version then raise exception 'Cover changed content revision'; end if;
  update public.blog_posts set markdown='New original' where id=p.id returning * into p;
  if p.content_version = old_version then raise exception 'Body did not invalidate translation'; end if;
  begin
    perform public.save_blog_translation(p.id,'zh',old_version,'过时','','旧译文','笔记','{}','manual');
    raise exception 'Stale save accepted';
  exception when serialization_failure then null;
  end;
  perform set_config('test.translation_post',p.id::text,true);
  perform set_config('test.translation_admin',admin_id::text,true);
  perform set_config('request.jwt.claims','{}',true);
end;
$$;
set local role anon;
do $$ begin
  if exists(select 1 from public.blog_post_translations where post_id=current_setting('test.translation_post')::uuid) then raise exception 'Stale translation exposed'; end if;
end $$;
reset role;
do $$ declare p public.blog_posts;
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.translation_admin'),'role','authenticated')::text,true);
  select * into p from public.blog_posts where id=current_setting('test.translation_post')::uuid;
  perform public.save_blog_translation(p.id,'zh',p.content_version,'新译文','','更新的译文','笔记','{}','manual');
  perform set_config('request.jwt.claims','{}',true);
end $$;
set local role anon;
do $$ begin
  if not exists(select 1 from public.blog_post_translations where post_id=current_setting('test.translation_post')::uuid) then raise exception 'Published translation invisible'; end if;
end $$;
reset role;
update public.blog_posts set published=false where id=current_setting('test.translation_post')::uuid;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
  if exists(select 1 from public.blog_post_translations where post_id=current_setting('test.translation_post')::uuid) then raise exception 'Draft translation exposed'; end if;
  begin
    perform public.save_blog_translation(current_setting('test.translation_post')::uuid,'zh',gen_random_uuid(),'Attack','','Attack','Test','{}');
    raise exception 'Anonymous write accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'PASS: translation revisions, stale writes, published/draft RLS, anonymous write denial' as result;
