#!/usr/bin/env bun

/**
 * Quick Start Demo for Enhanced Time-Series ML System
 * 
 * This script demonstrates the full capabilities of the ML-powered
 * time-series analysis and automated remediation system.
 */

import { EnhancedTimeSeriesDashboard } from '../time-series/enhanced-dashboard';
import { TimeSeriesAggregator } from '../time-series/aggregator';
import { MLPatternRecognizer } from '../time-series/ml-integration';
import { AutomatedRemediationEngine } from '../time-series/remediation-engine';

console.log('🚀 ENHANCED TIME-SERIES ML SYSTEM - QUICK START DEMO');
console.log('='.repeat(60));

async function runDemo() {
  // Initialize components
  const aggregator = new TimeSeriesAggregator();
  const mlRecognizer = new MLPatternRecognizer();
  const remediationEngine = new AutomatedRemediationEngine();
  
  console.log('✅ Components initialized');
  
  // 1. Generate sample data
  console.log('\n📊 Generating sample time-series data...');
  await generateSampleData(aggregator);
  
  // 2. Run ML analysis
  console.log('\n🧠 Running ML pattern analysis...');
  await runMLAnalysis(mlRecognizer, aggregator);
  
  // 3. Test automated remediation
  console.log('\n🤖 Testing automated remediation...');
  await testRemediation(remediationEngine);
  
  // 4. Start enhanced dashboard
  console.log('\n📈 Starting enhanced dashboard...');
  console.log('💡 The dashboard will show real-time ML insights and remediation status');
  console.log('🔴 Press Ctrl+C to stop the dashboard\n');
  
  const dashboard = new EnhancedTimeSeriesDashboard();
  dashboard.start(3000); // Update every 3 seconds for demo
}

async function generateSampleData(aggregator: TimeSeriesAggregator) {
  const now = new Date();
  const scopes = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'];
  const metricTypes = ['cpu_usage', 'memory_usage', 'network_traffic', 'error_rate'];
  
  // Generate 2 hours of sample data (5-minute intervals)
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000));
    
    for (const scope of scopes) {
      for (const metricType of metricTypes) {
        let value: number;
        
        // Generate realistic patterns
        switch (metricType) {
          case 'cpu_usage':
            // Daily pattern with noise
            const hour = timestamp.getHours();
            const baseCpu = 30 + Math.sin((hour - 6) * Math.PI / 12) * 25;
            value = baseCpu + (Math.random() - 0.5) * 10;
            break;
            
          case 'memory_usage':
            // Gradual increase with occasional drops
            value = 40 + (i * 0.5) + (Math.random() - 0.5) * 8;
            if (i % 8 === 0) value -= 15; // Simulate garbage collection
            break;
            
          case 'network_traffic':
            // Bursty pattern
            value = Math.random() > 0.8 ? 80 + Math.random() * 15 : 20 + Math.random() * 10;
            break;
            
          case 'error_rate':
            // Mostly low with occasional spikes
            value = Math.random() > 0.95 ? 5 + Math.random() * 10 : Math.random() * 2;
            break;
            
          default:
            value = 50 + (Math.random() - 0.5) * 20;
        }
        
        await aggregator.addMetric({
          timestamp: timestamp.toISOString(),
          value: Math.max(0, value),
          agentId: `agent-${String(i % 5).padStart(3, '0')}`,
          containerId: `container-${String(i % 3).padStart(3, '0')}`,
          metricType,
          scope
        });
      }
    }
  }
  
  console.log(`✅ Generated ${aggregator.getMetricsCount()} sample metrics`);
}

async function runMLAnalysis(mlRecognizer: MLPatternRecognizer, aggregator: TimeSeriesAggregator) {
  try {
    // Get recent metrics for analysis
    const recentMetrics = await aggregator.getMasterPerfMetrics('ENTERPRISE', {
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // Last 2 hours
    });
    
    if (recentMetrics.length < 20) {
      console.log('⚠️  Insufficient data for ML analysis');
      return;
    }
    
    const values = recentMetrics.map(m => typeof m.value === 'number' ? m.value : parseFloat(String(m.value))).filter(v => !isNaN(v));
    const timestamps = recentMetrics.map(m => m.timestamp);
    
    // Perform ML analysis
    const mlResult = await mlRecognizer['analyzePatternWithML'](values, timestamps, {
      metricType: 'cpu_usage',
      agentId: recentMetrics[0]?.agentId
    });
    
    console.log('\n📈 ML ANALYSIS RESULTS:');
    console.log(`   Pattern: ${mlResult.pattern.toUpperCase()}`);
    console.log(`   Confidence: ${(mlResult.confidence * 100).toFixed(1)}%`);
    console.log(`   Key Features:`);
    
    Object.entries(mlResult.features).slice(0, 5).forEach(([key, value]) => {
      console.log(`     ${key}: ${typeof value === 'number' ? value.toFixed(3) : value}`);
    });
    
    console.log(`\n   Top Remediation Suggestions:`);
    mlResult.remediation.slice(0, 3).forEach((rec, i) => {
      console.log(`     ${i + 1}. ${rec}`);
    });
    
  } catch (error) {
    console.error('❌ ML analysis failed:', error.message);
  }
}

async function testRemediation(remediationEngine: AutomatedRemediationEngine) {
  try {
    // Trigger a manual remediation for demo
    const workflow = await remediationEngine.triggerManualRemediation({
      agentId: 'agent-001',
      containerId: 'container-123',
      pattern: 'memory_leak',
      severity: 'high',
      value: 95,
      expected: 50,
      deviation: 2.5,
      recommendations: ['High memory usage detected', 'Consider container restart']
    }, ['send-alert', 'optimize-config']);
    
    console.log(`✅ Remediation workflow started: ${workflow.workflowId}`);
    console.log(`   Status: ${workflow.status}`);
    console.log(`   Actions: ${workflow.actions.map(a => a.name).join(', ')}`);
    
    // Wait a moment for execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check workflow status
    const activeWorkflows = remediationEngine.getActiveWorkflows();
    if (activeWorkflows.length > 0) {
      const latestWorkflow = activeWorkflows[activeWorkflows.length - 1];
      console.log(`   Latest Status: ${latestWorkflow.status}`);
      console.log(`   Results: ${latestWorkflow.results.map(r => `${r.action.name}: ${r.status}`).join(' | ')}`);
    }
    
  } catch (error) {
    console.error('❌ Remediation test failed:', error.message);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🚀 Enhanced Time-Series ML System - Quick Start Demo

Usage: bun run scripts/time-series-quick-start.ts [options]

Options:
  --help, -h     Show this help message
  --data-only    Only generate sample data
  --ml-only      Only run ML analysis
  --remediate-only Only test remediation
  --no-dashboard Skip starting the dashboard

Examples:
  bun run scripts/time-series-quick-start.ts              # Full demo
  bun run scripts/time-series-quick-start.ts --data-only  # Generate data only
  bun run scripts/time-series-quick-start.ts --ml-only    # ML analysis only
  bun run scripts/time-series-quick-start.ts --no-dashboard  # Skip dashboard

📦 Package Scripts:
  timeseries:enhanced           Start enhanced dashboard
  timeseries:ml-analyze         Run ML analysis
  timeseries:auto-remediate     Trigger manual remediation
  timeseries:workflows          Show active workflows
  timeseries:dashboard          Start dashboard with 3s updates
  timeseries:ml-cpu             ML analysis for CPU metrics
  timeseries:ml-memory          ML analysis for memory metrics

🔗 Integration:
  The system integrates with existing metrics collection and
  provides real-time ML insights with automated remediation.
  
  Environment variables:
  - KUBERNETES_API: Kubernetes API endpoint
  - DOCKER_API: Docker API endpoint  
  - SLACK_WEBHOOK: Slack webhook for notifications
  - NOTIFICATION_WEBHOOK: Generic webhook for notifications
`);
  process.exit(0);
}

if (args.includes('--data-only')) {
  const aggregator = new TimeSeriesAggregator();
  await generateSampleData(aggregator);
  console.log('\n✅ Sample data generation complete');
  process.exit(0);
}

if (args.includes('--ml-only')) {
  const aggregator = new TimeSeriesAggregator();
  const mlRecognizer = new MLPatternRecognizer();
  
  await generateSampleData(aggregator);
  await runMLAnalysis(mlRecognizer, aggregator);
  console.log('\n✅ ML analysis complete');
  process.exit(0);
}

if (args.includes('--remediate-only')) {
  const remediationEngine = new AutomatedRemediationEngine();
  await testRemediation(remediationEngine);
  console.log('\n✅ Remediation test complete');
  process.exit(0);
}

// Run full demo
if (!args.includes('--no-dashboard')) {
  runDemo().catch(console.error);
} else {
  // Run demo without dashboard
  runDemo().then(() => {
    console.log('\n✅ Demo completed without dashboard');
    process.exit(0);
  }).catch(console.error);
}
