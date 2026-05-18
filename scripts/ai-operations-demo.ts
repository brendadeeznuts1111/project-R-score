#!/usr/bin/env bun

/**
 * 🤖 AI Operations Manager Demo
 *
 * Demonstrates the AI-powered optimization and analysis capabilities
 * integrated with your Bun development workflow.
 */

import { aiOperations, AICommand, AIInsight } from './ai-operations-standalone';

async function runAIDemo(): Promise<void> {
  console.info('🤖 AI Operations Manager Demo');
  console.info('==============================\n');

  // 1. System Analysis
  console.info('📊 Getting system insights...');
  const insights = await aiOperations.getOptimizationSuggestions();
  console.info(`Found ${insights.length} optimization suggestions\n`);

  insights.slice(0, 3).forEach((insight, i) => {
    console.info(`${i + 1}. ${insight.title} (${insight.impact.toUpperCase()})`);
    console.info(`   ${insight.description}`);
    console.info(`   Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
    console.info(`   Recommendations:`);
    insight.recommendations.forEach(rec => console.info(`     • ${rec}`));
    console.info();
  });

  // 2. Performance Prediction
  console.info('🔮 Generating performance prediction...');
  const prediction = await aiOperations.predict('day');
  console.info(`Prediction confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
  console.info(`Resource usage:`);
  console.info(`  • CPU: ${prediction.resource.cpu.toFixed(1)}%`);
  console.info(`  • Memory: ${prediction.resource.memory.toFixed(1)}%`);
  console.info(`Performance metrics:`);
  console.info(`  • Response time: ${prediction.performance.responseTime.toFixed(1)}ms`);
  console.info(`  • Throughput: ${prediction.performance.throughput.toFixed(1)} req/s`);
  console.info(`  • Error rate: ${prediction.performance.errorRate.toFixed(2)}%\n`);

  // 3. Submit AI Commands
  console.info('🚀 Submitting optimization commands...');

  const commands: Omit<AICommand, 'id' | 'timestamp'>[] = [
    {
      type: 'optimize',
      input: 'Improve cache performance and memory usage',
      priority: 'high',
      parameters: { target: 'cache', duration: 300 },
    },
    {
      type: 'analyze',
      input: 'Analyze system bottlenecks and performance issues',
      priority: 'medium',
      parameters: { scope: 'full', includeHistorical: true },
    },
    {
      type: 'predict',
      input: 'Predict system behavior for next 24 hours',
      priority: 'low',
      parameters: { timeframe: 'day' },
    },
  ];

  const commandIds: string[] = [];
  for (const cmd of commands) {
    const id = await aiOperations.submitCommand(cmd);
    commandIds.push(id);
    console.info(`Submitted: ${cmd.type} (${cmd.priority}) - ID: ${id}`);
  }
  console.info();

  // 4. Execute Optimizations
  console.info('⚡ Executing AI optimizations...');
  for (const commandId of commandIds) {
    try {
      const result = await aiOperations.executeOptimization(commandId);
      console.info(`\nOptimization ${commandId}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.info(`Execution time: ${result.executionTime}ms`);

      if (result.improvements.length > 0) {
        console.info('Improvements:');
        result.improvements.forEach(imp => {
          console.info(
            `  • ${imp.metric}: ${imp.before} → ${imp.after} (${imp.improvement > 0 ? '+' : ''}${imp.improvement.toFixed(1)}%)`
          );
        });
      }

      if (result.insights.length > 0) {
        console.info(`Generated ${result.insights.length} insights`);
      }
    } catch (error) {
      console.info(`❌ Optimization ${commandId} failed: ${error}`);
    }
  }

  // 5. Final Insights Summary
  console.info('\n📋 Final Insights Summary:');
  const allInsights = aiOperations.getInsights({ minConfidence: 0.8 });
  const criticalInsights = allInsights.filter(i => i.impact === 'critical');
  const highInsights = allInsights.filter(i => i.impact === 'high');

  console.info(`Total insights: ${allInsights.length}`);
  console.info(`Critical: ${criticalInsights.length}`);
  console.info(`High priority: ${highInsights.length}`);

  if (criticalInsights.length > 0) {
    console.info('\n🚨 Critical Issues:');
    criticalInsights.forEach(insight => {
      console.info(`  • ${insight.title}: ${insight.description}`);
    });
  }

  console.info('\n✨ AI Operations demo completed!');
}

// Mock the required imports for demo
const logger = {
  info: (msg: string, data?: any, tags?: string[]) => console.info(`[INFO] ${msg}`),
  error: (msg: string, error?: Error, data?: any, tags?: string[]) =>
    console.info(`[ERROR] ${msg}`),
};

const globalCaches = {
  secrets: {
    getStats: () => ({
      hitRate: 0.75,
      hits: 150,
      misses: 50,
    }),
  },
};

// Run the demo
runAIDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
