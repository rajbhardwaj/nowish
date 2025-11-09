import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAllowedAnalyticsEmails, isEmailAllowedForAnalytics } from '@/lib/analyticsAuth';

type LandingRow = {
  day: string;
  landing_sessions: number;
  create_click_sessions: number;
  invites_created: number;
};

type InviteMetricRow = {
  day: string;
  invites_created: number;
  invites_with_rsvp: number;
  invites_with_rsvp_60m: number;
  invites_with_rsvp_24h: number;
  invites_expired_without_rsvp: number;
};

type RsvpRow = {
  day: string;
  joins: number;
  maybes: number;
  declines: number;
  total_rsvps: number;
};

type InviteStat = {
  invite_id: string;
  creator_id: string | null;
  created_at: string;
  window_start: string | null;
  first_rsvp_at: string | null;
  joins: number;
  maybes: number;
  declines: number;
  total_rsvps: number;
};

type InviteCreatorRow = {
  id: string;
  creator_id: string | null;
  created_at: string;
};

export const dynamic = 'force-dynamic';

const DAYS_TO_PULL = 14;
const HERO_WINDOW_DAYS = 7;
function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US');
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

async function getAnalyticsData() {
  const since = new Date();
  since.setDate(since.getDate() - HERO_WINDOW_DAYS);
  const sinceIso = since.toISOString();

  const [
    { data: landingRows, error: landingError },
    { data: inviteDailyRows, error: inviteDailyError },
    { data: rsvpRows, error: rsvpError },
    { data: inviteStats, error: inviteStatsError },
    { data: inviteCreators, error: inviteCreatorsError },
  ] = await Promise.all([
    supabaseAdmin
      .from('analytics_daily_landing_funnel')
      .select('*')
      .order('day', { ascending: false })
      .limit(DAYS_TO_PULL),
    supabaseAdmin
      .from('analytics_daily_invite_metrics')
      .select('*')
      .order('day', { ascending: false })
      .limit(DAYS_TO_PULL),
    supabaseAdmin
      .from('analytics_daily_rsvp_breakdown')
      .select('*')
      .order('day', { ascending: false })
      .limit(DAYS_TO_PULL),
    supabaseAdmin
      .from('analytics_invite_stats')
      .select('*')
      .gte('created_at', sinceIso),
    supabaseAdmin
      .from('open_invites')
      .select('id, creator_id, created_at')
      .gte('created_at', sinceIso),
  ]);

  if (landingError) console.error('analytics landing error', landingError);
  if (inviteDailyError) console.error('analytics invite metrics error', inviteDailyError);
  if (rsvpError) console.error('analytics rsvp error', rsvpError);
  if (inviteStatsError) console.error('analytics invite stats error', inviteStatsError);
  if (inviteCreatorsError) console.error('analytics invite creators error', inviteCreatorsError);

  const inviteStatsRows = (inviteStats ?? []) as InviteStat[];
  const inviteCreatorRows = (inviteCreators ?? []) as InviteCreatorRow[];

  const delaysInMinutes = inviteStatsRows
    .filter((row) => row.first_rsvp_at)
    .map((row) => {
      const created = new Date(row.created_at).getTime();
      const first = new Date(row.first_rsvp_at!).getTime();
      return (first - created) / 60000;
    })
    .filter((minutes) => minutes >= 0);

  const invitesWithRsvp = inviteStatsRows.filter((row) => row.total_rsvps > 0).length;
  const invitesCreated = inviteCreatorRows.length;
  const invitesExpired = inviteStatsRows.filter((row) => {
    if (!row.window_start || row.first_rsvp_at) return false;
    const windowStart = new Date(row.window_start).getTime();
    return windowStart + 30 * 60 * 1000 < Date.now();
  }).length;

  const newCreatorIds = new Set<string>();
  inviteCreatorRows.forEach((row) => {
    if (row.creator_id) newCreatorIds.add(row.creator_id);
  });

  const hero = {
    invitesCreated,
    newCreators: newCreatorIds.size,
    invitesWithRsvpPercent: invitesCreated ? invitesWithRsvp / invitesCreated : null,
    medianTT1RMinutes: median(delaysInMinutes),
    inviteExpiryRate: invitesCreated ? invitesExpired / invitesCreated : null,
  };

  return {
    hero,
    landingRows: (landingRows ?? []) as LandingRow[],
    inviteDailyRows: (inviteDailyRows ?? []) as InviteMetricRow[],
    rsvpRows: (rsvpRows ?? []) as RsvpRow[],
  };
}

export default async function AnalyticsDashboardPage() {
  const cookieStore = await cookies();
  const analyticsEmail = cookieStore.get('nowish-analytics-email')?.value ?? null;
  const email = analyticsEmail && analyticsEmail.trim().toLowerCase();

  if (!email) {
    redirect('/login?next=/analytics');
  }

  if (!isEmailAllowedForAnalytics(email)) {
    redirect('/');
  }

  const { hero, landingRows, inviteDailyRows, rsvpRows } = await getAnalyticsData();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard (alpha)</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last {HERO_WINDOW_DAYS} days. Data updates in real-time from Supabase.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">New creators</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatNumber(hero.newCreators)}</p>
          <p className="mt-1 text-xs text-slate-500">Unique creators with an invite</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Invites created</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formatNumber(hero.invitesCreated)}</p>
          <p className="mt-1 text-xs text-slate-500">Total invites in the window</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Invites with ≥1 RSVP</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {formatPercent(hero.invitesWithRsvpPercent)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Of invites created in the window</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Median time to first RSVP</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {hero.medianTT1RMinutes === null ? '—' : `${Math.round(hero.medianTT1RMinutes)} min`}
          </p>
          <p className="mt-1 text-xs text-slate-500">Invite created → first RSVP</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Invite expiry rate</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {formatPercent(hero.inviteExpiryRate)}
          </p>
          <p className="mt-1 text-xs text-slate-500">No RSVPs by start + 30m</p>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Acquisition &amp; Activation</h2>
          <p className="text-sm text-slate-500">Landing sessions → create clicks → invites created</p>
        </header>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold text-slate-600">Day</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Landing sessions</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Create clicks</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Invites created</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Landing → Create</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {landingRows.map((row) => {
                const conversion =
                  row.landing_sessions > 0 ? row.create_click_sessions / row.landing_sessions : null;
                return (
                  <tr key={row.day} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">{formatDateLabel(row.day)}</td>
                    <td className="px-4 py-2 text-slate-900">{formatNumber(row.landing_sessions)}</td>
                    <td className="px-4 py-2 text-slate-900">{formatNumber(row.create_click_sessions)}</td>
                    <td className="px-4 py-2 text-slate-900">{formatNumber(row.invites_created)}</td>
                    <td className="px-4 py-2 text-slate-900">{formatPercent(conversion)}</td>
                  </tr>
                );
              })}
              {!landingRows.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                    No landing data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Invite Performance</h2>
          <p className="text-sm text-slate-500">RSVP attainment speed, depth, expiry</p>
        </header>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold text-slate-600">Day</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Invites</th>
                <th className="px-4 py-2 font-semibold text-slate-600">≥1 RSVP</th>
                <th className="px-4 py-2 font-semibold text-slate-600">≤60m</th>
                <th className="px-4 py-2 font-semibold text-slate-600">≤24h</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Expired</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inviteDailyRows.map((row) => (
                <tr key={row.day} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{formatDateLabel(row.day)}</td>
                  <td className="px-4 py-2 text-slate-900">{formatNumber(row.invites_created)}</td>
                  <td className="px-4 py-2 text-slate-900">{formatNumber(row.invites_with_rsvp)}</td>
                  <td className="px-4 py-2 text-slate-900">{formatNumber(row.invites_with_rsvp_60m)}</td>
                  <td className="px-4 py-2 text-slate-900">{formatNumber(row.invites_with_rsvp_24h)}</td>
                  <td className="px-4 py-2 text-slate-900">
                    {formatNumber(row.invites_expired_without_rsvp)}
                  </td>
                </tr>
              ))}
              {!inviteDailyRows.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-slate-500">
                    No invite data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">RSVP Breakdown</h2>
          <p className="text-sm text-slate-500">Daily join / maybe / decline counts</p>
        </header>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold text-slate-600">Day</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Joins</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Maybes</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Declines</th>
                <th className="px-4 py-2 font-semibold text-slate-600">Total RSVPs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rsvpRows.map((row) => (
                <tr key={row.day} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{formatDateLabel(row.day)}</td>
                  <td className="px-4 py-2 text-slate-900">{formatNumber(row.joins)}</td>
                  <td className="px-4 py-2 text-slate-900">{formatNumber(row.maybes)}</td>
                  <td className="px-4 py-2 text-slate-900">{formatNumber(row.declines)}</td>
                  <td className="px-4 py-2 text-slate-900">{formatNumber(row.total_rsvps)}</td>
                </tr>
              ))}
              {!rsvpRows.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                    No RSVP data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Need more slices? Add SQL views in <code className="font-mono text-xs">supabase/views</code> and pull them into this
        page.
      </footer>
    </main>
  );
}

