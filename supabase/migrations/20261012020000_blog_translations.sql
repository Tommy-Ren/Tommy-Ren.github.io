begin;

alter table public.blog_posts add column if not exists source_language text not null default 'zh'
  check (source_language in ('en', 'zh'));
alter table public.blog_posts add column if not exists content_version uuid not null default gen_random_uuid();

create or replace function private.version_blog_content()
returns trigger language plpgsql set search_path = '' as $$
begin
  if row(new.title, new.summary, new.markdown, new.category, new.tags, new.source_language)
    is distinct from row(old.title, old.summary, old.markdown, old.category, old.tags, old.source_language) then
    new.content_version := gen_random_uuid();
  else
    new.content_version := old.content_version;
  end if;
  return new;
end;
$$;
revoke all on function private.version_blog_content() from public, anon, authenticated;
create or replace trigger blog_posts_content_version before update on public.blog_posts
  for each row execute function private.version_blog_content();

create table if not exists public.blog_post_translations (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh')),
  source_version uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  summary text not null default '' check (char_length(summary) <= 2000),
  markdown text not null check (char_length(btrim(markdown)) between 1 and 400000),
  category text not null check (char_length(btrim(category)) between 1 and 160),
  tags text[] not null default '{}' check (cardinality(tags) <= 12 and array_position(tags, null) is null),
  provider text not null default 'manual' check (provider in ('manual', 'deepl')),
  updated_at timestamptz not null default now(),
  primary key (post_id, locale)
);
alter table public.blog_post_translations enable row level security;
revoke all on public.blog_post_translations from public, anon, authenticated;
grant select on public.blog_post_translations to anon, authenticated;
grant all on public.blog_post_translations to service_role;
drop policy if exists translations_read on public.blog_post_translations;
create policy translations_read on public.blog_post_translations for select to anon, authenticated
using (exists (select 1 from public.blog_posts p where p.id = post_id and
  ((p.published and p.content_version = source_version) or (select public.is_blog_admin()))));

-- Atomic revision check: a slow translation can never replace a newer article.
-- Only the existing blog administrator can save; visitors only read cached text.
create or replace function public.save_blog_translation(
  p_post_id uuid, p_locale text, p_source_version uuid, p_title text,
  p_summary text, p_markdown text, p_category text, p_tags text[], p_provider text default 'manual'
) returns void language plpgsql security definer set search_path = '' as $$
declare source_post public.blog_posts;
begin
  if not public.is_blog_admin() then raise exception 'Administrator required' using errcode = '42501'; end if;
  select * into source_post from public.blog_posts where id = p_post_id for update;
  if not found then raise exception 'Article not found'; end if;
  if source_post.content_version <> p_source_version then raise exception 'Article changed; regenerate translation' using errcode = '40001'; end if;
  if source_post.source_language = p_locale then raise exception 'Target must differ from original language'; end if;
  if exists (select 1 from unnest(p_tags) t where char_length(t) > 128 or btrim(t) = '') then raise exception 'Invalid tags'; end if;
  insert into public.blog_post_translations (post_id, locale, source_version, title, summary, markdown, category, tags, provider)
  values (p_post_id, p_locale, p_source_version, p_title, p_summary, p_markdown, p_category, p_tags, p_provider)
  on conflict (post_id, locale) do update set source_version = excluded.source_version,
    title = excluded.title, summary = excluded.summary, markdown = excluded.markdown,
    category = excluded.category, tags = excluded.tags, provider = excluded.provider, updated_at = now();
end;
$$;
revoke all on function public.save_blog_translation(uuid,text,uuid,text,text,text,text,text[],text) from public, anon;
grant execute on function public.save_blog_translation(uuid,text,uuid,text,text,text,text,text[],text) to authenticated;

commit;
