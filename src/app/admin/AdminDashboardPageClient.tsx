'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import { RefreshCw, Shield, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SectionKey = 'overview' | 'growth' | 'users' | 'features' | 'engagement' | 'revenue' | 'logins' | 'feedback';

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'growth', label: 'Growth' },
  { key: 'users', label: 'Users' },
  { key: 'features', label: 'Features' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'logins', label: 'Logins' },
  { key: 'feedback', label: 'Feedback' },
];

const chartPalette = ['#c96442', '#d97757', '#b0aea5', '#87867f', '#f5f4ed'];

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Request failed');
  }
  return response.json();
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="border-border bg-[#30302e] text-[#faf9f5] ring-1 ring-white/10">
      <CardHeader>
        <CardTitle className="text-[#faf9f5]">{title}</CardTitle>
        {subtitle ? <CardDescription className="text-[#b0aea5]">{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LoadingState() {
  return <div className="h-72 animate-pulse rounded-2xl bg-white/5" />;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-100">
      <div className="mb-3">Failed to load this section.</div>
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
  }, [activeSection, refreshKey]);

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

  const overview = data.overview;
  const overviewGrowth = data.overviewGrowth;

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-[#141413] text-[#faf9f5]">
      <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-[1440px] flex-col lg:flex-row">
        <aside className="w-full border-b border-white/10 bg-[#1e1e1c] p-4 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3 px-2">
            <div className="rounded-xl bg-terracotta/15 p-2 text-terracotta"><Shield className="h-5 w-5" /></div>
            <div>
              <div className="font-serif text-xl">Admin Dashboard</div>
              <div className="text-sm text-[#b0aea5]">Platform analytics</div>
            </div>
          </div>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => navigateSection(section.key)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors',
                  activeSection === section.key ? 'bg-terracotta text-white' : 'text-[#b0aea5] hover:bg-white/5 hover:text-white'
                )}
              >
                <span>{section.label}</span>
                {activeSection === section.key ? <TrendingUp className="h-4 w-4" /> : null}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-[#b0aea5]">
                Last updated: {lastUpdated}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#b0aea5]">
                {sessionUser.name || sessionUser.email}
              </div>
              <Button variant="warm-sand" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {error ? <ErrorState onRetry={handleRefresh} /> : null}

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
                    <Card key={card.title} className="border-white/10 bg-[#30302e] text-[#faf9f5] ring-1 ring-white/10">
                      <CardHeader>
                        <CardDescription className="text-[#b0aea5]">{card.title}</CardDescription>
                        <CardTitle className="text-3xl text-[#faf9f5]">{card.value}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-[#b0aea5]">{card.sub}</CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <ChartCard title="User Growth" subtitle="Last 30 days">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={overviewGrowth?.cumulativeUsers?.map((item: any, index: number) => ({ date: item.date, cumulativeUsers: item.value, newUsers: overviewGrowth.newUsers[index]?.value ?? 0 })) ?? []}>
                          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                          <XAxis dataKey="date" stroke="#b0aea5" />
                          <YAxis stroke="#b0aea5" />
                          <Tooltip />
                          <Bar dataKey="newUsers" fill="#d97757" radius={[8, 8, 0, 0]} />
                          <Line type="monotone" dataKey="cumulativeUsers" stroke="#c96442" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                  <ChartCard title="Revenue Trend" subtitle="Estimated MRR from snapshots">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewGrowth?.mrr ?? []}>
                          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                          <XAxis dataKey="date" stroke="#b0aea5" />
                          <YAxis stroke="#b0aea5" />
                          <Tooltip />
                          <Area type="monotone" dataKey="value" stroke="#c96442" fill="#c96442" fillOpacity={0.25} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <ChartCard title="Most Recent Signups">
                    <div className="space-y-3 text-sm">{overview.recentSignups.map((user: any) => <div key={user.id} className="flex items-center justify-between border-b border-white/5 pb-2"><div>{user.email}</div><div className="text-[#b0aea5]">{user.plan}</div></div>)}</div>
                  </ChartCard>
                  <ChartCard title="Recent Pro Conversions">
                    <div className="space-y-3 text-sm">{overview.recentProConversions.map((user: any) => <div key={user.id} className="flex items-center justify-between border-b border-white/5 pb-2"><div>{user.email}</div><div className="text-[#b0aea5]">{relativeTime(user.convertedAt)}</div></div>)}</div>
                  </ChartCard>
                  <ChartCard title="Recent Feedback">
                    <div className="space-y-3 text-sm">{overview.recentFeedback.map((item: any) => <div key={item.id} className="border-b border-white/5 pb-2"><div>{item.message}</div><div className="mt-1 text-xs text-[#b0aea5]">{relativeTime(item.createdAt)}</div></div>)}</div>
                  </ChartCard>
                </div>
              </div>
            ) : null
          )}

          {activeSection === 'growth' && (
            loading && !data.growth ? <LoadingState /> : data.growth ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="User Acquisition"><div className="h-72"><ResponsiveContainer><BarChart data={data.growth.newUsers}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="date" stroke="#b0aea5" /><YAxis stroke="#b0aea5" /><Tooltip /><Bar dataKey="value" fill="#c96442" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></div></ChartCard>
                <ChartCard title="Pro Subscription Growth"><div className="h-72"><ResponsiveContainer><AreaChart data={data.growth.cumulativeProUsers}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="date" stroke="#b0aea5" /><YAxis stroke="#b0aea5" /><Tooltip /><Area dataKey="value" stroke="#d97757" fill="#d97757" fillOpacity={0.24} /></AreaChart></ResponsiveContainer></div></ChartCard>
                <ChartCard title="Active Users"><div className="h-72"><ResponsiveContainer><LineChart data={data.growth.activeUsers}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="date" stroke="#b0aea5" /><YAxis stroke="#b0aea5" /><Tooltip /><Line dataKey="value" stroke="#c96442" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></ChartCard>
                <ChartCard title="MRR"><div className="h-72"><ResponsiveContainer><LineChart data={data.growth.mrr}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="date" stroke="#b0aea5" /><YAxis stroke="#b0aea5" /><Tooltip /><Line dataKey="value" stroke="#b0aea5" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></ChartCard>
              </div>
            ) : null
          )}

          {activeSection === 'users' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search email or username" className="max-w-md bg-white/5 text-white" />
                <Button variant="warm-sand" onClick={handleRefresh}>Search</Button>
              </div>
              {loading && !data.users ? <LoadingState /> : data.users ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#30302e]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-[#b0aea5]"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Entries</th><th className="px-4 py-3">Collections</th><th className="px-4 py-3">Connections</th><th className="px-4 py-3">Last Active</th></tr></thead>
                    <tbody>{data.users.users.map((user: any) => <tr key={user.id} className="border-t border-white/5 align-top"><td className="px-4 py-3"><div className="font-medium">{user.email}</div><div className="text-xs text-[#b0aea5]">{user.username || 'No username'}</div><div className="mt-2 text-xs text-[#b0aea5]">Full email: {user.fullEmail}</div></td><td className="px-4 py-3"><Badge variant="secondary">{user.plan}</Badge></td><td className="px-4 py-3">{user.entriesCount}</td><td className="px-4 py-3">{user.collectionCount}</td><td className="px-4 py-3">{user.connectionCount}</td><td className="px-4 py-3">{relativeTime(user.lastActivity)}</td></tr>)}</tbody>
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
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">Day 1 retention</CardDescription><CardTitle>{formatPercent(data.engagement.retention.day1)}</CardTitle></CardHeader></Card>
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">Day 7 retention</CardDescription><CardTitle>{formatPercent(data.engagement.retention.day7)}</CardTitle></CardHeader></Card>
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">Day 30 retention</CardDescription><CardTitle>{formatPercent(data.engagement.retention.day30)}</CardTitle></CardHeader></Card>
                </div>
                <ChartCard title="Time to First Entry"><div className="h-72"><ResponsiveContainer><BarChart data={Object.entries(data.engagement.timeToFirstEntryHistogram).map(([bucket, value]) => ({ bucket, value }))}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="bucket" stroke="#b0aea5" /><YAxis stroke="#b0aea5" /><Tooltip /><Bar dataKey="value" fill="#c96442" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></div></ChartCard>
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
                  ].map(([title, value]) => <Card key={String(title)} className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">{title}</CardDescription><CardTitle>{value}</CardTitle></CardHeader></Card>)}
                </div>
                <ChartCard title="Subscription Status Breakdown"><div className="h-72"><ResponsiveContainer><PieChart><Pie data={data.revenue.subscriptionStatuses} dataKey="count" nameKey="status" innerRadius={60} outerRadius={90}>{data.revenue.subscriptionStatuses.map((entry: any, index: number) => <Cell key={entry.status} fill={chartPalette[index % chartPalette.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></ChartCard>
              </div>
            ) : null
          )}

          {activeSection === 'logins' && (
            loading && !data.logins ? <LoadingState /> : data.logins ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">Active last 24h</CardDescription><CardTitle>{data.logins.activeLast24h}</CardTitle></CardHeader></Card>
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">Active last 7 days</CardDescription><CardTitle>{data.logins.activeLast7d}</CardTitle></CardHeader></Card>
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">Active last 30 days</CardDescription><CardTitle>{data.logins.activeLast30d}</CardTitle></CardHeader></Card>
                </div>
                <ChartCard title="Daily Active Users"><div className="h-72"><ResponsiveContainer><LineChart data={data.logins.daily}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="date" stroke="#b0aea5" /><YAxis stroke="#b0aea5" /><Tooltip /><Bar dataKey="uniqueActiveUsers" fill="#d97757" radius={[8,8,0,0]} /><Line dataKey="uniqueActiveUsers" stroke="#c96442" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></ChartCard>
              </div>
            ) : null
          )}

          {activeSection === 'feedback' && (
            loading && !data.feedback ? <LoadingState /> : data.feedback ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">Total feedback</CardDescription><CardTitle>{data.feedback.aggregates.total}</CardTitle></CardHeader></Card>
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">This week</CardDescription><CardTitle>{data.feedback.aggregates.thisWeek}</CardTitle></CardHeader></Card>
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">This month</CardDescription><CardTitle>{data.feedback.aggregates.thisMonth}</CardTitle></CardHeader></Card>
                  <Card className="border-white/10 bg-[#30302e] text-[#faf9f5]"><CardHeader><CardDescription className="text-[#b0aea5]">Authenticated</CardDescription><CardTitle>{data.feedback.aggregates.authenticated}</CardTitle></CardHeader></Card>
                </div>
                <ChartCard title="Feedback Volume"><div className="h-72"><ResponsiveContainer><BarChart data={data.feedback.aggregates.submissionsPerDay}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="date" stroke="#b0aea5" /><YAxis stroke="#b0aea5" /><Tooltip /><Bar dataKey="value" fill="#c96442" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></div></ChartCard>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#30302e]">
                  <table className="w-full text-left text-sm"><thead className="bg-white/5 text-[#b0aea5]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Feedback</th></tr></thead><tbody>{data.feedback.items.map((item: any) => <tr key={item.id} className="border-t border-white/5"><td className="px-4 py-3">{relativeTime(item.createdAt)}</td><td className="px-4 py-3">{item.user?.email || item.anonymousEmail || 'Anonymous'}</td><td className="px-4 py-3">{item.user?.plan || 'Anonymous'}</td><td className="px-4 py-3">{item.content}</td></tr>)}</tbody></table>
                </div>
              </div>
            ) : null
          )}
        </main>
      </div>
    </div>
  );
}
