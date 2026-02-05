// @bun/proxy/examples/table-examples.ts - Comprehensive table examples

import {
    TableBuilder,
    createConfigurationTable,
    createMetricsTable,
    createPaginatedView,
    createSimpleTable,
    exportTable,
    type TableData,
    type TableOptions
} from '../utils/table-builder.js';

// Example 1: Basic Table Display
export function basicTableExample(): string {
  const data = [
    { id: 1, name: "Alice", age: 25, active: true },
    { id: 2, name: "Bob", age: 30, active: false },
    { id: 3, name: "Charlie", age: 35, active: true }
  ];

  return createSimpleTable(data, {
    theme: 'dark',
    showBorder: true,
    zebra: true
  });
}

// Example 2: Advanced Configuration Table
export function configurationTableExample(): string {
  const configData = [
    {
      property: "listenHost",
      type: "string",
      required: false,
      default: '"0.0.0.0"',
      description: "Host to bind server to"
    },
    {
      property: "listenPort",
      type: "number",
      required: false,
      default: "8080",
      description: "Port to listen on"
    },
    {
      property: "targetUrl",
      type: "string",
      required: true,
      default: "-",
      description: "Backend WebSocket URL"
    },
    {
      property: "maxConnections",
      type: "number",
      required: false,
      default: "10000",
      description: "Maximum concurrent connections"
    },
    {
      property: "idleTimeout",
      type: "number",
      required: false,
      default: "60000",
      description: "Idle timeout in milliseconds"
    }
  ];

  return createConfigurationTable(configData, {
    theme: 'dark',
    showBorder: true,
    zebra: true,
    caption: 'Enhanced Proxy Configuration Properties'
  });
}

// Example 3: Protocol Status Dashboard
export function protocolDashboardExample(): string {
  const proxyConfigs = [
    {
      protocol: "HTTP",
      listenPort: 8080,
      maxConnections: 10000,
      compression: true,
      ssl: false,
      status: "active"
    },
    {
      protocol: "HTTPS",
      listenPort: 8443,
      maxConnections: 5000,
      compression: true,
      ssl: true,
      status: "active"
    },
    {
      protocol: "WebSocket",
      listenPort: 3000,
      maxConnections: 20000,
      compression: true,
      ssl: false,
      status: "connecting"
    },
    {
      protocol: "WSS",
      listenPort: 443,
      maxConnections: 10000,
      compression: true,
      ssl: true,
      status: "error"
    }
  ];

  const builder = new TableBuilder()
    .addColumn("protocol", "Protocol", "string", { width: 12 })
    .addColumn("listenPort", "Port", "number", { align: "right" })
    .addColumn("maxConnections", "Max Conn", "number", {
      format: (v: number) => v.toLocaleString(),
      align: "right"
    })
    .addColumn("compression", "Compression", "boolean", {
      format: (v: boolean) => v ? "✓ Enabled" : "✗ Disabled",
      align: "center"
    })
    .addColumn("ssl", "SSL/TLS", "boolean", {
      format: (v: boolean) => v ? "✓ Yes" : "✗ No",
      align: "center"
    })
    .addColumn("status", "Status", "badge", {
      format: (value: string) => {
        const colors: Record<string, string> = {
          active: "green",
          connecting: "orange",
          error: "red"
        };
        return { text: value, color: colors[value] || "gray" };
      },
      align: "center"
    });

  builder.addRows(proxyConfigs);

  return builder.render();
}

// Example 4: Real-time Metrics Table
export function metricsTableExample(): string {
  const metrics = [
    {
      metric: "Active Connections",
      value: 7542,
      unit: "connections",
      trend: "up",
      threshold: "10,000",
      status: "healthy"
    },
    {
      metric: "Avg Latency",
      value: 85,
      unit: "ms",
      trend: "down",
      threshold: "100ms",
      status: "good"
    },
    {
      metric: "Error Rate",
      value: 0.8,
      unit: "%",
      trend: "down",
      threshold: "1%",
      status: "good"
    },
    {
      metric: "Throughput",
      value: 15420,
      unit: "req/s",
      trend: "up",
      threshold: "10,000 req/s",
      status: "excellent"
    },
    {
      metric: "Memory Usage",
      value: 68.5,
      unit: "%",
      trend: "up",
      threshold: "80%",
      status: "warning"
    }
  ];

  return createMetricsTable(metrics, {
    theme: 'dark',
    showBorder: true,
    zebra: true,
    compact: true,
    caption: `Live Metrics - ${new Date().toLocaleTimeString()}`
  });
}

// Example 5: Custom Formatters
export function customFormattersExample(): string {
  const data = [
    {
      amount: 1234.56,
      progress: 75,
      timestamp: Date.now(),
      tags: ["urgent", "backend"],
      status: "connected",
      size: 1048576,
      duration: 300000,
      color: "#3B82F6"
    },
    {
      amount: 789.01,
      progress: 30,
      timestamp: Date.now() - 86400000,
      tags: ["monitoring"],
      status: "connecting",
      size: 2097152,
      duration: 150000,
      color: "#10B981"
    }
  ];

  const builder = new TableBuilder()
    .addColumn("amount", "Amount", "number", {
      format: (value: number) => `$${value.toFixed(2)}`,
      align: "right"
    })
    .addColumn("progress", "Progress", "number", {
      format: (value: number) => {
        const filled = "█".repeat(Math.floor(value / 10));
        const empty = "░".repeat(10 - Math.floor(value / 10));
        return `${filled}${empty} ${value}%`;
      }
    })
    .addColumn("timestamp", "Timestamp", "datetime", {
      format: (value: number) => new Date(value).toLocaleString()
    })
    .addColumn("tags", "Tags", "array", {
      format: (value: string[]) => value.map(tag => `#${tag}`).join(", ")
    })
    .addColumn("status", "Status", "badge", {
      format: (value: string) => {
        const colors: Record<string, string> = {
          connected: "green",
          connecting: "orange",
          disconnected: "red"
        };
        return { text: value, color: colors[value] || "gray" };
      }
    })
    .addColumn("size", "Size", "bytes", {
      align: "right"
    })
    .addColumn("duration", "Duration", "duration", {
      align: "right"
    })
    .addColumn("color", "Color", "color");

  builder.addRows(data);

  return builder.render();
}

// Example 6: Export to Different Formats
export function exportExamples(): { html: string; json: string; csv: string; markdown: string } {
  const data: TableData = {
    columns: [
      { key: "name", header: "Name", type: "string" },
      { key: "status", header: "Status", type: "badge" },
      { key: "version", header: "Version", type: "string" }
    ],
    rows: [
      { name: "HTTP Proxy", status: "Stable", version: "1.0" },
      { name: "HTTPS Proxy", status: "Stable", version: "1.0" },
      { name: "WebSocket Proxy", status: "Stable", version: "1.3.5" }
    ]
  };

  return {
    html: exportTable(data, 'html'),
    json: exportTable(data, 'json'),
    csv: exportTable(data, 'csv'),
    markdown: exportTable(data, 'markdown')
  };
}

// Example 7: Paginated Table Viewer
export function paginatedTableExample(): string {
  const largeDataset: TableData = {
    columns: [
      { key: "id", header: "ID", type: "integer" },
      { key: "name", header: "Name", type: "string" },
      { key: "status", header: "Status", type: "badge" },
      { key: "connections", header: "Connections", type: "number" },
      { key: "latency", header: "Latency", type: "duration" }
    ],
    rows: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Proxy Server ${i + 1}`,
      status: i % 3 === 0 ? "active" : i % 3 === 1 ? "connecting" : "error",
      connections: Math.floor(Math.random() * 10000),
      latency: Math.floor(Math.random() * 1000)
    }))
  };

  const page1 = createPaginatedView(largeDataset, 1, 10);

  const builder = new TableBuilder();
  builder.setOptions({ theme: 'dark', showBorder: true, zebra: true });

  return builder.renderCustomTable(page1, {});
}

// Example 8: Interactive Table Viewer Class
export class InteractiveTableViewer {
  private data: TableData;
  private options: TableOptions;
  private currentPage: number;
  private pageSize: number;

  constructor(data: TableData, options: TableOptions = {}) {
    this.data = data;
    this.options = options;
    this.currentPage = 1;
    this.pageSize = options.pageSize || 20;
  }

  render(): string {
    const paginatedData = this.getCurrentPage();
    const builder = new TableBuilder();
    builder.setOptions({ ...this.options, caption: this.getCaption() });

    return builder.renderCustomTable(paginatedData, {});
  }

  private getCurrentPage(): TableData {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return {
      columns: this.data.columns,
      rows: this.data.rows.slice(start, end)
    };
  }

  private getCaption(): string {
    const total = this.data.rows.length;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, total);
    return `Page ${this.currentPage} - Showing ${start}-${end} of ${total}`;
  }

  getControls(): string {
    return `
Controls:
← Previous Page | → Next Page | ↑ Sort Asc | ↓ Sort Desc | Q Quit
Current Page: ${this.currentPage} of ${Math.ceil(this.data.rows.length / this.pageSize)}
    `;
  }

  nextPage(): boolean {
    const maxPage = Math.ceil(this.data.rows.length / this.pageSize);
    if (this.currentPage < maxPage) {
      this.currentPage++;
      return true;
    }
    return false;
  }

  previousPage(): boolean {
    if (this.currentPage > 1) {
      this.currentPage--;
      return true;
    }
    return false;
  }
}

// Example 9: Performance Monitoring Dashboard
export function createPerformanceDashboard(): string {
  function getLiveMetrics(): TableData {
    return {
      columns: [
        { key: "metric", header: "Metric", type: "string" },
        { key: "value", header: "Value", type: "number", align: "right" },
        { key: "unit", header: "Unit", type: "string" },
        { key: "trend", header: "Trend", type: "badge" },
        { key: "threshold", header: "Threshold", type: "string", align: "right" },
        { key: "status", header: "Status", type: "badge" }
      ],
      rows: [
        {
          metric: "Active Connections",
          value: Math.floor(Math.random() * 10000),
          unit: "connections",
          trend: Math.random() > 0.5 ? "up" : "down",
          threshold: "10,000",
          status: Math.random() > 0.1 ? "healthy" : "warning"
        },
        {
          metric: "Avg Latency",
          value: Math.floor(Math.random() * 200),
          unit: "ms",
          trend: Math.random() > 0.5 ? "down" : "up",
          threshold: "100ms",
          status: Math.random() > 0.2 ? "good" : "warning"
        },
        {
          metric: "Error Rate",
          value: Math.random() * 5,
          unit: "%",
          trend: Math.random() > 0.5 ? "up" : "down",
          threshold: "1%",
          status: Math.random() > 0.3 ? "good" : "error"
        },
        {
          metric: "Throughput",
          value: Math.floor(Math.random() * 20000),
          unit: "req/s",
          trend: "up",
          threshold: "10,000 req/s",
          status: "excellent"
        }
      ]
    };
  }

  const metrics = getLiveMetrics();
  const builder = new TableBuilder();
  builder.setOptions({
    theme: 'dark',
    showBorder: true,
    zebra: true,
    compact: true,
    caption: `Live Metrics - ${new Date().toLocaleTimeString()}`
  });

  return builder.renderCustomTable(metrics, {});
}

// Example 10: Complete Configuration Display
export function completeConfigurationExample(): string {
  const configurations = [
    {
      category: "Server Configuration",
      properties: [
        { property: "listenHost", type: "string", required: false, default: "0.0.0.0", description: "Host to bind server to" },
        { property: "listenPort", type: "number", required: false, default: "8080", description: "Port to listen on" },
        { property: "serverName", type: "string", required: true, default: "-", description: "Server identifier" }
      ]
    },
    {
      category: "Connection Management",
      properties: [
        { property: "maxConnections", type: "number", required: false, default: "10000", description: "Maximum concurrent connections" },
        { property: "idleTimeout", type: "number", required: false, default: "60000", description: "Idle timeout in ms" },
        { property: "heartbeatInterval", type: "number", required: false, default: "30000", description: "Heartbeat interval in ms" }
      ]
    },
    {
      category: "Security",
      properties: [
        { property: "enableCors", type: "boolean", required: false, default: "true", description: "Enable CORS support" },
        { property: "authType", type: "string", required: false, default: "none", description: "Authentication type" },
        { property: "rateLimit", type: "number", required: false, default: "1000", description: "Requests per minute" }
      ]
    }
  ];

  let result = "Enhanced Bun Proxy Configuration\n\n";

  configurations.forEach(config => {
    result += `## ${config.category}\n\n`;
    result += createConfigurationTable(config.properties, {
      theme: 'dark',
      showBorder: true,
      zebra: true
    });
    result += "\n\n";
  });

  return result;
}

// Export all examples for easy access
export const examples = {
  basicTableExample,
  configurationTableExample,
  protocolDashboardExample,
  metricsTableExample,
  customFormattersExample,
  exportExamples,
  paginatedTableExample,
  InteractiveTableViewer,
  createPerformanceDashboard,
  completeConfigurationExample
};
