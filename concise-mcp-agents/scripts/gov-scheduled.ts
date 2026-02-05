#!/usr/bin/env bun

// [GOV][SCHEDULED][UPDATE][GOV-SCH-001][v3.1.1][ACTIVE]

import { govEngine } from "./gov-rules.ts";

class GOVScheduler {
  async runScheduledUpdate(): Promise<void> {
    console.log('🔄 Running scheduled GOV system update...');

    // Step 1: Validate all rules
    console.log('📋 Validating rules...');
    try {
      const results = await govEngine.validateAllRules();
      const summary = govEngine.getValidationSummary();
      console.log(`✅ Validation: ${summary.passed}/${summary.total} rules passed (${summary.compliance}% compliance)`);

      if (summary.criticalFailures.length > 0) {
        console.log('⚠️  Critical failures:', summary.criticalFailures.join(', '));
      }
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
    }

    // Step 2: Update dashboard data
    console.log('📊 Updating dashboard data...');
    try {
      const { execSync } = require('child_process');
      execSync('cd /Users/nolarose/consise-mcp-agents && bun gov:dashboard', { stdio: 'inherit' });
      console.log('✅ Dashboard updated successfully');
    } catch (error) {
      console.error('❌ Dashboard update failed:', error.message);
    }

    // Step 3: Check for alerts
    console.log('🚨 Checking for alerts...');
    this.checkAlerts();

    // Step 4: Performance monitoring
    console.log('📈 Performance check...');
    this.performanceCheck();

    console.log('✅ Scheduled GOV update completed');
  }

  private checkAlerts(): void {
    const stats = govEngine.getLiveStats();

    // Alert conditions
    if (stats.compliance < 90) {
      console.log('🚨 ALERT: Compliance below 90%! Current:', stats.compliance + '%');
    }

    if (stats.violations > 0) {
      console.log('🚨 ALERT: Active violations detected:', stats.violations);
    }

    if (stats.active < stats.total * 0.8) {
      console.log('⚠️  WARNING: Many rules inactive. Active:', stats.active + '/' + stats.total);
    }
  }

  private performanceCheck(): void {
    const stats = govEngine.getLiveStats();
    const perf = stats.performance;

    console.log(`📊 Performance: ${perf.avgValidationTime} avg, ${perf.rulesPerSecond} rules/sec`);
    console.log(`💾 Resources: ${perf.memoryUsage} memory, ${perf.cpuUsage} CPU`);
  }

  async startScheduler(intervalMinutes: number = 60): Promise<void> {
    console.log(`⏰ Starting GOV scheduler (${intervalMinutes} minute intervals)...`);

    // Run initial update
    await this.runScheduledUpdate();

    // Schedule recurring updates
    setInterval(async () => {
      await this.runScheduledUpdate();
    }, intervalMinutes * 60 * 1000);

    console.log('✅ GOV scheduler active');
  }
}

// CLI Interface
const cmd = process.argv[2];
const scheduler = new GOVScheduler();

switch (cmd) {
  case 'run':
  case 'update':
    scheduler.runScheduledUpdate().catch(console.error);
    break;

  case 'start':
    const interval = parseInt(process.argv[3]) || 60;
    scheduler.startScheduler(interval);
    break;

  case 'alerts':
    scheduler.checkAlerts();
    break;

  default:
    console.log('GOV Scheduler Commands:');
    console.log('  run     - Run one-time scheduled update');
    console.log('  start   - Start continuous scheduler (default: 60min)');
    console.log('  alerts  - Check for system alerts');
}
