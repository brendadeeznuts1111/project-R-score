#!/usr/bin/env bun

// [PIPE][WATCH][PRODUCTION][PIPE-WATCH-PROD-001][v1.1][PRODUCTION]
// Production watch script with session management, jitter, circuit breaker monitoring, and safety guards

import { smartSessionRefresh } from '../src/etl/fetch-users';

const INTERVAL_SECONDS = 30; // Base interval
const JITTER_MAX_MS = 5000; // Max jitter to add
const CIRCUIT_BREAKER_FILE = 'data/circuit-breaker.json';
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check session every 5 minutes

console.log(`🚀 Starting production ETL watch loop (${INTERVAL_SECONDS}s base + jitter)`);
console.log(`⏱️  Jitter: 0-${JITTER_MAX_MS/1000}s to avoid thundering herd`);
console.log(`🔌 Circuit breaker: 5 failures → 5min cooldown`);
console.log(`🔄 Session refresh: Every ${Math.round(SESSION_CHECK_INTERVAL/60000)}min`);
console.log(`💰 Profit threshold: >$100`);
console.log(`📏 YAML rotation: >1MB files auto-rotated`);
console.log('');

let cycleCount = 0;
let lastSuccess = new Date();
let consecutiveFailures = 0;
let lastSessionCheck = 0;

// Production monitoring loop
while (true) {
  cycleCount++;
  const cycleStart = new Date();

  console.log(`\n🔄 Cycle #${cycleCount} - ${cycleStart.toISOString()}`);
  console.log(`📊 Last success: ${lastSuccess.toISOString()} (${Math.round((Date.now() - lastSuccess.getTime()) / 1000)}s ago)`);

  // Check circuit breaker state
  let circuitBreakerActive = false;
  try {
    if (await Bun.file(CIRCUIT_BREAKER_FILE).exists()) {
      const cbState = await Bun.file(CIRCUIT_BREAKER_FILE).json();
      if (cbState.open && Date.now() < cbState.cooldownUntil) {
        const remaining = Math.round((cbState.cooldownUntil - Date.now()) / 1000);
        console.log(`🔌 CIRCUIT BREAKER OPEN - ${remaining}s remaining`);
        await new Promise(resolve => setTimeout(resolve, Math.min(30000, remaining * 1000)));
        continue;
      } else if (cbState.open) {
        console.log(`🔌 CIRCUIT BREAKER RESET - Attempting recovery`);
      }
      circuitBreakerActive = cbState.open;
    }
  } catch (e) {
    // Ignore circuit breaker read errors
  }

  // Periodic session refresh (every 5 minutes, unless circuit breaker active)
  const now = Date.now();
  if (now - lastSessionCheck > SESSION_CHECK_INTERVAL) {
    console.log(`🔄 Performing periodic session refresh...`);
    try {
      const freshHeaders = await smartSessionRefresh(lastSessionCheck, circuitBreakerActive);
      if (freshHeaders) {
        console.log(`✅ Session tokens refreshed`);
      } else {
        console.log(`✅ Session still valid`);
      }
      lastSessionCheck = now;
    } catch (error) {
      console.error(`❌ Session refresh failed: ${error.message}`);
      // Continue anyway - maybe session is still valid
    }
  }

  // Run the ETL pipe
  const proc = Bun.spawn({
    cmd: ['bun', 'run', 'pipe:working'],
    stdout: 'inherit',
    stderr: 'inherit'
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log(`✅ Cycle #${cycleCount} SUCCESS`);
    lastSuccess = new Date();
    consecutiveFailures = 0;

    // Log success metrics
    try {
      if (await Bun.file('data/summary.yaml').exists()) {
        const yamlContent = await Bun.file('data/summary.yaml').text();
        const lineCount = yamlContent.split('\n').filter(line => line.trim()).length;
        console.log(`📊 Current data: ${lineCount} records in summary.yaml`);
      }
    } catch (e) {
      // Ignore metric errors
    }

  } else if (exitCode === 2) {
    // Special auth failure exit code
    console.error(`🔐 AUTH FAILURE detected (exit code 2)`);
    console.error(`💡 Cookie likely expired - syndicate traffic will continue but ETL is paused`);
    console.error(`📞 Alert: Cookie rotation required in #ops-cookie-rotor`);

    // Don't increment consecutiveFailures for auth issues (different problem)
    // Wait longer before retry
    await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
    continue;

  } else {
    console.error(`❌ Cycle #${cycleCount} FAILED (exit code ${exitCode})`);
    consecutiveFailures++;

    if (consecutiveFailures >= 5) {
      console.error(`🚨 ${consecutiveFailures} consecutive failures - entering degraded mode`);
      console.error(`⏰ Increasing check interval to 5 minutes`);
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
      continue;
    }
  }

  // Calculate next run time with jitter
  const baseDelay = INTERVAL_SECONDS * 1000;
  const jitter = Math.random() * JITTER_MAX_MS;
  const totalDelay = baseDelay + jitter;

  const nextRun = new Date(Date.now() + totalDelay);
  console.log(`⏰ Next run: ${nextRun.toISOString()} (in ${Math.round(totalDelay/1000)}s)`);

  // Sleep until next cycle
  await new Promise(resolve => setTimeout(resolve, totalDelay));
}
