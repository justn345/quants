-- Quants database. Row Level Security is ON for every table.
-- Users can only read/change their own rows. Shared market data is read-only for everyone.
-- Tables with no policies (link codes, AI usage, ask usage) are reachable only by the server (service role).

create extension if not exists pgcrypto;

-- ---------- Profiles & settings ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  time_zone text not null default 'UTC' check (char_length(time_zone) <= 64),
  near_account text check (near_account is null or near_account ~ '^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$'),
  quiet_start time,               -- local time, e.g. 23:00
  quiet_end time,                 -- local time, e.g. 07:00
  max_alerts_per_day int not null default 20 check (max_alerts_per_day between 1 and 200),
  repeat_gap_min int not null default 15 check (repeat_gap_min between 5 and 240),
  telegram_chat_id bigint unique,
  onboarded boolean not null default false,
  is_demo boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Watchlist: which coins a user follows, and which alert types per coin.
create table public.watchlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin text not null check (coin ~ '^[A-Za-z0-9]{1,15}$'),
  notify_signals boolean not null default true,
  notify_magnets boolean not null default true,
  notify_price boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, coin)
);
create index watchlist_coin_idx on public.watchlist (coin);

-- Personal price alerts and reminders. Each row belongs to exactly one user.
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin text not null check (coin ~ '^[A-Za-z0-9]{1,15}$'),
  kind text not null check (kind in ('price', 'percent', 'reminder')),
  direction text check (direction in ('above', 'below')),
  price numeric check (price is null or price > 0),
  percent numeric check (percent is null or percent between -95 and 500),
  remind_at timestamptz,
  note text check (char_length(note) <= 140),
  source_text text check (char_length(source_text) <= 280),
  status text not null default 'active' check (status in ('active', 'paused', 'fired', 'done')),
  repeat_max int not null default 3 check (repeat_max between 1 and 3),
  repeat_gap_min int not null default 15 check (repeat_gap_min between 5 and 240),
  sent_count int not null default 0,
  fired_at timestamptz,
  fired_price numeric,
  last_sent_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a price alert needs a price and direction; a pure reminder needs a time
  check ((kind = 'reminder' and remind_at is not null) or (kind <> 'reminder' and price is not null and direction is not null))
);
-- The every-minute checker scans active alerts per coin.
create index alerts_active_coin_idx on public.alerts (coin, direction, price) where status = 'active';
create index alerts_reminder_idx on public.alerts (remind_at) where status = 'active' and remind_at is not null;
create index alerts_repeat_idx on public.alerts (last_sent_at) where status = 'fired' and acknowledged_at is null;
create index alerts_user_idx on public.alerts (user_id, created_at desc);

-- Where a user wants coins delivered after a trade (their own wallets).
create table public.receive_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chain text not null check (chain ~ '^[a-z0-9_-]{2,20}$'),
  address text not null check (char_length(address) between 10 and 128),
  label text check (char_length(label) <= 40),
  created_at timestamptz not null default now(),
  unique (user_id, chain, address)
);

-- ---------- Shared market data (one copy for everyone) ----------
create table public.market_snapshots (
  coin text primary key,
  price numeric not null,
  change_24h_pct numeric,
  funding numeric,
  open_interest_usd numeric,
  volume_24h_usd numeric,
  max_leverage int,
  sz_decimals int,
  spot_via_intents boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  coin text not null,
  direction text not null check (direction in ('long', 'short', 'none')),
  label text not null,
  score numeric not null,
  price numeric not null,
  key_level numeric, entry_low numeric, entry_high numeric, stop numeric, target numeric,
  reason text not null,
  reason_source text not null check (reason_source in ('ai', 'template')),
  factors jsonb not null default '{}'::jsonb,
  outcome_4h text check (outcome_4h in ('hit_target', 'hit_stop', 'neither', 'no_trade')),
  outcome_24h text check (outcome_24h in ('hit_target', 'hit_stop', 'neither', 'no_trade')),
  created_at timestamptz not null default now()
);
create index signals_coin_time_idx on public.signals (coin, created_at desc);
create index signals_unscored_idx on public.signals (created_at) where outcome_24h is null;

-- ---------- Telegram ----------
-- Outbox: every message to send. dedupe_key makes sending idempotent (never twice).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  alert_id uuid references public.alerts(id) on delete cascade,
  signal_id uuid references public.signals(id) on delete set null,
  kind text not null check (kind in ('price', 'reminder', 'signal', 'magnet', 'system')),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_queue_idx on public.notifications (send_after) where status = 'queued';
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- One-time, expiring Telegram link codes. Only a hash is stored.
create table public.telegram_link_codes (
  code_hash text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- ---------- Usage counters (server only) ----------
create table public.ai_usage (
  day date not null,
  kind text not null check (kind in ('reason', 'parse', 'ask')),
  calls int not null default 0,
  failures int not null default 0,
  primary key (day, kind)
);

create table public.ask_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

-- ---------- Trades (quotes and status only; Quants never holds funds) ----------
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin text not null,
  side text not null check (side in ('buy', 'sell')),
  origin_asset text not null,
  destination_asset text not null,
  amount_in text not null,
  amount_out_expected text,
  deposit_address text,
  recipient text not null,
  status text not null default 'quoted',
  quote jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trades_user_idx on public.trades (user_id, created_at desc);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.watchlist enable row level security;
alter table public.alerts enable row level security;
alter table public.receive_addresses enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.signals enable row level security;
alter table public.notifications enable row level security;
alter table public.telegram_link_codes enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ask_usage enable row level security;
alter table public.trades enable row level security;

-- Profiles: own row only. Users may not make themselves admin/demo or set their Telegram chat id.
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- Column-level revokes don't override a table-level grant, so revoke the table, then grant safe columns.
revoke insert, update, delete on public.profiles from authenticated, anon;
grant update (display_name, avatar_url, time_zone, near_account, quiet_start, quiet_end,
              max_alerts_per_day, repeat_gap_min, onboarded) on public.profiles to authenticated;

create policy watchlist_own on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy alerts_own on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy receive_addresses_own on public.receive_addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_select_own on public.notifications for select using (auth.uid() = user_id);
create policy trades_select_own on public.trades for select using (auth.uid() = user_id);

-- Shared, public read-only data.
create policy market_snapshots_read on public.market_snapshots for select using (true);
create policy signals_read on public.signals for select using (true);

-- Users cannot change the server-managed alert fields directly (sent_count, fired_at...).
revoke update on public.alerts from authenticated, anon;
grant update (coin, kind, direction, price, percent, remind_at, note, status, repeat_max, repeat_gap_min,
              acknowledged_at) on public.alerts to authenticated;
-- Server-only tables: no access for browser roles at all.
revoke all on public.telegram_link_codes, public.ai_usage, public.ask_usage from authenticated, anon;
revoke insert, update, delete on public.market_snapshots, public.signals, public.notifications, public.trades from authenticated, anon;

-- New sign-ups get a profile and the five featured coins.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), 60),
          case when new.raw_user_meta_data->>'avatar_url' ~ '^https://' then new.raw_user_meta_data->>'avatar_url' end);
  insert into public.watchlist (user_id, coin)
  select new.id, c from unnest(array['BTC','ETH','SOL','BNB','HYPE']) as c;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep updated_at fresh.
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger alerts_touch before update on public.alerts for each row execute function public.touch_updated_at();
create trigger trades_touch before update on public.trades for each row execute function public.touch_updated_at();

-- Cap alerts per user to stop abuse (normal users never get near this).
create function public.limit_alerts() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.alerts where user_id = new.user_id and status in ('active','paused','fired')) >= 500 then
    raise exception 'Alert limit reached';
  end if;
  return new;
end $$;
create trigger alerts_limit before insert on public.alerts for each row execute function public.limit_alerts();
