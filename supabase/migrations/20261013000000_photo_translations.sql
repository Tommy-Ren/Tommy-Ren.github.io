begin;
alter table public.blog_photos add column if not exists source_language text not null default 'zh' check (source_language in ('en','zh'));
alter table public.blog_photos add column if not exists content_version uuid not null default gen_random_uuid();
create or replace function private.version_photo_content()
returns trigger language plpgsql set search_path = '' as $$
begin
  if row(new.title,new.caption,new.source_language) is distinct from row(old.title,old.caption,old.source_language) then
    new.content_version := gen_random_uuid();
  else new.content_version := old.content_version;
  end if;
  return new;
end $$;
revoke all on function private.version_photo_content() from public, anon, authenticated;
create or replace trigger blog_photos_content_version before update on public.blog_photos
  for each row execute function private.version_photo_content();
create table if not exists public.blog_photo_translations (
  photo_id uuid not null references public.blog_photos(id) on delete cascade,
  locale text not null check (locale in ('en','zh')),
  source_version uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  caption text not null default '' check (char_length(caption) <= 8000),
  provider text not null default 'deepl' check (provider in ('manual','deepl')),
  updated_at timestamptz not null default now(),
  primary key(photo_id,locale)
);
alter table public.blog_photo_translations enable row level security;
revoke all on public.blog_photo_translations from public, anon, authenticated;
grant select on public.blog_photo_translations to anon, authenticated;
grant all on public.blog_photo_translations to service_role;
drop policy if exists photo_translations_read on public.blog_photo_translations;
create policy photo_translations_read on public.blog_photo_translations for select to anon,authenticated
using (exists(select 1 from public.blog_photos p where p.id=photo_id and
  ((p.published and p.content_version=source_version) or (select public.is_blog_admin()))));
create or replace function public.save_photo_translation(
  p_photo_id uuid, p_locale text, p_source_version uuid, p_title text, p_caption text
) returns void language plpgsql security definer set search_path = '' as $$
declare photo public.blog_photos;
begin
  if not public.is_blog_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
  select * into photo from public.blog_photos where id=p_photo_id for update;
  if not found then raise exception 'Photo not found'; end if;
  if photo.content_version <> p_source_version then raise exception 'Photo changed; regenerate translation' using errcode='40001'; end if;
  if photo.source_language=p_locale then raise exception 'Target must differ from source'; end if;
  insert into public.blog_photo_translations(photo_id,locale,source_version,title,caption)
  values(p_photo_id,p_locale,p_source_version,p_title,p_caption)
  on conflict(photo_id,locale) do update set source_version=excluded.source_version,
    title=excluded.title,caption=excluded.caption,provider='deepl',updated_at=now();
end $$;
revoke all on function public.save_photo_translation(uuid,text,uuid,text,text) from public,anon;
grant execute on function public.save_photo_translation(uuid,text,uuid,text,text) to authenticated;
commit;
