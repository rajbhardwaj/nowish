-- Helper views for internal analytics dashboard.

-- Summaries per invite (RSVP counts, first RSVP timestamp)
create or replace view analytics_invite_stats as
select
  i.id as invite_id,
  i.creator_id,
  i.created_at,
  i.window_start,
  i.window_end,
  min(r.created_at) as first_rsvp_at,
  count(r.id) filter (where r.state = 'join') as joins,
  count(r.id) filter (where r.state = 'maybe') as maybes,
  count(r.id) filter (where r.state = 'decline') as declines,
  count(r.id) as total_rsvps
from open_invites i
left join rsvps r on r.invite_id = i.id
group by i.id;

-- Daily invite metrics (creation counts, RSVP attainment, expiry)
create or replace view analytics_daily_invite_metrics as
select
  date_trunc('day', created_at) as day,
  count(*) as invites_created,
  count(*) filter (where first_rsvp_at is not null) as invites_with_rsvp,
  count(*) filter (where first_rsvp_at is not null and first_rsvp_at <= created_at + interval '60 minutes') as invites_with_rsvp_60m,
  count(*) filter (where first_rsvp_at is not null and first_rsvp_at <= created_at + interval '24 hours') as invites_with_rsvp_24h,
  count(*) filter (
    where window_start is not null
      and first_rsvp_at is null
      and timezone('utc', window_start) + interval '30 minutes' < timezone('utc', now())
  ) as invites_expired_without_rsvp
from analytics_invite_stats
group by 1
order by 1 desc;

-- Daily landing funnel metrics (sessions, create clicks, invites created)
create or replace view analytics_daily_landing_funnel as
with landing_sessions as (
  select distinct date_trunc('day', occurred_at) as day, session_id
  from analytics_events
  where event = 'landing_view' and session_id is not null
),
create_clicks as (
  select date_trunc('day', occurred_at) as day, session_id
  from analytics_events
  where event = 'create_click' and session_id is not null
)
select
  ls.day,
  count(distinct ls.session_id) as landing_sessions,
  count(distinct cc.session_id) as create_click_sessions,
  count(i.invite_id) as invites_created
from landing_sessions ls
left join create_clicks cc
  on ls.session_id = cc.session_id and ls.day = cc.day
left join analytics_invite_stats i
  on date_trunc('day', i.created_at) = ls.day
group by 1
order by 1 desc;

-- RSVP distribution per day (joins/maybes/declines)
create or replace view analytics_daily_rsvp_breakdown as
select
  date_trunc('day', r.created_at) as day,
  count(*) filter (where r.state = 'join') as joins,
  count(*) filter (where r.state = 'maybe') as maybes,
  count(*) filter (where r.state = 'decline') as declines,
  count(*) as total_rsvps
from rsvps r
group by 1
order by 1 desc;

