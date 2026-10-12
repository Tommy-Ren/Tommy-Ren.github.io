-- Anonymous, aggregate-only blog statistics. No IP, email or location is stored.
begin;
create table if not exists private.blog_visits (
  visitor_id uuid not null,
  visited_on date not null,
  primary key (visitor_id, visited_on)
);
create table if not exists private.blog_checkins (
  visitor_id uuid not null,
  checked_on date not null,
  primary key (visitor_id, checked_on)
);
create table if not exists private.blog_launch (
  singleton boolean primary key default true check (singleton),
  started_on date not null default (now() at time zone 'America/Vancouver')::date
);
insert into private.blog_launch(singleton) values (true) on conflict do nothing;
alter table private.blog_visits enable row level security;
alter table private.blog_checkins enable row level security;
alter table private.blog_launch enable row level security;
revoke all on private.blog_visits, private.blog_checkins, private.blog_launch from public, anon, authenticated;

-- A visit is one browser per Vancouver calendar day, not every refresh.
-- Only aggregates and this browser's own check-in count leave the function.
create or replace function public.blog_statistics(p_visitor_id uuid, p_visit boolean default false, p_checkin boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'America/Vancouver')::date;
begin
  if p_visitor_id is null then raise exception 'A visitor ID is required'; end if;
  if p_visit or p_checkin then
    insert into private.blog_visits values (p_visitor_id, today) on conflict do nothing;
  end if;
  if p_checkin then
    insert into private.blog_checkins values (p_visitor_id, today) on conflict do nothing;
  end if;
  return jsonb_build_object(
    'today_visitors', (select count(*) from private.blog_visits where visited_on = today),
    'total_visits', (select count(*) from private.blog_visits),
    'running_days', (select greatest(1, today - started_on + 1) from private.blog_launch where singleton),
    'checked_in', exists(select 1 from private.blog_checkins where visitor_id = p_visitor_id and checked_on = today),
    'my_checkins', (select count(*) from private.blog_checkins where visitor_id = p_visitor_id),
    'date', today
  );
end;
$$;
revoke all on function public.blog_statistics(uuid, boolean, boolean) from public;
grant execute on function public.blog_statistics(uuid, boolean, boolean) to anon, authenticated;
commit;
