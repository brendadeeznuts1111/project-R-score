function envPort(key: string, defaultPort: number): number {
  const val = process.env[key];
  if (!val) return defaultPort;
  const parsed = parseInt(val, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    console.warn(`Invalid port for ${key}: "${val}", falling back to ${defaultPort}`);
    return defaultPort;
  }
  return parsed;
}

export const PORTS = {
  DOCS_SERVER: envPort('DOCS_SERVER_PORT', 3000),
  PAYMENT_SERVER: envPort('PAYMENT_SERVER_PORT', 3001),
  P2P_PROXY: envPort('P2P_PROXY_PORT', 3002),
  CONTENT_TYPE_SERVER: envPort('CONTENT_TYPE_SERVER_PORT', 3003),
  DASHBOARD: envPort('DASHBOARD_PORT', 3456),
  FILTER_DASHBOARD: envPort('FILTER_DASHBOARD_PORT', 4000),
  REDIS: envPort('REDIS_PORT', 6379),
  FRONTEND: envPort('FRONTEND_PORT', 5173),
  INTEGRATION_SERVER: envPort('INTEGRATION_SERVER_PORT', 8080),
  DEV_HUB: envPort('DEV_HUB_PORT', 8123),
  SERVER: envPort('SERVER_PORT', 3000),
} as const;

export const REDIS_URL = process.env.REDIS_URL || `redis://localhost:${PORTS.REDIS}`;
export const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
