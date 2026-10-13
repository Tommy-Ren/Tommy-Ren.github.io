-- Disposable fixtures: the entire suite rolls back, including synthetic users.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); d uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email,email_confirmed_at) values(a,a||'@example.invalid',now()),(b,b||'@example.invalid',now()),(u,u||'@example.invalid',null);
 insert into public.blog_profiles(id,display_name) values(a,'Test A'),(b,'Test B'),(u,'Unverified');
 insert into public.blog_posts(id,author_id,slug,title,summary,markdown,category,tags,cover,published)
 values(p,a,'test-'||p,'Published','test','test','test','{}','',true),(d,a,'test-'||d,'Draft','test','test','test','{}','',false);
 perform set_config('test.a',a::text,true);perform set_config('test.b',b::text,true);perform set_config('test.u',u::text,true);
 perform set_config('test.p',p::text,true);perform set_config('test.d',d::text,true);
end $$;
set local role anon;
do $$ begin
 if public.is_blog_member() then raise exception 'Anonymous member'; end if;
 if exists(select 1 from public.blog_posts where id=current_setting('test.d')::uuid) then raise exception 'Draft leaked';end if;
 begin insert into public.blog_comments(post_id,body) values(current_setting('test.p')::uuid,'anon');raise exception 'Anon wrote';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.u'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.is_blog_member() then raise exception 'Unverified member';end if;
 begin insert into public.blog_comments(post_id,body) values(current_setting('test.p')::uuid,'unverified');raise exception 'Unverified wrote';exception when insufficient_privilege then null;end;
 begin insert into public.blog_posts(slug,title,markdown,category,published) values('unverified-'||gen_random_uuid(),'x','x','x',true);raise exception 'Unverified published';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.b'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare affected integer; begin
 if not public.is_blog_member() then raise exception 'Verified member rejected';end if;
 if public.is_blog_admin() then raise exception 'Member became admin';end if;
 if exists(select 1 from public.blog_posts where id=current_setting('test.d')::uuid) then raise exception 'Other draft leaked';end if;
 update public.blog_posts set title='hijack' where id=current_setting('test.p')::uuid;get diagnostics affected=row_count;if affected<>0 then raise exception 'Other article editable';end if;
 delete from public.blog_posts where id=current_setting('test.p')::uuid;get diagnostics affected=row_count;if affected<>0 then raise exception 'Other article deletable';end if;
 begin insert into public.blog_posts(author_id,slug,title,markdown,category) values(current_setting('test.a')::uuid,'spoof-'||gen_random_uuid(),'x','x','x');raise exception 'Author spoofed';exception when insufficient_privilege then null;end;
 begin update public.blog_settings set display_name='hijack';get diagnostics affected=row_count;if affected<>0 then raise exception 'Member changed site settings';end if;exception when insufficient_privilege then null;end;
 insert into public.blog_comments(post_id,body) values(current_setting('test.p')::uuid,'Verified comment');
 begin insert into public.blog_comments(post_id,body) values(current_setting('test.p')::uuid,'Spam');raise exception 'Throttle bypass' using errcode='22000';exception when raise_exception then null;end;
 begin insert into public.blog_article_stats(post_id,views) values(current_setting('test.p')::uuid,1000);raise exception 'Counter spoofed';exception when insufficient_privilege then null;end;
 insert into public.blog_terms(kind,name) values('tag','test-'||left(current_setting('test.b'),8));
 update public.blog_profiles set display_name='Updated B' where id=current_setting('test.b')::uuid;
 get diagnostics affected=row_count;if affected<>1 then raise exception 'Own profile update failed';end if;
 update public.blog_profiles set display_name='Impersonated A' where id=current_setting('test.a')::uuid;
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Other profile editable';end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.a'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare affected integer; photo_id uuid; begin
 if not exists(select 1 from public.blog_posts where id=current_setting('test.d')::uuid) then raise exception 'Own draft missing';end if;
 update public.blog_posts set title='Own update' where id=current_setting('test.p')::uuid;get diagnostics affected=row_count;if affected<>1 then raise exception 'Own article not editable';end if;
 insert into public.blog_posts(slug,title,markdown,category,published) values('own-'||gen_random_uuid(),'Own article','Member publishing','test',true);
 begin insert into public.blog_comments(post_id,body) values(current_setting('test.d')::uuid,'Comment on a draft');raise exception 'Draft accepts comments';exception when insufficient_privilege then null;end;
 begin update public.blog_posts set author_id=current_setting('test.b')::uuid where id=current_setting('test.p')::uuid;raise exception 'Ownership changed';exception when insufficient_privilege then null;end;
 insert into public.blog_photos(title,image_url,published) values('Own photo','/test.webp',true) returning blog_photos.id into photo_id;
 update public.blog_photos set caption='Own caption' where blog_photos.id=photo_id;
 delete from public.blog_photos where blog_photos.id=photo_id;
 begin delete from public.blog_comments where post_id=current_setting('test.p')::uuid;get diagnostics affected=row_count;if affected<>0 then raise exception 'Other comment deletable';end if;exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.headers','{"cf-connecting-ip":"203.0.113.24"}',true);
set local role anon;
do $$ declare n bigint; begin
 n:=public.record_article_view(current_setting('test.p')::uuid);if n<>1 then raise exception 'View missing';end if;
 n:=public.record_article_view(current_setting('test.p')::uuid);if n<>1 then raise exception 'Repeated view inflated';end if;
 if public.record_article_view(current_setting('test.d')::uuid) is not null then raise exception 'Draft counted';end if;
end $$;
reset role;
select set_config('request.headers','{"cf-connecting-ip":"203.0.113.25"}',true);
set local role anon;
do $$ begin if public.record_article_view(current_setting('test.p')::uuid)<>2 then raise exception 'Second visitor missed';end if;end $$;
reset role;
rollback;
select 'PASS: anonymous/unverified guards, author ownership, draft privacy, comments, taxonomy, uploads metadata and deduplicated article views' as result;
