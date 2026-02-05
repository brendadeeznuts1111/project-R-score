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
  console.log(`🌐 Request ${requestId}: Checking rollout phase...`);
  
  if (!scheduler.shouldServeRequest()) {
    console.log(`   ❌ Request ${requestId}: Blocked (not in rollout phase)`);
    return;
  }
  
  // Simulate processing time
  const processingTime = 100 + Math.random() * 300; // 100-400ms
  const success = Math.random() > 0.03; // 97% success rate
  
  setTimeout(() => {
    scheduler.recordRequest(success, processingTime);
    
    if (success) {
      console.log(`   ✅ Request ${requestId}: Served in ${Math.round(processingTime)}ms`);
    } else {
      console.log(`   💥 Request ${requestId}: Failed after ${Math.round(processingTime)}ms`);
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
    console.log('🚀 FactoryWager Simple Rollout Dashboard');
    console.log('==========================================');
    console.log(`📊 Current Phase: ${metrics.phase}`);
    console.log(`🎯 Risk Score: ${metrics.risk}/100`);
    console.log(`💚 Health Score: ${metrics.health}%`);
    console.log(`📈 Requests: ${metrics.requests}`);
    console.log(`❌ Errors: ${metrics.errors}`);
    console.log(`⏰ Last Update: ${new Date(metrics.timestamp).toLocaleTimeString()}`);
    console.log('');
    console.log('📡 Live Monitoring:');
    console.log('   SSE: http://localhost:3003/events');
    console.log('   API: http://localhost:3003/status');
    console.log('   Health: http://localhost:3003/health');
    console.log('');
    console.log('🔄 Rollout Progression:');
    console.log('   Phase 0: 5%  (Risk: 65) ✅' + (scheduler.getCurrentPhase() >= 0 ? ' ← Current' : ''));
    console.log('   Phase 1: 25% (Risk: 55)' + (scheduler.getCurrentPhase() >= 1 ? ' ✅' : '') + (scheduler.getCurrentPhase() === 1 ? ' ← Current' : ''));
    console.log('   Phase 2: 50% (Risk: 45)' + (scheduler.getCurrentPhase() >= 2 ? ' ✅' : '') + (scheduler.getCurrentPhase() === 2 ? ' ← Current' : ''));
    console.log('   Phase 3: 100% (Risk: 35)' + (scheduler.getCurrentPhase() >= 3 ? ' ✅' : '') + (scheduler.getCurrentPhase() === 3 ? ' ← Current' : ''));
    
  }, 3000); // Update every 3 seconds
}

// Start dashboard
showDashboard();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down demo...');
  scheduler.stop();
  process.exit(0);
});

console.log('🎬 Simple Rollout Demo Started');
console.log('==============================');
console.log('📊 Progressing through phases every 60 seconds');
console.log('🌐 Simulating requests every 1.5 seconds');
console.log('📡 Real-time metrics available via SSE');
console.log('');
