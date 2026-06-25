#!/usr/bin/env bun
/**
 * scripts/show-metrics.ts
 * CLI tool to display enhanced skill metrics
 */

const API_URL = process.env.API_URL || "http://localhost:3002";
const API_KEY = process.env.API_KEY || "dev-key";

async function showMetrics() {
  try {
    const response = await fetch(`${API_URL}/api/metrics`, {
      headers: { "x-api-key": API_KEY },
    });

    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    const metrics = await response.json();

    console.info("\n\x1b[1;36m📊 Enhanced Skill Metrics\x1b[0m");
    console.info("═".repeat(60));

    // Aggregate Stats
    console.info("\n\x1b[1;33m📈 Aggregate Statistics\x1b[0m");
    console.info(`  Total Executions: \x1b[1m${metrics.aggregate.totalExecutions}\x1b[0m`);
    console.info(`  Success Rate:     \x1b[32m${metrics.aggregate.successRate}\x1b[0m`);
    console.info(`  Total Time:       ${metrics.aggregate.totalTime}`);
    console.info(`  Average Time:     ${metrics.aggregate.averageTime}`);

    // Terminal Usage
    console.info("\n\x1b[1;33m🖥️  Terminal Usage\x1b[0m");
    console.info(`  Active Terminals:     \x1b[1m${metrics.terminalUsage.activeTerminals}\x1b[0m`);
    console.info(`  Interactive Sessions: ${metrics.terminalUsage.interactiveSessions}`);
    console.info(`  Dashboard Sessions:   ${metrics.terminalUsage.dashboardSessions}`);
    console.info(`  Debug Sessions:       ${metrics.terminalUsage.debugSessions}`);
    console.info(`  Total Terminal Time:  ${metrics.terminalUsage.totalTerminalTime}`);

    // Trends
    console.info("\n\x1b[1;33m🔥 Trends\x1b[0m");
    console.info("  Last Hour:");
    console.info(`    Executions: ${metrics.trends.lastHour.executions}`);
    console.info(`    Avg Duration: ${Math.round(metrics.trends.lastHour.avgDuration)}ms`);
    console.info(`    Error Rate: ${metrics.trends.lastHour.errorRate}`);
    console.info("  Last 24 Hours:");
    console.info(`    Executions: ${metrics.trends.last24Hours.executions}`);
    console.info(`    Avg Duration: ${Math.round(metrics.trends.last24Hours.avgDuration)}ms`);
    console.info(`    Error Rate: ${metrics.trends.last24Hours.errorRate}`);

    // Per-Skill Breakdown
    if (Object.keys(metrics.bySkill).length > 0) {
      console.info("\n\x1b[1;33m📦 Per-Skill Breakdown\x1b[0m");
      for (const [skillId, skill] of Object.entries(metrics.bySkill) as any) {
        console.info(`\n  \x1b[1;35m${skillId}\x1b[0m`);
        console.info(`    Executions: ${skill.executions} (✓${skill.successes} ✗${skill.failures})`);
        console.info(`    Avg Duration: ${Math.round(skill.averageDuration)}ms`);
        console.info(`    Last Executed: ${skill.lastExecuted}`);
        if (Object.keys(skill.commands).length > 0) {
          console.info("    Commands:");
          for (const [cmd, cmdData] of Object.entries(skill.commands) as any) {
            console.info(`      ${cmd}: ${cmdData.count}x, avg ${Math.round(cmdData.avgDuration)}ms`);
          }
        }
      }
    }

    // Recent Executions
    if (metrics.recentExecutions.length > 0) {
      console.info("\n\x1b[1;33m📋 Recent Executions\x1b[0m");
      const recent = metrics.recentExecutions.slice(0, 10);
      for (const exec of recent) {
        const status = exec.status === "success" ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
        const time = new Date(exec.timestamp).toLocaleTimeString();
        console.info(`  ${status} ${exec.skillId}:${exec.command} [${Math.round(exec.duration)}ms] @ ${time}`);
      }
    }

    // System Health
    console.info("\n\x1b[1;33m💻 System Health\x1b[0m");
    console.info(`  Uptime:       ${metrics.system.uptime}`);
    console.info(`  Memory Used:  ${metrics.system.memoryUsage}`);
    console.info(`  Memory Total: ${metrics.system.memoryTotal}`);
    console.info(`  CPU Usage:    ${metrics.system.cpuUsage}`);

    console.info("\n" + "═".repeat(60));
    console.info(`\x1b[2mTimestamp: ${metrics.timestamp}\x1b[0m\n`);

  } catch (error: any) {
    if (error.code === "ECONNREFUSED") {
      console.error("\x1b[31mError: Cannot connect to API server at", API_URL);
      console.error("Make sure the server is running: bun run src/api-server.ts\x1b[0m");
    } else {
      console.error("\x1b[31mError:", error.message, "\x1b[0m");
    }
    process.exit(1);
  }
}

// Run
showMetrics();
