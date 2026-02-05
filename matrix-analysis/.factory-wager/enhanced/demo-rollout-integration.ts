#!/usr/bin/env bun
/**
 * Demo: Integration of Enhanced Rollout Scheduler with FactoryWager Workflows
 * Shows how the progressive rollout works with real-time monitoring and SSE notifications
 */

import { EnhancedRolloutScheduler } from './rollout-scheduler.ts';

// Create enhanced rollout scheduler
const scheduler = new EnhancedRolloutScheduler({
  phases: [
    { id: 0, percentage: 5, duration: 1, riskScore: 65, description: 'Initial canary', status: 'pending', metrics: { requestsServed: 0, errorRate: 0, responseTime: 0, userSatisfaction: 95, conversionRate: 5.2, revenueImpact: 0 } },
    { id: 1, percentage: 25, duration: 2, riskScore: 55, description: 'Limited rollout', status: 'pending', metrics: { requestsServed: 0, errorRate: 0, responseTime: 0, userSatisfaction: 95, conversionRate: 5.2, revenueImpact: 0 } },
    { id: 2, percentage: 50, duration: 3, riskScore: 45, description: 'Balanced rollout', status: 'pending', metrics: { requestsServed: 0, errorRate: 0, responseTime: 0, userSatisfaction: 95, conversionRate: 5.2, revenueImpact: 0 } },
    { id: 3, percentage: 100, duration: 4, riskScore: 35, description: 'Full deployment', status: 'pending', metrics: { requestsServed: 0, errorRate: 0, responseTime: 0, userSatisfaction: 95, conversionRate: 5.2, revenueImpact: 0 } }
  ],
  totalDuration: 10, // 10 minutes for demo
  autoAdvance: true,
  riskThreshold: 70,
  enableRollback: true,
  monitoringInterval: 5, // 5 seconds for demo
  sseEnabled: true,
  port: 3002
});

// Simulate incoming requests
function simulateTraffic() {
  setInterval(() => {
    if (!scheduler.shouldServeRequest()) {
      console.log('🚫 Request blocked (not in rollout phase)');
      return;
    }

    // Simulate request processing
    const responseTime = 100 + Math.random() * 200; // 100-300ms
    const success = Math.random() > 0.02; // 98% success rate
    
    scheduler.recordRequest(success, responseTime);
    
    if (success) {
      console.log(`✅ Request served in ${Math.round(responseTime)}ms`);
    } else {
      console.log(`❌ Request failed in ${Math.round(responseTime)}ms`);
    }
  }, 2000); // New request every 2 seconds
}

// Display dashboard
function displayDashboard() {
  setInterval(() => {
    const status = scheduler.getRolloutStatus();
    const currentPhase = status.currentPhase;
    
    console.clear();
    console.log('🚀 FactoryWager Enhanced Rollout Dashboard');
    console.log('==========================================');
    console.log(`📊 Current Phase: ${currentPhase.description} (${currentPhase.percentage}% traffic)`);
    console.log(`🎯 Risk Score: ${currentPhase.riskScore}/100`);
    console.log(`💚 Overall Health: ${status.health}%`);
    console.log(`📈 Progress: ${status.progress}%`);
    console.log(`⏱️ ETA: ${status.estimatedCompletion}`);
    console.log('');
    
    console.log('📊 Phase Metrics:');
    console.log(`   Requests Served: ${currentPhase.metrics.requestsServed}`);
    console.log(`   Error Rate: ${currentPhase.metrics.errorRate.toFixed(2)}%`);
    console.log(`   Response Time: ${Math.round(currentPhase.metrics.responseTime)}ms`);
    console.log(`   User Satisfaction: ${currentPhase.metrics.userSatisfaction.toFixed(1)}%`);
    console.log(`   Conversion Rate: ${currentPhase.metrics.conversionRate.toFixed(2)}%`);
    console.log(`   Revenue Impact: $${currentPhase.metrics.revenueImpact.toLocaleString()}`);
    console.log('');
    
    console.log('🔄 Rollout Status:');
    console.log(`   Running: ${status.state.isRunning ? '✅' : '❌'}`);
    console.log(`   Paused: ${status.state.isPaused ? '⏸️' : '▶️'}`);
    console.log(`   Total Requests: ${status.state.totalRequests}`);
    console.log(`   Total Errors: ${status.state.totalErrors}`);
    console.log('');
    
    console.log('📡 SSE Server: http://localhost:3002/events');
    console.log('📊 REST API: http://localhost:3002/status');
    console.log('');
    console.log('Commands: start | pause | resume | advance | rollback | status');
    
  }, 3000); // Update every 3 seconds
}

// Main demo function
async function runDemo() {
  console.log('🎬 Starting FactoryWager Enhanced Rollout Demo');
  console.log('===============================================');
  
  // Start the rollout
  await scheduler.start();
  
  // Start simulated traffic
  simulateTraffic();
  
  // Start dashboard display
  displayDashboard();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down demo...');
    scheduler.stop();
    process.exit(0);
  });
}

// Run the demo
runDemo().catch(console.error);
