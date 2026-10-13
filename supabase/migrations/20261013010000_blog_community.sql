-- Community authors, verified-email publishing, comments and per-article visits.
begin;
create or replace function public.is_blog_member()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null
    and email is not null and coalesce(is_anonymous,false)=false
    and (banned_until is null or banned_until < now()));
$$;
revoke all on function public.is_blog_member() from public;
grant execute on function public.is_blog_member() to anon,authenticated;

create table public.blog_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Reader' check(char_length(btrim(display_name)) between 1 and 60 and display_name !~ '[[:cntrl:]]'),
  avatar text not null default 'orbit' check(avatar in ('orbit','cat','fox','leaf','moon','robot','tommy')),
  created_at timestamptz not null default now()
);
alter table public.blog_profiles enable row level security;
revoke all on public.blog_profiles from public,anon,authenticated;
grant select on public.blog_profiles to anon,authenticated;
grant insert(id,display_name,avatar),update(display_name,avatar) on public.blog_profiles to authenticated;
grant all on public.blog_profiles to service_role;
create policy profiles_read on public.blog_profiles for select to anon,authenticated using(true);
create policy profiles_create on public.blog_profiles for insert to authenticated with check(id=auth.uid() and public.is_blog_member() and (avatar<>'tommy' or public.is_blog_admin()));
create policy profiles_edit on public.blog_profiles for update to authenticated using(id=auth.uid() and public.is_blog_member()) with check(id=auth.uid() and (avatar<>'tommy' or public.is_blog_admin()));

-- No email address is copied into the public author profile.
insert into public.blog_profiles(id,display_name,avatar)
select u.id,case when a.user_id is not null then 'Tommy Ren' else 'Reader' end,
  case when a.user_id is not null then 'tommy' else 'orbit' end
from auth.users u left join private.blog_admins a on a.user_id=u.id
where u.email_confirmed_at is not null on conflict do nothing;

alter table public.blog_posts add column author_id uuid references public.blog_profiles(id) on delete restrict default auth.uid();
alter table public.blog_photos add column author_id uuid references public.blog_profiles(id) on delete restrict default auth.uid();
update public.blog_posts set author_id=(select user_id from private.blog_admins order by created_at limit 1) where author_id is null;
update public.blog_photos set author_id=(select user_id from private.blog_admins order by created_at limit 1) where author_id is null;
alter table public.blog_posts alter column author_id set not null;
alter table public.blog_photos alter column author_id set not null;
create index blog_posts_author on public.blog_posts(author_id);
create index blog_photos_author on public.blog_photos(author_id);

create function private.protect_blog_author() returns trigger language plpgsql set search_path='' as $$
begin
  if new.author_id is distinct from old.author_id then raise exception 'The author cannot be changed' using errcode='42501'; end if;
  new.created_at:=old.created_at;
  return new;
end $$;
revoke all on function private.protect_blog_author() from public,anon,authenticated;
create trigger posts_author_immutable before update on public.blog_posts for each row execute function private.protect_blog_author();
create trigger photos_author_immutable before update on public.blog_photos for each row execute function private.protect_blog_author();

create policy posts_member_read on public.blog_posts for select to authenticated using(author_id=auth.uid() and public.is_blog_member());
create policy posts_member_insert on public.blog_posts for insert to authenticated with check(author_id=auth.uid() and public.is_blog_member());
create policy posts_member_update on public.blog_posts for update to authenticated using(author_id=auth.uid() and public.is_blog_member()) with check(author_id=auth.uid() and public.is_blog_member());
create policy posts_member_delete on public.blog_posts for delete to authenticated using(author_id=auth.uid() and public.is_blog_member());
create policy photos_member_read on public.blog_photos for select to authenticated using(author_id=auth.uid() and public.is_blog_member());
create policy photos_member_insert on public.blog_photos for insert to authenticated with check(author_id=auth.uid() and public.is_blog_member());
create policy photos_member_update on public.blog_photos for update to authenticated using(author_id=auth.uid() and public.is_blog_member()) with check(author_id=auth.uid() and public.is_blog_member());
create policy photos_member_delete on public.blog_photos for delete to authenticated using(author_id=auth.uid() and public.is_blog_member());
-- The restrictive guards also cover future permissive storage policies.
drop policy blog_media_write_admin_guard on storage.objects;
drop policy blog_media_delete_admin_guard on storage.objects;
create policy blog_media_write_member_guard on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'blog-media' or (public.is_blog_member() and (storage.foldername(name))[1]=auth.uid()::text));
create policy blog_media_delete_member_guard on storage.objects as restrictive for delete to authenticated using(bucket_id<>'blog-media' or (public.is_blog_member() and (storage.foldername(name))[1]=auth.uid()::text));
create policy blog_media_member_insert on storage.objects for insert to authenticated with check(bucket_id='blog-media' and public.is_blog_member() and (storage.foldername(name))[1]=auth.uid()::text);
create policy blog_media_member_read on storage.objects for select to authenticated using(bucket_id='blog-media' and public.is_blog_member() and (storage.foldername(name))[1]=auth.uid()::text);
create policy blog_media_member_delete on storage.objects for delete to authenticated using(bucket_id='blog-media' and public.is_blog_member() and (storage.foldername(name))[1]=auth.uid()::text);

create table public.blog_terms (
  kind text not null check(kind in ('category','tag')),
  name text not null check(char_length(btrim(name)) between 1 and 40 and name=btrim(name) and name !~ '[[:cntrl:],，]'),
  created_by uuid default auth.uid() references public.blog_profiles(id),
  primary key(kind,name)
);
alter table public.blog_terms enable row level security;
revoke all on public.blog_terms from public,anon,authenticated;
grant select on public.blog_terms to anon,authenticated;
grant insert(kind,name) on public.blog_terms to authenticated;
grant all on public.blog_terms to service_role;
create policy terms_read on public.blog_terms for select to anon,authenticated using(true);
create policy terms_create on public.blog_terms for insert to authenticated with check(public.is_blog_member() and created_by=auth.uid());
insert into public.blog_terms(kind,name) select distinct 'category',category from public.blog_posts where char_length(category)<=40 on conflict do nothing;
insert into public.blog_terms(kind,name) select distinct 'tag',unnest(tags) from public.blog_posts on conflict do nothing;

create table public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.blog_profiles(id),
  body text not null check(char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index blog_comments_post_date on public.blog_comments(post_id,created_at,id);
create index blog_comments_author_date on public.blog_comments(author_id,created_at);
alter table public.blog_comments enable row level security;
revoke all on public.blog_comments from public,anon,authenticated;
grant select on public.blog_comments to anon,authenticated;
grant insert(post_id,body) on public.blog_comments to authenticated;
grant delete on public.blog_comments to authenticated;
grant all on public.blog_comments to service_role;
create policy comments_read on public.blog_comments for select to anon,authenticated using(exists(select 1 from public.blog_posts p where p.id=post_id and p.published));
create policy comments_create on public.blog_comments for insert to authenticated with check(author_id=auth.uid() and public.is_blog_member() and exists(select 1 from public.blog_posts p where p.id=post_id and p.published));
create policy comments_delete on public.blog_comments for delete to authenticated using(public.is_blog_member() and (author_id=auth.uid() or public.is_blog_admin()));
create function private.limit_blog_comments() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.author_id::text,0));
  if exists(select 1 from public.blog_comments where author_id=new.author_id and created_at>now()-interval '30 seconds') then
    raise exception 'Please wait 30 seconds before posting another comment' using errcode='P0001';
  end if;
  return new;
end $$;
revoke all on function private.limit_blog_comments() from public,anon,authenticated;
create trigger comments_rate_limit before insert on public.blog_comments for each row execute function private.limit_blog_comments();

create table private.blog_article_visits (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  visitor_hash text not null,visited_on date not null,
  primary key(post_id,visitor_hash,visited_on)
);
alter table private.blog_article_visits enable row level security;
revoke all on private.blog_article_visits from public,anon,authenticated;
create table public.blog_article_stats (
  post_id uuid primary key references public.blog_posts(id) on delete cascade,
  views bigint not null default 0 check(views>=0)
);
alter table public.blog_article_stats enable row level security;
revoke all on public.blog_article_stats from public,anon,authenticated;
grant select on public.blog_article_stats to anon,authenticated;
create policy article_stats_read on public.blog_article_stats for select to anon,authenticated using(exists(select 1 from public.blog_posts p where p.id=post_id and p.published));
create function public.record_article_view(p_post_id uuid) returns bigint language plpgsql security definer set search_path='' as $$
declare ip inet; fingerprint text; inserted integer; total bigint; today date:=(now() at time zone 'America/Vancouver')::date;
begin
  if not exists(select 1 from public.blog_posts where id=p_post_id and published) then return null; end if;
  begin ip:=nullif(coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'cf-connecting-ip','')::inet;
  exception when invalid_text_representation then ip:=null; end;
  if ip is not null then
    fingerprint:=(select encode(extensions.hmac(convert_to(host(ip),'UTF8'),salt,'sha256'),'hex') from private.site_statistics_secret where singleton);
    insert into private.blog_article_visits values(p_post_id,fingerprint,today) on conflict do nothing;
    get diagnostics inserted=row_count;
    if inserted=1 then
      insert into public.blog_article_stats(post_id,views) values(p_post_id,1)
      on conflict(post_id) do update set views=public.blog_article_stats.views+1;
    end if;
  end if;
  select views into total from public.blog_article_stats where post_id=p_post_id;
  return coalesce(total,0);
end $$;
revoke all on function public.record_article_view(uuid) from public;
grant execute on function public.record_article_view(uuid) to anon,authenticated;
commit;
