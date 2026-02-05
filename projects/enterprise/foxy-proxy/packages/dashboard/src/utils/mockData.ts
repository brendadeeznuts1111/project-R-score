import type { DashboardData, ProxyInfo, AccountInfo, OrderInfo, ProxyStats } from "../types/proxy";

export const mockAccountInfo: AccountInfo = {
  id: "12345",
  email: "user@example.com",
  balance: "125.50",
  status: "active",
  total_proxies: 25,
  active_proxies: 18,
  expired_proxies: 7,
  traffic_used: 1024000,
  traffic_limit: 10240000
};

export const mockProxies: ProxyInfo[] = [
  {
    id: "proxy1",
    status: "active",
    type: "STATIC_DATACENTER",
    expires: "2024-12-31",
    ip: "192.168.1.1",
    port: 8080,
    username: "user1",
    password: "pass1",
    country: "United States",
    region: "Zone D",
    created_at: "2024-01-15",
    last_used: "2024-01-20",
    traffic_used: 512000,
    traffic_limit: 1024000
  },
  {
    id: "proxy2",
    status: "active",
    type: "STATIC_ISP",
    expires: "2024-11-30",
    ip: "192.168.1.2",
    port: 8080,
    username: "user2",
    password: "pass2",
    country: "Germany",
    region: "Berlin",
    created_at: "2024-01-10",
    last_used: "2024-01-19",
    traffic_used: 256000,
    traffic_limit: 512000
  },
  {
    id: "proxy3",
    status: "expiring",
    type: "ROTATING_RESIDENTIAL",
    expires: "2024-02-01",
    ip: "192.168.1.3",
    port: 8080,
    username: "user3",
    password: "pass3",
    country: "United Kingdom",
    region: "London",
    created_at: "2024-01-05",
    last_used: "2024-01-18",
    traffic_used: 128000,
    traffic_limit: 256000
  }
];

export const mockStats: ProxyStats = {
  total_proxies: 25,
  active_proxies: 18,
  expired_proxies: 7,
  expiring_soon: 3,
  traffic_used: 1024000,
  traffic_limit: 10240000,
  countries: [
    { country: "United States", count: 8 },
    { country: "Germany", count: 5 },
    { country: "United Kingdom", count: 4 },
    { country: "France", count: 3 },
    { country: "Netherlands", count: 2 }
  ],
  types: [
    { type: "STATIC_DATACENTER", count: 12 },
    { type: "STATIC_ISP", count: 8 },
    { type: "ROTATING_RESIDENTIAL", count: 5 }
  ]
};

export const mockRecentOrders: OrderInfo[] = [
  {
    order_id: "order123",
    status: "completed",
    total: "25.00",
    created_at: "2024-01-15",
    type: "NEW",
    proxies: []
  },
  {
    order_id: "order124",
    status: "completed",
    total: "15.00",
    created_at: "2024-01-10",
    type: "EXTEND",
    proxies: []
  }
];

export const mockDashboardData: DashboardData = {
  account: mockAccountInfo,
  proxies: mockProxies,
  stats: mockStats,
  recent_orders: mockRecentOrders
};
