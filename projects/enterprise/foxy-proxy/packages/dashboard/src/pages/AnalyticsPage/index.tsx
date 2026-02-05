import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { TrendingUp, Globe, Server, Activity } from "lucide-react";

import { useProxyData } from "../../hooks/useProxyData";

export const AnalyticsPage: React.FC = () => {
  const { data, loading, error } = useProxyData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <TrendingUp className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Mock data for charts
  const trafficData = [
    { name: "Mon", traffic: 4000, requests: 240 },
    { name: "Tue", traffic: 3000, requests: 139 },
    { name: "Wed", traffic: 2000, requests: 380 },
    { name: "Thu", traffic: 2780, requests: 390 },
    { name: "Fri", traffic: 1890, requests: 480 },
    { name: "Sat", traffic: 2390, requests: 380 },
    { name: "Sun", traffic: 3490, requests: 430 }
  ];

  const performanceData = [
    { name: "Jan", responseTime: 120, uptime: 99.9 },
    { name: "Feb", responseTime: 115, uptime: 99.8 },
    { name: "Mar", responseTime: 108, uptime: 99.9 },
    { name: "Apr", responseTime: 112, uptime: 99.7 },
    { name: "May", responseTime: 105, uptime: 99.9 },
    { name: "Jun", responseTime: 98, uptime: 100 }
  ];

  const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Insights</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor your proxy performance and usage patterns
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Avg Response Time</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">98ms</div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    -5% from last week
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Uptime</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">99.9%</div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    +0.1% from last month
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
              <Server className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">2.4M</div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    +12% from last week
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Countries</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {data.stats.countries.length}
                  </div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-600">
                    Active locations
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Traffic Overview */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Traffic</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="traffic" fill="#3b82f6" />
              <Bar dataKey="requests" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="responseTime" fill="#10b981" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="uptime"
                stroke="#f59e0b"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Country Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Proxy Distribution by Country</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.stats.countries}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.stats.countries.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Type Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Proxy Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.stats.types}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name.replace("_", " ")} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.stats.types.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
