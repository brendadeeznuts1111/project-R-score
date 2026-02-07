/**
 * Dashboard Builder
 *
 * Declarative dashboard composition system:
 * - Widget-based architecture
 * - Layout management
 * - Theme integration
 * - Data binding
 * - Export capabilities
 */

import type {
  DashboardConfig,
  DashboardLayout,
  WidgetConfig,
  WidgetType,
  DataSource,
  ThemedComponentProps,
  ExportConfig,
  ExportFormat,
} from './types';
import { createDashboardConfig, createWidgetConfig, DEFAULT_BREAKPOINTS } from './types';
import type { ThemeName } from '../../themes/config/index';

// ==================== Component Registry ====================

export type ComponentRenderer = (props: Record<string, unknown>) => string;

interface ComponentDefinition {
  name: string;
  type: WidgetType;
  defaultProps: Record<string, unknown>;
  render: ComponentRenderer;
}

class ComponentRegistry {
  private components = new Map<string, ComponentDefinition>();

  register(def: ComponentDefinition): void {
    this.components.set(def.name, def);
  }

  get(name: string): ComponentDefinition | undefined {
    return this.components.get(name);
  }

  list(): ComponentDefinition[] {
    return Array.from(this.components.values());
  }

  listByType(type: WidgetType): ComponentDefinition[] {
    return this.list().filter(c => c.type === type);
  }
}

// ==================== Dashboard Builder Class ====================

export class DashboardBuilder {
  private config: DashboardConfig;
  private widgets: WidgetConfig[] = [];
  private layouts: Map<string, DashboardLayout> = new Map();
  private registry: ComponentRegistry;
  private dataBindings = new Map<string, DataSource>();

  constructor(config?: Partial<DashboardConfig>) {
    this.config = createDashboardConfig(config);
    this.registry = new ComponentRegistry();
    this.registerDefaultComponents();
  }

  // ==================== Configuration ====================

  setTheme(theme: ThemeName): this {
    this.config.theme = theme;
    return this;
  }

  setRefreshInterval(ms: number): this {
    this.config.refreshInterval = ms;
    return this;
  }

  enableLiveUpdates(): this {
    this.config.liveUpdates = true;
    return this;
  }

  disableLiveUpdates(): this {
    this.config.liveUpdates = false;
    return this;
  }

  setView(view: DashboardConfig['view']): this {
    this.config.view = view;
    return this;
  }

  // ==================== Widget Management ====================

  addWidget(
    type: WidgetType,
    title: string,
    position: { x: number; y: number; w: number; h: number },
    options: {
      dataSource?: DataSource;
      filters?: WidgetConfig['filters'];
      refreshInterval?: number;
    } = {}
  ): this {
    const widget: WidgetConfig = {
      id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      position,
      dataSource: options.dataSource || { type: 'api' },
      filters: options.filters,
      refreshInterval: options.refreshInterval,
      theme: this.config.theme,
    };

    this.widgets.push(widget);
    return this;
  }

  addStatsWidget(
    title: string,
    position: { x: number; y: number; w: number; h: number },
    options: {
      dataSource?: DataSource;
      metricKey?: string;
    } = {}
  ): this {
    return this.addWidget('stats', title, position, {
      dataSource: options.dataSource || {
        type: 'api',
        endpoint: `/api/metrics/${options.metricKey || 'default'}`,
      },
    });
  }

  addChartWidget(
    title: string,
    position: { x: number; y: number; w: number; h: number },
    options: {
      dataSource?: DataSource;
      chartType?: 'line' | 'bar' | 'pie';
    } = {}
  ): this {
    return this.addWidget('chart', title, position, {
      dataSource: options.dataSource || { type: 'api', endpoint: '/api/charts' },
    });
  }

  addTableWidget(
    title: string,
    position: { x: number; y: number; w: number; h: number },
    options: {
      dataSource?: DataSource;
      columns?: string[];
    } = {}
  ): this {
    return this.addWidget('table', title, position, {
      dataSource: options.dataSource || { type: 'api', endpoint: '/api/data' },
    });
  }

  addListWidget(
    title: string,
    position: { x: number; y: number; w: number; h: number },
    options: {
      dataSource?: DataSource;
    } = {}
  ): this {
    return this.addWidget('list', title, position, {
      dataSource: options.dataSource || { type: 'api', endpoint: '/api/list' },
    });
  }

  addTimelineWidget(
    title: string,
    position: { x: number; y: number; w: number; h: number },
    options: {
      dataSource?: DataSource;
    } = {}
  ): this {
    return this.addWidget('timeline', title, position, {
      dataSource: options.dataSource || { type: 'api', endpoint: '/api/timeline' },
    });
  }

  addGaugeWidget(
    title: string,
    position: { x: number; y: number; w: number; h: number },
    options: {
      dataSource?: DataSource;
      min?: number;
      max?: number;
    } = {}
  ): this {
    return this.addWidget('gauge', title, position, {
      dataSource: options.dataSource || { type: 'api', endpoint: '/api/metrics' },
    });
  }

  addCustomWidget(
    title: string,
    position: { x: number; y: number; w: number; h: number },
    options: {
      dataSource?: DataSource;
      component?: string;
    } = {}
  ): this {
    return this.addWidget('custom', title, position, {
      dataSource: options.dataSource,
    });
  }

  removeWidget(widgetId: string): this {
    this.widgets = this.widgets.filter(w => w.id !== widgetId);
    return this;
  }

  // ==================== Layout Management ====================

  saveLayout(name: string, columns = 12): this {
    this.layouts.set(name, {
      id: `layout-${Date.now()}`,
      name,
      widgets: [...this.widgets],
      columns,
      breakpoints: DEFAULT_BREAKPOINTS,
    });
    return this;
  }

  loadLayout(name: string): this {
    const layout = this.layouts.get(name);
    if (layout) {
      this.widgets = [...layout.widgets];
    }
    return this;
  }

  clearWidgets(): this {
    this.widgets = [];
    return this;
  }

  // ==================== Pre-built Dashboards ====================

  buildAdminDashboard(): this {
    this.clearWidgets();

    // Top row - Stats
    this.addStatsWidget('Total Revenue', { x: 0, y: 0, w: 3, h: 2 }, { metricKey: 'revenue' });
    this.addStatsWidget('Active Tickets', { x: 3, y: 0, w: 3, h: 2 }, { metricKey: 'tickets' });
    this.addStatsWidget('Active Barbers', { x: 6, y: 0, w: 3, h: 2 }, { metricKey: 'barbers' });
    this.addStatsWidget('Connections', { x: 9, y: 0, w: 3, h: 2 }, { metricKey: 'connections' });

    // Second row - Charts and Tables
    this.addChartWidget('Revenue Trend', { x: 0, y: 2, w: 8, h: 4 }, { chartType: 'line' });
    this.addListWidget('Active Barbers', { x: 8, y: 2, w: 4, h: 4 });

    // Third row - Timeline and Gauges
    this.addTimelineWidget('Recent Activity', { x: 0, y: 6, w: 6, h: 4 });
    this.addGaugeWidget('System Load', { x: 6, y: 6, w: 3, h: 4 });
    this.addGaugeWidget('Cache Hit Rate', { x: 9, y: 6, w: 3, h: 4 });

    return this;
  }

  buildClientDashboard(): this {
    this.clearWidgets();

    // Services
    this.addListWidget('Available Services', { x: 0, y: 0, w: 4, h: 6 });

    // Booking
    this.addTableWidget('Your Bookings', { x: 4, y: 0, w: 8, h: 4 });

    // Payment history
    this.addTableWidget('Payment History', { x: 4, y: 4, w: 8, h: 4 });

    return this;
  }

  buildBarberDashboard(): this {
    this.clearWidgets();

    // Stats
    this.addStatsWidget('My Earnings', { x: 0, y: 0, w: 4, h: 2 });
    this.addStatsWidget('Tickets Completed', { x: 4, y: 0, w: 4, h: 2 });
    this.addStatsWidget('Rating', { x: 8, y: 0, w: 4, h: 2 });

    // Current ticket
    this.addCustomWidget('Current Ticket', { x: 0, y: 2, w: 6, h: 4 });

    // Queue
    this.addListWidget('Queue', { x: 6, y: 2, w: 6, h: 4 });

    return this;
  }

  buildAnalyticsDashboard(): this {
    this.clearWidgets();

    // Revenue analytics
    this.addChartWidget('Revenue by Day', { x: 0, y: 0, w: 6, h: 4 }, { chartType: 'bar' });
    this.addChartWidget('Revenue by Service', { x: 6, y: 0, w: 6, h: 4 }, { chartType: 'pie' });

    // Performance metrics
    this.addTableWidget('Barber Performance', { x: 0, y: 4, w: 8, h: 6 });
    this.addGaugeWidget('Customer Satisfaction', { x: 8, y: 4, w: 4, h: 3 });
    this.addGaugeWidget('Repeat Rate', { x: 8, y: 7, w: 4, h: 3 });

    return this;
  }

  // ==================== Export ====================

  export(format: ExportFormat = 'json', options: Partial<ExportConfig> = {}): string {
    const config = this.build();

    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);

      case 'csv':
        return this.exportToCSV();

      case 'html':
        return this.exportToHTML();

      default:
        return JSON.stringify(config, null, 2);
    }
  }

  private exportToCSV(): string {
    const lines = ['Widget ID,Type,Title,Position X,Position Y,Width,Height'];
    for (const widget of this.widgets) {
      lines.push(
        `${widget.id},${widget.type},"${widget.title}",${widget.position.x},${widget.position.y},${widget.position.w},${widget.position.h}`
      );
    }
    return lines.join('\n');
  }

  private exportToHTML(): string {
    const widgetsHtml = this.widgets
      .map(
        w => `
      <div class="widget" data-id="${w.id}" data-type="${w.type}" style="
        grid-column: ${w.position.x + 1} / span ${w.position.w};
        grid-row: ${w.position.y + 1} / span ${w.position.h};
      ">
        <h3>${w.title}</h3>
        <div class="widget-content"></div>
      </div>
    `
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <title>Dashboard</title>
  <style>
    .dashboard { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1rem; }
    .widget { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; }
    .widget h3 { margin: 0 0 1rem 0; }
  </style>
</head>
<body>
  <div class="dashboard">
    ${widgetsHtml}
  </div>
</body>
</html>`;
  }

  // ==================== Build ====================

  build(): { config: DashboardConfig; widgets: WidgetConfig[]; layouts: DashboardLayout[] } {
    return {
      config: this.config,
      widgets: [...this.widgets],
      layouts: Array.from(this.layouts.values()),
    };
  }

  // ==================== Component Registration ====================

  private registerDefaultComponents(): void {
    // Stats component
    this.registry.register({
      name: 'stats',
      type: 'stats',
      defaultProps: { format: 'currency', trend: true },
      render: props => `<div class="stats-widget">${JSON.stringify(props)}</div>`,
    });

    // Chart component
    this.registry.register({
      name: 'chart',
      type: 'chart',
      defaultProps: { type: 'line', animate: true },
      render: props => `<div class="chart-widget">${JSON.stringify(props)}</div>`,
    });

    // Table component
    this.registry.register({
      name: 'table',
      type: 'table',
      defaultProps: { sortable: true, pagination: true },
      render: props => `<div class="table-widget">${JSON.stringify(props)}</div>`,
    });

    // List component
    this.registry.register({
      name: 'list',
      type: 'list',
      defaultProps: { itemHeight: 48 },
      render: props => `<div class="list-widget">${JSON.stringify(props)}</div>`,
    });

    // Timeline component
    this.registry.register({
      name: 'timeline',
      type: 'timeline',
      defaultProps: { groupBy: 'day' },
      render: props => `<div class="timeline-widget">${JSON.stringify(props)}</div>`,
    });

    // Gauge component
    this.registry.register({
      name: 'gauge',
      type: 'gauge',
      defaultProps: { min: 0, max: 100 },
      render: props => `<div class="gauge-widget">${JSON.stringify(props)}</div>`,
    });
  }
}

// ==================== Factory Functions ====================

export function createDashboard(config?: Partial<DashboardConfig>): DashboardBuilder {
  return new DashboardBuilder(config);
}

export function createAdminDashboard(): DashboardBuilder {
  return new DashboardBuilder({ view: 'admin', theme: 'professional' }).buildAdminDashboard();
}

export function createClientDashboard(): DashboardBuilder {
  return new DashboardBuilder({ view: 'client', theme: 'light' }).buildClientDashboard();
}

export function createBarberDashboard(): DashboardBuilder {
  return new DashboardBuilder({ view: 'barber', theme: 'dark' }).buildBarberDashboard();
}

export function createAnalyticsDashboard(): DashboardBuilder {
  return new DashboardBuilder({
    view: 'analytics',
    theme: 'professional',
  }).buildAnalyticsDashboard();
}

export default DashboardBuilder;
