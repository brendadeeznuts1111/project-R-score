/**
 * Dashboard System
 *
 * Unified dashboard exports:
 * - Types and interfaces
 * - Composition API (useDashboard)
 * - Dashboard builder
 * - Real-time sync engine
 */

// Types
export {
  // Core types
  type DashboardView,
  type DashboardMode,
  type DashboardConfig,
  type DashboardFeatures,
  type MetricValue,
  type MetricSeries,
  type DashboardMetrics,
  type UpdateType,
  type RealTimeUpdate,
  type UpdateSubscription,
  type WidgetType,
  type WidgetConfig,
  type DataSource,
  type DataSourceType,
  type FilterConfig,
  type DashboardLayout,
  type LayoutBreakpoints,
  type ConnectionInfo,
  type BarberInfo,
  type BarberMetrics,
  type TicketInfo,
  type ServiceInfo,
  type OrderInfo,
  type OrderItem,
  type TelemetryEvent,
  type ThemedComponentProps,
  type DashboardApiResponse,
  type PaginatedResponse,
  type WebSocketMessage,
  type WebSocketMessageType,
  type CacheConfig,
  type CacheEntry,
  type ExportConfig,
  type ExportFormat,

  // Constants and helpers
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_BREAKPOINTS,
  createDashboardConfig,
  createWidgetConfig,
  isStale,
  calculateTrend,
} from './types';

// Composition API
export {
  useDashboard,
  useMetrics,
  useWidgets,
  useTheme,
  type UseDashboardReturn,
} from './composables/useDashboard';

// Dashboard Builder
export {
  DashboardBuilder,
  createDashboard,
  createAdminDashboard,
  createClientDashboard,
  createBarberDashboard,
  createAnalyticsDashboard,
  type ComponentRenderer,
  type ComponentDefinition,
} from './builder';

// Sync Engine
export {
  SyncEngine,
  createSyncEngine,
  createBroadcastSync,
  type SyncStatus,
  type SyncStrategy,
  type SyncConfig,
  type SyncState,
  type SyncMessage,
  type PresenceInfo,
  type ConflictResolution,
  DEFAULT_SYNC_CONFIG,
} from './sync';

// ==================== Convenience Exports ====================

export function createLiveDashboard(
  view: 'admin' | 'client' | 'barber' | 'analytics',
  options: {
    theme?: import('../../themes/config/index').ThemeName;
    channel?: string;
    autoConnect?: boolean;
  } = {}
) {
  const { DashboardBuilder } = require('./builder');
  const { SyncEngine } = require('./sync');

  // Create builder based on view
  let builder: DashboardBuilder;
  switch (view) {
    case 'admin':
      builder = new DashboardBuilder({
        view,
        theme: options.theme || 'professional',
      }).buildAdminDashboard();
      break;
    case 'client':
      builder = new DashboardBuilder({
        view,
        theme: options.theme || 'light',
      }).buildClientDashboard();
      break;
    case 'barber':
      builder = new DashboardBuilder({
        view,
        theme: options.theme || 'dark',
      }).buildBarberDashboard();
      break;
    case 'analytics':
      builder = new DashboardBuilder({
        view,
        theme: options.theme || 'professional',
      }).buildAnalyticsDashboard();
      break;
    default:
      builder = new DashboardBuilder({ view, theme: options.theme || 'professional' });
  }

  // Create sync engine
  const sync = new SyncEngine({
    channel: options.channel || `dashboard:${view}`,
    autoConnect: options.autoConnect !== false,
  });

  return {
    builder,
    sync,
    dashboard: builder.build(),
    connect: () => sync.connect(),
    disconnect: () => sync.disconnect(),
  };
}

// ==================== Version ====================

export const DASHBOARD_SYSTEM_VERSION = '2.0.0';
