-- Run the complete file in Supabase SQL Editor after the photo translation migration.
-- All accounts, photos and translations are generated fixtures inside this rollback transaction.
begin;

do $$
declare admin_id uuid := gen_random_uuid(); member_id uuid := gen_random_uuid(); p public.blog_photos;
begin
  insert into auth.users(id,email) values
    (admin_id,'photo-admin-' || admin_id::text || '@example.invalid'),
    (member_id,'photo-member-' || member_id::text || '@example.invalid');
  insert into private.blog_admins(user_id) values(admin_id);
  perform set_config('test.photo_translation_admin',admin_id::text,true);
  perform set_config('test.photo_translation_member',member_id::text,true);
  insert into public.blog_photos(title,caption,image_url,published,source_language)
    values('森林','雨后的森林。','/blog/assets/forest.webp',true,'zh') returning * into p;
  perform set_config('test.photo_translation_public',p.id::text,true);
  insert into public.blog_photos(title,caption,image_url,published,source_language)
    values('旧说明','这段说明将被修改。','/blog/assets/coast.webp',true,'zh') returning * into p;
  perform set_config('test.photo_translation_stale',p.id::text,true);
  insert into public.blog_photos(title,caption,image_url,published,source_language)
    values('Unpublished photo','','/blog/assets/mountain.webp',false,'en') returning * into p;
  perform set_config('test.photo_translation_draft',p.id::text,true);
  insert into public.blog_photos(title,caption,image_url,published,source_language)
    values('City','Evening in the city.','/blog/assets/city.webp',true,'en') returning * into p;
  perform set_config('test.photo_translation_english',p.id::text,true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.photo_translation_admin'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.photo_translation_admin'),true);
do $$
declare p public.blog_photos; previous_version uuid; rejected boolean := false;
begin
  if not public.is_blog_admin() then raise exception 'Test administrator not recognized'; end if;
  select * into p from public.blog_photos where id=current_setting('test.photo_translation_public')::uuid;
  perform public.save_photo_translation(p.id,'en',p.content_version,'Forest','The forest after rain.');
  previous_version := p.content_version;
  update public.blog_photos set image_url='/blog/assets/coast.webp',source_url='https://example.com/photo',
    credit='Original photographer',sort_order=23,content_version=gen_random_uuid() where id=p.id returning * into p;
  if p.content_version <> previous_version then raise exception 'Image/credit/sort changes or manual revision write invalidated text'; end if;
  update public.blog_photos set title=title,caption=caption where id=p.id returning * into p;
  if p.content_version <> previous_version then raise exception 'No-op save invalidated the translation'; end if;
  begin
    perform public.save_photo_translation(p.id,'zh',p.content_version,'同语言','不能使用原文语言作为目标。');
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Source-language translation accepted'; end if;

  select * into p from public.blog_photos where id=current_setting('test.photo_translation_draft')::uuid;
  perform public.save_photo_translation(p.id,'zh',p.content_version,'未公开照片','');
  if not exists(select 1 from public.blog_photo_translations where photo_id=p.id and caption='') then raise exception 'Empty-caption translation failed'; end if;
  select * into p from public.blog_photos where id=current_setting('test.photo_translation_english')::uuid;
  perform public.save_photo_translation(p.id,'zh',p.content_version,'城市','城市的夜晚。');

  select * into p from public.blog_photos where id=current_setting('test.photo_translation_stale')::uuid;
  previous_version := p.content_version;
  perform public.save_photo_translation(p.id,'en',p.content_version,'Old description','Will become stale.');
  update public.blog_photos set title='新的标题' where id=p.id returning * into p;
  if p.content_version=previous_version then raise exception 'Title change did not invalidate the translation'; end if;
  previous_version := p.content_version;
  update public.blog_photos set caption='新的说明。' where id=p.id returning * into p;
  if p.content_version=previous_version then raise exception 'Caption change did not invalidate the translation'; end if;
  previous_version := p.content_version;
  update public.blog_photos set source_language='en' where id=p.id returning * into p;
  if p.content_version=previous_version then raise exception 'Source-language change did not invalidate the translation'; end if;
  begin
    perform public.save_photo_translation(p.id,'zh',previous_version,'过时译文','过时内容。');
    raise exception 'Stale translation write accepted';
  exception when serialization_failure then null;
  end;
  if (select count(*) from public.blog_photo_translations where photo_id in (
    current_setting('test.photo_translation_public')::uuid,current_setting('test.photo_translation_stale')::uuid,
    current_setting('test.photo_translation_draft')::uuid,current_setting('test.photo_translation_english')::uuid)) <> 4
    then raise exception 'Administrator cannot inspect all current, stale and draft translations'; end if;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  if public.is_blog_admin() then raise exception 'Anonymous visitor has admin status'; end if;
  if (select count(*) from public.blog_photo_translations where photo_id in (
    current_setting('test.photo_translation_public')::uuid,current_setting('test.photo_translation_english')::uuid)) <> 2
    then raise exception 'Published current translations unavailable anonymously'; end if;
  if exists(select 1 from public.blog_photo_translations where photo_id in (
    current_setting('test.photo_translation_stale')::uuid,current_setting('test.photo_translation_draft')::uuid))
    then raise exception 'Anonymous visitor can read stale or draft translations'; end if;
  begin
    perform public.save_photo_translation(current_setting('test.photo_translation_public')::uuid,'en',gen_random_uuid(),'Attack','Attack');
    raise exception 'Anonymous RPC write accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.blog_photo_translations set title='Attack' where photo_id=current_setting('test.photo_translation_public')::uuid;
    raise exception 'Anonymous direct table write accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.photo_translation_member'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.photo_translation_member'),true);
do $$
declare p public.blog_photos;
begin
  if public.is_blog_admin() then raise exception 'Ordinary member has admin status'; end if;
  if exists(select 1 from public.blog_photo_translations where photo_id in (
    current_setting('test.photo_translation_stale')::uuid,current_setting('test.photo_translation_draft')::uuid))
    then raise exception 'Ordinary member can read stale or draft translations'; end if;
  select * into p from public.blog_photos where id=current_setting('test.photo_translation_public')::uuid;
  begin
    perform public.save_photo_translation(p.id,'en',p.content_version,'Attack','Attack');
    raise exception 'Non-admin RPC write accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.blog_photo_translations(photo_id,locale,source_version,title,caption)
      values(p.id,'zh',p.content_version,'Attack','Attack');
    raise exception 'Non-admin direct insert accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.blog_photo_translations where photo_id=p.id;
    raise exception 'Non-admin direct delete accepted';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.photo_translation_admin'),'role','authenticated')::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.photo_translation_admin'),true);
do $$
declare p public.blog_photos;
begin
  select * into p from public.blog_photos where id=current_setting('test.photo_translation_stale')::uuid;
  perform public.save_photo_translation(p.id,'zh',p.content_version,'新译文','新说明。');
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select set_config('request.jwt.claim.sub','',true);
do $$
begin
  if (select count(*) from public.blog_photo_translations where photo_id=current_setting('test.photo_translation_stale')::uuid) <> 1
    or not exists(select 1 from public.blog_photo_translations where photo_id=current_setting('test.photo_translation_stale')::uuid and locale='zh' and title='新译文')
    then raise exception 'Regenerated translation is unavailable or older locale leaked'; end if;
end $$;
reset role;
rollback;
select 'PASS: photo translation directions, revisions, stale writes, anonymous/member RLS, draft privacy and write authorization; all fixtures rolled back' as result;
