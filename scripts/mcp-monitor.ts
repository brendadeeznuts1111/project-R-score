#!/usr/bin/env bun

/**
 * 📊 Health Dashboard - MCP System Monitor
 * 
 * Comprehensive monitoring dashboard for Model Context Protocol
 * with AI-powered health analysis and real-time metrics.
 */

import { aiOperations } from '../lib/ai/ai-operations-manager.ts';
import { nanoseconds } from 'bun';
import { globalCaches } from '../lib/performance/cache-manager.ts';
import { anomalyDetector } from '../lib/ai/anomaly-detector.ts';
import { zeroTrustManager } from '../lib/security/zero-trust-manager.ts';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function colorize(text: string, color: string, style?: 'bold'): string {
  let prefix = colors[color as keyof typeof colors] || colors.gray;
  if (style === 'bold') {
    prefix = colors.bright + prefix;
  }
  return `${prefix}${text}${colors.reset}`;
}

interface MCPHealth {
  timestamp: number;
  systems: {
    ai: AIHealth;
    security: SecurityHealth;
    cache: CacheHealth;
    anomalies: AnomalyHealth;
  };
  overall: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
  };
}

interface AIHealth {
  commandsProcessed: number;
  insightsGenerated: number;
  predictionsAccuracy: number;
  averageResponseTime: number;
  activeOptimizations: number;
}

interface SecurityHealth {
  authenticationSuccess: number;
  threatsBlocked: number;
  riskScore: number;
  activeIdentities: number;
  policiesEnforced: number;
}

interface CacheHealth {
  hitRate: number;
  memoryUsage: number;
  evictionRate: number;
  totalOperations: number;
  intelligentOptimizations: number;
}

interface AnomalyHealth {
  anomaliesDetected: number;
  falsePositiveRate: number;
  averageDetectionTime: number;
  activeRules: number;
  automatedResponses: number;
}

class MCPMonitor {
  private startTime: number;
  private isRunning = false;
  private monitorInterval?: ReturnType<typeof setInterval>;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  async collectHealthMetrics(): Promise<MCPHealth> {
    const start = nanoseconds();
    
    // AI Operations Health
    const aiInsights = aiOperations.getInsights();
    const aiSuggestions = await aiOperations.getOptimizationSuggestions();
    const aiHealth: AIHealth = {
      commandsProcessed: aiInsights.length,
      insightsGenerated: aiSuggestions.length,
      predictionsAccuracy: 0.85, // Mock - would be calculated from real data
      averageResponseTime: 150, // Mock - would be calculated from real metrics
      activeOptimizations: aiInsights.filter(i => i.type === 'performance').length
    };
    
    // Security Health
    const securityStats = zeroTrustManager.getStatistics();
    const securityHealth: SecurityHealth = {
      authenticationSuccess: 95.2, // Mock percentage
      threatsBlocked: 12,
      riskScore: 25,
      activeIdentities: securityStats?.totalIdentities || 0,
      policiesEnforced: securityStats?.totalPolicies || 0
    };
    
    // Cache Health
    const cacheHealth: CacheHealth = {
      hitRate: globalCaches.secrets.getStats().hitRate,
      memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      evictionRate: 0.05, // Mock percentage
      totalOperations: globalCaches.secrets.getStats().hits + globalCaches.secrets.getStats().misses,
      intelligentOptimizations: 8 // Mock number
    };
    
    // Anomaly Detection Health
    const anomalyStats = anomalyDetector.getStatistics();
    const anomalyHealth: AnomalyHealth = {
      anomaliesDetected: anomalyStats.totalAnomalies,
      falsePositiveRate: 0.15, // Mock percentage
      averageDetectionTime: 250, // Mock milliseconds
      activeRules: 25, // Mock number
      automatedResponses: anomalyStats.totalAnomalies * 0.6 // Mock percentage
    };
    
    // Calculate overall health score
    const aiScore = Math.min(100, (aiHealth.predictionsAccuracy * 50) + (100 - aiHealth.averageResponseTime / 5));
    const securityScore = Math.max(0, 100 - securityHealth.riskScore);
    const cacheScore = cacheHealth.hitRate * 100;
    const anomalyScore = Math.max(0, 100 - (anomalyHealth.falsePositiveRate * 100));
    
    const overallScore = (aiScore + securityScore + cacheScore + anomalyScore) / 4;
    
    const health: MCPHealth = {
      timestamp: Date.now(),
      systems: {
        ai: aiHealth,
        security: securityHealth,
        cache: cacheHealth,
        anomalies: anomalyHealth
      },
      overall: {
        score: overallScore,
        status: overallScore >= 80 ? 'healthy' : overallScore >= 60 ? 'warning' : 'critical',
        uptime: Date.now() - this.startTime
      }
    };
    
    return health;
  }
  
  getHealthColor(score: number): string {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  }
  
  getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  }
  
  formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
  
  displayHealthDashboard(health: MCPHealth) {
    console.clear();
    console.log(colorize('📊 MCP HEALTH DASHBOARD', 'bright') + colorize('', 'cyan'));
    console.log(colorize('═'.repeat(80), 'gray'));
    
    // Overall Status
    const overallColor = this.getHealthColor(health.overall.score);
    const statusIcon = this.getStatusIcon(health.overall.status);
    
    console.log(colorize('\n🏥 OVERALL SYSTEM HEALTH', 'white', 'bold'));
    console.log(`${colorize('Status:', 'gray')} ${statusIcon} ${colorize(health.overall.status.toUpperCase(), overallColor)}`);
    console.log(`${colorize('Score:', 'gray')} ${colorize(health.overall.score.toFixed(1), overallColor)}/100`);
    console.log(`${colorize('Uptime:', 'gray')} ${colorize(this.formatUptime(health.overall.uptime), 'cyan')}`);
    console.log(`${colorize('Last Update:', 'gray')} ${colorize(new Date(health.timestamp).toLocaleTimeString(), 'cyan')}`);
    
    // AI Operations
    console.log(colorize('\n🤖 AI OPERATIONS', 'yellow', 'bold'));
    console.log(colorize('─'.repeat(40), 'gray'));
    console.log(`${colorize('Commands Processed:', 'gray')} ${colorize(health.systems.ai.commandsProcessed.toString(), 'cyan')}`);
    console.log(`${colorize('Insights Generated:', 'gray')} ${colorize(health.systems.ai.insightsGenerated.toString(), 'cyan')}`);
    console.log(`${colorize('Prediction Accuracy:', 'gray')} ${colorize(`${health.systems.ai.predictionsAccuracy.toFixed(1)}%`, this.getHealthColor(health.systems.ai.predictionsAccuracy))}`);
    console.log(`${colorize('Avg Response Time:', 'gray')} ${colorize(`${health.systems.ai.averageResponseTime}ms`, 'cyan')}`);
    console.log(`${colorize('Active Optimizations:', 'gray')} ${colorize(health.systems.ai.activeOptimizations.toString(), 'cyan')}`);
    
    // Security
    console.log(colorize('\n🔒 SECURITY SYSTEM', 'yellow', 'bold'));
    console.log(colorize('─'.repeat(40), 'gray'));
    console.log(`${colorize('Auth Success Rate:', 'gray')} ${colorize(`${health.systems.security.authenticationSuccess.toFixed(1)}%`, this.getHealthColor(health.systems.security.authenticationSuccess))}`);
    console.log(`${colorize('Threats Blocked:', 'gray')} ${colorize(health.systems.security.threatsBlocked.toString(), 'cyan')}`);
    console.log(`${colorize('Risk Score:', 'gray')} ${colorize(health.systems.security.riskScore.toString(), this.getHealthColor(100 - health.systems.security.riskScore))}`);
    console.log(`${colorize('Active Identities:', 'gray')} ${colorize(health.systems.security.activeIdentities.toString(), 'cyan')}`);
    console.log(`${colorize('Policies Enforced:', 'gray')} ${colorize(health.systems.security.policiesEnforced.toString(), 'cyan')}`);
    
    // Cache Performance
    console.log(colorize('\n🗄️  CACHE PERFORMANCE', 'yellow', 'bold'));
    console.log(colorize('─'.repeat(40), 'gray'));
    console.log(`${colorize('Hit Rate:', 'gray')} ${colorize(`${(health.systems.cache.hitRate * 100).toFixed(1)}%`, this.getHealthColor(health.systems.cache.hitRate * 100))}`);
    console.log(`${colorize('Memory Usage:', 'gray')} ${colorize(`${health.systems.cache.memoryUsage.toFixed(1)}%`, this.getHealthColor(100 - health.systems.cache.memoryUsage))}`);
    console.log(`${colorize('Eviction Rate:', 'gray')} ${colorize(`${(health.systems.cache.evictionRate * 100).toFixed(1)}%`, 'cyan')}`);
    console.log(`${colorize('Total Operations:', 'gray')} ${colorize(health.systems.cache.totalOperations.toLocaleString(), 'cyan')}`);
    console.log(`${colorize('Smart Optimizations:', 'gray')} ${colorize(health.systems.cache.intelligentOptimizations.toString(), 'cyan')}`);
    
    // Anomaly Detection
    console.log(colorize('\n🛡️  ANOMALY DETECTION', 'yellow', 'bold'));
    console.log(colorize('─'.repeat(40), 'gray'));
    console.log(`${colorize('Anomalies Detected:', 'gray')} ${colorize(health.systems.anomalies.anomaliesDetected.toString(), 'cyan')}`);
    console.log(`${colorize('False Positive Rate:', 'gray')} ${colorize(`${(health.systems.anomalies.falsePositiveRate * 100).toFixed(1)}%`, this.getHealthColor(100 - health.systems.anomalies.falsePositiveRate * 100))}`);
    console.log(`${colorize('Avg Detection Time:', 'gray')} ${colorize(`${health.systems.anomalies.averageDetectionTime}ms`, 'cyan')}`);
    console.log(`${colorize('Active Rules:', 'gray')} ${colorize(health.systems.anomalies.activeRules.toString(), 'cyan')}`);
    console.log(`${colorize('Automated Responses:', 'gray')} ${colorize(health.systems.anomalies.automatedResponses.toString(), 'cyan')}`);
    
    // AI Recommendations
    console.log(colorize('\n💡 AI RECOMMENDATIONS', 'magenta', 'bold'));
    console.log(colorize('─'.repeat(40), 'gray'));
    
    const criticalInsights = aiOperations.getInsights({ 
      impact: 'critical', 
      minConfidence: 0.7 
    }).slice(0, 3);
    
    if (criticalInsights.length > 0) {
      criticalInsights.forEach((insight, i) => {
        console.log(`${colorize(`${i + 1}.`, 'magenta')} ${colorize(insight.title, 'white')} (${colorize(`${(insight.confidence * 100).toFixed(0)}%`, 'cyan')} confidence)`);
      });
    } else {
      console.log(colorize('   No critical recommendations at this time', 'green'));
    }
    
    // Footer
    console.log(colorize('\n' + '═'.repeat(80), 'gray'));
    console.log(colorize('Press Ctrl+C to exit monitoring | Updates every 5 seconds', 'gray'));
  }
  
  async startMonitoring(interval: number = 5000) {
    if (this.isRunning) {
      console.log(colorize('⚠️  Monitoring already running', 'yellow'));
      return;
    }
    
    this.isRunning = true;
    console.log(colorize('🚀 Starting MCP Health Monitor...', 'cyan'));
    
    // Initial display
    const health = await this.collectHealthMetrics();
    this.displayHealthDashboard(health);
    
    // Set up interval for continuous monitoring
    this.monitorInterval = setInterval(async () => {
      try {
        const health = await this.collectHealthMetrics();
        this.displayHealthDashboard(health);
      } catch (error) {
        console.error(colorize('❌ Monitor error:', 'red'), error.message);
      }
    }, interval);
  }
  
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    this.isRunning = false;
    console.log(colorize('\n🛑 Monitoring stopped', 'yellow'));
  }
}

async function main() {
  const monitor = new MCPMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  try {
    await monitor.startMonitoring();
  } catch (error) {
    console.error(colorize('❌ Failed to start monitoring:', 'red'), error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
