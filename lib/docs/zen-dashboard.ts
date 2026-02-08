/**
 * Zen Documentation Dashboard
 * Real-time visualization of the Ultra-Zen Documentation System
 */

import { ZenStreamSearcher } from './stream-search';
import { FetchAndRipStreamer, DOCUMENTATION_URLS } from './fetch-and-rip';
import { VirtualFileManager } from './virtual-file-manager';

interface DashboardMetrics {
  totalSearches: number;
  averageSearchTime: number;
  totalMatches: number;
  memoryUsage: number;
  networkStreams: number;
  virtualFiles: number;
  systemHealth: 'optimal' | 'good' | 'warning' | 'critical';
  lastUpdate: string;
}

interface SearchHistory {
  query: string;
  matches: number;
  time: number;
  timestamp: string;
  type: 'local' | 'network' | 'template' | 'virtual';
}

/**
 * Real-time Dashboard for Zen Documentation System
 */
export class ZenDocumentationDashboard {
  private metrics: DashboardMetrics;
  private searchHistory: SearchHistory[] = [];
  private searcher: ZenStreamSearcher;
  private networkStreamer: FetchAndRipStreamer;
  private virtualManager: VirtualFileManager;
  private updateInterval: any = null;

  constructor() {
    this.metrics = {
      totalSearches: 0,
      averageSearchTime: 0,
      totalMatches: 0,
      memoryUsage: 0,
      networkStreams: 0,
      virtualFiles: 0,
      systemHealth: 'optimal',
      lastUpdate: new Date().toISOString()
    };

    this.searcher = new ZenStreamSearcher();
    this.networkStreamer = new FetchAndRipStreamer();
    this.virtualManager = new VirtualFileManager();
  }

  /**
   * Start real-time dashboard monitoring
   */
  startMonitoring(): void {
    console.log('📊 Starting Zen Documentation Dashboard...');
    
    // Update metrics every 5 seconds
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
      this.renderDashboard();
    }, 5000);

    // Initial render
    this.renderDashboard();
  }

  /**
   * Stop dashboard monitoring
   */
  stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('📊 Dashboard monitoring stopped.');
  }

  /**
   * Update system metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      // Get current memory usage
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB

      // Count virtual files
      const virtualFiles = await this.virtualManager.listVirtualFiles('*');
      this.metrics.virtualFiles = virtualFiles.length;

      // Calculate system health based on metrics
      this.updateSystemHealth();

      this.metrics.lastUpdate = new Date().toISOString();
    } catch (error) {
      console.error('❌ Error updating metrics:', error);
    }
  }

  /**
   * Update system health status
   */
  private updateSystemHealth(): void {
    const { memoryUsage, averageSearchTime, totalSearches } = this.metrics;
    
    if (memoryUsage > 100 || averageSearchTime > 1000) {
      this.metrics.systemHealth = 'critical';
    } else if (memoryUsage > 50 || averageSearchTime > 500) {
      this.metrics.systemHealth = 'warning';
    } else if (memoryUsage > 20 || averageSearchTime > 100) {
      this.metrics.systemHealth = 'good';
    } else {
      this.metrics.systemHealth = 'optimal';
    }
  }

  /**
   * Record a search in history
   */
  recordSearch(query: string, matches: number, time: number, type: SearchHistory['type']): void {
    const search: SearchHistory = {
      query,
      matches,
      time,
      timestamp: new Date().toISOString(),
      type
    };

    this.searchHistory.unshift(search);
    if (this.searchHistory.length > 10) {
      this.searchHistory = this.searchHistory.slice(0, 10);
    }

    // Update metrics
    this.metrics.totalSearches++;
    this.metrics.totalMatches += matches;
    this.metrics.averageSearchTime = 
      this.searchHistory.reduce((sum, s) => sum + s.time, 0) / this.searchHistory.length;

    if (type === 'network') {
      this.metrics.networkStreams++;
    }
  }

  /**
   * Render the dashboard
   */
  private renderDashboard(): void {
    // Clear screen
    console.clear();
    
    console.log('🎪 Zen Documentation Dashboard - Real-time Monitoring');
    console.log('='.repeat(80));
    
    // System Health Indicator
    this.renderSystemHealth();
    
    // Key Metrics
    this.renderKeyMetrics();
    
    // Recent Searches
    this.renderSearchHistory();
    
    // Performance Graph
    this.renderPerformanceGraph();
    
    // System Information
    this.renderSystemInfo();
    
    console.log('\n🔄 Updating every 5 seconds... (Press Ctrl+C to stop)');
  }

  /**
   * Render system health indicator
   */
  private renderSystemHealth(): void {
    const health = this.metrics.systemHealth;
    const healthIcons = {
      optimal: '🟢',
      good: '🟡', 
      warning: '🟠',
      critical: '🔴'
    };
    
    console.log(`${healthIcons[health]} System Health: ${health.toUpperCase()}`);
    console.log(`   Last Update: ${new Date(this.metrics.lastUpdate).toLocaleString()}`);
    console.log('');
  }

  /**
   * Render key metrics
   */
  private renderKeyMetrics(): void {
    console.log('📊 Key Metrics:');
    console.log(`   🔍 Total Searches: ${this.metrics.totalSearches}`);
    console.log(`   ⚡ Avg Search Time: ${this.metrics.averageSearchTime.toFixed(2)}ms`);
    console.log(`   🎯 Total Matches: ${this.metrics.totalMatches}`);
    console.log(`   💾 Memory Usage: ${this.metrics.memoryUsage.toFixed(2)}MB`);
    console.log(`   🌐 Network Streams: ${this.metrics.networkStreams}`);
    console.log(`   📁 Virtual Files: ${this.metrics.virtualFiles}`);
    console.log('');
  }

  /**
   * Render search history
   */
  private renderSearchHistory(): void {
    console.log('📜 Recent Searches:');
    
    if (this.searchHistory.length === 0) {
      console.log('   No searches performed yet.');
    } else {
      this.searchHistory.forEach((search, index) => {
        const typeIcons = {
          local: '🧘',
          network: '🌐',
          template: '🧭',
          virtual: '🌐'
        };
        
        console.log(`   ${index + 1}. ${typeIcons[search.type]} "${search.query}" - ${search.matches} matches in ${search.time.toFixed(2)}ms`);
      });
    }
    console.log('');
  }

  /**
   * Render performance graph
   */
  private renderPerformanceGraph(): void {
    console.log('📈 Performance Timeline:');
    
    if (this.searchHistory.length === 0) {
      console.log('   No data to display.');
      return;
    }

    // Create simple ASCII graph
    const maxTime = Math.max(...this.searchHistory.map(s => s.time));
    const graphWidth = 50;
    
    this.searchHistory.slice(0, 8).forEach((search, index) => {
      const barLength = Math.round((search.time / maxTime) * graphWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(graphWidth - barLength);
      const query = search.query.substring(0, 12).padEnd(12);
      
      console.log(`   ${query} │${bar}│ ${search.time.toFixed(0)}ms`);
    });
    console.log('');
  }

  /**
   * Render system information
   */
  private renderSystemInfo(): void {
    console.log('💻 System Information:');
    console.log(`   Platform: ${process.platform} ${process.arch}`);
    console.log(`   Node Version: ${process.version}`);
    console.log(`   PID: ${process.pid}`);
    console.log(`   Uptime: ${(process.uptime() / 60).toFixed(1)} minutes`);
    console.log('');
  }

  /**
   * Generate HTML dashboard
   */
  async generateHTMLDashboard(): Promise<string> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zen Documentation Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #e2e8f0; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; }
        .metric-value { font-size: 2em; font-weight: bold; color: #3b82f6; }
        .metric-label { color: #94a3b8; margin-top: 5px; }
        .health-${this.metrics.systemHealth} { color: ${this.metrics.systemHealth === 'optimal' ? '#22c55e' : this.metrics.systemHealth === 'good' ? '#f59e0b' : '#ef4444'}; }
        .search-history { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; }
        .search-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #334155; }
        .search-item:last-child { border-bottom: none; }
        .performance-chart { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🎪 Zen Documentation Dashboard</h1>
            <p class="health-${this.metrics.systemHealth}">System Health: ${this.metrics.systemHealth.toUpperCase()}</p>
            <p>Last Update: ${new Date(this.metrics.lastUpdate).toLocaleString()}</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${this.metrics.totalSearches}</div>
                <div class="metric-label">Total Searches</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.metrics.averageSearchTime.toFixed(2)}ms</div>
                <div class="metric-label">Average Search Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.metrics.totalMatches}</div>
                <div class="metric-label">Total Matches</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.metrics.memoryUsage.toFixed(2)}MB</div>
                <div class="metric-label">Memory Usage</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.metrics.networkStreams}</div>
                <div class="metric-label">Network Streams</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.metrics.virtualFiles}</div>
                <div class="metric-label">Virtual Files</div>
            </div>
        </div>
        
        <div class="search-history">
            <h2>📜 Recent Searches</h2>
            ${this.searchHistory.map(search => `
                <div class="search-item">
                    <span>${search.type} - "${search.query}"</span>
                    <span>${search.matches} matches in ${search.time.toFixed(2)}ms</span>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
    
    return html;
  }

  /**
   * Demonstrate dashboard with live searches
   */
  async demonstrateDashboard(): Promise<void> {
    console.log('🎪 Zen Documentation Dashboard Demo');
    console.log('=' .repeat(60));
    
    this.startMonitoring();
    
    // Perform some demo searches
    const demoQueries = ['bun', 'performance', 'streaming', 'zen'];
    
    for (const query of demoQueries) {
      console.log(`\n🔍 Performing demo search: ${query}`);
      
      try {
        // Local search
        const startTime = performance.now();
        const results = await this.searcher.streamSearch({
          query,
          cachePath: '/Users/nolarose/Projects/.cache'
        });
        const searchTime = performance.now() - startTime;
        
        this.recordSearch(query, results.matchesFound, searchTime, 'local');
        
        // Wait a bit for visual effect
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`⚠️ Search failed: ${error.message}`);
      }
    }
    
    // Generate HTML dashboard
    console.log('\n📄 Generating HTML dashboard...');
    const htmlDashboard = await this.generateHTMLDashboard();
    
    const dashboardFile = (Bun as any).file('zen-dashboard.html', { type: 'text/html' });
    await Bun.write(dashboardFile, new TextEncoder().encode(htmlDashboard));
    
    console.log('✅ HTML dashboard saved as: zen-dashboard.html');
    
    // Keep monitoring for a bit
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    this.stopMonitoring();
  }
}

// Run dashboard demo
if (import.meta.url === `file://${process.argv[1]}`) {
  const dashboard = new ZenDocumentationDashboard();
  dashboard.demonstrateDashboard().catch(console.error);
}
