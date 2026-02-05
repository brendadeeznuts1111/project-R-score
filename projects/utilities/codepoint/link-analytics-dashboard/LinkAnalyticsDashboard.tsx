import { useState } from 'react';

interface LinkAnalytics {
  id: string;
  url: string;
  shortCode: string;
  originalUrl: string;
  clicks: number;
  uniqueClicks: number;
  createdAt: Date;
  lastClicked: Date;
  referrers: ReferrerData[];
  devices: DeviceData[];
  locations: LocationData[];
  conversionRate: number;
  status: 'active' | 'paused' | 'expired';
}

interface ReferrerData {
  source: string;
  count: number;
  percentage: number;
}

interface DeviceData {
  type: 'desktop' | 'mobile' | 'tablet';
  count: number;
  percentage: number;
}

interface LocationData {
  country: string;
  city: string;
  count: number;
  percentage: number;
}

interface TimeSeriesData {
  date: string;
  clicks: number;
  uniqueClicks: number;
}

export default function LinkAnalyticsDashboard() {
  const [links, setLinks] = useState<LinkAnalytics[]>([
    {
      id: '1',
      url: 'https://bit.ly/launch-demo',
      shortCode: 'launch-demo',
      originalUrl: 'https://myproduct.com/launch-campaign-2024',
      clicks: 15420,
      uniqueClicks: 12350,
      createdAt: new Date('2024-01-01'),
      lastClicked: new Date('2024-01-20'),
      referrers: [
        { source: 'twitter.com', count: 5234, percentage: 33.9 },
        { source: 'linkedin.com', count: 4120, percentage: 26.7 },
        { source: 'direct', count: 3089, percentage: 20.0 },
        { source: 'facebook.com', count: 2156, percentage: 14.0 },
        { source: 'other', count: 821, percentage: 5.4 }
      ],
      devices: [
        { type: 'mobile', count: 8924, percentage: 57.8 },
        { type: 'desktop', count: 4987, percentage: 32.3 },
        { type: 'tablet', count: 1509, percentage: 9.9 }
      ],
      locations: [
        { country: 'United States', city: 'New York', count: 4234, percentage: 27.4 },
        { country: 'United Kingdom', city: 'London', count: 2156, percentage: 14.0 },
        { country: 'Canada', city: 'Toronto', count: 1542, percentage: 10.0 },
        { country: 'Australia', city: 'Sydney', count: 1234, percentage: 8.0 },
        { country: 'Germany', city: 'Berlin', count: 987, percentage: 6.4 }
      ],
      conversionRate: 12.5,
      status: 'active'
    },
    {
      id: '2',
      url: 'https://short.ly/marketing-q1',
      shortCode: 'marketing-q1',
      originalUrl: 'https://company.com/q1-marketing-report',
      clicks: 8750,
      uniqueClicks: 7234,
      createdAt: new Date('2024-01-05'),
      lastClicked: new Date('2024-01-19'),
      referrers: [
        { source: 'email', count: 3456, percentage: 39.5 },
        { source: 'linkedin.com', count: 2345, percentage: 26.8 },
        { source: 'direct', count: 1876, percentage: 21.4 },
        { source: 'twitter.com', count: 876, percentage: 10.0 },
        { source: 'other', count: 197, percentage: 2.3 }
      ],
      devices: [
        { type: 'desktop', count: 5234, percentage: 59.8 },
        { type: 'mobile', count: 2876, percentage: 32.9 },
        { type: 'tablet', count: 640, percentage: 7.3 }
      ],
      locations: [
        { country: 'United States', city: 'San Francisco', count: 3456, percentage: 39.5 },
        { country: 'United Kingdom', city: 'Manchester', count: 1876, percentage: 21.4 },
        { country: 'Germany', city: 'Munich', count: 1234, percentage: 14.1 },
        { country: 'France', city: 'Paris', count: 987, percentage: 11.3 },
        { country: 'Netherlands', city: 'Amsterdam', count: 1197, percentage: 13.7 }
      ],
      conversionRate: 8.3,
      status: 'active'
    }
  ]);

  const [selectedLink, setSelectedLink] = useState<LinkAnalytics | null>(links[0]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const timeSeriesData: TimeSeriesData[] = [
    { date: 'Jan 1', clicks: 450, uniqueClicks: 380 },
    { date: 'Jan 5', clicks: 680, uniqueClicks: 520 },
    { date: 'Jan 10', clicks: 890, uniqueClicks: 720 },
    { date: 'Jan 15', clicks: 1200, uniqueClicks: 980 },
    { date: 'Jan 20', clicks: 15420, uniqueClicks: 12350 }
  ];

  const filteredLinks = links.filter(link =>
    link.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.originalUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const totalUniqueClicks = links.reduce((sum, link) => sum + link.uniqueClicks, 0);
  const avgConversionRate = links.reduce((sum, link) => sum + link.conversionRate, 0) / links.length;

  const getStatusColor = (status: LinkAnalytics['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDeviceIcon = (type: DeviceData['type']) => {
    switch (type) {
      case 'desktop': return '🖥️';
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      default: return '📱';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">
            📊 Link Analytics Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Track, analyze, and optimize your link performance
          </p>
        </header>

        {/* Overview Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Clicks</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(totalClicks)}</p>
              </div>
              <div className="text-3xl">👆</div>
            </div>
            <div className="mt-2 flex items-center text-green-600 text-sm">
              <span className="mr-1">↑</span>
              <span>12.5% from last month</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Unique Clicks</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(totalUniqueClicks)}</p>
              </div>
              <div className="text-3xl">👥</div>
            </div>
            <div className="mt-2 flex items-center text-green-600 text-sm">
              <span className="mr-1">↑</span>
              <span>8.3% from last month</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Avg. Conversion</p>
                <p className="text-3xl font-bold text-gray-900">{avgConversionRate.toFixed(1)}%</p>
              </div>
              <div className="text-3xl">🎯</div>
            </div>
            <div className="mt-2 flex items-center text-red-600 text-sm">
              <span className="mr-1">↓</span>
              <span>2.1% from last month</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Active Links</p>
                <p className="text-3xl font-bold text-gray-900">{links.length}</p>
              </div>
              <div className="text-3xl">🔗</div>
            </div>
            <div className="mt-2 flex items-center text-green-600 text-sm">
              <span className="mr-1">↑</span>
              <span>2 new this week</span>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search links..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
            >
              + Create Link
            </button>
          </div>
        </section>

        {/* Links Table */}
        <section className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Link Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Short Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLinks.map(link => (
                  <tr key={link.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLink(link)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-blue-600">{link.shortCode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 truncate max-w-xs" title={link.originalUrl}>
                        {link.originalUrl}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(link.clicks)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(link.uniqueClicks)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{link.conversionRate}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(link.status)}`}>
                        {link.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                      <button className="text-gray-600 hover:text-gray-900">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Analytics */}
        {selectedLink && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Referrers */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Referrers</h3>
              <div className="space-y-3">
                {selectedLink.referrers.map((referrer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">{referrer.source}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${referrer.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">{referrer.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Devices */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
              <div className="space-y-3">
                {selectedLink.devices.map((device, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getDeviceIcon(device.type)}</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">{device.type}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${device.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">{device.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h3>
              <div className="space-y-3">
                {selectedLink.locations.map((location, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{location.city}</div>
                      <div className="text-xs text-gray-500">{location.country}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${location.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">{location.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Series */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Click Trends</h3>
              <div className="space-y-3">
                {timeSeriesData.map((data, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{data.date}</span>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-xs text-gray-600">Total: {formatNumber(data.clicks)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-xs text-gray-600">Unique: {formatNumber(data.uniqueClicks)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
