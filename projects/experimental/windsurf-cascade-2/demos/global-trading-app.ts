#!/usr/bin/env bun
// Global High-Frequency Sports Trading Application
// Multi-Region, Cross-Platform, Production-Ready Trading System

import { integrationManager } from './src/trading/global/integration-manager.js';
import { platformManager } from './src/trading/cross-platform/platform-manager.js';
import { sportsTradingAPI } from './src/trading/sports-trading-api.js';

// Global trading application class
class GlobalTradingApp {
  private port: number;
  private dashboardUrl: string;

  constructor(port: number = 3000) {
    this.port = port;
    this.dashboardUrl = `file://${process.cwd()}/trading-dashboard-enhanced.html`;
  }

  // Start the global trading application
  public async start(): Promise<void> {
    console.info('🌍 Starting Global High-Frequency Sports Trading System...');
    
    try {
      // 1. Display system information
      this.displaySystemInfo();
      
      // 2. Check platform compatibility
      await this.checkPlatformCompatibility();
      
      // 3. Start the global integration manager
      console.info('🚀 Starting global integration manager...');
      await integrationManager.start();
      
      // 4. Start the trading API server
      console.info('🌐 Starting trading API server...');
      await sportsTradingAPI.start();
      
      // 5. Display global dashboard information
      this.displayGlobalDashboardInfo();
      
      // 6. Set up graceful shutdown
      this.setupShutdownHandlers();
      
      // 7. Start monitoring
      this.startMonitoring();
      
      console.info('🎉 Global High-Frequency Trading System is running!');
      console.info('📊 Enhanced Dashboard: Open trading-dashboard-enhanced.html');
      console.info('🔗 API: http://localhost:3000');
      console.info('⚡ Powered by 13-byte configuration system');
      console.info('🌍 Multi-Region, Cross-Platform, Production-Ready');
      
    } catch (error) {
      console.error('❌ Failed to start global trading application:', error);
      process.exit(1);
    }
  }

  // Display comprehensive system information
  private displaySystemInfo(): void {
    const systemReport = platformManager.getSystemReport();
    
    console.info('\n💻 SYSTEM INFORMATION:');
    console.info('┌─────────────────────────────────────────────────────────────┐');
    console.info('│ Platform & Environment                                      │');
    console.info('├─────────────────────────────────────────────────────────────┤');
    console.info(`│ Platform: ${systemReport.platform.platform}-${systemReport.platform.arch.padEnd(15)} │`);
    console.info(`│ Cores: ${systemReport.platform.cores.toString().padEnd(21)} │`);
    console.info(`│ Memory: ${(systemReport.platform.memory / 1024 / 1024 / 1024).toFixed(1)}GB${' '.repeat(15)} │`);
    console.info(`│ Environment: ${systemReport.environment.isProduction ? 'Production' : 'Development'.padEnd(10)} │`);
    console.info(`│ Region: ${systemReport.environment.region.padEnd(21)} │`);
    console.info(`│ Timezone: ${systemReport.environment.timezone.padEnd(17)} │`);
    console.info('├─────────────────────────────────────────────────────────────┤');
    console.info('│ Feature Support                                               │');
    console.info('├─────────────────────────────────────────────────────────────┤');
    
    systemReport.optimizations.forEach(opt => {
      console.info(`│ ✅ ${opt.padEnd(53)} │`);
    });
    
    if (systemReport.recommendations.length > 0) {
      console.info('├─────────────────────────────────────────────────────────────┤');
      console.info('│ Recommendations                                               │');
      console.info('├─────────────────────────────────────────────────────────────┤');
      systemReport.recommendations.forEach(rec => {
        console.info(`│ ⚠️  ${rec.padEnd(53)} │`);
      });
    }
    
    console.info('└─────────────────────────────────────────────────────────────┘');
  }

  // Check platform compatibility
  private async checkPlatformCompatibility(): Promise<void> {
    console.info('\n🔍 PLATFORM COMPATIBILITY CHECK:');
    
    const isSupported = platformManager.isPlatformSupported();
    
    if (isSupported) {
      console.info('✅ Platform is fully supported');
    } else {
      console.info('⚠️  Platform has limited support');
      console.info('   Some features may not be available');
    }
    
    // Optimize performance
    console.info('🔧 Optimizing platform performance...');
    await platformManager.optimizePerformance();
    
    const perf = platformManager.getPlatformConfig().performance;
    console.info(`⚡ Performance optimized:`);
    console.info(`   Config latency: ${perf.configLatency}ns`);
    console.info(`   Signal latency: ${perf.signalLatency}ns`);
    console.info(`   Throughput: ${perf.throughput} ops/sec`);
  }

  // Display global dashboard information
  private displayGlobalDashboardInfo(): void {
    console.info('\n📱 GLOBAL TRADING DASHBOARD:');
    console.info('┌─────────────────────────────────────────────────────────────┐');
    console.info('│ Multi-Region Features                                         │');
    console.info('├─────────────────────────────────────────────────────────────┤');
    console.info('│ 🌍 Active Regions: US, UK, EU, APAC                        │');
    console.info('│ 📱 Platform Integration: Polymarket, Fanduel               │');
    console.info('│ 🔄 Real-time Data Sync: 2-second intervals                 │');
    console.info('│ ⚡ Arbitrage Detection: Cross-region opportunities          │');
    console.info('│ 🛡️ Risk Management: Multi-region position limits            │');
    console.info('├─────────────────────────────────────────────────────────────┤');
    console.info('│ Interactive Controls                                          │');
    console.info('├─────────────────────────────────────────────────────────────┤');
    console.info('│ • Region selection with real-time toggle                    │');
    console.info('│ • Platform filtering (Polymarket/Fanduel)                   │');
    console.info('│ • Global auto-trading controls                              │');
    console.info('│ • Multi-region arbitrage enable/disable                    │');
    console.info('│ • Cross-platform risk management                           │');
    console.info('├─────────────────────────────────────────────────────────────┤');
    console.info('│ Advanced Analytics                                           │');
    console.info('├─────────────────────────────────────────────────────────────┤');
    console.info('│ • Regional performance metrics                             │');
    console.info('│ • Platform-specific statistics                             │');
    console.info('│ • Global P&L tracking                                      │');
    console.info('│ • Arbitrage opportunity alerts                             │');
    console.info('│ • Cross-region latency monitoring                          │');
    console.info('└─────────────────────────────────────────────────────────────┘');
  }

  // Setup graceful shutdown handlers
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.info(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop integration manager
        await integrationManager.stop();
        
        // Stop API server
        sportsTradingAPI.stop();
        
        // Display final statistics
        const metrics = integrationManager.getGlobalMetrics();
        const config = integrationManager.getGlobalConfig();
        
        console.info('\n📊 FINAL GLOBAL STATISTICS:');
        console.info('┌─────────────────────────────────────────────────────────────┐');
        console.info(`│ Total Uptime: ${Math.floor(metrics.uptime / 1000 / 60)}m ${Math.floor((metrics.uptime % 60000) / 1000)}s${' '.repeat(42)} │`);
        console.info(`│ Data Points: ${metrics.totalDataPoints.toString().padEnd(47)} │`);
        console.info(`│ Signals Generated: ${metrics.totalSignals.toString().padEnd(41)} │`);
        console.info(`│ Trades Executed: ${metrics.totalTrades.toString().padEnd(43)} │`);
        console.info(`│ Success Rate: ${metrics.successRate.toFixed(1)}%${' '.repeat(46)} │`);
        console.info(`│ Total P&L: ${(metrics.pnl * 100).toFixed(2)}%${' '.repeat(49)} │`);
        console.info('├─────────────────────────────────────────────────────────────┤');
        console.info('│ Regional Coverage                                             │');
        console.info('├─────────────────────────────────────────────────────────────┤');
        console.info(`│ Active Regions: ${metrics.activeRegions}/${config.regions.length}${' '.repeat(38)} │`);
        console.info(`│ Active Platforms: ${metrics.activePlatforms}/${config.platforms.length}${' '.repeat(36)} │`);
        console.info(`│ Average Latency: ${metrics.averageLatency.toFixed(2)}ms${' '.repeat(40)} │`);
        console.info('└─────────────────────────────────────────────────────────────┘');
        
        console.info('\n🎓 Global High-Frequency Trading System stopped successfully');
        process.exit(0);
        
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  // Start system monitoring
  private startMonitoring(): void {
    // Monitor system health every 30 seconds
    setInterval(async () => {
      try {
        const health = await integrationManager.getSystemHealth();
        
        if (!health.overall) {
          console.info('⚠️  System Health Issues Detected:');
          
          Object.entries(health.regions).forEach(([region, healthy]) => {
            if (!healthy) {
              console.info(`   ${region.toUpperCase()}: Unhealthy`);
            }
          });
          
          Object.entries(health.platforms).forEach(([platform, healthy]) => {
            if (!healthy) {
              console.info(`   ${platform}: Unhealthy`);
            }
          });
          
          health.performance.issues.forEach(issue => {
            console.info(`   Performance: ${issue}`);
          });
        }
        
        // Log metrics every 5 minutes
        if (Date.now() % 300000 < 30000) { // Roughly every 5 minutes
          const metrics = integrationManager.getGlobalMetrics();
          console.info(`📊 Status: ${metrics.totalDataPoints} data points, ${metrics.totalTrades} trades, ${(metrics.pnl * 100).toFixed(2)}% P&L`);
        }
        
      } catch (error) {
        console.error('Health monitoring failed:', error);
      }
    }, 30000);
  }

  // Get application status
  public getStatus(): {
    running: boolean;
    port: number;
    uptime: number;
    globalMetrics: any;
    systemHealth: any;
  } {
    return {
      running: integrationManager.getGlobalMetrics().uptime > 0,
      port: this.port,
      uptime: integrationManager.getGlobalMetrics().uptime,
      globalMetrics: integrationManager.getGlobalMetrics(),
      systemHealth: {} // Would be populated with actual health check
    };
  }
}

// Create enhanced demo for global trading
class GlobalTradingDemo {
  // Run comprehensive global demo
  public async run(): Promise<void> {
    console.info('🌍 GLOBAL HIGH-FREQUENCY TRADING DEMO');
    console.info('====================================');
    console.info('🚀 Multi-Region • Cross-Platform • Production-Ready');
    console.info('⚡ Powered by 13-byte configuration system');
    console.info('');

    const app = new GlobalTradingApp(3000);
    
    try {
      // Start the global system
      await app.start();
      
      // Run for demonstration period
      console.info('\n🎮 Running 2-minute global demonstration...');
      
      // Monitor progress
      let demoTime = 0;
      const demoInterval = setInterval(() => {
        demoTime += 10;
        const metrics = integrationManager.getGlobalMetrics();
        
        console.info(`⚡ [${demoTime}s] Regions: ${metrics.activeRegions}, Data: ${metrics.totalDataPoints}, Signals: ${metrics.totalSignals}, Trades: ${metrics.totalTrades}`);
        
        if (demoTime >= 120) {
          clearInterval(demoInterval);
          console.info('\n🎯 Demo completed! System continues running...');
          console.info('📱 Open trading-dashboard-enhanced.html to interact with the system');
        }
      }, 10000);
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    }
  }
}

// Main execution function
export async function runGlobalTradingApp(): Promise<void> {
  const app = new GlobalTradingApp(3000);
  
  try {
    await app.start();
    
    // Keep the process running
    console.info('\n🎯 Global system is running. Press Ctrl+C to stop.');
    
    // Display interactive commands
    console.info('\n📮 Available Commands:');
    console.info('   • Open trading-dashboard-enhanced.html for interactive control');
    console.info('   • API available at http://localhost:3000');
    console.info('   • Health check: curl http://localhost:3000/trading/status');
    console.info('   • Performance: curl http://localhost:3000/trading/benchmark');
    
  } catch (error) {
    console.error('❌ Application failed to start:', error);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.includes('--demo')) {
    const demo = new GlobalTradingDemo();
    demo.run().catch(console.error);
  } else {
    runGlobalTradingApp().catch(console.error);
  }
}
