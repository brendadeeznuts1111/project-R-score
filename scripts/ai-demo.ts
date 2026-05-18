#!/usr/bin/env bun

/**
 * 🤖 Intelligent Insights - AI Demo
 *
 * Comprehensive demonstration of AI Operations Manager capabilities
 * with real-time insights, predictions, and intelligent optimizations.
 */

import { aiOperations } from '../lib/ai/ai-operations-manager.ts';
import { SmartCacheManager, smartCaches } from '../lib/ai/smart-cache-manager.ts';
import { anomalyDetector } from '../lib/ai/anomaly-detector.ts';
import { zeroTrustManager } from '../lib/security/zero-trust-manager.ts';
import { nanoseconds, deepEquals, openInEditor } from 'bun';
import { c, glyphs, getProfileTheme } from '../lib/utils/color-system.ts';

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
  gray: '\x1b[90m',
};

function colorize(text: string, color: string, style?: 'bold'): string {
  let prefix = colors[color as keyof typeof colors] || colors.gray;
  if (style === 'bold') {
    prefix = colors.bright + prefix;
  }
  return `${prefix}${text}${colors.reset}`;
}

interface AIDemoConfig {
  duration: number; // seconds
  intensity: 'light' | 'moderate' | 'heavy';
  features: {
    predictions: boolean;
    optimizations: boolean;
    anomalyDetection: boolean;
    securityAnalysis: boolean;
    smartCaching: boolean;
  };
}

class AIDemo {
  private config: AIDemoConfig;
  private startTime: number;
  private isRunning = false;
  private metrics: {
    commandsProcessed: number;
    insightsGenerated: number;
    predictionsMade: number;
    optimizationsExecuted: number;
    anomaliesDetected: number;
    securityEvents: number;
    cacheOperations: number;
  };

  constructor(config: Partial<AIDemoConfig> = {}) {
    this.config = {
      duration: 60, // 1 minute default
      intensity: 'moderate',
      features: {
        predictions: true,
        optimizations: true,
        anomalyDetection: true,
        securityAnalysis: true,
        smartCaching: true,
      },
      ...config,
    };

    this.startTime = Date.now();
    this.metrics = {
      commandsProcessed: 0,
      insightsGenerated: 0,
      predictionsMade: 0,
      optimizationsExecuted: 0,
      anomaliesDetected: 0,
      securityEvents: 0,
      cacheOperations: 0,
    };
  }

  async demonstrateAIOperations() {
    console.info(colorize('\n🤖 AI OPERATIONS DEMONSTRATION', 'cyan', 'bold'));
    console.info(colorize('─'.repeat(60), 'gray'));

    // Submit various AI commands
    const commands = [
      {
        type: 'optimize' as const,
        input: 'Optimize system performance',
        priority: 'high' as const,
      },
      { type: 'analyze' as const, input: 'Analyze security patterns', priority: 'medium' as const },
      {
        type: 'predict' as const,
        input: 'Predict resource usage',
        priority: 'medium' as const,
        parameters: { timeframe: 'hour' },
      },
      { type: 'automate' as const, input: 'Automate routine tasks', priority: 'low' as const },
    ];

    console.info(colorize('\n📤 Submitting AI Commands...', 'yellow'));

    for (const cmd of commands) {
      const start = nanoseconds();
      const commandId = await aiOperations.submitCommand(cmd);
      const elapsed = (nanoseconds() - start) / 1e6;

      console.info(
        `  ✅ ${colorize(cmd.type.toUpperCase(), 'cyan')}: ${colorize(commandId, 'green')} (${colorize(`${elapsed.toFixed(2)}ms`, 'gray')})`
      );
      this.metrics.commandsProcessed++;

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Get AI insights
    console.info(colorize('\n💡 Generating AI Insights...', 'yellow'));
    const insights = await aiOperations.getOptimizationSuggestions();

    insights.slice(0, 5).forEach((insight, i) => {
      const confidenceColor =
        insight.confidence > 0.8 ? 'green' : insight.confidence > 0.6 ? 'yellow' : 'red';
      console.info(
        `  ${i + 1}. ${colorize(insight.title, 'white')} (${colorize(`${(insight.confidence * 100).toFixed(0)}%`, confidenceColor)} confidence)`
      );
      console.info(`     ${colorize(insight.description, 'gray')}`);
      this.metrics.insightsGenerated++;
    });
  }

  async demonstratePredictions() {
    if (!this.config.features.predictions) return;

    console.info(colorize('\n🔮 AI Predictions Demo', 'cyan', 'bold'));
    console.info(colorize('─'.repeat(40), 'gray'));

    const timeframes = ['hour', 'day', 'week'] as const;

    for (const timeframe of timeframes) {
      console.info(colorize(`\n📊 Predicting for ${timeframe}...`, 'yellow'));

      const start = nanoseconds();
      const prediction = await aiOperations.predict(timeframe);
      const elapsed = (nanoseconds() - start) / 1e6;

      console.info(`  ⏱️  Generated in ${colorize(`${elapsed.toFixed(2)}ms`, 'cyan')}`);
      console.info(
        `  🎯 Confidence: ${colorize(`${(prediction.confidence * 100).toFixed(1)}%`, 'green')}`
      );
      console.info(
        `  💻 CPU Prediction: ${colorize(`${prediction.resource.cpu.toFixed(1)}%`, 'cyan')}`
      );
      console.info(
        `  🧠 Memory Prediction: ${colorize(`${prediction.resource.memory.toFixed(1)}%`, 'cyan')}`
      );
      console.info(
        `  ⚡ Response Time: ${colorize(`${prediction.performance.responseTime.toFixed(1)}ms`, 'cyan')}`
      );

      this.metrics.predictionsMade++;
    }
  }

  async demonstrateSmartCaching() {
    if (!this.config.features.smartCaching) return;

    console.info(colorize('\n🧠 Smart Caching Demo', 'cyan', 'bold'));
    console.info(colorize('─'.repeat(40), 'gray'));

    const cache = new SmartCacheManager<string, any>({
      enablePredictions: true,
      autoOptimization: true,
    });

    console.info(colorize('\n📝 Demonstrating access pattern learning...', 'yellow'));

    // Simulate access patterns
    const patterns = [
      { key: 'user-profile-123', data: { name: 'John', role: 'admin' } },
      { key: 'config-app-settings', data: { theme: 'dark', lang: 'en' } },
      { key: 'user-profile-123', data: { name: 'John', role: 'admin' } }, // Repeat access
      { key: 'api-response-analytics', data: { users: 1250, active: 89 } },
      { key: 'user-profile-123', data: { name: 'John', role: 'admin' } }, // Repeat access
      { key: 'config-app-settings', data: { theme: 'dark', lang: 'en' } }, // Repeat access
    ];

    for (const pattern of patterns) {
      await cache.set(pattern.key, pattern.data);
      await cache.get(pattern.key); // Access to build pattern
      this.metrics.cacheOperations++;
    }

    // Get intelligence metrics
    const metrics = cache.getIntelligenceMetrics();
    console.info(`  🧠 Patterns Learned: ${colorize(metrics.patternsLearned.toString(), 'cyan')}`);
    console.info(
      `  🎯 Hit Rate Improvement: ${colorize(`${(metrics.hitRateImprovement * 100).toFixed(1)}%`, 'green')}`
    );
    console.info(`  ⚡ Optimizations: ${colorize(metrics.optimizations.toString(), 'cyan')}`);

    // Test predictions
    console.info(colorize('\n🔮 Testing cache predictions...', 'yellow'));
    const predictions = await cache.predictAccesses();
    console.info(
      `  📊 Generated ${colorize(predictions.size.toString(), 'cyan')} access predictions`
    );

    await cache.stop();
  }

  async demonstrateAnomalyDetection() {
    if (!this.config.features.anomalyDetection) return;

    console.info(colorize('\n🛡️  Anomaly Detection Demo', 'cyan', 'bold'));
    console.info(colorize('─'.repeat(40), 'gray'));

    console.info(colorize('\n📊 Submitting normal metrics...', 'yellow'));

    // Submit normal metrics
    for (let i = 0; i < 10; i++) {
      await anomalyDetector.submitMetrics({
        timestamp: Date.now() - (10 - i) * 60000,
        source: 'demo-server',
        metrics: {
          cpu_usage_percent: 30 + Math.random() * 20,
          memory_usage_percent: 40 + Math.random() * 20,
          response_time_ms: 100 + Math.random() * 50,
          error_rate_percent: Math.random() * 2,
        },
      });
    }

    console.info(colorize('\n⚠️  Submitting anomalous metrics...', 'yellow'));

    // Submit anomalous metrics
    await anomalyDetector.submitMetrics({
      timestamp: Date.now(),
      source: 'demo-server',
      metrics: {
        cpu_usage_percent: 95, // Anomaly!
        memory_usage_percent: 45,
        response_time_ms: 120,
        error_rate_percent: 1,
      },
    });

    // Run detection
    console.info(colorize('\n🔍 Running anomaly detection...', 'yellow'));
    const anomalies = await anomalyDetector.runDetection();

    console.info(
      `  🚨 Detected ${colorize(anomalies.length.toString(), anomalies.length > 0 ? 'red' : 'green')} anomalies`
    );

    anomalies.slice(0, 3).forEach((anomaly, i) => {
      const severityColor =
        anomaly.severity === 'critical' ? 'red' : anomaly.severity === 'high' ? 'yellow' : 'cyan';
      console.info(
        `  ${i + 1}. ${colorize(anomaly.title, 'white')} (${colorize(anomaly.severity, severityColor)})`
      );
      console.info(`     ${colorize(anomaly.description, 'gray')}`);
      this.metrics.anomaliesDetected++;
    });

    // Get statistics
    const stats = anomalyDetector.getStatistics();
    console.info(
      `  📈 Detection Accuracy: ${colorize(`${(stats.detectionAccuracy * 100).toFixed(1)}%`, 'green')}`
    );
  }

  async demonstrateSecurityAnalysis() {
    if (!this.config.features.securityAnalysis) return;

    console.info(colorize('\n🔐 Security Analysis Demo', 'cyan', 'bold'));
    console.info(colorize('─'.repeat(40), 'gray'));

    // Register test identity
    console.info(colorize('\n👤 Registering test identity...', 'yellow'));
    const identityId = await zeroTrustManager.registerIdentity({
      id: 'demo-user-ai',
      type: 'user',
      attributes: { role: 'demo', department: 'engineering' },
      credentials: {
        type: 'password',
        hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // 'password'
        expires: Date.now() + 3600000,
      },
      permissions: ['read', 'demo'],
    });

    console.info(`  ✅ Identity registered: ${colorize(identityId, 'green')}`);

    // Test authentication
    console.info(colorize('\n🔑 Testing authentication...', 'yellow'));
    const authResult = await zeroTrustManager.authenticate(
      identityId,
      { password: 'password' },
      {
        identityId,
        sessionId: 'demo-session-' + Date.now(),
        ipAddress: '192.168.1.100',
        timestamp: Date.now(),
        riskScore: 15,
      }
    );

    if (authResult.success) {
      console.info(
        `  ✅ Authentication successful (${colorize(`${authResult.confidence.toFixed(1)}%`, 'green')} confidence)`
      );
      this.metrics.securityEvents++;
    } else {
      console.info(
        `  ❌ Authentication failed: ${colorize(authResult.reason || 'Unknown', 'red')}`
      );
    }

    // Get security insights
    const securityInsights = aiOperations.getInsights({ type: 'security' });
    console.info(
      `\n🛡️  Security Insights: ${colorize(securityInsights.length.toString(), 'cyan')}`
    );

    securityInsights.slice(0, 3).forEach((insight, i) => {
      console.info(`  ${i + 1}. ${colorize(insight.title, 'white')}`);
      console.info(`     ${colorize(insight.description, 'gray')}`);
    });
  }

  async demonstrateOptimizations() {
    if (!this.config.features.optimizations) return;

    console.info(colorize('\n⚡ Intelligent Optimizations Demo', 'cyan', 'bold'));
    console.info(colorize('─'.repeat(40), 'gray'));

    // Get optimization suggestions
    console.info(colorize('\n💡 Generating optimization suggestions...', 'yellow'));
    const suggestions = await aiOperations.getOptimizationSuggestions();

    console.info(
      `  📊 Found ${colorize(suggestions.length.toString(), 'cyan')} optimization opportunities`
    );

    // Execute a sample optimization
    if (suggestions.length > 0) {
      console.info(colorize('\n🚀 Executing sample optimization...', 'yellow'));

      const commandId = await aiOperations.submitCommand({
        type: 'optimize',
        input: 'Execute performance optimization',
        priority: 'high',
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = aiOperations.getCommandResult(commandId);
      if (result && result.success) {
        console.info(`  ✅ Optimization completed successfully`);
        console.info(
          `  📈 Improvements: ${colorize(result.improvements.length.toString(), 'cyan')}`
        );

        result.improvements.forEach((improvement, i) => {
          const improvementColor =
            improvement.improvement > 30
              ? 'green'
              : improvement.improvement > 15
                ? 'yellow'
                : 'cyan';
          console.info(
            `    ${i + 1}. ${colorize(improvement.metric, 'white')}: ${colorize(`${improvement.before} → ${improvement.after}`, improvementColor)} (${colorize(`+${improvement.improvement.toFixed(1)}%`, improvementColor)})`
          );
        });

        this.metrics.optimizationsExecuted++;
      } else {
        console.info(`  ⏳ Optimization still processing...`);
      }
    }
  }

  displayDemoSummary() {
    const elapsed = Date.now() - this.startTime;
    const elapsedSeconds = Math.floor(elapsed / 1000);

    console.info(colorize('\n🎉 AI DEMONSTRATION SUMMARY', 'cyan', 'bold'));
    console.info(colorize('═'.repeat(60), 'gray'));

    console.info(colorize('\n📊 Performance Metrics:', 'yellow', 'bold'));
    console.info(`  ⏱️  Duration: ${colorize(`${elapsedSeconds}s`, 'cyan')}`);
    console.info(
      `  🤖 Commands Processed: ${colorize(this.metrics.commandsProcessed.toString(), 'cyan')}`
    );
    console.info(
      `  💡 Insights Generated: ${colorize(this.metrics.insightsGenerated.toString(), 'cyan')}`
    );
    console.info(
      `  🔮 Predictions Made: ${colorize(this.metrics.predictionsMade.toString(), 'cyan')}`
    );
    console.info(
      `  ⚡ Optimizations Executed: ${colorize(this.metrics.optimizationsExecuted.toString(), 'cyan')}`
    );
    console.info(
      `  🛡️  Anomalies Detected: ${colorize(this.metrics.anomaliesDetected.toString(), 'cyan')}`
    );
    console.info(
      `  🔐 Security Events: ${colorize(this.metrics.securityEvents.toString(), 'cyan')}`
    );
    console.info(
      `  🗄️  Cache Operations: ${colorize(this.metrics.cacheOperations.toString(), 'cyan')}`
    );

    // Calculate throughput
    const totalOps = Object.values(this.metrics).reduce((sum, val) => sum + val, 0);
    const opsPerSecond = (totalOps / elapsedSeconds).toFixed(1);

    console.info(colorize('\n⚡ Throughput:', 'yellow', 'bold'));
    console.info(`  📈 Total Operations: ${colorize(totalOps.toString(), 'cyan')}`);
    console.info(`  🚀 Ops/Second: ${colorize(opsPerSecond, 'green')}`);

    // AI System Health
    console.info(colorize('\n🏥 AI System Health:', 'yellow', 'bold'));
    const insights = aiOperations.getInsights();
    const criticalInsights = insights.filter(i => i.impact === 'critical');

    if (criticalInsights.length === 0) {
      console.info(`  ✅ ${colorize('All systems operating normally', 'green')}`);
    } else {
      console.info(
        `  ⚠️  ${colorize(`${criticalInsights.length} critical insights require attention`, 'yellow')}`
      );
    }

    console.info(colorize('\n🎯 Demo Configuration:', 'yellow', 'bold'));
    console.info(`  🔥 Intensity: ${colorize(this.config.intensity.toUpperCase(), 'cyan')}`);
    console.info(
      `  ⚙️  Features: ${colorize(
        Object.values(this.config.features)
          .filter(f => f)
          .length.toString(),
        'cyan'
      )} enabled`
    );

    console.info(colorize('\n✨ Thank you for exploring FactoryWager AI!', 'green', 'bold'));
  }

  async runDemo() {
    if (this.isRunning) {
      console.info(colorize('⚠️  Demo already running', 'yellow'));
      return;
    }

    this.isRunning = true;
    console.info(colorize('🚀 Starting AI Operations Demo...', 'cyan'));
    console.info(
      colorize(
        `⏱️  Duration: ${this.config.duration}s | Intensity: ${this.config.intensity}`,
        'gray'
      )
    );

    try {
      await this.demonstrateAIOperations();
      await this.demonstratePredictions();
      await this.demonstrateSmartCaching();
      await this.demonstrateAnomalyDetection();
      await this.demonstrateSecurityAnalysis();
      await this.demonstrateOptimizations();

      this.displayDemoSummary();
    } catch (error) {
      console.error(colorize('❌ Demo failed:', 'red'), error.message);
    } finally {
      this.isRunning = false;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const config: Partial<AIDemoConfig> = {};

  if (args.includes('--light')) config.intensity = 'light';
  else if (args.includes('--heavy')) config.intensity = 'heavy';
  else if (args.includes('--summary'))
    config.intensity = 'light'; // Summary mode = light
  else config.intensity = 'moderate';

  if (args.includes('--no-predictions'))
    config.features = { ...config.features, predictions: false };
  if (args.includes('--no-cache')) config.features = { ...config.features, smartCaching: false };
  if (args.includes('--no-security'))
    config.features = { ...config.features, securityAnalysis: false };
  if (args.includes('--no-anomalies'))
    config.features = { ...config.features, anomalyDetection: false };
  if (args.includes('--no-optimizations'))
    config.features = { ...config.features, optimizations: false };

  const durationIndex = args.findIndex(arg => arg.startsWith('--duration='));
  if (durationIndex !== -1) {
    config.duration = parseInt(args[durationIndex].split('=')[1]) || 60;
  } else if (args.includes('--summary')) {
    config.duration = 30; // Shorter for summary mode
  }

  const demo = new AIDemo(config);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.info(colorize('\n🛑 Demo interrupted', 'yellow'));
    process.exit(0);
  });

  if (args.includes('--summary')) {
    // Ultra-fast summary mode for one-liners
    try {
      console.info(colorize('🤖 AI Insights Summary', 'cyan'));

      const insights = await aiOperations.getOptimizationSuggestions();
      const anomalyStats = await anomalyDetector.getStatistics();

      console.info(
        `  Insights: ${colorize(insights.length.toString(), 'green')} | Anomalies: ${colorize(anomalyStats.totalAnomalies.toString(), anomalyStats.totalAnomalies > 0 ? 'yellow' : 'green')}`
      );
      console.info(`  Top Issue: ${colorize(insights[0]?.title || 'No issues', 'cyan')}`);
      console.info(
        `  Status: ${colorize(insights.filter(i => i.impact === 'critical').length === 0 ? '✅ Good' : '⚠️  Review needed', insights.filter(i => i.impact === 'critical').length === 0 ? 'green' : 'yellow')}`
      );
    } catch (error) {
      console.info(colorize('❌ AI summary failed', 'red'), error?.message || String(error));
    }
    return;
  }

  await demo.runDemo();
}

if (import.meta.main) {
  main();
}
