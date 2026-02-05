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
    console.log('🌍 Starting Global High-Frequency Sports Trading System...');
    
    try {
      // 1. Display system information
      this.displaySystemInfo();
      
      // 2. Check platform compatibility
      await this.checkPlatformCompatibility();
      
      // 3. Start the global integration manager
      console.log('🚀 Starting global integration manager...');
      await integrationManager.start();
      
      // 4. Start the trading API server
      console.log('🌐 Starting trading API server...');
      await sportsTradingAPI.start();
      
      // 5. Display global dashboard information
      this.displayGlobalDashboardInfo();
      
      // 6. Set up graceful shutdown
      this.setupShutdownHandlers();
      
      // 7. Start monitoring
      this.startMonitoring();
      
      console.log('🎉 Global High-Frequency Trading System is running!');
      console.log('📊 Enhanced Dashboard: Open trading-dashboard-enhanced.html');
      console.log('🔗 API: http://localhost:3000');
      console.log('⚡ Powered by 13-byte configuration system');
      console.log('🌍 Multi-Region, Cross-Platform, Production-Ready');
      
    } catch (error) {
      console.error('❌ Failed to start global trading application:', error);
      process.exit(1);
    }
  }

  // Display comprehensive system information
  private displaySystemInfo(): void {
    const systemReport = platformManager.getSystemReport();
    
    console.log('\n💻 SYSTEM INFORMATION:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ Platform & Environment                                      │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│ Platform: ${systemReport.platform.platform}-${systemReport.platform.arch.padEnd(15)} │`);
    console.log(`│ Cores: ${systemReport.platform.cores.toString().padEnd(21)} │`);
    console.log(`│ Memory: ${(systemReport.platform.memory / 1024 / 1024 / 1024).toFixed(1)}GB${' '.repeat(15)} │`);
    console.log(`│ Environment: ${systemReport.environment.isProduction ? 'Production' : 'Development'.padEnd(10)} │`);
    console.log(`│ Region: ${systemReport.environment.region.padEnd(21)} │`);
    console.log(`│ Timezone: ${systemReport.environment.timezone.padEnd(17)} │`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ Feature Support                                               │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    
    systemReport.optimizations.forEach(opt => {
      console.log(`│ ✅ ${opt.padEnd(53)} │`);
    });
    
    if (systemReport.recommendations.length > 0) {
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log('│ Recommendations                                               │');
      console.log('├─────────────────────────────────────────────────────────────┤');
      systemReport.recommendations.forEach(rec => {
        console.log(`│ ⚠️  ${rec.padEnd(53)} │`);
      });
    }
    
    console.log('└─────────────────────────────────────────────────────────────┘');
  }

  // Check platform compatibility
  private async checkPlatformCompatibility(): Promise<void> {
    console.log('\n🔍 PLATFORM COMPATIBILITY CHECK:');
    
    const isSupported = platformManager.isPlatformSupported();
    
    if (isSupported) {
      console.log('✅ Platform is fully supported');
    } else {
      console.log('⚠️  Platform has limited support');
      console.log('   Some features may not be available');
    }
    
    // Optimize performance
    console.log('🔧 Optimizing platform performance...');
    await platformManager.optimizePerformance();
    
    const perf = platformManager.getPlatformConfig().performance;
    console.log(`⚡ Performance optimized:`);
    console.log(`   Config latency: ${perf.configLatency}ns`);
    console.log(`   Signal latency: ${perf.signalLatency}ns`);
    console.log(`   Throughput: ${perf.throughput} ops/sec`);
  }

  // Display global dashboard information
  private displayGlobalDashboardInfo(): void {
    console.log('\n📱 GLOBAL TRADING DASHBOARD:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ Multi-Region Features                                         │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ 🌍 Active Regions: US, UK, EU, APAC                        │');
    console.log('│ 📱 Platform Integration: Polymarket, Fanduel               │');
    console.log('│ 🔄 Real-time Data Sync: 2-second intervals                 │');
    console.log('│ ⚡ Arbitrage Detection: Cross-region opportunities          │');
    console.log('│ 🛡️ Risk Management: Multi-region position limits            │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ Interactive Controls                                          │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ • Region selection with real-time toggle                    │');
    console.log('│ • Platform filtering (Polymarket/Fanduel)                   │');
    console.log('│ • Global auto-trading controls                              │');
    console.log('│ • Multi-region arbitrage enable/disable                    │');
    console.log('│ • Cross-platform risk management                           │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ Advanced Analytics                                           │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ • Regional performance metrics                             │');
    console.log('│ • Platform-specific statistics                             │');
    console.log('│ • Global P&L tracking                                      │');
    console.log('│ • Arbitrage opportunity alerts                             │');
    console.log('│ • Cross-region latency monitoring                          │');
    console.log('└─────────────────────────────────────────────────────────────┘');
  }

  // Setup graceful shutdown handlers
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop integration manager
        await integrationManager.stop();
        
        // Stop API server
        sportsTradingAPI.stop();
        
        // Display final statistics
        const metrics = integrationManager.getGlobalMetrics();
        const config = integrationManager.getGlobalConfig();
        
        console.log('\n📊 FINAL GLOBAL STATISTICS:');
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log(`│ Total Uptime: ${Math.floor(metrics.uptime / 1000 / 60)}m ${Math.floor((metrics.uptime % 60000) / 1000)}s${' '.repeat(42)} │`);
        console.log(`│ Data Points: ${metrics.totalDataPoints.toString().padEnd(47)} │`);
        console.log(`│ Signals Generated: ${metrics.totalSignals.toString().padEnd(41)} │`);
        console.log(`│ Trades Executed: ${metrics.totalTrades.toString().padEnd(43)} │`);
        console.log(`│ Success Rate: ${metrics.successRate.toFixed(1)}%${' '.repeat(46)} │`);
        console.log(`│ Total P&L: ${(metrics.pnl * 100).toFixed(2)}%${' '.repeat(49)} │`);
        console.log('├─────────────────────────────────────────────────────────────┤');
        console.log('│ Regional Coverage                                             │');
        console.log('├─────────────────────────────────────────────────────────────┤');
        console.log(`│ Active Regions: ${metrics.activeRegions}/${config.regions.length}${' '.repeat(38)} │`);
        console.log(`│ Active Platforms: ${metrics.activePlatforms}/${config.platforms.length}${' '.repeat(36)} │`);
        console.log(`│ Average Latency: ${metrics.averageLatency.toFixed(2)}ms${' '.repeat(40)} │`);
        console.log('└─────────────────────────────────────────────────────────────┘');
        
        console.log('\n🎓 Global High-Frequency Trading System stopped successfully');
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
          console.log('⚠️  System Health Issues Detected:');
          
          Object.entries(health.regions).forEach(([region, healthy]) => {
            if (!healthy) {
              console.log(`   ${region.toUpperCase()}: Unhealthy`);
            }
          });
          
          Object.entries(health.platforms).forEach(([platform, healthy]) => {
            if (!healthy) {
              console.log(`   ${platform}: Unhealthy`);
            }
          });
          
          health.performance.issues.forEach(issue => {
            console.log(`   Performance: ${issue}`);
          });
        }
        
        // Log metrics every 5 minutes
        if (Date.now() % 300000 < 30000) { // Roughly every 5 minutes
          const metrics = integrationManager.getGlobalMetrics();
          console.log(`📊 Status: ${metrics.totalDataPoints} data points, ${metrics.totalTrades} trades, ${(metrics.pnl * 100).toFixed(2)}% P&L`);
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
    console.log('🌍 GLOBAL HIGH-FREQUENCY TRADING DEMO');
    console.log('====================================');
    console.log('🚀 Multi-Region • Cross-Platform • Production-Ready');
    console.log('⚡ Powered by 13-byte configuration system');
    console.log('');

    const app = new GlobalTradingApp(3000);
    
    try {
      // Start the global system
      await app.start();
      
      // Run for demonstration period
      console.log('\n🎮 Running 2-minute global demonstration...');
      
      // Monitor progress
      let demoTime = 0;
      const demoInterval = setInterval(() => {
        demoTime += 10;
        const metrics = integrationManager.getGlobalMetrics();
        
        console.log(`⚡ [${demoTime}s] Regions: ${metrics.activeRegions}, Data: ${metrics.totalDataPoints}, Signals: ${metrics.totalSignals}, Trades: ${metrics.totalTrades}`);
        
        if (demoTime >= 120) {
          clearInterval(demoInterval);
          console.log('\n🎯 Demo completed! System continues running...');
          console.log('📱 Open trading-dashboard-enhanced.html to interact with the system');
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
    console.log('\n🎯 Global system is running. Press Ctrl+C to stop.');
    
    // Display interactive commands
    console.log('\n📮 Available Commands:');
    console.log('   • Open trading-dashboard-enhanced.html for interactive control');
    console.log('   • API available at http://localhost:3000');
    console.log('   • Health check: curl http://localhost:3000/trading/status');
    console.log('   • Performance: curl http://localhost:3000/trading/benchmark');
    
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
