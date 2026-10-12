-- Run after both statistics migrations. Synthetic test data always rolls back.
begin;
do $$
declare
  before_count bigint := (select count(*) from private.site_ip_visits);
  first_visit jsonb;
  repeated jsonb;
  second_visit jsonb;
begin
  perform set_config('request.headers', '{"cf-connecting-ip":"192.0.2.91"}', true);
  first_visit := public.site_statistics();
  repeated := public.site_statistics();
  assert (first_visit->>'total_visits')::bigint = before_count + 1, 'Opening a page counts without check-in';
  assert first_visit = repeated, 'One IP is counted once per Vancouver day';
  perform set_config('request.headers', '{"cf-connecting-ip":"192.0.2.92"}', true);
  second_visit := public.site_statistics();
  assert (second_visit->>'total_visits')::bigint = before_count + 2, 'Different IP counts independently';
  perform set_config('request.headers', '{"cf-connecting-ip":"192.0.2.91","x-forwarded-for":"198.51.100.5"}', true);
  repeated := public.blog_statistics(gen_random_uuid(), true, true);
  assert (repeated->>'total_visits')::bigint = before_count + 2, 'Browser UUID, check-in and spoofed forwarded header cannot inflate visits';
  perform set_config('request.headers', '{"x-forwarded-for":"192.0.2.93"}', true);
  repeated := public.site_statistics();
  assert not (repeated->>'recorded')::boolean, 'Untrusted forwarded-only request is not counted';
  assert (repeated->>'total_visits')::bigint = before_count + 2, 'Missing trusted gateway IP fails closed';
  perform set_config('request.headers', '{"cf-connecting-ip":"invalid"}', true);
  assert not (public.site_statistics()->>'recorded')::boolean, 'Malformed address fails closed';
  assert (first_visit->>'date')::date = (now() at time zone 'America/Vancouver')::date, 'Vancouver date';
  assert not exists(select 1 from private.site_ip_visits where length(visitor_hash) <> 64), 'Only HMAC digests stored';
  assert not has_table_privilege('anon', 'private.site_ip_visits', 'SELECT'), 'No access to visitor digests';
  assert not has_table_privilege('authenticated', 'private.site_statistics_secret', 'SELECT'), 'No access to HMAC secret';
  assert not has_table_privilege('authenticated', 'private.site_ip_visits', 'INSERT'), 'No direct visit writes';
  assert has_function_privilege('anon', 'public.site_statistics()', 'EXECUTE'), 'Public aggregate API';
end $$;
rollback;
select 'PASS: automatic counting, IP deduplication, header validation, legacy clients, hashing and permissions. All test writes rolled back.' as result;
