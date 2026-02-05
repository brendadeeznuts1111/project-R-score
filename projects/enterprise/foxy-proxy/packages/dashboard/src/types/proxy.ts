export interface ProxyRegion {
  id: string;
  ip_type: "STATIC_DATACENTER" | "STATIC_ISP" | "ROTATING_RESIDENTIAL";
  status: string;
  ip_version: "IPv4" | "IPv6";
  country: string;
  country_code: string;
  region: string;
}

export interface ProxyInfo {
  id: string;
  status: string;
  type: string;
  expires: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  country?: string;
  region?: string;
  created_at?: string;
  last_used?: string;
  traffic_used?: number;
  traffic_limit?: number;
}

export interface AccountInfo {
  id: string;
  email: string;
  balance: string;
  status: string;
  total_proxies?: number;
  active_proxies?: number;
  expired_proxies?: number;
  traffic_used?: number;
  traffic_limit?: number;
}

export interface OrderInfo {
  order_id: string;
  status: string;
  total: string;
  created_at: string;
  proxies: ProxyInfo[];
  type: "NEW" | "EXTEND";
}

export interface ProxyStats {
  total_proxies: number;
  active_proxies: number;
  expired_proxies: number;
  expiring_soon: number;
  traffic_used: number;
  traffic_limit: number;
  countries: Array<{
    country: string;
    count: number;
  }>;
  types: Array<{
    type: string;
    count: number;
  }>;
}

export interface DashboardData {
  account: AccountInfo;
  proxies: ProxyInfo[];
  stats: ProxyStats;
  recent_orders: OrderInfo[];
}
