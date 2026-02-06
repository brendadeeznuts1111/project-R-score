#!/usr/bin/env bun

/**
 * 🤖 AI Operations Manager Demo
 *
 * Demonstrates the AI-powered optimization and analysis capabilities
 * integrated with your Bun development workflow.
 */

import { aiOperations, AICommand, AIInsight } from './ai-operations-standalone';

async function runAIDemo(): Promise<void> {
  console.log('🤖 AI Operations Manager Demo');
  console.log('==============================\n');

  // 1. System Analysis
  console.log('📊 Getting system insights...');
  const insights = await aiOperations.getOptimizationSuggestions();
  console.log(`Found ${insights.length} optimization suggestions\n`);

  insights.slice(0, 3).forEach((insight, i) => {
    console.log(`${i + 1}. ${insight.title} (${insight.impact.toUpperCase()})`);
    console.log(`   ${insight.description}`);
    console.log(`   Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
    console.log(`   Recommendations:`);
    insight.recommendations.forEach(rec => console.log(`     • ${rec}`));
    console.log();
  });

  // 2. Performance Prediction
  console.log('🔮 Generating performance prediction...');
  const prediction = await aiOperations.predict('day');
  console.log(`Prediction confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
  console.log(`Resource usage:`);
  console.log(`  • CPU: ${prediction.resource.cpu.toFixed(1)}%`);
  console.log(`  • Memory: ${prediction.resource.memory.toFixed(1)}%`);
  console.log(`Performance metrics:`);
  console.log(`  • Response time: ${prediction.performance.responseTime.toFixed(1)}ms`);
  console.log(`  • Throughput: ${prediction.performance.throughput.toFixed(1)} req/s`);
  console.log(`  • Error rate: ${prediction.performance.errorRate.toFixed(2)}%\n`);

  // 3. Submit AI Commands
  console.log('🚀 Submitting optimization commands...');

  const commands: Omit<AICommand, 'id' | 'timestamp'>[] = [
    {
      type: 'optimize',
      input: 'Improve cache performance and memory usage',
      priority: 'high',
      parameters: { target: 'cache', duration: 300 }
    },
    {
      type: 'analyze',
      input: 'Analyze system bottlenecks and performance issues',
      priority: 'medium',
      parameters: { scope: 'full', includeHistorical: true }
    },
    {
      type: 'predict',
      input: 'Predict system behavior for next 24 hours',
      priority: 'low',
      parameters: { timeframe: 'day' }
    }
  ];

  const commandIds: string[] = [];
  for (const cmd of commands) {
    const id = await aiOperations.submitCommand(cmd);
    commandIds.push(id);
    console.log(`Submitted: ${cmd.type} (${cmd.priority}) - ID: ${id}`);
  }
  console.log();

  // 4. Execute Optimizations
  console.log('⚡ Executing AI optimizations...');
  for (const commandId of commandIds) {
    try {
      const result = await aiOperations.executeOptimization(commandId);
      console.log(`\nOptimization ${commandId}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`Execution time: ${result.executionTime}ms`);

      if (result.improvements.length > 0) {
        console.log('Improvements:');
        result.improvements.forEach(imp => {
          console.log(`  • ${imp.metric}: ${imp.before} → ${imp.after} (${imp.improvement > 0 ? '+' : ''}${imp.improvement.toFixed(1)}%)`);
        });
      }

      if (result.insights.length > 0) {
        console.log(`Generated ${result.insights.length} insights`);
      }
    } catch (error) {
      console.log(`❌ Optimization ${commandId} failed: ${error}`);
    }
  }

  // 5. Final Insights Summary
  console.log('\n📋 Final Insights Summary:');
  const allInsights = aiOperations.getInsights({ minConfidence: 0.8 });
  const criticalInsights = allInsights.filter(i => i.impact === 'critical');
  const highInsights = allInsights.filter(i => i.impact === 'high');

  console.log(`Total insights: ${allInsights.length}`);
  console.log(`Critical: ${criticalInsights.length}`);
  console.log(`High priority: ${highInsights.length}`);

  if (criticalInsights.length > 0) {
    console.log('\n🚨 Critical Issues:');
    criticalInsights.forEach(insight => {
      console.log(`  • ${insight.title}: ${insight.description}`);
    });
  }

  console.log('\n✨ AI Operations demo completed!');
}

// Mock the required imports for demo
const logger = {
  info: (msg: string, data?: any, tags?: string[]) => console.log(`[INFO] ${msg}`),
  error: (msg: string, error?: Error, data?: any, tags?: string[]) => console.log(`[ERROR] ${msg}`)
};

const globalCaches = {
  secrets: {
    getStats: () => ({
      hitRate: 0.75,
      hits: 150,
      misses: 50
    })
  }
};

// Run the demo
runAIDemo().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});