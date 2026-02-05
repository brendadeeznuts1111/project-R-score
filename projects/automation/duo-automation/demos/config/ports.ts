/**
 * Centralized Port Configuration
 * Environment-based port management for all services
 */

export interface PortConfig {
  webServer: number;
  redis: number;
  storageDashboard: number;
  analyticsDashboard: number;
  adminDashboard: number;
  metricsDashboard: number;
  systemDashboard: number;
  cashappDashboard: number;
  empireCommandDashboard: number;
  tokenManagementDashboard: number;
  enhancedDashboard: number;
  postgres: number;
  imapSsl: number;
  smtp: number;
  smtpSsl: number;
  otlp: number;
  deviceEndpoint: number;
}

export const getDefaultPorts = (): PortConfig => ({
  webServer: 8080,
  redis: 6379,
  storageDashboard: 3004,
  analyticsDashboard: 3005,
  adminDashboard: 3006,
  metricsDashboard: 3001,
  systemDashboard: 3000,
  cashappDashboard: 3007,
  empireCommandDashboard: 3008,
  tokenManagementDashboard: 3009,
  enhancedDashboard: 3010,
  postgres: 5432,
  imapSsl: 993,
  smtp: 587,
  smtpSsl: 465,
  otlp: 4318,
  deviceEndpoint: 26689,
});

export const getPorts = (): PortConfig => ({
  webServer: parseInt(process.env.WEB_SERVER_PORT || '8080'),
  redis: parseInt(process.env.REDIS_PORT || '6379'),
  storageDashboard: parseInt(process.env.STORAGE_DASHBOARD_PORT || '3004'),
  analyticsDashboard: parseInt(process.env.ANALYTICS_DASHBOARD_PORT || '3005'),
  adminDashboard: parseInt(process.env.ADMIN_DASHBOARD_PORT || '3006'),
  metricsDashboard: parseInt(process.env.METRICS_DASHBOARD_PORT || '3001'),
  systemDashboard: parseInt(process.env.SYSTEM_DASHBOARD_PORT || '3000'),
  cashappDashboard: parseInt(process.env.CASHAPP_DASHBOARD_PORT || '3007'),
  empireCommandDashboard: parseInt(process.env.EMPIRE_COMMAND_DASHBOARD_PORT || '3008'),
  tokenManagementDashboard: parseInt(process.env.TOKEN_MANAGEMENT_DASHBOARD_PORT || '3009'),
  enhancedDashboard: parseInt(process.env.ENHANCED_DASHBOARD_PORT || '3010'),
  postgres: parseInt(process.env.POSTGRES_PORT || '5432'),
  imapSsl: parseInt(process.env.IMAP_SSL_PORT || '993'),
  smtp: parseInt(process.env.SMTP_PORT || '587'),
  smtpSsl: parseInt(process.env.SMTP_SSL_PORT || '465'),
  otlp: parseInt(process.env.OTLP_PORT || '4318'),
  deviceEndpoint: parseInt(process.env.DEVICE_ENDPOINT_PORT || '26689'),
});

export const getPortUrl = (serviceName: keyof PortConfig, path = ''): string => {
  const ports = getPorts();
  const port = ports[serviceName];
  const host = process.env.HOST || 'localhost';
  return `http://${host}:${port}${path}`;
};

export const validatePorts = (ports: PortConfig): boolean => {
  return Object.values(ports).every(port => 
    Number.isInteger(port) && port > 0 && port < 65536
  );
};

export const getPortConflicts = (ports: PortConfig): string[] => {
  const portValues = Object.values(ports);
  const conflicts: string[] = [];
  
  const seen = new Set<number>();
  portValues.forEach((port, index) => {
    if (seen.has(port)) {
      const serviceName = Object.keys(ports)[index] as keyof PortConfig;
      conflicts.push(serviceName);
    }
    seen.add(port);
  });
  
  return conflicts;
};
