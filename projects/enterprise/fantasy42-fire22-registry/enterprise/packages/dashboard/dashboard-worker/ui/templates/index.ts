/**
 * UI Templates Index
 * Main export file for all UI templates
 */

// API Templates
export { generateApiDashboardPage } from './api-dashboard';
export { generateApiEndpointsPage } from './api-endpoints';
export { generateApiMonitoringPage } from './api-monitoring';
export { generateApiLogsPage } from './api-logs';
export { generateApiSecurityPage } from './api-security';

// Shared utilities
export * from './api-shared';

// Re-export for backward compatibility
export { generateApiPage } from './api-main';
