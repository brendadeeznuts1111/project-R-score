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

    console.log("\n\x1b[1;36m📊 Enhanced Skill Metrics\x1b[0m");
    console.log("═".repeat(60));

    // Aggregate Stats
    console.log("\n\x1b[1;33m📈 Aggregate Statistics\x1b[0m");
    console.log(`  Total Executions: \x1b[1m${metrics.aggregate.totalExecutions}\x1b[0m`);
    console.log(`  Success Rate:     \x1b[32m${metrics.aggregate.successRate}\x1b[0m`);
    console.log(`  Total Time:       ${metrics.aggregate.totalTime}`);
    console.log(`  Average Time:     ${metrics.aggregate.averageTime}`);

    // Terminal Usage
    console.log("\n\x1b[1;33m🖥️  Terminal Usage\x1b[0m");
    console.log(`  Active Terminals:     \x1b[1m${metrics.terminalUsage.activeTerminals}\x1b[0m`);
    console.log(`  Interactive Sessions: ${metrics.terminalUsage.interactiveSessions}`);
    console.log(`  Dashboard Sessions:   ${metrics.terminalUsage.dashboardSessions}`);
    console.log(`  Debug Sessions:       ${metrics.terminalUsage.debugSessions}`);
    console.log(`  Total Terminal Time:  ${metrics.terminalUsage.totalTerminalTime}`);

    // Trends
    console.log("\n\x1b[1;33m🔥 Trends\x1b[0m");
    console.log("  Last Hour:");
    console.log(`    Executions: ${metrics.trends.lastHour.executions}`);
    console.log(`    Avg Duration: ${Math.round(metrics.trends.lastHour.avgDuration)}ms`);
    console.log(`    Error Rate: ${metrics.trends.lastHour.errorRate}`);
    console.log("  Last 24 Hours:");
    console.log(`    Executions: ${metrics.trends.last24Hours.executions}`);
    console.log(`    Avg Duration: ${Math.round(metrics.trends.last24Hours.avgDuration)}ms`);
    console.log(`    Error Rate: ${metrics.trends.last24Hours.errorRate}`);

    // Per-Skill Breakdown
    if (Object.keys(metrics.bySkill).length > 0) {
      console.log("\n\x1b[1;33m📦 Per-Skill Breakdown\x1b[0m");
      for (const [skillId, skill] of Object.entries(metrics.bySkill) as any) {
        console.log(`\n  \x1b[1;35m${skillId}\x1b[0m`);
        console.log(`    Executions: ${skill.executions} (✓${skill.successes} ✗${skill.failures})`);
        console.log(`    Avg Duration: ${Math.round(skill.averageDuration)}ms`);
        console.log(`    Last Executed: ${skill.lastExecuted}`);
        if (Object.keys(skill.commands).length > 0) {
          console.log("    Commands:");
          for (const [cmd, cmdData] of Object.entries(skill.commands) as any) {
            console.log(`      ${cmd}: ${cmdData.count}x, avg ${Math.round(cmdData.avgDuration)}ms`);
          }
        }
      }
    }

    // Recent Executions
    if (metrics.recentExecutions.length > 0) {
      console.log("\n\x1b[1;33m📋 Recent Executions\x1b[0m");
      const recent = metrics.recentExecutions.slice(0, 10);
      for (const exec of recent) {
        const status = exec.status === "success" ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
        const time = new Date(exec.timestamp).toLocaleTimeString();
        console.log(`  ${status} ${exec.skillId}:${exec.command} [${Math.round(exec.duration)}ms] @ ${time}`);
      }
    }

    // System Health
    console.log("\n\x1b[1;33m💻 System Health\x1b[0m");
    console.log(`  Uptime:       ${metrics.system.uptime}`);
    console.log(`  Memory Used:  ${metrics.system.memoryUsage}`);
    console.log(`  Memory Total: ${metrics.system.memoryTotal}`);
    console.log(`  CPU Usage:    ${metrics.system.cpuUsage}`);

    console.log("\n" + "═".repeat(60));
    console.log(`\x1b[2mTimestamp: ${metrics.timestamp}\x1b[0m\n`);

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
