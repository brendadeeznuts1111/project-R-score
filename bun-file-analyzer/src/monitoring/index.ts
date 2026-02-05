/**
 * Monitoring and Security Integration
 * Comprehensive monitoring system with security, performance tracking, and real-time analytics
 */

import { Bun } from "bun";
import { 
  SecureCookieManager, 
  SecurityMiddleware, 
  BundleAnalyzer, 
  PerformanceDashboard, 
  AppMonitor 
} from "../security/secure-cookie-manager";

// Export all monitoring components
export {
  SecureCookieManager,
  SecurityMiddleware,
  BundleAnalyzer,
  PerformanceDashboard,
  AppMonitor,
};

/**
 * Initialize comprehensive monitoring system
 */
export async function initializeMonitoring(options: {
  metafilePath?: string;
  monitoringPort?: number;
  enableSecurity?: boolean;
  enablePerformance?: boolean;
} = {}) {
  const colorize = (text: string, color?: string) => {
    return typeof Bun !== 'undefined' ? Bun.color(text, color) : text;
  };
  
  const {
    metafilePath = "./dist/metafile.json",
    monitoringPort = 3002,
    enableSecurity = true,
    enablePerformance = true,
  } = options;

  console.log(colorize("🚀 Initializing monitoring system...", "ansi"));

  // Initialize main monitor
  const monitor = new AppMonitor(metafilePath);
  
  // Analyze build if performance monitoring is enabled
  if (enablePerformance) {
    await monitor.analyzeBuild();
  }
  
  // Start monitoring server
  const server = await monitor.startMonitoring(monitoringPort);
  
  // Setup middleware for security
  const securityMiddleware = monitor.getSecurityMiddleware();
  const performanceDashboard = monitor.getPerformanceDashboard();
  
  console.log(colorize("✅ Monitoring system initialized", "ansi"));
  console.log(colorize("📊 Dashboard: http://localhost:" + monitoringPort, "ansi"));
  console.log(colorize("🔍 Bundle Analysis: http://localhost:" + monitoringPort + "/bundle-analysis", "ansi"));
  console.log(colorize("📈 Metrics API: http://localhost:" + monitoringPort + "/metrics", "ansi"));
  
  return {
    monitor,
    server,
    securityMiddleware,
    performanceDashboard,
    
    // Convenience methods
    recordMetric: (name: string, value: number, tags?: Record<string, string>) => 
      performanceDashboard.recordMetric(name, value, tags),
    
    secureRequest: (request: Request) => 
      securityMiddleware.secureRequest(request),
    
    generateReport: () => 
      performanceDashboard.generateReport(),
  };
}

/**
 * HMR integration for development
 */
if (import.meta.hot) {
  const colorize = (text: string, color?: string) => {
    return typeof Bun !== 'undefined' ? Bun.color(text, color) : text;
  };
  
  import.meta.hot.accept(async () => {
    console.log(colorize("🔄 Monitoring system hot reloaded", "ansi"));
    
    // Re-initialize monitoring with current options
    const monitoring = await initializeMonitoring();
    
    // Notify HMR system
    import.meta.hot.send("monitoring:reloaded", {
      timestamp: Date.now(),
      version: typeof Bun !== 'undefined' ? Bun.version : "unknown",
    });
  });
  
  // Handle HMR disconnect
  import.meta.hot.on("monitoring:disconnect", () => {
    console.log(colorize("🔌 Monitoring system disconnected", "ansi"));
  });
}

/**
 * Default export for easy integration
 */
export default initializeMonitoring;
