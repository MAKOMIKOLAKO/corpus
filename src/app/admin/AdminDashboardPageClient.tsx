'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, RefreshCw, Shield, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCost } from '@/lib/geminiPricing';
import { cn } from '@/lib/utils';

type SectionKey = 'overview' | 'growth' | 'users' | 'features' | 'engagement' | 'revenue' | 'costs' | 'logins' | 'feedback';

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'growth', label: 'Growth' },
  { key: 'users', label: 'Users' },
  { key: 'features', label: 'Features' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'costs', label: 'Costs' },
  { key: 'logins', label: 'Logins' },
  { key: 'feedback', label: 'Feedback' },
];

const chartPalette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const chartGridColor = 'color-mix(in srgb, var(--foreground) 10%, transparent)';
const chartAxisColor = 'var(--content-secondary)';
const chartPrimaryColor = 'var(--chart-1)';
const chartSecondaryColor = 'var(--accent-hover)';
const chartMutedColor = 'var(--chart-5)';

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }
  return response.json();
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LoadingState() {
  return <div className="h-72 animate-pulse rounded-2xl bg-muted/50" />;
}

function ErrorState({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
      <div className="mb-3">Failed to load this section.</div>
      {message ? <div className="mb-4 text-xs text-content-secondary">{message}</div> : null}
      <Button variant="warm-sand" onClick={onRetry}>Retry</Button>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

function formatCostDisplay(value: number) {
  return formatCost(value || 0);
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0);
}

function tooltipCurrencyFormatter(value: unknown) {
  return [formatCostDisplay(Number(value) || 0), 'Cost'];
}

function relativeTime(value?: string | Date | null) {
  if (!value) return 'Never';
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export default function AdminDashboardPageClient({
  sessionUser,
}: {
  sessionUser: { id: string; name?: string | null; email?: string | null };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = (searchParams?.get('section') as SectionKey) || 'overview';
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [userSearch, setUserSearch] = useState('');
  const [costPeriod, setCostPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const [costSeriesPeriod, setCostSeriesPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [costUserDetails, setCostUserDetails] = useState<any | null>(null);
  const [rawCallsOpen, setRawCallsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const timestamp = Date.now();
        const nextData: Record<string, any> = { ...data };

        if (activeSection === 'overview') {
          const [overview, growth] = await Promise.all([
            fetchJson(`/api/admin/metrics/overview?t=${timestamp}`),
            fetchJson(`/api/admin/metrics/growth?period=30d&t=${timestamp}`),
          ]);
          nextData.overview = overview;
          nextData.overviewGrowth = growth;
        } else if (activeSection === 'growth') {
          nextData.growth = await fetchJson(`/api/admin/metrics/growth?period=90d&t=${timestamp}`);
        } else if (activeSection === 'users') {
          nextData.users = await fetchJson(`/api/admin/metrics/users?page=1&limit=25&search=${encodeURIComponent(userSearch)}&t=${timestamp}`);
        } else if (activeSection === 'features') {
          nextData.features = await fetchJson(`/api/admin/metrics/features?t=${timestamp}`);
        } else if (activeSection === 'engagement') {
          nextData.engagement = await fetchJson(`/api/admin/metrics/engagement?t=${timestamp}`);
        } else if (activeSection === 'revenue') {
          nextData.revenue = await fetchJson(`/api/admin/metrics/revenue?t=${timestamp}`);
        } else if (activeSection === 'costs') {
          const [overview, byFeature, byUser, byDay, byMonth, rawCalls] = await Promise.all([
            fetchJson(`/api/admin/costs/overview?t=${timestamp}`),
            fetchJson(`/api/admin/costs/by-feature?period=30d&t=${timestamp}`),
            fetchJson(`/api/admin/costs/by-user?period=${costPeriod}&page=1&limit=25&sort=cost&t=${timestamp}`),
            fetchJson(`/api/admin/costs/by-day?period=${costSeriesPeriod}&t=${timestamp}`),
            fetchJson(`/api/admin/costs/by-user-by-month?months=3&t=${timestamp}`),
            fetchJson(`/api/admin/costs/raw-calls?page=1&limit=25&t=${timestamp}`),
          ]);
          nextData.costs = { overview, byFeature, byUser, byDay, byMonth, rawCalls };
        } else if (activeSection === 'logins') {
          nextData.logins = await fetchJson(`/api/admin/metrics/logins?t=${timestamp}`);
        } else if (activeSection === 'feedback') {
          nextData.feedback = await fetchJson(`/api/admin/metrics/feedback?page=1&limit=25&t=${timestamp}`);
        }

        if (!cancelled) {
          setData(nextData);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeSection, refreshKey, costPeriod, costSeriesPeriod]);

  const lastUpdated = useMemo(() => {
    const source =
      data[activeSection]?.generatedAt ||
      data.overview?.generatedAt ||
      data.overviewGrowth?.generatedAt ||
      null;
    return source ? relativeTime(source) : 'Just now';
  }, [activeSection, data]);

  const handleRefresh = () => setRefreshKey((value) => value + 1);
  const navigateSection = (section: SectionKey) => router.push(`/admin?section=${section}`);
  const handleDownloadCostReport = async () => {
    const response = await fetch('/api/admin/costs/report', { method: 'POST' });
    if (!response.ok) {
      throw new Error('Failed to download report');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `corpus-cost-report-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };
  const loadCostUserDetails = async (userId: string) => {
    const [daily, raw] = await Promise.all([
      fetchJson(`/api/admin/costs/by-user-by-day?userId=${encodeURIComponent(userId)}&period=30d&t=${Date.now()}`),
      fetchJson(`/api/admin/costs/raw-calls?page=1&limit=100&userId=${encodeURIComponent(userId)}&t=${Date.now()}`),
    ]);
    setCostUserDetails({
      userId,
      daily,
      raw,
      user: data.costs?.byUser?.users?.find((item: any) => item.userId === userId) ?? null,
    });
  };

  const overview = data.overview;
  const overviewGrowth = data.overviewGrowth;
  const costs = data.costs;
  const rollingAverage = useMemo(() => {
    const points = costs?.byDay?.points ?? [];
    return points.map((point: any, index: number) => {
      const window = points.slice(Math.max(0, index - 6), index + 1);
      const avg = window.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0) / Math.max(window.length, 1);
      return { ...point, rollingAverage: avg };
    });
  }, [costs]);
  const featureStackData = useMemo(() => {
    const points = costs?.byDay?.points ?? [];
    return points.map((point: any) => ({ date: point.date, ...(point.costByFeature || {}) }));
  }, [costs]);
  const featureKeys = useMemo(() => {
    const keys = new Set<string>();
    featureStackData.forEach((row: any) => Object.keys(row).forEach((key) => key !== 'date' && keys.add(key)));
    return Array.from(keys);
  }, [featureStackData]);
  const monthlyUserRows = useMemo(() => {
    const rows = costs?.byMonth?.rows ?? [];
    const months = Array.from(new Set<string>(rows.map((row: any) => String(row.month)))).sort().reverse().slice(0, 3);
    const grouped = new Map<string, any>();
    rows.forEach((row: any) => {
      const existing = grouped.get(row.userId ?? row.email ?? row.username ?? 'CRON') ?? {
        key: row.userId ?? row.email ?? row.username ?? 'CRON',
        userId: row.userId,
        email: row.email,
        username: row.username,
        plan: row.plan,
        months: {},
      };
      existing.months[row.month] = row.totalCost;
      grouped.set(existing.key, existing);
    });
    return {
      months,
      rows: Array.from(grouped.values())
        .map((row) => {
          const total = months.reduce((sum: number, month: string) => sum + Number(row.months[month] ?? 0), 0);
          return {
            ...row,
            total,
            avg: total / Math.max(months.length, 1),
          };
        })
        .sort((a, b) => b.total - a.total),
    };
  }, [costs]);
  const costProjection = useMemo(() => {
    const points = costs?.byDay?.points ?? [];
    const avg30 = points.length > 0
      ? points.reduce((sum: number, point: any) => sum + (point.totalCost || 0), 0) / points.length
      : 0;
    const estimatedMrr = costs?.overview?.estimatedMrr ?? 0;
    return {
      averageDailyCost: avg30,
      next30: avg30 * 30,
      next90: avg30 * 90,
      next12Months: avg30 * 365,
      percentOfMrr: estimatedMrr > 0 ? (avg30 * 30) / estimatedMrr : 0,
      estimatedMrr,
    };
  }, [costs]);

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-background text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-[1440px] flex-col lg:flex-row">
        <aside className="w-full border-b border-border bg-card/70 p-4 backdrop-blur-sm lg:w-72 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="rounded-xl bg-accent-muted p-2 text-accent"><Shield className="h-5 w-5" /></div>
            <div>
              <div className="font-serif text-xl">Admin Dashboard</div>
              <div className="text-sm text-content-secondary">Platform analytics</div>
            </div>
          </div>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => navigateSection(section.key)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors',
                  activeSection === section.key
                    ? 'bg-accent text-accent-foreground ring-1 ring-accent'
                    : 'text-content-secondary hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{section.label}</span>
                {activeSection === section.key ? <TrendingUp className="h-4 w-4" /> : null}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-content-secondary">
                Last updated: {lastUpdated}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-content-secondary ring-1 ring-foreground/10">
                {sessionUser.name || sessionUser.email}
              </div>
              <Button variant="warm-sand" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {error ? <ErrorState message={error} onRetry={handleRefresh} /> : null}

          {activeSection === 'overview' && (
            loading && !overview ? <LoadingState /> : overview ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    { title: 'Total Users', value: overview.totalUsers, sub: `+${overview.newUsersToday} today, +${overview.newUsersThisWeek} this week` },
                    { title: 'Pro Subscribers', value: overview.totalProUsers, sub: `${overview.proBreakdown.monthly} monthly, ${overview.proBreakdown.annual} annual, ${overview.proBreakdown.lifetime} lifetime` },
                    { title: 'Estimated MRR', value: formatCurrency(overview.estimatedMrr), sub: overview.notes.mrr },
                    { title: 'Total Papers Indexed', value: overview.totalGlobalEntries, sub: `${overview.totalEntries} saved entries` },
                    { title: 'Daily Active Users', value: overview.dailyActiveUsers, sub: `${overview.weeklyActiveUsers} this week, ${overview.monthlyActiveUsers} this month` },
                    { title: 'Feature Adoption', value: overview.featureAdoption.usersWithThreePlusFeatures, sub: `${overview.featureAdoption.mostPopularFeature.name} most popular` },
                  ].map((card) => (
                    <Card key={card.title} className="bg-card text-card-foreground">
                      <CardHeader>
                        <CardDescription>{card.title}</CardDescription>
                        <CardTitle className="text-3xl">{card.value}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-content-secondary">{card.sub}</CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <ChartCard title="User Growth" subtitle="Last 30 days">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={overviewGrowth?.cumulativeUsers?.map((item: any, index: number) => ({ date: item.date, cumulativeUsers: item.value, newUsers: overviewGrowth.newUsers[index]?.value ?? 0 })) ?? []}>
                          <CartesianGrid stroke={chartGridColor} vertical={false} />
                          <XAxis dataKey="date" stroke={chartAxisColor} />
                          <YAxis stroke={chartAxisColor} />
                          <Tooltip />
                          <Bar dataKey="newUsers" fill={chartSecondaryColor} radius={[8, 8, 0, 0]} />
                          <Line type="monotone" dataKey="cumulativeUsers" stroke={chartPrimaryColor} strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                  <ChartCard title="Revenue Trend" subtitle="Estimated MRR from snapshots">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewGrowth?.mrr ?? []}>
                          <CartesianGrid stroke={chartGridColor} vertical={false} />
                          <XAxis dataKey="date" stroke={chartAxisColor} />
                          <YAxis stroke={chartAxisColor} />
                          <Tooltip />
                          <Area type="monotone" dataKey="value" stroke={chartPrimaryColor} fill={chartPrimaryColor} fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <ChartCard title="Most Recent Signups">
                    <div className="space-y-3 text-sm">{overview.recentSignups.map((user: any) => <div key={user.id} className="flex items-center justify-between border-b border-border/60 pb-2"><div>{user.email}</div><div className="text-content-secondary">{user.plan}</div></div>)}</div>
                  </ChartCard>
                  <ChartCard title="Recent Pro Conversions">
                    <div className="space-y-3 text-sm">{overview.recentProConversions.map((user: any) => <div key={user.id} className="flex items-center justify-between border-b border-border/60 pb-2"><div>{user.email}</div><div className="text-content-secondary">{relativeTime(user.convertedAt)}</div></div>)}</div>
                  </ChartCard>
                  <ChartCard title="Recent Feedback">
                    <div className="space-y-3 text-sm">{overview.recentFeedback.map((item: any) => <div key={item.id} className="border-b border-border/60 pb-2"><div>{item.message}</div><div className="mt-1 text-xs text-content-secondary">{relativeTime(item.createdAt)}</div></div>)}</div>
                  </ChartCard>
                </div>
              </div>
            ) : null
          )}

          {activeSection === 'growth' && (
            loading && !data.growth ? <LoadingState /> : data.growth ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="User Acquisition"><div className="h-72"><ResponsiveContainer><BarChart data={data.growth.newUsers}><CartesianGrid stroke={chartGridColor} vertical={false} /><XAxis dataKey="date" stroke={chartAxisColor} /><YAxis stroke={chartAxisColor} /><Tooltip /><Bar dataKey="value" fill={chartPrimaryColor} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
                <ChartCard title="Pro Subscription Growth"><div className="h-72"><ResponsiveContainer><AreaChart data={data.growth.cumulativeProUsers}><CartesianGrid stroke={chartGridColor} vertical={false} /><XAxis dataKey="date" stroke={chartAxisColor} /><YAxis stroke={chartAxisColor} /><Tooltip /><Area dataKey="value" stroke={chartSecondaryColor} fill={chartSecondaryColor} fillOpacity={0.2} /></AreaChart></ResponsiveContainer></div></ChartCard>
                <ChartCard title="Active Users"><div className="h-72"><ResponsiveContainer><LineChart data={data.growth.activeUsers}><CartesianGrid stroke={chartGridColor} vertical={false} /><XAxis dataKey="date" stroke={chartAxisColor} /><YAxis stroke={chartAxisColor} /><Tooltip /><Line dataKey="value" stroke={chartPrimaryColor} strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></ChartCard>
                <ChartCard title="MRR"><div className="h-72"><ResponsiveContainer><LineChart data={data.growth.mrr}><CartesianGrid stroke={chartGridColor} vertical={false} /><XAxis dataKey="date" stroke={chartAxisColor} /><YAxis stroke={chartAxisColor} /><Tooltip /><Line dataKey="value" stroke={chartMutedColor} strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></ChartCard>
              </div>
            ) : null
          )}

          {activeSection === 'users' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search email or username" className="max-w-md bg-background" />
                <Button variant="warm-sand" onClick={handleRefresh}>Search</Button>
              </div>
              {loading && !data.users ? <LoadingState /> : data.users ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-card ring-1 ring-foreground/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-content-secondary"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Entries</th><th className="px-4 py-3">Collections</th><th className="px-4 py-3">Connections</th><th className="px-4 py-3">Last Active</th></tr></thead>
                    <tbody>{data.users.users.map((user: any) => <tr key={user.id} className="border-t border-border/60 align-top"><td className="px-4 py-3"><div className="font-medium">{user.email}</div><div className="text-xs text-content-secondary">{user.username || 'No username'}</div><div className="mt-2 text-xs text-content-secondary">Full email: {user.fullEmail}</div></td><td className="px-4 py-3"><Badge variant="secondary">{user.plan}</Badge></td><td className="px-4 py-3">{user.entriesCount}</td><td className="px-4 py-3">{user.collectionCount}</td><td className="px-4 py-3">{user.connectionCount}</td><td className="px-4 py-3">{relativeTime(user.lastActivity)}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}

          {activeSection === 'features' && (
            loading && !data.features ? <LoadingState /> : data.features ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="Entry Creation Breakdown"><div className="h-72"><ResponsiveContainer><PieChart><Pie data={data.features.entryCreationBySource} dataKey="count" nameKey="source" innerRadius={60} outerRadius={90}>{data.features.entryCreationBySource.map((entry: any, index: number) => <Cell key={entry.source} fill={chartPalette[index % chartPalette.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></ChartCard>
                <ChartCard title="Queue Usage"><div className="space-y-3 text-sm">{data.features.queueUsage.map((item: any) => <div key={`${item.inputType}-${item.status}`} className="flex items-center justify-between border-b border-white/5 pb-2"><span>{item.inputType} / {item.status}</span><span>{item.count}</span></div>)}</div></ChartCard>
                <ChartCard title="Daily Brief Usage"><div className="space-y-2 text-sm"><div>Total briefs: {data.features.dailyBriefs.totalGenerated}</div><div>Avg papers per brief: {data.features.dailyBriefs.averagePapersSelected.toFixed(1)}</div><div>Viewed ratio: {formatPercent(data.features.dailyBriefs.viewedRatio)}</div></div></ChartCard>
                <ChartCard title="RSS Feed Subscriptions"><div className="space-y-3 text-sm">{data.features.rssSubscriptions.topDefaultFeeds.map((feed: any) => <div key={feed.name} className="flex items-center justify-between border-b border-white/5 pb-2"><span>{feed.name}</span><span>{feed.count}</span></div>)}</div></ChartCard>
              </div>
            ) : null
          )}

          {activeSection === 'engagement' && (
            loading && !data.engagement ? <LoadingState /> : data.engagement ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card><CardHeader><CardDescription>Day 1 retention</CardDescription><CardTitle>{formatPercent(data.engagement.retention.day1)}</CardTitle></CardHeader></Card>
                  <Card><CardHeader><CardDescription>Day 7 retention</CardDescription><CardTitle>{formatPercent(data.engagement.retention.day7)}</CardTitle></CardHeader></Card>
                  <Card><CardHeader><CardDescription>Day 30 retention</CardDescription><CardTitle>{formatPercent(data.engagement.retention.day30)}</CardTitle></CardHeader></Card>
                </div>
                <ChartCard title="Time to First Entry"><div className="h-72"><ResponsiveContainer><BarChart data={Object.entries(data.engagement.timeToFirstEntryHistogram).map(([bucket, value]) => ({ bucket, value }))}><CartesianGrid stroke={chartGridColor} vertical={false} /><XAxis dataKey="bucket" stroke={chartAxisColor} /><YAxis stroke={chartAxisColor} /><Tooltip /><Bar dataKey="value" fill={chartPrimaryColor} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
              </div>
            ) : null
          )}

          {activeSection === 'revenue' && (
            loading && !data.revenue ? <LoadingState /> : data.revenue ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    ['Active paying users', data.revenue.activePayingUsers],
                    ['Estimated MRR', formatCurrency(data.revenue.estimatedMrr)],
                    ['New subscriptions this month', data.revenue.newSubscriptionsThisMonth],
                    ['Churn this month', data.revenue.churnThisMonth],
                    ['Net new MRR', formatCurrency(data.revenue.netNewMrrThisMonth)],
                  ].map(([title, value]) => <Card key={String(title)}><CardHeader><CardDescription>{title}</CardDescription><CardTitle>{value}</CardTitle></CardHeader></Card>)}
                </div>
                <ChartCard title="Subscription Status Breakdown"><div className="h-72"><ResponsiveContainer><PieChart><Pie data={data.revenue.subscriptionStatuses} dataKey="count" nameKey="status" innerRadius={60} outerRadius={90}>{data.revenue.subscriptionStatuses.map((entry: any, index: number) => <Cell key={entry.status} fill={chartPalette[index % chartPalette.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></ChartCard>
              </div>
            ) : null
          )}

          {activeSection === 'costs' && (
            loading && !costs ? <LoadingState /> : costs ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-serif text-2xl">Gemini Costs</h2>
                    <p className="text-sm text-content-secondary">Tracking API spend, usage, projections, and raw call diagnostics.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="warm-sand" onClick={() => void handleDownloadCostReport()}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Report
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Card><CardHeader><CardDescription>Today's Gemini Cost</CardDescription><CardTitle>{formatCostDisplay(costs.overview.today.totalCost)}</CardTitle></CardHeader><CardContent className="text-sm text-content-secondary">{formatLargeNumber(costs.overview.today.totalCalls)} API calls · {formatLargeNumber(costs.overview.today.totalTokens)} tokens<br />{costs.overview.today.trendVsYesterday >= 0 ? '+' : ''}{(costs.overview.today.trendVsYesterday * 100).toFixed(1)}% vs yesterday</CardContent></Card>
                  <Card><CardHeader><CardDescription>This Month's Cost</CardDescription><CardTitle>{formatCostDisplay(costs.overview.currentMonth.totalCost)}</CardTitle></CardHeader><CardContent className="text-sm text-content-secondary">Projected: {formatCostDisplay(costs.overview.currentMonth.estimatedEndOfMonthCost)}</CardContent></Card>
                  <Card><CardHeader><CardDescription>All-Time Cost</CardDescription><CardTitle>{formatCostDisplay(costs.overview.allTimeCost)}</CardTitle></CardHeader><CardContent className="text-sm text-content-secondary">{formatLargeNumber(costs.overview.allTimeCalls)} total API calls<br />Tracking began {costs.overview.firstTrackedAt ? relativeTime(costs.overview.firstTrackedAt) : 'not yet'}</CardContent></Card>
                  <Card><CardHeader><CardDescription>Cost Per Active User (Today)</CardDescription><CardTitle>{costs.overview.today.uniqueUsersServed > 0 ? formatCostDisplay(costs.overview.today.avgCostPerActiveUser) : '--'}</CardTitle></CardHeader><CardContent className="text-sm text-content-secondary">{formatLargeNumber(costs.overview.today.uniqueUsersServed)} users served today</CardContent></Card>
                  <Card><CardHeader><CardDescription>Most Expensive Feature</CardDescription><CardTitle>{costs.overview.currentMonth.topFeature?.label ?? 'No data'}</CardTitle></CardHeader><CardContent className="text-sm text-content-secondary">{costs.overview.currentMonth.topFeature ? `${formatCostDisplay(costs.overview.currentMonth.topFeature.totalCost)} · ${(costs.overview.currentMonth.topFeature.percentage * 100).toFixed(1)}% of month · ${formatLargeNumber(costs.overview.currentMonth.topFeature.callCount)} calls` : 'No Gemini usage this month yet.'}</CardContent></Card>
                  <Card><CardHeader><CardDescription>API Success Rate</CardDescription><CardTitle>{(costs.overview.successRate * 100).toFixed(1)}%</CardTitle></CardHeader><CardContent className="text-sm text-content-secondary">{formatLargeNumber(costs.overview.failedCalls)} failed calls{costs.overview.failedCalls > 0 && costs.overview.mostCommonError ? <><br />Most common error: {costs.overview.mostCommonError}</> : null}</CardContent></Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-6">
                    <ChartCard title="Cost Trend" subtitle="Daily cost with 7-day rolling average">
                      <div className="mb-4 flex gap-2">
                        {(['7d', '30d', '90d', '1y'] as const).map((period) => (
                          <Button key={period} variant={costSeriesPeriod === period ? 'warm-sand' : 'outline'} onClick={() => setCostSeriesPeriod(period)}>{period.toUpperCase()}</Button>
                        ))}
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={rollingAverage}>
                            <CartesianGrid stroke={chartGridColor} vertical={false} />
                            <XAxis dataKey="date" stroke={chartAxisColor} />
                            <YAxis stroke={chartAxisColor} tickFormatter={(value) => formatCostDisplay(value)} />
                            <Tooltip formatter={tooltipCurrencyFormatter} />
                            <Bar dataKey="totalCost" fill={chartSecondaryColor} radius={[8, 8, 0, 0]} />
                            <Line type="monotone" dataKey="rollingAverage" stroke={chartPrimaryColor} strokeWidth={3} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>

                    <ChartCard title="Cost By Feature Over Time" subtitle="Stacked daily feature cost breakdown">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={featureStackData}>
                            <CartesianGrid stroke={chartGridColor} vertical={false} />
                            <XAxis dataKey="date" stroke={chartAxisColor} />
                            <YAxis stroke={chartAxisColor} tickFormatter={(value) => formatCostDisplay(value)} />
                            <Tooltip formatter={tooltipCurrencyFormatter} />
                            {featureKeys.map((key, index) => (
                              <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={chartPalette[index % chartPalette.length]} fill={chartPalette[index % chartPalette.length]} fillOpacity={0.28} />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>
                  </div>

                  <Card className="h-fit">
                    <CardHeader>
                      <CardTitle>Cost Projections</CardTitle>
                      <CardDescription>Estimates based on recent averages</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-content-secondary">
                      <div className="flex items-center justify-between"><span>Next 30 days</span><span className="font-medium text-foreground">{formatCostDisplay(costProjection.next30)}</span></div>
                      <div className="flex items-center justify-between"><span>Next 90 days</span><span className="font-medium text-foreground">{formatCostDisplay(costProjection.next90)}</span></div>
                      <div className="flex items-center justify-between"><span>Next 12 months</span><span className="font-medium text-foreground">{formatCostDisplay(costProjection.next12Months)}</span></div>
                      <div className="border-t border-border pt-3">
                        <div className="flex items-center justify-between"><span>Current estimated MRR</span><span className="font-medium text-foreground">{formatCurrency(costProjection.estimatedMrr)}</span></div>
                        <div className="mt-2 flex items-center justify-between"><span>Gemini cost as % of MRR</span><span className="font-medium text-foreground">{(costProjection.percentOfMrr * 100).toFixed(1)}%</span></div>
                      </div>
                      <p className="text-xs">These projections are estimates based on current daily averages and should be treated as directional rather than exact.</p>
                    </CardContent>
                  </Card>
                </div>

                <ChartCard title="Cost By Feature" subtitle="Ordered by total month cost">
                  <div className="overflow-hidden rounded-2xl border border-border bg-card ring-1 ring-foreground/10">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 text-content-secondary"><tr><th className="px-4 py-3">Feature</th><th className="px-4 py-3">Total cost</th><th className="px-4 py-3">Calls</th><th className="px-4 py-3">Avg/call</th><th className="px-4 py-3">Avg input</th><th className="px-4 py-3">Avg output</th><th className="px-4 py-3">Success</th><th className="px-4 py-3">% of total</th></tr></thead>
                      <tbody>{(costs.byFeature.features || []).map((feature: any) => <tr key={feature.feature} className="border-t border-border/60 align-top"><td className="px-4 py-3"><div className="font-medium">{feature.label}</div><div className="text-xs text-content-secondary">{feature.feature}</div></td><td className="px-4 py-3">{formatCostDisplay(feature.totalCost)}</td><td className="px-4 py-3">{formatLargeNumber(feature.totalCalls)}</td><td className="px-4 py-3">{formatCostDisplay(feature.avgCostPerCall)}</td><td className="px-4 py-3">{formatLargeNumber(feature.avgInputTokensPerCall)}</td><td className="px-4 py-3">{formatLargeNumber(feature.avgOutputTokensPerCall)}</td><td className="px-4 py-3">{(feature.successRate * 100).toFixed(1)}%</td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, feature.costAsPercentOfTotal * 100)}%` }} /></div><span>{(feature.costAsPercentOfTotal * 100).toFixed(1)}%</span></div></td></tr>)}</tbody>
                    </table>
                  </div>
                </ChartCard>

                <ChartCard title="Cost Per User" subtitle="Identify high-cost accounts and drill into usage">
                  <div className="mb-4 flex gap-2">
                    {(['today', '7d', '30d', 'all'] as const).map((period) => (
                      <Button key={period} variant={costPeriod === period ? 'warm-sand' : 'outline'} onClick={() => setCostPeriod(period)}>{period === 'today' ? 'Today' : period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : 'All Time'}</Button>
                    ))}
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-card ring-1 ring-foreground/10">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 text-content-secondary"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Total cost</th><th className="px-4 py-3">Calls</th><th className="px-4 py-3">Most used feature</th><th className="px-4 py-3">Avg/day</th><th className="px-4 py-3">Actions</th></tr></thead>
                      <tbody>{(costs.byUser.users || []).map((user: any) => <tr key={user.userId} className="border-t border-border/60 align-top"><td className="px-4 py-3"><div className="font-medium">{user.email ?? user.userId}</div><div className="text-xs text-content-secondary">{user.username || 'No username'}</div></td><td className="px-4 py-3"><Badge variant="secondary">{user.plan ?? 'UNKNOWN'}</Badge></td><td className="px-4 py-3">{formatCostDisplay(user.totalCost)}</td><td className="px-4 py-3">{formatLargeNumber(user.totalCalls)}</td><td className="px-4 py-3">{user.mostUsedFeature ?? '—'}</td><td className="px-4 py-3">{formatCostDisplay(user.avgCostPerDay)}</td><td className="px-4 py-3"><Button variant="warm-sand" onClick={() => void loadCostUserDetails(user.userId)}>View details</Button></td></tr>)}</tbody>
                    </table>
                  </div>
                </ChartCard>

                {costUserDetails?.user ? (
                  <div className="grid gap-6 xl:grid-cols-2">
                    <ChartCard title="Selected User Cost By Feature" subtitle={costUserDetails.user.email ?? costUserDetails.user.userId}>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(costUserDetails.user.costByFeature || {}).map(([feature, cost]) => ({ feature, cost }))}>
                            <CartesianGrid stroke={chartGridColor} vertical={false} />
                            <XAxis dataKey="feature" stroke={chartAxisColor} angle={-20} textAnchor="end" height={80} />
                            <YAxis stroke={chartAxisColor} tickFormatter={(value) => formatCostDisplay(value)} />
                            <Tooltip formatter={tooltipCurrencyFormatter} />
                            <Bar dataKey="cost" fill={chartPrimaryColor} radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>
                    <ChartCard title="Selected User Daily Cost" subtitle="Last 30 days by feature/day">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={(costUserDetails.daily?.points || []).reduce((acc: any[], item: any) => {
                            const existing = acc.find((row) => row.date === item.date);
                            if (existing) {
                              existing.cost += item.cost;
                            } else {
                              acc.push({ date: item.date, cost: item.cost });
                            }
                            return acc;
                          }, [])}>
                            <CartesianGrid stroke={chartGridColor} vertical={false} />
                            <XAxis dataKey="date" stroke={chartAxisColor} />
                            <YAxis stroke={chartAxisColor} tickFormatter={(value) => formatCostDisplay(value)} />
                            <Tooltip formatter={tooltipCurrencyFormatter} />
                            <Line type="monotone" dataKey="cost" stroke={chartPrimaryColor} strokeWidth={3} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>
                  </div>
                ) : null}

                <ChartCard title="Monthly Cost By User" subtitle="Last 3 months by user">
                  <div className="overflow-hidden rounded-2xl border border-border bg-card ring-1 ring-foreground/10">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 text-content-secondary"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Plan</th>{monthlyUserRows.months.map((month: string) => <th key={month} className="px-4 py-3">{month}</th>)}<th className="px-4 py-3">3-Month Total</th><th className="px-4 py-3">Avg/Month</th></tr></thead>
                      <tbody>{monthlyUserRows.rows.map((row: any) => <tr key={row.key} className="border-t border-border/60 align-top"><td className="px-4 py-3"><div className="font-medium">{row.email ?? row.userId ?? row.key}</div><div className="text-xs text-content-secondary">{row.username || 'No username'}</div></td><td className="px-4 py-3"><Badge variant="secondary">{row.plan ?? 'UNKNOWN'}</Badge></td>{monthlyUserRows.months.map((month: string) => <td key={month} className="px-4 py-3">{formatCostDisplay(row.months[month] ?? 0)}</td>)}<td className="px-4 py-3">{formatCostDisplay(row.total)}</td><td className="px-4 py-3">{formatCostDisplay(row.avg)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </ChartCard>

                <div>
                  <Button variant="warm-sand" onClick={() => setRawCallsOpen((value) => !value)}>
                    Debug: Raw API Calls
                  </Button>
                </div>

                {rawCallsOpen ? (
                  <ChartCard title="Raw Calls Debug Table" subtitle="Latest tracked Gemini API calls">
                    <div className="overflow-hidden rounded-2xl border border-border bg-card ring-1 ring-foreground/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-content-secondary"><tr><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Feature</th><th className="px-4 py-3">Model</th><th className="px-4 py-3">Input</th><th className="px-4 py-3">Output</th><th className="px-4 py-3">Cost</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Success</th></tr></thead>
                        <tbody>{(costs.rawCalls.calls || []).map((call: any) => <tr key={call.id} className="border-t border-border/60 align-top"><td className="px-4 py-3">{relativeTime(call.calledAt)}</td><td className="px-4 py-3">{call.maskedEmail ?? call.userId ?? 'CRON'}</td><td className="px-4 py-3">{call.feature}</td><td className="px-4 py-3">{call.model}</td><td className="px-4 py-3">{formatLargeNumber(call.inputTokens)}</td><td className="px-4 py-3">{formatLargeNumber(call.outputTokens)}</td><td className="px-4 py-3">{formatCostDisplay(call.totalCost)}</td><td className="px-4 py-3">{call.durationMs ?? '—'}ms</td><td className="px-4 py-3">{call.success ? <span className="inline-flex items-center gap-1 text-green-700"><TrendingUp className="h-4 w-4" />Yes</span> : <span className="inline-flex items-center gap-1 text-destructive"><TrendingDown className="h-4 w-4" />No</span>}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </ChartCard>
                ) : null}
              </div>
            ) : null
          )}

          {activeSection === 'logins' && (
            loading && !data.logins ? <LoadingState /> : data.logins ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card><CardHeader><CardDescription>Active last 24h</CardDescription><CardTitle>{data.logins.activeLast24h}</CardTitle></CardHeader></Card>
                  <Card><CardHeader><CardDescription>Active last 7 days</CardDescription><CardTitle>{data.logins.activeLast7d}</CardTitle></CardHeader></Card>
                  <Card><CardHeader><CardDescription>Active last 30 days</CardDescription><CardTitle>{data.logins.activeLast30d}</CardTitle></CardHeader></Card>
                </div>
                <ChartCard title="Daily Active Users"><div className="h-72"><ResponsiveContainer><LineChart data={data.logins.daily}><CartesianGrid stroke={chartGridColor} vertical={false} /><XAxis dataKey="date" stroke={chartAxisColor} /><YAxis stroke={chartAxisColor} /><Tooltip /><Bar dataKey="uniqueActiveUsers" fill={chartSecondaryColor} radius={[8, 8, 0, 0]} /><Line dataKey="uniqueActiveUsers" stroke={chartPrimaryColor} strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></ChartCard>
              </div>
            ) : null
          )}

          {activeSection === 'feedback' && (
            loading && !data.feedback ? <LoadingState /> : data.feedback ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card><CardHeader><CardDescription>Total feedback</CardDescription><CardTitle>{data.feedback.aggregates.total}</CardTitle></CardHeader></Card>
                  <Card><CardHeader><CardDescription>This week</CardDescription><CardTitle>{data.feedback.aggregates.thisWeek}</CardTitle></CardHeader></Card>
                  <Card><CardHeader><CardDescription>This month</CardDescription><CardTitle>{data.feedback.aggregates.thisMonth}</CardTitle></CardHeader></Card>
                  <Card><CardHeader><CardDescription>Authenticated</CardDescription><CardTitle>{data.feedback.aggregates.authenticated}</CardTitle></CardHeader></Card>
                </div>
                <ChartCard title="Feedback Volume"><div className="h-72"><ResponsiveContainer><BarChart data={data.feedback.aggregates.submissionsPerDay}><CartesianGrid stroke={chartGridColor} vertical={false} /><XAxis dataKey="date" stroke={chartAxisColor} /><YAxis stroke={chartAxisColor} /><Tooltip /><Bar dataKey="value" fill={chartPrimaryColor} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
                <div className="overflow-hidden rounded-2xl border border-border bg-card ring-1 ring-foreground/10">
                  <table className="w-full text-left text-sm"><thead className="bg-muted/50 text-content-secondary"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Feedback</th></tr></thead><tbody>{data.feedback.items.map((item: any) => <tr key={item.id} className="border-t border-border/60"><td className="px-4 py-3">{relativeTime(item.createdAt)}</td><td className="px-4 py-3">{item.user?.email || item.anonymousEmail || 'Anonymous'}</td><td className="px-4 py-3">{item.user?.plan || 'Anonymous'}</td><td className="px-4 py-3">{item.content}</td></tr>)}</tbody></table>
                </div>
              </div>
            ) : null
          )}
        </main>
      </div>
    </div>
  );
}
