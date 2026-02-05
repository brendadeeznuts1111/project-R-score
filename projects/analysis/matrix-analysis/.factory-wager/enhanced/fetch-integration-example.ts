#!/usr/bin/env bun
/**
 * Example: Integration with your original fetch() concept
 * Shows how to use the rollout scheduler in a real application
 */

import { createRolloutScheduler } from './simple-rollout-scheduler.ts';

// Initialize scheduler
const scheduler = createRolloutScheduler();
scheduler.start();

// Your original concept - enhanced with real scheduler
const phases = [5, 25, 50, 100]; // Percentages for each phase
let rolloutPhase = 0;

// Update rollout phase from scheduler
setInterval(() => {
  rolloutPhase = scheduler.getCurrentPhase();
}, 1000);

// Enhanced fetch() function with rollout logic
async function enhancedFetch(url: string, options?: RequestInit): Promise<Response> {
  // Your original logic - now using real scheduler
  if (rolloutPhase < 3 && Math.random() > phases[rolloutPhase] / 100) {
    // Return 404 for requests not in rollout phase
    console.log(`🚫 Request to ${url} blocked - Phase ${rolloutPhase} (${phases[rolloutPhase]}% rollout)`);
    return new Response('Feature not available', { status: 404 });
  }

  // Record request start
  const startTime = Date.now();
  
  try {
    // Make actual request
    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;
    
    // Record successful request
    scheduler.recordRequest(response.ok, responseTime);
    
    console.log(`✅ Request to ${url} succeeded in ${responseTime}ms - Phase ${rolloutPhase}`);
    return response;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Record failed request
    scheduler.recordRequest(false, responseTime);
    
    console.log(`❌ Request to ${url} failed in ${responseTime}ms - Phase ${rolloutPhase}`);
    throw error;
  }
}

// Express.js middleware example
export function rolloutMiddleware(req: any, res: any, next: any) {
  // Your original logic - now with real scheduler
  if (rolloutPhase < 3 && Math.random() > phases[rolloutPhase] / 100) {
    return res.status(404).json({ 
      error: 'Feature not available in current rollout phase',
      phase: rolloutPhase,
      rolloutPercentage: phases[rolloutPhase]
    });
  }
  
  next();
}

// Simulate API usage
async function simulateAPIUsage() {
  const endpoints = [
    'https://api.example.com/users',
    'https://api.example.com/products',
    'https://api.example.com/orders'
  ];
  
  setInterval(async () => {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
    try {
      await enhancedFetch(endpoint);
    } catch (error) {
      // Error already logged in enhancedFetch
    }
  }, 2000); // API call every 2 seconds
}

// Start simulation
simulateAPIUsage();

// Display status
setInterval(() => {
  const metrics = scheduler.getMetrics();
  console.log(`\n📊 Rollout Status: Phase ${metrics.phase} | Risk: ${metrics.risk}/100 | Health: ${metrics.health}%`);
  console.log(`📈 Requests: ${metrics.requests} | Errors: ${metrics.errors}`);
}, 10000); // Status update every 10 seconds

console.log('🎬 Fetch Integration Example Started');
console.log('===================================');
console.log('🌐 Simulating API calls with rollout logic');
console.log('📊 Phase progression: 5% → 25% → 50% → 100%');
console.log('📡 Real-time metrics: http://localhost:3003/status');
console.log('');
