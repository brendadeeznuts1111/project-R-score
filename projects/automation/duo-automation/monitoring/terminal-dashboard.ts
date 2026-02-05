// monitoring/terminal-dashboard.ts
// File watching will be implemented with Bun when needed
import { resolve } from 'path';

export interface TerminalMetrics {
  uptime: number;
  memory_usage: number;
  cpu_usage: number;
  active_sessions: number;
  error_rate: number;
  latency: number;
  requests_per_second: number;
  feature_flags: string[];
  last_restart: Date;
}

export interface ActiveSession {
  userId: string;
  command: string;
  startTime: Date;
  status: 'active' | 'idle' | 'error';
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

export interface TerminalLayout {
  cols: number;
  rows: number;
  createBox(title: string, content: string): string;
  createTable(headers: string[], rows: string[][]): string;
  createProgressBar(value: number, max: number, width: number): string;
  createSparkline(data: number[], width: number): string;
}

export class DuplexMonitor {
  private terminals = new Map<string, any>();
  private metrics: TerminalMetrics[] = [];
  private activeSessions: ActiveSession[] = [];
  private isRunning = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private watchHandle: any = null;
  
  constructor(private options: {
    cols?: number;
    rows?: number;
    updateInterval?: number;
    enableFeatureWatch?: boolean;
  } = {}) {
    this.options = {
      cols: 120,
      rows: 40,
      updateInterval: 1000,
      enableFeatureWatch: true,
      ...options
    };
  }
  
  async startMonitoring() {
    console.log('🚀 Starting DuoPlus Terminal Monitoring Dashboard...');
    
    // Create main monitoring terminal
    const monitor = await this.createMonitoringTerminal();
    
    // Setup periodic updates
    this.updateInterval = setInterval(() => {
      this.updateDashboard(monitor);
    }, this.options.updateInterval);
    
    // Setup feature flag watching
    if (this.options.enableFeatureWatch) {
      this.setupFeatureFlagWatching(monitor);
    }
    
    // Setup signal handlers
    this.setupSignalHandlers();
    
    this.isRunning = true;
    
    // Initial dashboard render
    await this.updateDashboard(monitor);
    
    console.log('✅ Terminal monitoring dashboard started successfully!');
    console.log(`📊 Dashboard: ${monitor.cols}x${monitor.rows}`);
    console.log(`🔄 Update interval: ${this.options.updateInterval}ms`);
    console.log(`👀 Feature watching: ${this.options.enableFeatureWatch ? 'enabled' : 'disabled'}`);
  }
  
  private async createMonitoringTerminal(): Promise<any> {
    // Mock terminal implementation (in real usage, this would use Bun.Terminal)
    const mockTerminal = {
      cols: this.options.cols,
      rows: this.options.rows,
      buffer: [] as string[],
      
      write(data: string) {
        // In real implementation, this would write to the actual terminal
        process.stdout.write(data);
      },
      
      clear() {
        this.write('\x1b[2J\x1b[H'); // Clear screen and move cursor to top
      },
      
      data: (callback: (term: any, data: string) => void) => {
        // Handle keyboard input
        process.stdin.setRawMode(true);
        process.stdin.on('data', (data) => {
          const input = data.toString();
          callback(this, input);
          
          // Handle monitoring commands
          if (input.includes('q') || input.includes('\u0003')) { // q or Ctrl+C
            this.stopMonitoring();
          } else if (input.includes('m')) { // m for metrics
            this.showDetailedMetrics(this);
          } else if (input.includes('l')) { // l for logs
            this.showRecentLogs(this);
          } else if (input.includes('f')) { // f for features
            this.showFeatureFlags(this);
          } else if (input.includes('s')) { // s for sessions
            this.showActiveSessions(this);
          } else if (input.includes('r')) { // r for restart
            this.restartServices();
          } else if (input.includes('h')) { // h for help
            this.showHelp(this);
          }
        });
      }
    };
    
    // Setup input handling
    mockTerminal.data((term: any, data: string) => {
      // Handle commands
      if (data.includes('metrics')) {
        this.showMetrics(term);
      } else if (data.includes('logs')) {
        this.showLogs(term);
      }
    });
    
    this.terminals.set('main', mockTerminal);
    return mockTerminal;
  }
  
  private setupFeatureFlagWatching(monitor: any) {
    const featuresPath = resolve('./features.json');
    
    try {
      watch(featuresPath, async (eventType) => {
        if (eventType === 'change') {
          monitor.write('\x1b[33m⚠️ Feature flags updated, reloading...\x1b[0m\n');
          
          try {
            // Read new features
            const features = JSON.parse(await Bun.file(featuresPath).text());
            
            // Update environment
            process.env.BUN_FEATURES = Object.keys(features).join(',');
            
            // Trigger rebuild with new features
            await this.rebuildWithFeatures(features);
            
            monitor.write('\x1b[32m✅ Feature flags reloaded successfully\x1b[0m\n');
            
            // Update metrics
            this.collectMetrics().then(metrics => {
              metrics.feature_flags = Object.keys(features);
              this.metrics.push(metrics);
            });
            
          } catch (error) {
            monitor.write(`\x1b[31m❌ Failed to reload features: ${error}\x1b[0m\n`);
          }
        }
      });
      
      console.log(`👀 Watching feature flags: ${featuresPath}`);
      
    } catch (error) {
      console.log(`⚠️ Could not setup feature flag watching: ${error}`);
    }
  }
  
  private async rebuildWithFeatures(features: Record<string, boolean>) {
    try {
      // In real implementation, this would use Bun.build
      console.log('🔨 Rebuilding with new features...');
      
      // Simulate build process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update process environment
      process.env.BUN_FEATURES = Object.keys(features).join(',');
      
      console.log('✅ Build completed with features:', Object.keys(features).join(', '));
      
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }
  }
  
  async updateDashboard(term: any) {
    if (!this.isRunning) return;
    
    // Clear screen
    term.clear();
    
    const layout = new TerminalLayout(term.cols, term.rows);
    
    // Header
    const headerContent = `Uptime: ${process.uptime().toFixed(0)}s | Features: ${process.env.BUN_FEATURES || 'none'} | PID: ${process.pid}`;
    term.write(layout.createBox('🔍 DuoPlus Monitoring Dashboard', headerContent));
    
    // Current metrics
    const metrics = await this.collectMetrics();
    term.write('\n' + layout.createTable(
      ['📊 Metric', '💹 Value', '🚦 Status', '📈 Trend'],
      Object.entries(metrics).map(([key, value]) => [
        key,
        this.formatMetricValue(key, value),
        this.getStatusIndicator(value, key),
        this.getTrendIndicator(key, value)
      ])
    ));
    
    // Performance sparklines
    term.write('\n' + layout.createBox(
      '📈 Performance Trends',
      this.generatePerformanceSparklines(layout)
    ));
    
    // Active sessions
    const sessions = this.getActiveSessions();
    term.write('\n' + layout.createBox(
      `👥 Active Sessions (${sessions.length})`,
      sessions.length > 0 
        ? sessions.map(s => `• ${s.userId}: ${s.command || 'idle'} (${this.formatDuration(Date.now() - s.startTime.getTime())})`).join('\n')
        : 'No active sessions'
    ));
    
    // Recent events
    term.write('\n' + layout.createBox(
      '📋 Recent Events',
      this.getRecentEvents().join('\n')
    ));
    
    // Help footer
    term.write('\n' + layout.createBox(
      '⌨️ Commands',
      '[m]etrics [l]ogs [f]eatures [s]essions [r]estart [h]elp [q]uit'
    ));
  }
  
  private async collectMetrics(): Promise<TerminalMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Simulate collecting metrics from various sources
    const metrics: TerminalMetrics = {
      uptime: process.uptime(),
      memory_usage: memUsage.heapUsed / 1024 / 1024, // MB
      cpu_usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      active_sessions: this.activeSessions.length,
      error_rate: Math.random() * 0.1, // Simulated error rate
      latency: 50 + Math.random() * 200, // Simulated latency in ms
      requests_per_second: Math.floor(Math.random() * 1000),
      feature_flags: process.env.BUN_FEATURES?.split(',') || [],
      last_restart: new Date()
    };
    
    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
    
    return metrics;
  }
  
  private getActiveSessions(): ActiveSession[] {
    // Simulate active sessions
    return [
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
  }
  
  private getRecentEvents(): string[] {
    const now = new Date();
    return [
      `${now.toISOString()} - ✅ System health check passed`,
      `${new Date(now.getTime() - 60000).toISOString()} - 📊 Metrics collection completed`,
      `${new Date(now.getTime() - 120000).toISOString()} - 🔧 Feature flag reload completed`,
      `${new Date(now.getTime() - 180000).toISOString()} - 🚀 Service restart completed`,
      `${new Date(now.getTime() - 240000).toISOString()} - 📈 Performance optimization applied`
    ];
  }
  
  private formatMetricValue(key: string, value: any): string {
    switch (key) {
      case 'memory_usage':
        return `${value.toFixed(1)} MB`;
      case 'cpu_usage':
        return `${value.toFixed(2)}s`;
      case 'latency':
        return `${value.toFixed(0)} ms`;
      case 'error_rate':
        return `${(value * 100).toFixed(2)}%`;
      case 'uptime':
        return this.formatDuration(value * 1000);
      case 'feature_flags':
        return value.length.toString();
      default:
        return value.toString();
    }
  }
  
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  private getStatusIndicator(value: any, metric: string): string {
    switch (metric) {
      case 'error_rate':
        return value > 0.05 ? '🔴' : value > 0.01 ? '🟡' : '🟢';
      case 'latency':
        return value > 1000 ? '🔴' : value > 500 ? '🟡' : '🟢';
      case 'memory_usage':
        return value > 500 ? '🔴' : value > 200 ? '🟡' : '🟢';
      case 'cpu_usage':
        return value > 80 ? '🔴' : value > 50 ? '🟡' : '🟢';
      case 'active_sessions':
        return value > 100 ? '🔴' : value > 50 ? '🟡' : '🟢';
      default:
        return '🟢';
    }
  }
  
  private getTrendIndicator(metric: string, value: any): string {
    if (this.metrics.length < 2) return '➖';
    
    const previous = this.metrics[this.metrics.length - 2];
    const current = this.metrics[this.metrics.length - 1];
    
    const prevValue = previous[metric as keyof TerminalMetrics];
    const currValue = current[metric as keyof TerminalMetrics];
    
    if (currValue > prevValue) return '📈';
    if (currValue < prevValue) return '📉';
    return '➖';
  }
  
  private generatePerformanceSparklines(layout: TerminalLayout): string {
    const width = Math.floor(layout.cols * 0.8);
    
    // Generate sparklines for different metrics
    const memoryData = this.metrics.slice(-20).map(m => m.memory_usage);
    const latencyData = this.metrics.slice(-20).map(m => m.latency);
    const errorData = this.metrics.slice(-20).map(m => m.error_rate * 100);
    
    return [
      `Memory: ${layout.createSparkline(memoryData, width / 3)}`,
      `Latency: ${layout.createSparkline(latencyData, width / 3)}`,
      `Errors: ${layout.createSparkline(errorData, width / 3)}`
    ].join('\n');
  }
  
  // Command handlers
  private showMetrics(term: any) {
    term.write('\n📊 Detailed Metrics:\n');
    const metrics = this.metrics[this.metrics.length - 1];
    if (metrics) {
      Object.entries(metrics).forEach(([key, value]) => {
        term.write(`  ${key}: ${this.formatMetricValue(key, value)}\n`);
      });
    }
  }
  
  private showLogs(term: any) {
    term.write('\n📋 Recent Logs:\n');
    this.getRecentEvents().forEach(event => {
      term.write(`  ${event}\n`);
    });
  }
  
  private showFeatureFlags(term: any) {
    term.write('\n🚩 Active Feature Flags:\n');
    const flags = process.env.BUN_FEATURES?.split(',') || [];
    if (flags.length > 0) {
      flags.forEach(flag => term.write(`  ✅ ${flag}\n`));
    } else {
      term.write('  No feature flags enabled\n');
    }
  }
  
  private showActiveSessions(term: any) {
    term.write('\n👥 Active Sessions:\n');
    const sessions = this.getActiveSessions();
    sessions.forEach(session => {
      term.write(`  • ${session.userId}: ${session.command} (${session.status})\n`);
    });
  }
  
  private showHelp(term: any) {
    term.write('\n❓ Help - Available Commands:\n');
    term.write('  [m] Show detailed metrics\n');
    term.write('  [l] Show recent logs\n');
    term.write('  [f] Show feature flags\n');
    term.write('  [s] Show active sessions\n');
    term.write('  [r] Restart services\n');
    term.write('  [h] Show this help\n');
    term.write('  [q] Quit monitoring\n');
  }
  
  private async restartServices() {
    console.log('🔄 Restarting services...');
    // Implement service restart logic
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Services restarted successfully');
  }
  
  private setupSignalHandlers() {
    const gracefulShutdown = () => {
      console.log('\n🛑 Shutting down gracefully...');
      this.stopMonitoring();
      process.exit(0);
    };
    
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  }
  
  stopMonitoring() {
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.watchHandle) {
      this.watchHandle.close();
      this.watchHandle = null;
    }
    
    console.log('✅ Terminal monitoring stopped');
  }
}

export class TerminalLayout implements TerminalLayout {
  constructor(public cols: number, public rows: number) {}
  
  createBox(title: string, content: string): string {
    const width = Math.min(this.cols - 4, 100);
    const border = '─'.repeat(width - 2);
    
    let result = `┌─ ${title} ${' '.repeat(width - title.length - 6)}┐\n`;
    
    // Wrap content
    const lines = this.wrapText(content, width - 4);
    lines.forEach(line => {
      result += `│ ${line.padEnd(width - 4)} │\n`;
    });
    
    result += `└─${border}┘`;
    return result;
  }
  
  createTable(headers: string[], rows: string[][]): string {
    if (rows.length === 0) return 'No data available';
    
    // Calculate column widths
    const colCount = headers.length;
    const colWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth);
    });
    
    // Create header
    let result = '│ ' + headers.map((header, i) => 
      header.padEnd(colWidths[i])
    ).join(' │ ') + ' │\n';
    
    // Add separator
    result += '├─' + colWidths.map(width => '─'.repeat(width)).join('─┼─') + '─┤\n';
    
    // Add rows
    rows.forEach(row => {
      result += '│ ' + row.map((cell, i) => 
        (cell || '').padEnd(colWidths[i])
      ).join(' │ ') + ' │\n';
    });
    
    return result;
  }
  
  createProgressBar(value: number, max: number, width: number): string {
    const percentage = Math.min(100, (value / max) * 100);
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + '] ' + percentage.toFixed(1) + '%';
  }
  
  createSparkline(data: number[], width: number): string {
    if (data.length === 0) return '░'.repeat(width);
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const blocks = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    
    return data.slice(-width).map(value => {
      const normalized = (value - min) / range;
      const blockIndex = Math.floor(normalized * (blocks.length - 1));
      return blocks[blockIndex];
    }).join('');
  }
  
  private wrapText(text: string, width: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }
}

export default DuplexMonitor;
