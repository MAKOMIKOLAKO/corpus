'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MetricsChart } from '@/components/admin/MetricsChart';

interface Metrics {
  userOnboarding: {
    totalSignups: number;
    signupsPerDay: Array<{ date: Date; count: number }>;
    usernameSetups: number;
    emailVerifications: number;
  };
  entryActions: {
    totalEntries: number;
    avgEntriesPerUser: number;
    readingStatusDistribution: Array<{ status: string; count: number }>;
    topUsers: Array<{ email: string; entryCount: number }>;
  };
  collections: {
    collectionsCreated: number;
    sharedCollections: number;
    collectionSharesAccepted: number;
    avgEntriesPerCollection: number;
  };
  engagement: {
    feedCardViews: number;
    addToLibraryClicks: number;
    multipleSavesUsers: number;
    multipleSavePercentage: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    checkAuthAndFetchMetrics();
  }, []);

  const checkAuthAndFetchMetrics = async () => {
    const credentials = sessionStorage.getItem('adminCredentials');

    if (!credentials) {
      router.push('/admin');
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      if (dateRange.startDate) queryParams.append('startDate', dateRange.startDate);
      if (dateRange.endDate) queryParams.append('endDate', dateRange.endDate);

      const response = await fetch(`/api/admin/metrics?${queryParams}`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      if (response.status === 401) {
        sessionStorage.removeItem('adminCredentials');
        router.push('/admin');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      toast.error('Failed to load metrics');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateFilter = () => {
    setIsLoading(true);
    checkAuthAndFetchMetrics();
  };

  const handleExportCSV = () => {
    if (!metrics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Signups', metrics.userOnboarding.totalSignups],
      ['Username Setups', metrics.userOnboarding.usernameSetups],
      ['Email Verifications', metrics.userOnboarding.emailVerifications],
      ['Total Entries', metrics.entryActions.totalEntries],
      ['Avg Entries Per User', metrics.entryActions.avgEntriesPerUser],
      ['Collections Created', metrics.collections.collectionsCreated],
      ['Shared Collections', metrics.collections.sharedCollections],
      ['Collection Shares Accepted', metrics.collections.collectionSharesAccepted],
      ['Avg Entries Per Collection', metrics.collections.avgEntriesPerCollection],
      ['Feed Card Views', metrics.engagement.feedCardViews],
      ['Add to Library Clicks', metrics.engagement.addToLibraryClicks],
      ['Multiple Saves Users', metrics.engagement.multipleSavesUsers],
      ['Multiple Save Percentage', `${metrics.engagement.multipleSavePercentage}%`],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminCredentials');
    router.push('/admin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Export CSV
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Filter */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium mb-4">Date Range Filter</h2>
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
            <button
              onClick={handleDateFilter}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Apply Filter
            </button>
            <button
              onClick={() => {
                setDateRange({ startDate: '', endDate: '' });
                setIsLoading(true);
                setTimeout(() => checkAuthAndFetchMetrics(), 0);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* User Onboarding Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Onboarding</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Signups:</span>
                <span className="font-medium">{metrics.userOnboarding.totalSignups}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Username Setups:</span>
                <span className="font-medium">{metrics.userOnboarding.usernameSetups}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email Verified:</span>
                <span className="font-medium">{metrics.userOnboarding.emailVerifications}</span>
              </div>
            </div>
          </div>

          {/* Entry Actions Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Entry Actions</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Entries:</span>
                <span className="font-medium">{metrics.entryActions.totalEntries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Per User:</span>
                <span className="font-medium">{metrics.entryActions.avgEntriesPerUser}</span>
              </div>
            </div>
          </div>

          {/* Collections Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Collections</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{metrics.collections.collectionsCreated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shared:</span>
                <span className="font-medium">{metrics.collections.sharedCollections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shares Accepted:</span>
                <span className="font-medium">{metrics.collections.collectionSharesAccepted}</span>
              </div>
            </div>
          </div>

          {/* Engagement Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Feed Views:</span>
                <span className="font-medium">{metrics.engagement.feedCardViews}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Library Clicks:</span>
                <span className="font-medium">{metrics.engagement.addToLibraryClicks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Multi-save Users:</span>
                <span className="font-medium">{metrics.engagement.multipleSavesUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Multi-save %:</span>
                <span className="font-medium">{metrics.engagement.multipleSavePercentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Reading Status Distribution */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reading Status</h3>
            <div className="space-y-2">
              {metrics.entryActions.readingStatusDistribution.map((status) => (
                <div key={status.status} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{status.status.toLowerCase()}:</span>
                  <span className="font-medium">{status.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Collection Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Collection Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Entries/Coll:</span>
                <span className="font-medium">{metrics.collections.avgEntriesPerCollection}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Signups Trend */}
          {metrics.userOnboarding.signupsPerDay.length > 0 && (
            <MetricsChart
              type="line"
              title="Signups Trend (Last 30 Days)"
              data={metrics.userOnboarding.signupsPerDay}
              xAxisKey="date"
              yAxisKey="count"
            />
          )}

          {/* Reading Status Distribution */}
          {metrics.entryActions.readingStatusDistribution.length > 0 && (
            <MetricsChart
              type="pie"
              title="Reading Status Distribution"
              data={metrics.entryActions.readingStatusDistribution.map(r => ({
                name: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
                value: r.count
              }))}
              dataKey="value"
              nameKey="name"
            />
          )}
        </div>

        {/* Top Users Chart */}
        {metrics.entryActions.topUsers.length > 0 && (
          <MetricsChart
            type="bar"
            title="Top Users by Entries Saved"
            data={metrics.entryActions.topUsers.map(u => ({
              name: u.email.split('@')[0], // Show only username part
              entries: u.entryCount
            }))}
            dataKey="entries"
            nameKey="name"
          />
        )}

        {/* Top Users Table */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Users by Entries Saved</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entries Saved
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.entryActions.topUsers.map((user, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.entryCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signups Per Day */}
        {metrics.userOnboarding.signupsPerDay.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Signups Per Day (Last 30 Days)</h3>
            <div className="space-y-2">
              {metrics.userOnboarding.signupsPerDay.map((day) => (
                <div key={day.date.toString()} className="flex justify-between">
                  <span className="text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                  <span className="font-medium">{day.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
