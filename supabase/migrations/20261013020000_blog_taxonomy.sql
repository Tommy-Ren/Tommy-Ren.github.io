begin;
alter table public.blog_terms add column source_language text not null default 'en' check(source_language in ('en','zh'));
alter table public.blog_terms add column name_en text check(char_length(name_en) between 1 and 100);
alter table public.blog_terms add column name_zh text check(char_length(name_zh) between 1 and 100);
update public.blog_terms set source_language=case when name ~ '[一-鿿]' then 'zh' else 'en' end;
update public.blog_terms set name_en=case when source_language='en' then name end,name_zh=case when source_language='zh' then name end;
drop policy terms_create on public.blog_terms;
create policy terms_admin_create on public.blog_terms for insert to authenticated with check(public.is_blog_admin() and created_by=auth.uid());
create policy terms_admin_translate on public.blog_terms for update to authenticated using(public.is_blog_admin()) with check(public.is_blog_admin());
grant insert(source_language) on public.blog_terms to authenticated;
grant update(name_en,name_zh) on public.blog_terms to authenticated;
-- The canonical names remain stable; translated labels never change article references.
create function private.initialize_term_language() returns trigger language plpgsql set search_path='' as $$
begin
 new.name_en:=case when new.source_language='en' then new.name else null end;
 new.name_zh:=case when new.source_language='zh' then new.name else null end;
 return new;
end $$;
create trigger blog_term_language before insert on public.blog_terms for each row execute function private.initialize_term_language();
-- Enforce the approved vocabulary even if a member bypasses the picker with an API call.
create function private.check_post_taxonomy() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.role() = 'authenticated' and not public.is_blog_admin() then
  if not exists(select 1 from public.blog_terms where kind='category' and name=new.category)
   or exists(select 1 from unnest(new.tags) as selected(value) where not exists(select 1 from public.blog_terms where kind='tag' and name=selected.value)) then
   raise exception 'Choose an existing category and tags.' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
create trigger blog_post_taxonomy before insert or update of category,tags on public.blog_posts for each row execute function private.check_post_taxonomy();
commit;
