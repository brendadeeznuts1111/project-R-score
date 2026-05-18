#!/usr/bin/env bun
/**
 * Demo: Simple Rollout Scheduler based on original concept
 * Shows the core idea: progressive A/B rollout with risk assessment
 */

import { createRolloutScheduler } from './simple-rollout-scheduler.ts';

// Initialize the scheduler (your original concept)
const scheduler = createRolloutScheduler();

// Start the rollout progression
scheduler.start();

// Simulate your original fetch() integration
function simulateRequest(requestId: number): void {
  console.info(`🌐 Request ${requestId}: Checking rollout phase...`);
  
  if (!scheduler.shouldServeRequest()) {
    console.info(`   ❌ Request ${requestId}: Blocked (not in rollout phase)`);
    return;
  }
  
  // Simulate processing time
  const processingTime = 100 + Math.random() * 300; // 100-400ms
  const success = Math.random() > 0.03; // 97% success rate
  
  setTimeout(() => {
    scheduler.recordRequest(success, processingTime);
    
    if (success) {
      console.info(`   ✅ Request ${requestId}: Served in ${Math.round(processingTime)}ms`);
    } else {
      console.info(`   💥 Request ${requestId}: Failed after ${Math.round(processingTime)}ms`);
    }
  }, processingTime);
}

// Simulate traffic pattern
let requestId = 1;
setInterval(() => {
  simulateRequest(requestId++);
}, 1500); // New request every 1.5 seconds

// Display dashboard
function showDashboard(): void {
  setInterval(() => {
    const metrics = scheduler.getMetrics();
    
    console.clear();
    console.info('🚀 FactoryWager Simple Rollout Dashboard');
    console.info('==========================================');
    console.info(`📊 Current Phase: ${metrics.phase}`);
    console.info(`🎯 Risk Score: ${metrics.risk}/100`);
    console.info(`💚 Health Score: ${metrics.health}%`);
    console.info(`📈 Requests: ${metrics.requests}`);
    console.info(`❌ Errors: ${metrics.errors}`);
    console.info(`⏰ Last Update: ${new Date(metrics.timestamp).toLocaleTimeString()}`);
    console.info('');
    console.info('📡 Live Monitoring:');
    console.info('   SSE: http://localhost:3003/events');
    console.info('   API: http://localhost:3003/status');
    console.info('   Health: http://localhost:3003/health');
    console.info('');
    console.info('🔄 Rollout Progression:');
    console.info('   Phase 0: 5%  (Risk: 65) ✅' + (scheduler.getCurrentPhase() >= 0 ? ' ← Current' : ''));
    console.info('   Phase 1: 25% (Risk: 55)' + (scheduler.getCurrentPhase() >= 1 ? ' ✅' : '') + (scheduler.getCurrentPhase() === 1 ? ' ← Current' : ''));
    console.info('   Phase 2: 50% (Risk: 45)' + (scheduler.getCurrentPhase() >= 2 ? ' ✅' : '') + (scheduler.getCurrentPhase() === 2 ? ' ← Current' : ''));
    console.info('   Phase 3: 100% (Risk: 35)' + (scheduler.getCurrentPhase() >= 3 ? ' ✅' : '') + (scheduler.getCurrentPhase() === 3 ? ' ← Current' : ''));
    
  }, 3000); // Update every 3 seconds
}

// Start dashboard
showDashboard();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.info('\n🛑 Shutting down demo...');
  scheduler.stop();
  process.exit(0);
});

console.info('🎬 Simple Rollout Demo Started');
console.info('==============================');
console.info('📊 Progressing through phases every 60 seconds');
console.info('🌐 Simulating requests every 1.5 seconds');
console.info('📡 Real-time metrics available via SSE');
console.info('');
