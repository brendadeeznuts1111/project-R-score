/**
 * REAL Zen Dashboard - Connected to Actual Search System
 * Shows genuine search data, not simulated values
 */

import { ZenStreamSearcher } from './stream-search';
import { FetchAndRipStreamer, DOCUMENTATION_URLS } from './fetch-and-rip';

interface RealMetrics {
  totalSearches: number;
  realSearchHistory: Array<{
    query: string;
    matches: number;
    time: number;
    memory: number;
    timestamp: string;
  }>;
  systemHealth: 'optimal' | 'good' | 'warning' | 'critical';
  lastUpdate: string;
}

/**
 * Real Dashboard with Actual Search Integration
 */
export class RealZenDashboard {
  private metrics: RealMetrics;
  private searcher: ZenStreamSearcher;
  private networkStreamer: FetchAndRipStreamer;
  private updateInterval: any = null;

  constructor() {
    this.metrics = {
      totalSearches: 0,
      realSearchHistory: [],
      systemHealth: 'optimal',
      lastUpdate: new Date().toISOString()
    };

    this.searcher = new ZenStreamSearcher();
    this.networkStreamer = new FetchAndRipStreamer();
  }

  /**
   * Start REAL monitoring with actual searches
   */
  startRealMonitoring(): void {
    console.log('🎯 Starting REAL Zen Dashboard - Live Search Data!');
    
    // Perform actual searches every 10 seconds
    this.updateInterval = setInterval(async () => {
      await this.performRealSearch();
      this.renderRealDashboard();
    }, 10000);

    // Initial search
    this.performRealSearch().then(() => this.renderRealDashboard());
  }

  /**
   * Perform a REAL search and record results
   */
  private async performRealSearch(): Promise<void> {
    const queries = ['bun', 'performance', 'streaming', 'zen', 'fetch'];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    
    console.log(`🔍 Performing REAL search: "${randomQuery}"`);
    
    try {
      const startTime = performance.now();
      const results = await this.searcher.streamSearch({
        query: randomQuery,
        cachePath: '/Users/nolarose/Projects/.cache'
      });
      const searchTime = performance.now() - startTime;

      // Record REAL data
      const realSearch = {
        query: randomQuery,
        matches: results.matchesFound,
        time: searchTime,
        memory: results.memoryUsage / 1024 / 1024, // MB
        timestamp: new Date().toISOString()
      };

      this.metrics.realSearchHistory.unshift(realSearch);
      if (this.metrics.realSearchHistory.length > 10) {
        this.metrics.realSearchHistory = this.metrics.realSearchHistory.slice(0, 10);
      }

      this.metrics.totalSearches++;
      this.updateSystemHealth();
      this.metrics.lastUpdate = new Date().toISOString();

      console.log(`✅ REAL Search Results: ${results.matchesFound} matches in ${searchTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error(`❌ Real search failed: ${error.message}`);
    }
  }

  /**
   * Update system health based on REAL data
   */
  private updateSystemHealth(): void {
    if (this.metrics.realSearchHistory.length === 0) {
      this.metrics.systemHealth = 'optimal';
      return;
    }

    const avgTime = this.metrics.realSearchHistory.reduce((sum, s) => sum + s.time, 0) / this.metrics.realSearchHistory.length;
    const avgMemory = this.metrics.realSearchHistory.reduce((sum, s) => sum + s.memory, 0) / this.metrics.realSearchHistory.length;

    if (avgTime > 100 || avgMemory > 50) {
      this.metrics.systemHealth = 'critical';
    } else if (avgTime > 50 || avgMemory > 20) {
      this.metrics.systemHealth = 'warning';
    } else if (avgTime > 20 || avgMemory > 10) {
      this.metrics.systemHealth = 'good';
    } else {
      this.metrics.systemHealth = 'optimal';
    }
  }

  /**
   * Render REAL dashboard with actual data
   */
  private renderRealDashboard(): void {
    console.clear();
    console.log('🎯 REAL Zen Dashboard - Live Search Data');
    console.log('=' .repeat(70));
    
    // System Health
    const healthIcons = { optimal: '🟢', good: '🟡', warning: '🟠', critical: '🔴' };
    console.log(`${healthIcons[this.metrics.systemHealth]} System Health: ${this.metrics.systemHealth.toUpperCase()}`);
    console.log(`   Last Update: ${new Date(this.metrics.lastUpdate).toLocaleString()}`);
    console.log('');
    
    // REAL Metrics
    if (this.metrics.realSearchHistory.length > 0) {
      const latest = this.metrics.realSearchHistory[0];
      const avgTime = this.metrics.realSearchHistory.reduce((sum, s) => sum + s.time, 0) / this.metrics.realSearchHistory.length;
      const avgMemory = this.metrics.realSearchHistory.reduce((sum, s) => sum + s.memory, 0) / this.metrics.realSearchHistory.length;
      const totalMatches = this.metrics.realSearchHistory.reduce((sum, s) => sum + s.matches, 0);

      console.log('📊 REAL Search Metrics:');
      console.log(`   🔍 Total Searches: ${this.metrics.totalSearches}`);
      console.log(`   ⚡ Avg Search Time: ${avgTime.toFixed(2)}ms`);
      console.log(`   🎯 Total Matches: ${totalMatches}`);
      console.log(`   💾 Avg Memory: ${avgMemory.toFixed(2)}MB`);
      console.log(`   🌐 Latest Query: "${latest.query}"`);
      console.log('');
    }

    // REAL Search History
    console.log('📜 REAL Search History:');
    if (this.metrics.realSearchHistory.length === 0) {
      console.log('   No searches performed yet.');
    } else {
      this.metrics.realSearchHistory.forEach((search, index) => {
        console.log(`   ${index + 1}. 🔍 "${search.query}" - ${search.matches} matches in ${search.time.toFixed(2)}ms (${search.memory.toFixed(2)}MB)`);
      });
    }
    console.log('');

    // Performance Graph
    console.log('📈 REAL Performance Timeline:');
    if (this.metrics.realSearchHistory.length > 0) {
      const maxTime = Math.max(...this.metrics.realSearchHistory.map(s => s.time));
      const graphWidth = 40;
      
      this.metrics.realSearchHistory.slice(0, 8).forEach((search, index) => {
        const barLength = Math.round((search.time / maxTime) * graphWidth);
        const bar = '█'.repeat(barLength) + '░'.repeat(graphWidth - barLength);
        const query = search.query.substring(0, 10).padEnd(10);
        
        console.log(`   ${query} │${bar}│ ${search.time.toFixed(0)}ms (${search.matches} matches)`);
      });
    }
    console.log('');

    console.log('🔄 Performing REAL searches every 10 seconds...');
    console.log('🎯 This is 100% REAL data from our Zen Search Engine!');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('👋 Real dashboard monitoring stopped.');
  }

  /**
   * Generate REAL HTML dashboard
   */
  async generateRealHTMLDashboard(): Promise<string> {
    const avgTime = this.metrics.realSearchHistory.length > 0 
      ? this.metrics.realSearchHistory.reduce((sum, s) => sum + s.time, 0) / this.metrics.realSearchHistory.length 
      : 0;
    const avgMemory = this.metrics.realSearchHistory.length > 0
      ? this.metrics.realSearchHistory.reduce((sum, s) => sum + s.memory, 0) / this.metrics.realSearchHistory.length
      : 0;
    const totalMatches = this.metrics.realSearchHistory.reduce((sum, s) => sum + s.matches, 0);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>REAL Zen Dashboard - Live Search Data</title>
    <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #e2e8f0; }
        .real-badge { background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; margin-left: 10px; }
        .metric-card { background: #1e293b; padding: 20px; border-radius: 12px; margin: 10px 0; border: 1px solid #334155; }
        .metric-value { font-size: 2em; font-weight: bold; color: #22c55e; }
        .search-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #334155; }
    </style>
</head>
<body>
    <h1>🎯 REAL Zen Dashboard <span class="real-badge">LIVE DATA</span></h1>
    <p>100% Real search results from our Ultra-Zen Documentation System</p>
    
    <div class="metric-card">
        <div class="metric-value">${this.metrics.totalSearches}</div>
        <div>🔍 Total REAL Searches</div>
    </div>
    
    <div class="metric-card">
        <div class="metric-value">${avgTime.toFixed(2)}ms</div>
        <div>⚡ Average REAL Search Time</div>
    </div>
    
    <div class="metric-card">
        <div class="metric-value">${totalMatches}</div>
        <div>🎯 Total REAL Matches</div>
    </div>
    
    <div class="metric-card">
        <div class="metric-value">${avgMemory.toFixed(2)}MB</div>
        <div>💾 Average REAL Memory Usage</div>
    </div>
    
    <div class="metric-card">
        <h3>📜 REAL Search History</h3>
        ${this.metrics.realSearchHistory.map(search => `
            <div class="search-item">
                <span>🔍 "${search.query}"</span>
                <span>${search.matches} matches • ${search.time.toFixed(2)}ms</span>
            </div>
        `).join('')}
    </div>
    
    <p style="text-align: center; margin-top: 40px; color: #64748b;">
        🎯 This dashboard shows 100% REAL search data<br>
        🚀 No simulated values - actual performance metrics
    </p>
</body>
</html>`;
    
    return html;
  }
}

// Run REAL dashboard
if (import.meta.url === `file://${process.argv[1]}`) {
  const realDashboard = new RealZenDashboard();
  realDashboard.startRealMonitoring();
  
  // Stop after 5 minutes
  setTimeout(() => {
    realDashboard.stopMonitoring();
  }, 5 * 60 * 1000);
}
