import React from "react";
import { Server, Activity, AlertTriangle, TrendingUp, Globe } from "lucide-react";

import { useProxyData } from "../../hooks/useProxyData";
import { EnvironmentHub } from "../../components/EnvironmentHub";

export const OverviewPage: React.FC = () => {
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
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const stats = [
    {
      name: "Total Proxies",
      value: data.stats.total_proxies,
      icon: Server,
      color: "bg-blue-500",
      change: "+2 from last month",
      changeType: "positive"
    },
    {
      name: "Active Proxies",
      value: data.stats.active_proxies,
      icon: Activity,
      color: "bg-green-500",
      change: "+1 from last week",
      changeType: "positive"
    },
    {
      name: "Expiring Soon",
      value: data.stats.expiring_soon,
      icon: AlertTriangle,
      color: "bg-yellow-500",
      change: "Action required",
      changeType: "warning"
    },
    {
      name: "Account Balance",
      value: `$${data.account.balance}`,
      icon: TrendingUp,
      color: "bg-purple-500",
      change: "+$25 this month",
      changeType: "positive"
    }
  ];

  const trafficUsage = (data.stats.traffic_used / data.stats.traffic_limit) * 100;

  return (
    <div className="space-y-6">
      {/* Deployment Environments */}
      <EnvironmentHub />

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back! Here's what's happening with your proxies today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                        <div
                          className={`ml-2 flex items-baseline text-sm font-semibold ${
                            stat.changeType === "positive"
                              ? "text-green-600"
                              : stat.changeType === "warning"
                                ? "text-yellow-600"
                                : "text-gray-600"
                          }`}
                        >
                          {stat.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Traffic Usage */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Traffic Usage</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Used</span>
              <span className="font-medium">{trafficUsage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(trafficUsage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{(data.stats.traffic_used / 1024 / 1024).toFixed(2)} MB used</span>
              <span>{(data.stats.traffic_limit / 1024 / 1024).toFixed(2)} MB total</span>
            </div>
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Countries</h3>
          <div className="space-y-3">
            {data.stats.countries.slice(0, 5).map((country) => (
              <div key={country.country} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{country.country}</span>
                </div>
                <span className="text-sm text-gray-500">{country.count} proxies</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {data.recent_orders.slice(0, 3).map((order) => (
            <div key={order.order_id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Order #{order.order_id}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">${order.total}</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
