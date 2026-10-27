-- eckert.data · personal tracker schema
-- Run once in the Supabase SQL editor. Then: Project Settings → API → Exposed schemas → add "tracker".

create schema if not exists tracker;
grant usage on schema tracker to authenticated;

-- Things you track (weight, sleep hours, miles run, rainfall, coffee…)
create table if not exists tracker.metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  unit        text,                                   -- lb, hrs, mi, in, cups… (optional)
  category    text,                                   -- Health, Home, Kids… (optional, used as an Overview filter)
  color       text not null default '#1a8f4e',
  decimals    int  not null default 1 check (decimals between 0 and 6),
  -- per-metric chart settings, saved whenever you change them on the Overview:
  -- {type:'line'|'area'|'bar'|'step'|'dots'|'cumulative'|'calendar'|'histogram'|'number',
  --  bucket:'raw'|'day'|'week'|'month', agg:'sum'|'avg'|'min'|'max'|'last'|'count', span:6|12, hidden:bool}
  chart       jsonb not null default '{}'::jsonb,
  sort_order  int  not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- One row per data point
create table if not exists tracker.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  metric_id   uuid not null references tracker.metrics(id) on delete cascade,
  ts          timestamptz not null default now(),
  value       numeric,                                -- nullable: lets a metric be a simple "it happened" event
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists entries_user_metric_ts on tracker.entries (user_id, metric_id, ts desc);
create index if not exists entries_user_ts        on tracker.entries (user_id, ts desc);

-- Row-level security: every row belongs to the signed-in user
alter table tracker.metrics enable row level security;
alter table tracker.entries enable row level security;

drop policy if exists metrics_own on tracker.metrics;
create policy metrics_own on tracker.metrics for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists entries_own on tracker.entries;
create policy entries_own on tracker.entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on all tables in schema tracker to authenticated;
alter default privileges in schema tracker grant select, insert, update, delete on tables to authenticated;
