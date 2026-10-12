-- Automatic, shared portfolio/blog visits. Apply after blog_statistics migration.
begin;
create table if not exists private.site_statistics_secret (
  singleton boolean primary key default true check (singleton),
  salt bytea not null default extensions.gen_random_bytes(32)
);
insert into private.site_statistics_secret(singleton) values (true) on conflict do nothing;
create table if not exists private.site_ip_visits (
  visitor_hash text not null,
  visited_on date not null,
  primary key (visitor_hash, visited_on)
);
create index if not exists site_ip_visits_date_idx on private.site_ip_visits(visited_on);
alter table private.site_statistics_secret enable row level security;
alter table private.site_ip_visits enable row level security;
revoke all on private.site_statistics_secret, private.site_ip_visits from public, anon, authenticated;

create or replace function public.site_statistics()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'America/Vancouver')::date;
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  ip inet;
  fingerprint text;
begin
  -- Hosted Supabase sits behind Cloudflare. CF overwrites this header with the
  -- connecting address. Do NOT trust caller-controlled X-Forwarded-For values.
  -- Missing/invalid gateway headers fail closed: return counts without recording.
  begin
    ip := nullif(headers->>'cf-connecting-ip', '')::inet;
  exception when invalid_text_representation then ip := null;
  end;
  if ip is not null then
    fingerprint := (select encode(extensions.hmac(convert_to(host(ip), 'UTF8'), salt, 'sha256'), 'hex')
      from private.site_statistics_secret where singleton);
    insert into private.site_ip_visits(visitor_hash, visited_on)
      values (fingerprint, today) on conflict do nothing;
  end if;
  return jsonb_build_object(
    'today_visitors', (select count(*) from private.site_ip_visits where visited_on = today),
    'total_visits', (select count(*) from private.site_ip_visits),
    'running_days', greatest(1, today - (select started_on from private.blog_launch where singleton) + 1),
    'date', today,
    'recorded', ip is not null
  );
end;
$$;
revoke all on function public.site_statistics() from public;
grant execute on function public.site_statistics() to anon, authenticated;

-- Keep old cached clients working without allowing UUID/check-in based writes.
create or replace function public.blog_statistics(p_visitor_id uuid, p_visit boolean default false, p_checkin boolean default false)
returns jsonb language sql security definer set search_path = '' as $$
  select public.site_statistics() || jsonb_build_object('checked_in', false, 'my_checkins', 0);
$$;
commit;
