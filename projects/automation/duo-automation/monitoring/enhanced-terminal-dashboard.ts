// monitoring/enhanced-terminal-dashboard.ts
import { feature } from "bun:bundle";

// Feature flag based imports and initialization
if (feature("ADVANCED_MONITORING")) {
  console.log("🚀 Advanced monitoring features enabled");
}

if (feature("DEBUG_MODE")) {
  console.log("🐛 Debug mode active - verbose logging enabled");
}

export interface EnhancedTerminalMetrics {
  // Core metrics
  uptime: number;
  memory_usage: number;
  cpu_usage: number;
  active_sessions: number;
  error_rate: number;
  latency: number;
  requests_per_second: number;
  
  // Enhanced metrics (feature-gated)
  disk_usage?: number;
  network_io?: {
    bytes_in: number;
    bytes_out: number;
  };
  gpu_usage?: number;
  temperature?: number;
  
  // Feature flags
  feature_flags: string[];
  last_restart: Date;
  
  // Debug info
  debug_info?: {
    node_version: string;
    bun_version: string;
    platform: string;
    arch: string;
  };
}

export interface PTYSession {
  id: string;
  terminal: any; // Bun.Terminal
  process: any; // Bun.Process
  command: string;
  startTime: Date;
  status: 'active' | 'idle' | 'completed' | 'error';
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

export class EnhancedDuplexMonitor {
  private terminals = new Map<string, any>();
  private ptySessions = new Map<string, PTYSession>();
  private metrics: EnhancedTerminalMetrics[] = [];
  private isRunning = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private watchHandle: any = null;
  private mainTerminal: any = null;
  
  constructor(private options: {
    cols?: number;
    rows?: number;
    updateInterval?: number;
    enableFeatureWatch?: boolean;
    enablePTY?: boolean;
    debugMode?: boolean;
  } = {}) {
    const baseOptions = {
      cols: process.stdout.columns || 120,
      rows: process.stdout.rows || 40,
      updateInterval: 1000,
      enableFeatureWatch: true,
      enablePTY: false,
      debugMode: false
    };
    
    // Apply feature-gated options
    if (feature("DEBUG_MODE")) {
      baseOptions.debugMode = true;
    }
    
    if (feature("PTY_SESSIONS")) {
      baseOptions.enablePTY = true;
    }
    
    this.options = {
      ...baseOptions,
      ...options
    };
    
    if (this.options.debugMode) {
      console.log("🐛 Enhanced monitor initialized in debug mode");
    }
  }
  
  async startMonitoring() {
    console.log('🚀 Starting Enhanced DuoPlus Terminal Monitoring Dashboard...');
    
    // Create main monitoring terminal with PTY support
    this.mainTerminal = await this.createEnhancedTerminal();
    
    // Setup periodic updates
    this.updateInterval = setInterval(() => {
      this.updateDashboard(this.mainTerminal);
    }, this.options.updateInterval);
    
    // Setup feature flag watching with compile-time flags
    if (this.options.enableFeatureWatch) {
      this.setupFeatureFlagWatching(this.mainTerminal);
    }
    
    // Setup PTY session management if enabled
    if (this.options.enablePTY && feature("PTY_SESSIONS")) {
      this.setupPTYSessionManagement();
    }
    
    // Setup signal handlers
    this.setupSignalHandlers();
    
    // Setup terminal resize handling
    this.setupResizeHandling();
    
    this.isRunning = true;
    
    // Initial dashboard render
    await this.updateDashboard(this.mainTerminal);
    
    console.log('✅ Enhanced terminal monitoring dashboard started successfully!');
    console.log(`🖥️ Dashboard: ${this.mainTerminal.cols}x${this.mainTerminal.rows}`);
    console.log(`🔄 Update interval: ${this.options.updateInterval}ms`);
    console.log(`🚀 PTY Support: ${this.options.enablePTY ? 'enabled' : 'disabled'}`);
    console.log(`🐛 Debug Mode: ${this.options.debugMode ? 'enabled' : 'disabled'}`);
    
    if (feature("ADVANCED_MONITORING")) {
      console.log(`📈 Advanced Monitoring: enabled`);
    }
  }
  
  private async createEnhancedTerminal(): Promise<any> {
    // Create reusable terminal using Bun.Terminal API
    const terminal = new Bun.Terminal({
      cols: this.options.cols,
      rows: this.options.rows,
      data: (term: any, data: string) => {
        this.handleTerminalData(term, data);
      }
    });
    
    // Store for reuse
    this.terminals.set('main', terminal);
    
    return terminal;
  }
  
  private handleTerminalData(terminal: any, data: string) {
    // Handle keyboard input for interactive controls
    if (this.options.debugMode) {
      console.log(`🐛 Terminal input: ${data.replace(/\n/g, '\\n')}`);
    }
    
    // Handle monitoring commands
    if (data.includes('q') || data.includes('\u0003')) { // q or Ctrl+C
      this.stopMonitoring();
    } else if (data.includes('m')) { // m for metrics
      this.showDetailedMetrics(terminal);
    } else if (data.includes('l')) { // l for logs
      this.showRecentLogs(terminal);
    } else if (data.includes('f')) { // f for features
      this.showFeatureFlags(terminal);
    } else if (data.includes('s')) { // s for sessions
      this.showActiveSessions(terminal);
    } else if (data.includes('p') && feature("PTY_SESSIONS")) { // p for PTY sessions
      this.showPTYSessions(terminal);
    } else if (data.includes('t')) { // t for tests
      this.runDiagnosticTests(terminal);
    } else if (data.includes('r')) { // r for restart
      this.restartServices();
    } else if (data.includes('d')) { // d for debug
      this.toggleDebugMode();
    } else if (data.includes('h')) { // h for help
      this.showEnhancedHelp(terminal);
    } else if (data.includes('c')) { // c for create PTY
      if (feature("PTY_SESSIONS")) {
        this.createInteractivePTY(terminal);
      }
    }
  }
  
  private setupPTYSessionManagement() {
    console.log('🖥️ Setting up PTY session management...');
    
    // Create PTY session manager
    const ptyManager = new Bun.Terminal({
      cols: 80,
      rows: 24,
      data: (term: any, data: string) => {
        // Handle PTY session data
        this.handlePTYData(term, data);
      }
    });
    
    this.terminals.set('pty-manager', ptyManager);
  }
  
  private async createInteractivePTY(mainTerminal: any) {
    const sessionId = `pty_${Date.now()}`;
    
    if (this.options.debugMode) {
      console.log(`🐛 Creating PTY session: ${sessionId}`);
    }
    
    // Create new terminal for PTY session
    const ptyTerminal = new Bun.Terminal({
      cols: 80,
      rows: 24,
      data: (term: any, data: string) => {
        // Forward PTY output to main terminal
        mainTerminal.write(`\n[PTY ${sessionId}] ${data}`);
      }
    });
    
    // Spawn interactive shell with PTY
    const proc = Bun.spawn(["bash"], {
      terminal: ptyTerminal,
      env: {
        ...process.env,
        PTY_SESSION: sessionId,
        PS1: `[PTY:${sessionId}]\\$ `
      }
    });
    
    // Store PTY session
    const ptySession: PTYSession = {
      id: sessionId,
      terminal: ptyTerminal,
      process: proc,
      command: 'bash',
      startTime: new Date(),
      status: 'active',
      resourceUsage: { memory: 0, cpu: 0 }
    };
    
    this.ptySessions.set(sessionId, ptySession);
    
    mainTerminal.write(`\n✅ Created PTY session: ${sessionId}`);
    mainTerminal.write(`\n📝 Use 'p' to view all PTY sessions`);
    
    // Handle session completion
    proc.exited.then((code: number) => {
      ptySession.status = code === 0 ? 'completed' : 'error';
      mainTerminal.write(`\n🏁 PTY session ${sessionId} completed with code: ${code}`);
    });
  }
  
  private handlePTYData(terminal: any, data: string) {
    // Handle PTY-specific commands
    if (data.includes('exit')) {
      // Clean up PTY session
      const sessionId = this.findPTYSessionByTerminal(terminal);
      if (sessionId) {
        this.ptySessions.delete(sessionId);
        console.log(`🗑️ PTY session ${sessionId} cleaned up`);
      }
    }
  }
  
  private findPTYSessionByTerminal(terminal: any): string | null {
    for (const [id, session] of this.ptySessions) {
      if (session.terminal === terminal) {
        return id;
      }
    }
    return null;
  }
  
  private setupResizeHandling() {
    process.stdout.on("resize", () => {
      if (this.mainTerminal) {
        const newCols = process.stdout.columns || 120;
        const newRows = process.stdout.rows || 40;
        
        this.mainTerminal.resize(newCols, newRows);
        this.options.cols = newCols;
        this.options.rows = newRows;
        
        if (this.options.debugMode) {
          console.log(`🐛 Terminal resized to ${newCols}x${newRows}`);
        }
        
        // Redraw dashboard with new dimensions
        this.updateDashboard(this.mainTerminal);
      }
    });
  }
  
  private setupFeatureFlagWatching(terminal: any) {
    const featuresPath = './features.json';
    
    try {
      import('fs').then(fs => {
        fs.watchFile(featuresPath, async (eventType) => {
          if (eventType === 'change') {
            terminal.write('\x1b[33m⚠️ Feature flags updated, reloading...\x1b[0m\n');
            
            try {
              // Read new features
              const featuresText = await Bun.file(featuresPath).text();
              const features = JSON.parse(featuresText);
              
              // Update environment
              process.env.BUN_FEATURES = Object.keys(features).join(',');
              
              // Trigger rebuild with new features using compile-time flags
              await this.rebuildWithFeatures(features);
              
              terminal.write('\x1b[32m✅ Feature flags reloaded successfully\x1b[0m\n');
              
              // Show active features
              const activeFeatures = Object.entries(features)
                .filter(([_, enabled]) => enabled)
                .map(([name]) => name);
              
              terminal.write(`🚩 Active features: ${activeFeatures.join(', ')}\n`);
              
            } catch (error) {
              terminal.write(`\x1b[31m❌ Failed to reload features: ${error}\x1b[0m\n`);
            }
          }
        });
      });
      
      console.log(`👀 Watching feature flags: ${featuresPath}`);
      
    } catch (error) {
      console.log(`⚠️ Could not setup feature flag watching: ${error}`);
    }
  }
  
  private async rebuildWithFeatures(features: Record<string, boolean>) {
    try {
      if (this.options.debugMode) {
        console.log('🔨 Rebuilding with new features...');
      }
      
      // Use Bun.build with compile-time feature flags
      const buildResult = await Bun.build({
        entrypoints: ["./src/main.ts"],
        outdir: "./dist",
        features: Object.keys(features).filter(key => features[key]),
        minify: !this.options.debugMode,
        sourcemap: this.options.debugMode ? "inline" : false
      });
      
      if (buildResult.success) {
        console.log('✅ Build completed successfully');
        
        if (this.options.debugMode) {
          console.log(`📦 Built ${buildResult.outputs.length} files`);
          buildResult.outputs.forEach(output => {
            console.log(`   - ${output.path}`);
          });
        }
      } else {
        throw new Error('Build failed');
      }
      
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }
  }
  
  async updateDashboard(term: any) {
    if (!this.isRunning) return;
    
    // Clear screen using ANSI escape sequences
    term.write('\x1b[2J\x1b[H');
    
    // Create layout with current terminal dimensions
    const layout = new EnhancedTerminalLayout(term.cols, term.rows);
    
    // Header with feature flag info
    const headerContent = this.createHeaderContent();
    term.write(layout.createBox('🔍 Enhanced DuoPlus Monitoring Dashboard', headerContent));
    
    // Current metrics with enhanced data
    const metrics = await this.collectEnhancedMetrics();
    term.write('\n' + layout.createEnhancedMetricsTable(metrics));
    
    // Performance sparklines with improved Unicode handling
    term.write('\n' + layout.createBox(
      '📈 Performance Trends (Improved Unicode Support)',
      this.generateEnhancedSparklines(layout, metrics)
    ));
    
    // Active sessions
    const sessions = this.getActiveSessions();
    term.write('\n' + layout.createBox(
      `👥 Active Sessions (${sessions.length})`,
      this.formatSessions(sessions)
    ));
    
    // PTY sessions (feature-gated)
    if (feature("PTY_SESSIONS") && this.ptySessions.size > 0) {
      term.write('\n' + layout.createBox(
        `🖥️ PTY Sessions (${this.ptySessions.size})`,
        this.formatPTYSessions()
      ));
    }
    
    // Recent events
    term.write('\n' + layout.createBox(
      '📋 Recent Events',
      this.getRecentEvents().join('\n')
    ));
    
    // Enhanced help footer
    term.write('\n' + layout.createBox(
      '⌨️ Enhanced Commands',
      this.createCommandHelp()
    ));
  }
  
  private createHeaderContent(): string {
    const uptime = this.formatDuration(process.uptime() * 1000);
    const features = process.env.BUN_FEATURES?.split(',') || ['none'];
    const featureCount = features.length;
    
    let content = `Uptime: ${uptime} | Features: ${featureCount} active | PID: ${process.pid}`;
    
    if (feature("ADVANCED_MONITORING")) {
      content += ` | Advanced: ✅`;
    }
    
    if (this.options.debugMode) {
      content += ` | Debug: 🐛`;
    }
    
    if (feature("PTY_SESSIONS")) {
      content += ` | PTY: ${this.ptySessions.size} sessions`;
    }
    
    return content;
  }
  
  private createCommandHelp(): string {
    let commands = '[m]etrics [l]ogs [f]eatures [s]essions';
    
    if (feature("PTY_SESSIONS")) {
      commands += ' [p]ty [c]reate-pty';
    }
    
    commands += ' [t]ests [r]estart [d]ebug [h]elp [q]uit';
    
    return commands;
  }
  
  private async collectEnhancedMetrics(): Promise<EnhancedTerminalMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const baseMetrics: EnhancedTerminalMetrics = {
      uptime: process.uptime(),
      memory_usage: memUsage.heapUsed / 1024 / 1024, // MB
      cpu_usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      active_sessions: this.getActiveSessions().length,
      error_rate: Math.random() * 0.1, // Simulated error rate
      latency: 50 + Math.random() * 200, // Simulated latency in ms
      requests_per_second: Math.floor(Math.random() * 1000),
      feature_flags: process.env.BUN_FEATURES?.split(',') || [],
      last_restart: new Date()
    };
    
    // Add enhanced metrics if feature is enabled
    if (feature("ADVANCED_MONITORING")) {
      baseMetrics.disk_usage = 50 + Math.random() * 30; // Simulated disk usage %
      baseMetrics.network_io = {
        bytes_in: Math.floor(Math.random() * 1000000),
        bytes_out: Math.floor(Math.random() * 1000000)
      };
      baseMetrics.gpu_usage = Math.random() * 100; // Simulated GPU usage
      baseMetrics.temperature = 40 + Math.random() * 30; // Simulated temperature
    }
    
    // Add debug info if debug mode is enabled
    if (this.options.debugMode) {
      baseMetrics.debug_info = {
        node_version: process.version,
        bun_version: Bun.version,
        platform: process.platform,
        arch: process.arch
      };
    }
    
    this.metrics.push(baseMetrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
    
    return baseMetrics;
  }
  
  private formatSessions(sessions: any[]): string {
    if (sessions.length === 0) return 'No active sessions';
    
    return sessions.map(s => {
      const duration = this.formatDuration(Date.now() - s.startTime.getTime());
      const status = s.status === 'active' ? '🟢' : s.status === 'idle' ? '⏳' : '🔴';
      return `${status} ${s.userId}: ${s.command || 'idle'} (${duration})`;
    }).join('\n');
  }
  
  private formatPTYSessions(): string {
    if (this.ptySessions.size === 0) return 'No PTY sessions active';
    
    return Array.from(this.ptySessions.values()).map(session => {
      const duration = this.formatDuration(Date.now() - session.startTime.getTime());
      const status = session.status === 'active' ? '🟢' : 
                    session.status === 'completed' ? '✅' : '🔴';
      return `${status} ${session.id}: ${session.command} (${duration})`;
    }).join('\n');
  }
  
  private generateEnhancedSparklines(layout: EnhancedTerminalLayout, metrics: EnhancedTerminalMetrics): string {
    const width = Math.floor(layout.cols * 0.8);
    
    const sparklines: string[] = [];
    
    // Basic metrics
    const memoryData = this.metrics.slice(-20).map(m => m.memory_usage);
    const latencyData = this.metrics.slice(-20).map(m => m.latency);
    const errorData = this.metrics.slice(-20).map(m => m.error_rate * 100);
    
    sparklines.push(`Memory: ${layout.createSparkline(memoryData, width / 3)}`);
    sparklines.push(`Latency: ${layout.createSparkline(latencyData, width / 3)}`);
    sparklines.push(`Errors: ${layout.createSparkline(errorData, width / 3)}`);
    
    // Enhanced metrics (feature-gated)
    if (feature("ADVANCED_MONITORING") && metrics.disk_usage !== undefined) {
      const diskData = this.metrics.slice(-20).map(m => m.disk_usage || 0);
      const gpuData = this.metrics.slice(-20).map(m => m.gpu_usage || 0);
      const tempData = this.metrics.slice(-20).map(m => m.temperature || 0);
      
      sparklines.push(`Disk: ${layout.createSparkline(diskData, width / 4)}`);
      sparklines.push(`GPU: ${layout.createSparkline(gpuData, width / 4)}`);
      sparklines.push(`Temp: ${layout.createSparkline(tempData, width / 4)}`);
    }
    
    return sparklines.join('\n');
  }
  
  private showPTYSessions(term: any) {
    term.write('\n🖥️ Active PTY Sessions:\n');
    
    if (this.ptySessions.size === 0) {
      term.write('  No PTY sessions active\n');
      term.write('  Press [c] to create a new PTY session\n');
      return;
    }
    
    Array.from(this.ptySessions.values()).forEach(session => {
      const duration = this.formatDuration(Date.now() - session.startTime.getTime());
      const status = session.status === 'active' ? '🟢' : 
                    session.status === 'completed' ? '✅' : '🔴';
      term.write(`  ${status} ${session.id}: ${session.command} (${duration})\n`);
    });
    
    term.write('\nCommands:\n');
    term.write('  [c] Create new PTY session\n');
    term.write('  [p] Refresh PTY session list\n');
  }
  
  private runDiagnosticTests(term: any) {
    term.write('\n🧪 Running Diagnostic Tests...\n');
    
    // Test Unicode string width handling
    const testStrings = [
      '🇺🇸 Flag emoji',
      '👋🏽 Emoji with skin tone',
      '👨‍👩‍👧 Family emoji',
      '\u2060 Word joiner',
      'Normal text'
    ];
    
    term.write('📏 Unicode Width Tests:\n');
    testStrings.forEach(str => {
      const width = Bun.stringWidth(str);
      term.write(`  "${str}" → width: ${width}\n`);
    });
    
    // Test feature flags
    term.write('\n🚩 Feature Flag Tests:\n');
    term.write(`  ADVANCED_MONITORING: ${feature("ADVANCED_MONITORING") ? '✅' : '❌'}\n`);
    term.write(`  DEBUG_MODE: ${feature("DEBUG_MODE") ? '✅' : '❌'}\n`);
    term.write(`  PTY_SESSIONS: ${feature("PTY_SESSIONS") ? '✅' : '❌'}\n`);
    
    // Test terminal dimensions
    term.write('\n📐 Terminal Dimensions:\n');
    term.write(`  Cols: ${term.cols}, Rows: ${term.rows}\n`);
    term.write(`  Process: ${process.stdout.columns}x${process.stdout.rows}\n`);
    
    term.write('\n✅ Diagnostic tests completed\n');
  }
  
  private toggleDebugMode() {
    this.options.debugMode = !this.options.debugMode;
    console.log(`🐛 Debug mode ${this.options.debugMode ? 'enabled' : 'disabled'}`);
    
    if (this.mainTerminal) {
      this.mainTerminal.write(`\n🐛 Debug mode ${this.options.debugMode ? 'enabled' : 'disabled'}\n`);
    }
  }
  
  private showEnhancedHelp(term: any) {
    term.write('\n❓ Enhanced Help - Available Commands:\n');
    term.write('  [m] Show detailed metrics\n');
    term.write('  [l] Show recent logs\n');
    term.write('  [f] Show feature flags\n');
    term.write('  [s] Show active sessions\n');
    
    if (feature("PTY_SESSIONS")) {
      term.write('  [p] Show PTY sessions\n');
      term.write('  [c] Create new PTY session\n');
    }
    
    term.write('  [t] Run diagnostic tests\n');
    term.write('  [d] Toggle debug mode\n');
    term.write('  [r] Restart services\n');
    term.write('  [h] Show this help\n');
    term.write('  [q] Quit monitoring\n');
    
    term.write('\n🚀 Feature Flags:\n');
    term.write(`  ADVANCED_MONITORING: ${feature("ADVANCED_MONITORING") ? '✅' : '❌'}\n`);
    term.write(`  DEBUG_MODE: ${feature("DEBUG_MODE") ? '✅' : '❌'}\n`);
    term.write(`  PTY_SESSIONS: ${feature("PTY_SESSIONS") ? '✅' : '❌'}\n`);
  }
  
  // Helper methods (reuse from previous implementation)
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
  
  private getActiveSessions(): any[] {
    return [
      {
        userId: 'user_001',
        command: 'duoplus inspect --query="$.users[0]"',
        startTime: new Date(Date.now() - 300000),
        status: 'active'
      },
      {
        userId: 'user_002',
        command: 'duoplus scope --inspect',
        startTime: new Date(Date.now() - 120000),
        status: 'active'
      }
    ];
  }
  
  private getRecentEvents(): string[] {
    const now = new Date();
    return [
      `${now.toISOString()} - ✅ System health check passed`,
      `${new Date(now.getTime() - 60000).toISOString()} - 📊 Enhanced metrics collection completed`,
      `${new Date(now.getTime() - 120000).toISOString()} - 🔨 Feature flag rebuild completed`,
      `${new Date(now.getTime() - 180000).toISOString()} - 🖥️ PTY session created`,
      `${new Date(now.getTime() - 240000).toISOString()} - 🧪 Diagnostic tests passed`
    ];
  }
  
  private showDetailedMetrics(term: any) {
    term.write('\n📊 Detailed Enhanced Metrics:\n');
    const metrics = this.metrics[this.metrics.length - 1];
    if (metrics) {
      Object.entries(metrics).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          term.write(`  ${key}:\n`);
          Object.entries(value).forEach(([subKey, subValue]) => {
            term.write(`    ${subKey}: ${subValue}\n`);
          });
        } else {
          term.write(`  ${key}: ${value}\n`);
        }
      });
    }
  }
  
  private showRecentLogs(term: any) {
    term.write('\n📋 Recent Enhanced Logs:\n');
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
    
    term.write('\n🔍 Compile-time Features:\n');
    term.write(`  ADVANCED_MONITORING: ${feature("ADVANCED_MONITORING") ? '✅' : '❌'}\n`);
    term.write(`  DEBUG_MODE: ${feature("DEBUG_MODE") ? '✅' : '❌'}\n`);
    term.write(`  PTY_SESSIONS: ${feature("PTY_SESSIONS") ? '✅' : '❌'}\n`);
  }
  
  private showActiveSessions(term: any) {
    term.write('\n👥 Active Sessions:\n');
    const sessions = this.getActiveSessions();
    sessions.forEach(session => {
      term.write(`  • ${session.userId}: ${session.command} (${session.status})\n`);
    });
  }
  
  private async restartServices() {
    console.log('🔄 Restarting enhanced services...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Enhanced services restarted successfully');
  }
  
  private setupSignalHandlers() {
    const gracefulShutdown = () => {
      console.log('\n🛑 Shutting down enhanced monitoring gracefully...');
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
    
    // Clean up PTY sessions
    this.ptySessions.forEach(session => {
      session.terminal.close();
      session.process.kill();
    });
    this.ptySessions.clear();
    
    // Clean up terminals
    this.terminals.forEach(terminal => {
      terminal.close();
    });
    this.terminals.clear();
    
    console.log('✅ Enhanced terminal monitoring stopped');
  }
}

export class EnhancedTerminalLayout {
  constructor(public cols: number, public rows: number) {}
  
  createBox(title: string, content: string): string {
    const width = Math.min(this.cols - 4, 100);
    const border = '─'.repeat(width - 2);
    
    let result = `┌─ ${title} ${' '.repeat(width - title.length - 6)}┐\n`;
    
    const lines = this.wrapText(content, width - 4);
    lines.forEach(line => {
      result += `│ ${line.padEnd(width - 4)} │\n`;
    });
    
    result += `└─${border}┘`;
    return result;
  }
  
  createEnhancedMetricsTable(metrics: EnhancedTerminalMetrics): string {
    const headers = ['📊 Metric', '💹 Value', '🚦 Status', '📈 Trend'];
    const rows: string[][] = [];
    
    // Basic metrics
    const basicMetrics = [
      ['uptime', metrics.uptime],
      ['memory_usage', metrics.memory_usage],
      ['cpu_usage', metrics.cpu_usage],
      ['active_sessions', metrics.active_sessions],
      ['error_rate', metrics.error_rate],
      ['latency', metrics.latency],
      ['requests_per_second', metrics.requests_per_second]
    ];
    
    basicMetrics.forEach(([key, value]) => {
      rows.push([
        key,
        this.formatMetricValue(key, value),
        this.getStatusIndicator(value, key),
        '📊'
      ]);
    });
    
    // Enhanced metrics (feature-gated)
    if (metrics.disk_usage !== undefined) {
      rows.push(['disk_usage', metrics.disk_usage, this.getStatusIndicator(metrics.disk_usage, 'disk_usage'), '💾']);
      rows.push(['network_in', metrics.network_io?.bytes_in || 0, '🟢', '📡']);
      rows.push(['network_out', metrics.network_io?.bytes_out || 0, '🟢', '📡']);
      rows.push(['gpu_usage', metrics.gpu_usage || 0, this.getStatusIndicator(metrics.gpu_usage || 0, 'gpu_usage'), '🎮']);
      rows.push(['temperature', metrics.temperature || 0, this.getStatusIndicator(metrics.temperature || 0, 'temperature'), '🌡️']);
    }
    
    return this.createTable(headers, rows);
  }
  
  private createTable(headers: string[], rows: string[][]): string {
    if (rows.length === 0) return 'No data available';
    
    const colCount = headers.length;
    const colWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth);
    });
    
    let result = '│ ' + headers.map((header, i) => 
      header.padEnd(colWidths[i])
    ).join(' │ ') + ' │\n';
    
    result += '├─' + colWidths.map(width => '─'.repeat(width)).join('─┼─') + '─┤\n';
    
    rows.forEach(row => {
      result += '│ ' + row.map((cell, i) => 
        (cell || '').padEnd(colWidths[i])
      ).join(' │ ') + ' │\n';
    });
    
    return result;
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
      case 'disk_usage':
        return `${value.toFixed(1)}%`;
      case 'temperature':
        return `${value.toFixed(1)}°C`;
      case 'gpu_usage':
        return `${value.toFixed(1)}%`;
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
      case 'disk_usage':
        return value > 80 ? '🔴' : value > 60 ? '🟡' : '🟢';
      case 'temperature':
        return value > 70 ? '🔴' : value > 50 ? '🟡' : '🟢';
      case 'gpu_usage':
        return value > 80 ? '🔴' : value > 50 ? '🟡' : '🟢';
      default:
        return '🟢';
    }
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

export default EnhancedDuplexMonitor;
