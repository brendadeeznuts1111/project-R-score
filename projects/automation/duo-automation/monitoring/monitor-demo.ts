// monitoring/monitor-demo.ts
import { DuplexMonitor, TerminalLayout } from './terminal-dashboard';

console.log(`
🖥️ **TERMINAL MONITORING DASHBOARD DEMO**
═══════════════════════════════════════════════════════════════════

Demonstrating the comprehensive terminal monitoring system with
real-time metrics, feature flag watching, and interactive controls.
`);

// Create and start the monitoring dashboard
const monitor = new DuplexMonitor({
  cols: 120,
  rows: 40,
  updateInterval: 2000, // 2 seconds for demo
  enableFeatureWatch: true
});

// Demo the terminal layout system
console.log(`
📐 **TERMINAL LAYOUT SYSTEM**
═══════════════════════════════════════════════════════════════════

const layout = new TerminalLayout(80, 24);

// Create boxes
console.log(layout.createBox('System Status', 'All systems operational'));
`);

const layout = new TerminalLayout(80, 24);

// Demo box creation
const boxDemo = layout.createBox(
  '🖥️ System Status',
  'All systems operational\nUptime: 2h 34m\nMemory: 245 MB\nCPU: 12%'
);
console.log(boxDemo);

console.log(`
// Create tables
const table = layout.createTable(
  ['Metric', 'Value', 'Status'],
  [
    ['Memory', '245 MB', '🟢'],
    ['CPU', '12%', '🟢'],
    ['Latency', '45 ms', '🟢']
  ]
);
`);

// Demo table creation
const tableDemo = layout.createTable(
  ['📊 Metric', '💹 Value', '🚦 Status'],
  [
    ['Memory', '245 MB', '🟢'],
    ['CPU', '12%', '🟢'],
    ['Latency', '45 ms', '🟢'],
    ['Error Rate', '0.02%', '🟢'],
    ['Active Sessions', '23', '🟡']
  ]
);
console.log(tableDemo);

console.log(`
// Create progress bars
const progress = layout.createProgressBar(75, 100, 20);
console.log(progress); // [████████████████████░░] 75.0%
`);

// Demo progress bar
const progressDemo = layout.createProgressBar(75, 100, 30);
console.log(`Progress: ${progressDemo}`);

console.log(`
// Create sparklines
const sparkline = layout.createSparkline([1, 3, 2, 5, 4, 6, 3, 7, 5, 8], 10);
console.log(sparkline); // ▂▃▄▅▄▆▅▇▆█
`);

// Demo sparkline
const sparklineDemo = layout.createSparkline([1, 3, 2, 5, 4, 6, 3, 7, 5, 8, 6, 9, 7, 8, 9], 15);
console.log(`Sparkline: ${sparklineDemo}`);

// Simulate metrics collection
console.log(`
📊 **METRICS COLLECTION DEMO**
═══════════════════════════════════════════════════════════════════

// Simulated real-time metrics
const metrics = {
  uptime: 9240,                    // seconds
  memory_usage: 245.7,              // MB
  cpu_usage: 12.3,                  // percentage
  active_sessions: 23,
  error_rate: 0.002,                // 0.2%
  latency: 45,                      // ms
  requests_per_second: 156,
  feature_flags: ['inspector', 'monitor', 'analytics'],
  last_restart: new Date()
};

// Status indicators
const getStatusIndicator = (value, metric) => {
  switch (metric) {
    case 'error_rate': return value > 0.05 ? '🔴' : value > 0.01 ? '🟡' : '🟢';
    case 'latency': return value > 1000 ? '🔴' : value > 500 ? '🟡' : '🟢';
    case 'memory_usage': return value > 500 ? '🔴' : value > 200 ? '🟡' : '🟢';
    default: return '🟢';
  }
};
`);

// Demo status indicators
const demoMetrics = {
  error_rate: 0.002,
  latency: 45,
  memory_usage: 245.7,
  cpu_usage: 12.3,
  active_sessions: 23
};

console.log('Status Indicators:');
Object.entries(demoMetrics).forEach(([key, value]) => {
  let indicator = '🟢';
  if (key === 'error_rate') {
    indicator = value > 0.05 ? '🔴' : value > 0.01 ? '🟡' : '🟢';
  } else if (key === 'latency') {
    indicator = value > 1000 ? '🔴' : value > 500 ? '🟡' : '🟢';
  } else if (key === 'memory_usage') {
    indicator = value > 500 ? '🔴' : value > 200 ? '🟡' : '🟢';
  } else if (key === 'active_sessions') {
    indicator = value > 100 ? '🔴' : value > 50 ? '🟡' : '🟢';
  }
  console.log(`  ${key}: ${value} ${indicator}`);
});

// Simulate active sessions
console.log(`
👥 **ACTIVE SESSIONS DEMO**
═══════════════════════════════════════════════════════════════════

const activeSessions = [
  {
    userId: 'user_001',
    command: 'duoplus inspect --query="$.users[0]"',
    startTime: new Date(Date.now() - 300000), // 5 minutes ago
    status: 'active',
    resourceUsage: { memory: 45, cpu: 12 }
  },
  {
    userId: 'user_002', 
    command: 'duoplus scope --inspect',
    startTime: new Date(Date.now() - 120000), // 2 minutes ago
    status: 'active',
    resourceUsage: { memory: 32, cpu: 8 }
  },
  {
    userId: 'user_003',
    command: 'idle',
    startTime: new Date(Date.now() - 600000), // 10 minutes ago
    status: 'idle',
    resourceUsage: { memory: 15, cpu: 2 }
  }
];
`);

// Demo active sessions
const activeSessionsDemo = [
  {
    userId: 'user_001',
    command: 'duoplus inspect --query="$.users[0]"',
    startTime: new Date(Date.now() - 300000),
    status: 'active' as const,
    resourceUsage: { memory: 45, cpu: 12 }
  },
  {
    userId: 'user_002',
    command: 'duoplus scope --inspect',
    startTime: new Date(Date.now() - 120000),
    status: 'active' as const,
    resourceUsage: { memory: 32, cpu: 8 }
  },
  {
    userId: 'user_003',
    command: 'idle',
    startTime: new Date(Date.now() - 600000),
    status: 'idle' as const,
    resourceUsage: { memory: 15, cpu: 2 }
  }
];

console.log('Active Sessions:');
activeSessionsDemo.forEach(session => {
  const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000 / 60);
  const status = session.status === 'active' ? '🟢' : '⏳';
  console.log(`  ${status} ${session.userId}: ${session.command} (${duration}m)`);
});

// Feature flag watching demo
console.log(`
🚩 **FEATURE FLAG WATCHING DEMO**
═══════════════════════════════════════════════════════════════════

// features.json
{
  "inspector": true,
  "monitor": true,
  "analytics": true,
  "debug_mode": false,
  "experimental_ui": true
}

// Watch for changes
Bun.watch({
  paths: ["./features.json"],
  async onChange(event) {
    monitor.write('⚠️ Feature flags updated, reloading...\\n');
    
    const features = JSON.parse(await Bun.file("./features.json").text());
    process.env.BUN_FEATURES = Object.keys(features).join(',');
    
    await Bun.build({
      entrypoints: ["./src/main.ts"],
      outdir: "./dist",
      features: features
    });
    
    monitor.write('✅ Feature flags reloaded successfully\\n');
  }
});
`);

// Demo feature flags
const featureFlags = {
  inspector: true,
  monitor: true,
  analytics: true,
  debug_mode: false,
  experimental_ui: true
};

console.log('Current Feature Flags:');
Object.entries(featureFlags).forEach(([flag, enabled]) => {
  const status = enabled ? '✅' : '❌';
  console.log(`  ${status} ${flag}`);
});

console.log(`\nEnvironment: BUN_FEATURES=${Object.keys(featureFlags).join(',')}`);

// Interactive commands demo
console.log(`
⌨️ **INTERACTIVE COMMANDS DEMO**
═══════════════════════════════════════════════════════════════════

// Keyboard shortcuts
process.stdin.setRawMode(true);
process.stdin.on('data', (data) => {
  const input = data.toString();
  
  switch (input) {
    case 'm': // Metrics
      showDetailedMetrics();
      break;
    case 'l': // Logs
      showRecentLogs();
      break;
    case 'f': // Features
      showFeatureFlags();
      break;
    case 's': // Sessions
      showActiveSessions();
      break;
    case 'r': // Restart
      restartServices();
      break;
    case 'h': // Help
      showHelp();
      break;
    case 'q': // Quit
    case '\\u0003': // Ctrl+C
      stopMonitoring();
      break;
  }
});

// Command help
const helpText = \`
❓ Available Commands:
  [m] Show detailed metrics
  [l] Show recent logs  
  [f] Show feature flags
  [s] Show active sessions
  [r] Restart services
  [h] Show this help
  [q] Quit monitoring
\`;
`);

console.log('Interactive Commands:');
console.log('  [m] Metrics - Show detailed system metrics');
console.log('  [l] Logs    - Display recent log entries');
console.log('  [f] Flags   - Show active feature flags');
console.log('  [s] Sessions - List active user sessions');
console.log('  [r] Restart - Restart system services');
console.log('  [h] Help    - Show this help menu');
console.log('  [q] Quit    - Exit monitoring dashboard');

// Performance trends demo
console.log(`
📈 **PERFORMANCE TRENDS DEMO**
═══════════════════════════════════════════════════════════════════

// Sparkline generation for performance metrics
const generateSparklines = (metrics) => {
  const memoryData = metrics.slice(-20).map(m => m.memory_usage);
  const latencyData = metrics.slice(-20).map(m => m.latency);
  const errorData = metrics.slice(-20).map(m => m.error_rate * 100);
  
  return [
    \`Memory: \${createSparkline(memoryData, 20)}\`,
    \`Latency: \${createSparkline(latencyData, 20)}\`,
    \`Errors: \${createSparkline(errorData, 20)}\`
  ];
};

// Sample metrics history
const metricsHistory = [
  { memory_usage: 120, latency: 45, error_rate: 0.001 },
  { memory_usage: 125, latency: 48, error_rate: 0.001 },
  { memory_usage: 130, latency: 42, error_rate: 0.002 },
  { memory_usage: 135, latency: 50, error_rate: 0.001 },
  { memory_usage: 140, latency: 55, error_rate: 0.003 },
  { memory_usage: 145, latency: 52, error_rate: 0.002 },
  { memory_usage: 150, latency: 48, error_rate: 0.001 },
  { memory_usage: 155, latency: 45, error_rate: 0.001 },
  { memory_usage: 160, latency: 43, error_rate: 0.002 },
  { memory_usage: 165, latency: 47, error_rate: 0.001 }
];
`);

// Demo sparklines
const metricsHistory = [
  { memory_usage: 120, latency: 45, error_rate: 0.001 },
  { memory_usage: 125, latency: 48, error_rate: 0.001 },
  { memory_usage: 130, latency: 42, error_rate: 0.002 },
  { memory_usage: 135, latency: 50, error_rate: 0.001 },
  { memory_usage: 140, latency: 55, error_rate: 0.003 },
  { memory_usage: 145, latency: 52, error_rate: 0.002 },
  { memory_usage: 150, latency: 48, error_rate: 0.001 },
  { memory_usage: 155, latency: 45, error_rate: 0.001 },
  { memory_usage: 160, latency: 43, error_rate: 0.002 },
  { memory_usage: 165, latency: 47, error_rate: 0.001 }
];

const memoryData = metricsHistory.map(m => m.memory_usage);
const latencyData = metricsHistory.map(m => m.latency);
const errorData = metricsHistory.map(m => m.error_rate * 100);

console.log('Performance Trends:');
console.log(`  Memory: ${layout.createSparkline(memoryData, 20)}`);
console.log(`  Latency: ${layout.createSparkline(latencyData, 20)}`);
console.log(`  Errors:  ${layout.createSparkline(errorData, 20)}`);

// System integration demo
console.log(`
🔧 **SYSTEM INTEGRATION DEMO**
═══════════════════════════════════════════════════════════════════

// Integration with Bun features
const monitor = new DuplexMonitor({
  cols: 120,
  rows: 40,
  updateInterval: 1000,
  enableFeatureWatch: true
});

// Start monitoring
await monitor.startMonitoring();

// Automatic rebuild on feature changes
watchFile('./features.json', async (eventType) => {
  if (eventType === 'change') {
    const features = JSON.parse(readFileSync('./features.json', 'utf8'));
    
    // Update environment
    process.env.BUN_FEATURES = Object.keys(features).join(',');
    
    // Trigger rebuild
    await Bun.build({
      entrypoints: ['./src/main.ts'],
      outdir: './dist',
      features: features
    });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  monitor.stopMonitoring();
  process.exit(0);
});
`);

console.log('System Integration Features:');
console.log('  ✅ Real-time metrics collection');
console.log('  ✅ Feature flag watching');
console.log('  ✅ Automatic rebuild on changes');
console.log('  ✅ Interactive keyboard controls');
console.log('  ✅ Performance trend visualization');
console.log('  ✅ Session monitoring');
console.log('  ✅ Graceful shutdown handling');

// Start the monitoring demo
console.log(`
🚀 **STARTING MONITORING DEMO**
═══════════════════════════════════════════════════════════════════

To start the actual monitoring dashboard:

import { DuplexMonitor } from './monitoring/terminal-dashboard';

const monitor = new DuplexMonitor({
  cols: 120,
  rows: 40,
  updateInterval: 1000,
  enableFeatureWatch: true
});

await monitor.startMonitoring();

// The dashboard will show:
// • Real-time system metrics
// • Active user sessions  
// • Performance sparklines
// • Recent events log
// • Feature flag status
// • Interactive controls

// Use keyboard shortcuts:
// [m] Metrics [l] Logs [f] Features [s] Sessions
// [r] Restart [h] Help [q] Quit
`);

console.log(`
🎯 **MONITORING DASHBOARD FEATURES**
═══════════════════════════════════════════════════════════════════

✅ **Real-time Metrics**: CPU, memory, latency, error rate
✅ **Session Monitoring**: Track active user sessions
✅ **Performance Trends**: Visual sparklines for metrics
✅ **Feature Flag Watching**: Auto-reload on configuration changes
✅ **Interactive Controls**: Keyboard shortcuts for navigation
✅ **Event Logging**: Recent system events and activities
✅ **Status Indicators**: Color-coded health status
✅ **Progress Visualization**: Progress bars and charts
✅ **Graceful Shutdown**: Clean termination handling
✅ **Auto-refresh**: Configurable update intervals

🏆 **Production-ready terminal monitoring system!** 🖥️📊⚡
`);

export { DuplexMonitor, TerminalLayout };
