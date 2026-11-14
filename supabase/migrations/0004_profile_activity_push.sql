-- Profile bio, last-seen, check-in preference; activity log; web push subscriptions; avatar storage.

alter table public.profiles
  add column if not exists bio text check (char_length(bio) <= 280),
  add column if not exists last_seen_at timestamptz,
  add column if not exists notify_checkins boolean not null default true;
grant update (bio, notify_checkins) on public.profiles to authenticated;

-- Everything a user does through Quants' routes (trade clicks, quotes, deposits), for their own history and reports.
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('trade_click', 'quote', 'deposit_address', 'alert_created', 'telegram_linked', 'push_enabled')),
  coin text check (coin is null or coin ~ '^[A-Za-z0-9]{1,15}$'),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_user_idx on public.activity (user_id, created_at desc);
alter table public.activity enable row level security;
create policy activity_select_own on public.activity for select using (auth.uid() = user_id);
revoke insert, update, delete on public.activity from authenticated, anon;

-- Phone notifications (Web Push). One row per device.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) < 1000),
  p256dh text not null check (char_length(p256dh) < 200),
  auth text not null check (char_length(auth) < 100),
  created_at timestamptz not null default now()
);
create index if not exists push_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy push_select_own on public.push_subscriptions for select using (auth.uid() = user_id);
create policy push_delete_own on public.push_subscriptions for delete using (auth.uid() = user_id);
revoke insert, update on public.push_subscriptions from authenticated, anon;

-- Notifications can also be 'checkin' (the agent's "wait / market check" message).
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('price', 'reminder', 'signal', 'magnet', 'system', 'checkin'));
alter table public.notifications add column if not exists pushed_at timestamptz;

-- Avatars: public read, each user writes only inside their own folder (<user id>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists avatars_read on storage.objects;
drop policy if exists avatars_write_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_read on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_write_own on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Admin numbers in one call (server-only).
create or replace function public.admin_stats() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'users_total', (select count(*) from profiles),
    'users_real', (select count(*) from profiles where not is_demo),
    'users_demo', (select count(*) from profiles where is_demo),
    'signups_today', (select count(*) from profiles where created_at >= current_date),
    'signups_7d', (select count(*) from profiles where created_at >= now() - interval '7 days'),
    'active_15m', (select count(*) from profiles where last_seen_at >= now() - interval '15 minutes'),
    'active_24h', (select count(*) from profiles where last_seen_at >= now() - interval '24 hours'),
    'telegram_linked', (select count(*) from profiles where telegram_chat_id is not null),
    'push_devices', (select count(*) from push_subscriptions),
    'alerts_active', (select count(*) from alerts where status = 'active'),
    'alerts_total', (select count(*) from alerts),
    'alerts_fired_24h', (select count(*) from alerts where fired_at >= now() - interval '24 hours'),
    'notifications_sent_24h', (select count(*) from notifications where status = 'sent' and sent_at >= now() - interval '24 hours'),
    'notifications_total', (select count(*) from notifications),
    'signals_total', (select count(*) from signals),
    'trade_clicks_7d', (select count(*) from activity where kind = 'trade_click' and created_at >= now() - interval '7 days'),
    'quotes_7d', (select count(*) from activity where kind = 'quote' and created_at >= now() - interval '7 days'),
    'deposit_addresses_7d', (select count(*) from activity where kind = 'deposit_address' and created_at >= now() - interval '7 days'),
    'signups_by_day', (select coalesce(jsonb_agg(x order by x->>'day'), '[]'::jsonb) from (
        select jsonb_build_object('day', d::date, 'n', (select count(*) from profiles where created_at::date = d::date)) x
        from generate_series(current_date - 13, current_date, interval '1 day') d) s)
  );
$$;
revoke execute on function public.admin_stats() from public, anon, authenticated;
