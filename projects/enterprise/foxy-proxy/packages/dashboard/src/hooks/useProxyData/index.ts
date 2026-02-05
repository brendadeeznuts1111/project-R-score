import { useState, useEffect } from "react";

import IPFoxyAPI from "../../utils/api";
import { mockDashboardData } from "../../utils/mockData";
import type { DashboardData, OrderInfo } from "../../types/proxy";

export const useProxyData = (apiToken?: string, apiId?: string) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // For development, use mock data if no credentials provided
        if (!apiToken || !apiId) {
          setData(mockDashboardData);
        } else {
          const api = new IPFoxyAPI(apiToken, apiId);
          const [account, proxies, recentOrders] = await Promise.all([
            api.getAccountInfo(),
            api.getProxyList(),
            // Mock recent orders for now
            Promise.resolve(mockDashboardData.recent_orders)
          ]);

          const stats = {
            total_proxies: proxies.length,
            active_proxies: proxies.filter((p) => p.status === "active").length,
            expired_proxies: proxies.filter((p) => p.status === "expired").length,
            expiring_soon: proxies.filter((p) => p.status === "expiring").length,
            traffic_used: account.traffic_used || 0,
            traffic_limit: account.traffic_limit || 0,
            countries: proxies.reduce(
              (acc, proxy) => {
                const country = proxy.country || "Unknown";
                const existing = acc.find((c) => c.country === country);
                if (existing) {
                  existing.count++;
                } else {
                  acc.push({ country, count: 1 });
                }
                return acc;
              },
              [] as Array<{ country: string; count: number }>
            ),
            types: proxies.reduce(
              (acc, proxy) => {
                const type = proxy.type || "Unknown";
                const existing = acc.find((t) => t.type === type);
                if (existing) {
                  existing.count++;
                } else {
                  acc.push({ type, count: 1 });
                }
                return acc;
              },
              [] as Array<{ type: string; count: number }>
            )
          };

          setData({
            account,
            proxies,
            stats,
            recent_orders: recentOrders as OrderInfo[]
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiToken, apiId, refreshKey]);

  const refetch = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return { data, loading, error, refetch };
};
