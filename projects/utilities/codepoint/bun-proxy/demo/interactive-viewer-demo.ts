// @bun/proxy/demo/interactive-viewer-demo.ts - Enhanced Interactive table viewer demonstration

import {
  InteractiveTableViewer,
  type TableData
} from '../src/utils/index.js';
import { inspect } from 'bun';

// Demo 1: Enhanced Interactive Viewer with Real-time Features
console.log("=== Demo 1: Enhanced Interactive Table Viewer ===");

// Enhanced data with more realistic service statuses and metrics
const enhancedData: TableData = {
  columns: [
    {
      key: "name",
      header: "Service Name",
      type: "string",
      align: 'left',
      width: 20
    },
    {
      key: "status",
      header: "Status",
      type: "badge",
      align: 'center',
      width: 12
    },
    {
      key: "connections",
      header: "Connections",
      type: "number",
      align: 'right',
      width: 12,
      format: (value: number) => value.toLocaleString()
    },
    {
      key: "latency",
      header: "Latency",
      type: "duration",
      align: 'right',
      width: 10
    },
    {
      key: "uptime",
      header: "Uptime",
      type: "duration",
      align: 'right',
      width: 15
    },
    {
      key: "cpu",
      header: "CPU %",
      type: "percentage",
      align: 'right',
      width: 8
    },
    {
      key: "memory",
      header: "Memory",
      type: "string",
      align: 'right',
      width: 10,
      format: (value: number) => `${(value / 1024 / 1024).toFixed(1)}MB`
    },
    {
      key: "version",
      header: "Version",
      type: "string",
      align: 'center',
      width: 10
    },
    {
      key: "lastHealthCheck",
      header: "Last Check",
      type: "datetime",
      align: 'right',
      width: 12
    }
  ],
  rows: [
    {
      name: "HTTP Proxy",
      status: "active",
      connections: 1234,
      latency: 45000,
      uptime: 86400000,
      cpu: 45.2,
      memory: 256000000,
      version: "1.2.0",
      lastHealthCheck: Date.now() - 30000
    },
    {
      name: "HTTPS Proxy",
      status: "active",
      connections: 892,
      latency: 78000,
      uptime: 172800000,
      cpu: 38.7,
      memory: 198000000,
      version: "1.2.0",
      lastHealthCheck: Date.now() - 45000
    },
    {
      name: "WebSocket Proxy",
      status: "connecting",
      connections: 567,
      latency: 120000,
      uptime: 3600000,
      cpu: 12.3,
      memory: 89000000,
      version: "1.3.5",
      lastHealthCheck: Date.now() - 120000
    },
    {
      name: "SOCKS5 Proxy",
      status: "error",
      connections: 0,
      latency: 5000000,
      uptime: 0,
      cpu: 0,
      memory: 0,
      version: "1.1.0",
      lastHealthCheck: Date.now() - 300000
    },
    {
      name: "API Gateway",
      status: "healthy",
      connections: 3456,
      latency: 25000,
      uptime: 259200000,
      cpu: 67.8,
      memory: 512000000,
      version: "2.1.0",
      lastHealthCheck: Date.now() - 15000
    },
    {
      name: "Auth Service",
      status: "healthy",
      connections: 2341,
      latency: 35000,
      uptime: 604800000,
      cpu: 23.4,
      memory: 128000000,
      version: "1.8.3",
      lastHealthCheck: Date.now() - 20000
    },
    {
      name: "Data Service",
      status: "degraded",
      connections: 1890,
      latency: 450000,
      uptime: 432000000,
      cpu: 89.1,
      memory: 1024000000,
      version: "3.0.1",
      lastHealthCheck: Date.now() - 180000
    },
    {
      name: "Cache Service",
      status: "healthy",
      connections: 5678,
      latency: 15000,
      uptime: 1209600000,
      cpu: 15.6,
      memory: 256000000,
      version: "2.5.2",
      lastHealthCheck: Date.now() - 10000
    },
    {
      name: "Message Queue",
      status: "warning",
      connections: 1234,
      latency: 180000,
      uptime: 86400000,
      cpu: 78.9,
      memory: 345000000,
      version: "1.4.0",
      lastHealthCheck: Date.now() - 90000
    },
    {
      name: "Load Balancer",
      status: "healthy",
      connections: 8901,
      latency: 20000,
      uptime: 2592000000,
      cpu: 34.5,
      memory: 167000000,
      version: "2.0.1",
      lastHealthCheck: Date.now() - 5000
    },
    {
      name: "Database Service",
      status: "healthy",
      connections: 4567,
      latency: 55000,
      uptime: 3153600000,
      cpu: 56.7,
      memory: 2048000000,
      version: "4.2.0",
      lastHealthCheck: Date.now() - 25000
    },
    {
      name: "Storage Service",
      status: "active",
      connections: 2345,
      latency: 85000,
      uptime: 172800000,
      cpu: 41.2,
      memory: 890000000,
      version: "3.1.0",
      lastHealthCheck: Date.now() - 35000
    },
    {
      name: "Logging Service",
      status: "healthy",
      connections: 7890,
      latency: 12000,
      uptime: 2592000000,
      cpu: 29.8,
      memory: 456000000,
      version: "1.6.0",
      lastHealthCheck: Date.now() - 8000
    },
    {
      name: "Monitoring Service",
      status: "healthy",
      connections: 1234,
      latency: 18000,
      uptime: 604800000,
      cpu: 19.3,
      memory: 98000000,
      version: "2.3.0",
      lastHealthCheck: Date.now() - 12000
    },
    {
      name: "Config Service",
      status: "active",
      connections: 567,
      latency: 25000,
      uptime: 86400000,
      cpu: 8.7,
      memory: 45000000,
      version: "1.2.0",
      lastHealthCheck: Date.now() - 40000
    },
    {
      name: "Search Service",
      status: "maintenance",
      connections: 0,
      latency: 0,
      uptime: 0,
      cpu: 0,
      memory: 0,
      version: "1.0.0",
      lastHealthCheck: Date.now() - 600000
    },
    {
      name: "Email Service",
      status: "healthy",
      connections: 345,
      latency: 95000,
      uptime: 432000000,
      cpu: 11.2,
      memory: 67000000,
      version: "2.0.1",
      lastHealthCheck: Date.now() - 55000
    },
    {
      name: "Analytics Service",
      status: "degraded",
      connections: 789,
      latency: 340000,
      uptime: 86400000,
      cpu: 92.3,
      memory: 1567000000,
      version: "3.2.0",
      lastHealthCheck: Date.now() - 240000
    }
  ]
};

// Create enhanced viewer with custom options
const enhancedViewer = new InteractiveTableViewer(enhancedData, {
  theme: 'dark',
  showBorder: true,
  zebra: true,
  pageSize: 6,
  caption: '🚀 Enhanced Proxy Services Dashboard - Real-time Monitoring'
});

// Add real-time data simulation
let updateInterval: any = null;

function simulateRealTimeUpdates() {
  console.log("\n🔄 Starting real-time data simulation...");
  console.log("💡 Services will update automatically every 3 seconds");
  console.log("⏹️  Press Ctrl+C to stop simulation\n");

  updateInterval = setInterval(() => {
    // Randomly update some service metrics
    const randomIndex = Math.floor(Math.random() * enhancedData.rows.length);
    const service = enhancedData.rows[randomIndex];

    // Update connections
    const connectionChange = Math.floor(Math.random() * 200) - 100;
    service.connections = Math.max(0, service.connections + connectionChange);

    // Update latency
    const latencyChange = Math.floor(Math.random() * 10000) - 5000;
    service.latency = Math.max(1000, service.latency + latencyChange);

    // Update CPU
    const cpuChange = (Math.random() * 10) - 5;
    service.cpu = Math.max(0, Math.min(100, service.cpu + cpuChange));

    // Update last health check
    service.lastHealthCheck = Date.now();

    // Occasionally change status
    if (Math.random() < 0.1) {
      const statuses = ["active", "healthy", "degraded", "warning", "error"];
      const currentStatus = service.status;
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      if (newStatus !== currentStatus) {
        service.status = newStatus;
        console.log(`🔄 Status changed for ${service.name}: ${currentStatus} → ${newStatus}`);
      }
    }

    // Re-render the viewer
    enhancedViewer.render();
  }, 3000);
}

// Enhanced interactive demo
function runInteractiveDemo() {
  console.log("🎯 Welcome to the Enhanced Interactive Table Viewer Demo!");
  console.log("📊 This demo showcases real-time service monitoring with interactive controls");
  console.log("🎮 Use keyboard controls to navigate and interact with the data\n");

  // Show initial view
  enhancedViewer.render();

  // Start real-time updates after a brief pause
  setTimeout(() => {
    simulateRealTimeUpdates();
  }, 2000);

  // Handle cleanup on exit
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).process) {
      (globalThis as any).process.on('SIGINT', () => {
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
        console.log("\n\n👋 Demo stopped. Thanks for trying the Enhanced Interactive Table Viewer!");
        if (typeof globalThis !== 'undefined' && (globalThis as any).process) {
          (globalThis as any).process.exit(0);
        }
      });
    }
  } catch (error) {
    // Process not available, continue without signal handling
  }

  // Demonstrate different features automatically
  setTimeout(() => {
    console.log("\n🔍 Auto-filtering to show only 'healthy' services...");
    enhancedViewer.setFilter('healthy');
  }, 8000);

  setTimeout(() => {
    console.log("\n📊 Auto-sorting by CPU usage (descending)...");
    enhancedViewer.setSortColumn('cpu');
  }, 15000);

  setTimeout(() => {
    console.log("\n🔄 Clearing filter to show all services...");
    enhancedViewer.setFilter('');
  }, 22000);

  setTimeout(() => {
    console.log("\n📈 Auto-sorting by connections (descending)...");
    enhancedViewer.setSortColumn('connections');
  }, 29000);
}

// Run the enhanced demo
runInteractiveDemo();

console.log("\n=== Demo 2: Factory Methods ===");

// Demo using factory methods
const proxyServers = [
  {
    name: "HTTP Proxy",
    status: "active",
    connections: 1234,
    latency: 45000,
    uptime: 86400000,
    version: "1.2.0"
  },
  {
    name: "HTTPS Proxy",
    status: "active",
    connections: 892,
    latency: 78000,
    uptime: 172800000,
    version: "1.2.0"
  },
  {
    name: "WebSocket Proxy",
    status: "connecting",
    connections: 567,
    latency: 120000,
    uptime: 3600000,
    version: "1.3.5"
  }
];

const proxyViewer = InteractiveTableViewer.forProxyServers(proxyServers, {
  theme: 'dark',
  pageSize: 5
});

console.log("Proxy Servers Viewer:");
proxyViewer.render();

const metrics = [
  {
    metric: "Active Connections",
    value: 7542,
    unit: "connections",
    status: "healthy",
    threshold: "10,000"
  },
  {
    metric: "Average Latency",
    value: 85,
    unit: "ms",
    status: "good",
    threshold: "100ms"
  },
  {
    metric: "Error Rate",
    value: 0.8,
    unit: "%",
    status: "excellent",
    threshold: "1%"
  },
  {
    metric: "Throughput",
    value: 15420,
    unit: "req/s",
    status: "excellent",
    threshold: "10,000 req/s"
  },
  {
    metric: "Memory Usage",
    value: 68.5,
    unit: "%",
    status: "warning",
    threshold: "80%"
  },
  {
    metric: "CPU Usage",
    value: 45.2,
    unit: "%",
    status: "good",
    threshold: "70%"
  }
];

const metricsViewer = InteractiveTableViewer.forMetrics(metrics, {
  theme: 'dark',
  pageSize: 4
});

console.log("\nMetrics Viewer:");
metricsViewer.render();

const config = [
  {
    property: "listenHost",
    type: "string",
    required: false,
    default: "0.0.0.0",
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
  },
  {
    property: "enableCors",
    type: "boolean",
    required: false,
    default: "true",
    description: "Enable CORS support"
  }
];

const configViewer = InteractiveTableViewer.forConfiguration(config, {
  theme: 'dark',
  pageSize: 3
});

console.log("\nConfiguration Viewer:");
configViewer.render();

console.log("\n=== Demo 3: Advanced Features ===");

// Demo with custom formatting
const advancedData: TableData = {
  columns: [
    { key: "service", header: "Service", type: "string" },
    { key: "status", header: "Status", type: "badge" },
    { key: "health", header: "Health", type: "number" },
    { key: "responseTime", header: "Response Time", type: "duration" },
    { key: "successRate", header: "Success Rate", type: "percentage" },
    { key: "lastRestart", header: "Last Restart", type: "datetime" },
    { key: "alerts", header: "Alerts", type: "badge" }
  ],
  rows: [
    {
      service: "API Gateway",
      status: "healthy",
      health: 95,
      responseTime: 120,
      successRate: 99.2,
      lastRestart: Date.now() - 86400000,
      alerts: 2
    },
    {
      service: "Auth Service",
      status: "healthy",
      health: 88,
      responseTime: 250,
      successRate: 97.8,
      lastRestart: Date.now() - 172800000,
      alerts: 5
    },
    {
      service: "Data Service",
      status: "degraded",
      health: 76,
      responseTime: 450,
      successRate: 94.5,
      lastRestart: Date.now() - 3600000,
      alerts: 12
    },
    {
      service: "Cache Service",
      status: "healthy",
      health: 92,
      responseTime: 15,
      successRate: 99.8,
      lastRestart: Date.now() - 2592000000,
      alerts: 0
    },
    {
      service: "Message Queue",
      status: "warning",
      health: 68,
      responseTime: 180,
      successRate: 91.2,
      lastRestart: Date.now() - 86400000,
      alerts: 8
    }
  ]
};

const advancedViewer = new InteractiveTableViewer(advancedData, {
  theme: 'dark',
  showBorder: true,
  zebra: true,
  pageSize: 3,
  caption: 'Advanced Service Monitoring Dashboard'
});

// Apply custom formatting
advancedViewer.render();

console.log("\n=== Demo 4: Sorting and Filtering Simulation ===");

// Simulate sorting by different columns
console.log("Sorting by 'name' (asc):");
enhancedViewer.setSortColumn('name');
enhancedViewer.render();

console.log("\nSorting by 'connections' (desc):");
enhancedViewer.setSortColumn('connections');
enhancedViewer.render();

console.log("\nFiltering by 'active':");
enhancedViewer.setFilter('active');
enhancedViewer.render();

console.log("\n=== Demo 5: Pagination Navigation ===");

// Navigate through pages
enhancedViewer.setFilter(''); // Clear filter
enhancedViewer.goToPage(1);
console.log("Page 1:");
enhancedViewer.render();

enhancedViewer.nextPage();
console.log("\nPage 2:");
enhancedViewer.render();

enhancedViewer.nextPage();
console.log("\nPage 3:");
enhancedViewer.render();

console.log("\n=== Interactive Table Viewer Demo Complete ===");
console.log("The InteractiveTableViewer provides:");
console.log("✅ Real-time sorting and filtering");
console.log("✅ Pagination with customizable page sizes");
console.log("✅ Interactive command interface");
console.log("✅ Factory methods for common use cases");
console.log("✅ Custom formatting and styling");
console.log("✅ Responsive table rendering");
console.log("✅ Keyboard navigation support");
console.log("✅ Status indicators and badges");
console.log("✅ Multiple export formats");
console.log("✅ Theme support (dark/light)");
console.log("✅ Progress bars and visual indicators");
