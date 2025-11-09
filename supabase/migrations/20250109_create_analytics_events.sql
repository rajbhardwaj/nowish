-- Creates the analytics_events table used for lightweight product analytics logging.
create extension if not exists "pgcrypto";

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  session_id text,
  user_id uuid,
  invite_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_event_idx on public.analytics_events (event);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);
create index if not exists analytics_events_invite_idx on public.analytics_events (invite_id);
create index if not exists analytics_events_occurred_at_idx on public.analytics_events (occurred_at);

