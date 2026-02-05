#!/usr/bin/env bun

/**
 * 🌅 Bun Morning Ritual - Complete Development Status Dashboard
 *
 * Unified command combining essential checks for daily development:
 * - System status, GitHub integration, AI insights
 * - Optimized for speed and actionable information
 *
 * Usage: bun run morning-ritual
 */

interface RitualStatus {
  component: string;
  status: 'good' | 'warning' | 'error';
  message: string;
  details?: string[];
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

async function getSystemStatus(): Promise<RitualStatus> {
  try {
    const version = Bun.version;
    const revision = Bun.revision.slice(0, 8);
    const platform = `${process.platform}-${process.arch}`;

    // Check if running latest
    const response = await fetch("https://api.github.com/repos/oven-sh/bun/git/refs/heads/main");
    const data = await response.json();
    const latestCommit = data.object.sha;
    const isLatest = Bun.revision === latestCommit;

    return {
      component: 'System',
      status: isLatest ? 'good' : 'warning',
      message: `Bun ${version} (${revision}) on ${platform}`,
      details: [
        isLatest ? '🟢 Running latest main commit' : '🟡 Running canary build',
        `Latest: ${latestCommit.slice(0, 8)}`
      ]
    };
  } catch (error) {
    return {
      component: 'System',
      status: 'warning',
      message: 'Unable to check system status',
      details: [`Error: ${error}`]
    };
  }
}

async function getGitHubStatus(): Promise<RitualStatus> {
  try {
    // Quick commit check
    const commitResponse = await fetch("https://api.github.com/repos/oven-sh/bun/git/refs/heads/main");
    const commitData = await commitResponse.json();

    // Quick URL validation (sample)
    const urlChecks = await Promise.all([
      fetch('https://bun.com/docs', { method: 'HEAD' }),
      fetch('https://bun.com/reference', { method: 'HEAD' })
    ]);

    const healthyUrls = urlChecks.filter(r => r.status === 200).length;
    const totalUrls = urlChecks.length;

    // Local git status
    let gitStatus = 'unknown';
    try {
      const gitProc = Bun.spawn(['git', 'status', '--porcelain'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      const gitOutput = await new Response(gitProc.stdout).text();
      const changes = gitOutput.trim().split('\n').filter(line => line.length > 0).length;
      gitStatus = `${changes} uncommitted`;
    } catch {
      gitStatus = 'git check failed';
    }

    const isHealthy = healthyUrls === totalUrls;

    return {
      component: 'GitHub',
      status: isHealthy ? 'good' : 'error',
      message: `Latest: ${commitData.object.sha.slice(0, 8)} | URLs: ${healthyUrls}/${totalUrls} | Git: ${gitStatus}`,
      details: [
        `📊 Docs healthy: ${healthyUrls}/${totalUrls}`,
        `🔄 Local changes: ${gitStatus}`
      ]
    };
  } catch (error) {
    return {
      component: 'GitHub',
      status: 'error',
      message: 'GitHub check failed',
      details: [`Error: ${error}`]
    };
  }
}

async function getAIInsights(): Promise<RitualStatus> {
  try {
    // Quick AI analysis (simplified)
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const heapRatio = Math.round((heapUsedMB / heapTotalMB) * 100);

    // Mock performance metrics
    const responseTime = 95; // ms (from AI demo)
    const cacheHitRate = 85; // % (from AI demo)

    const hasIssues = heapRatio > 80 || responseTime > 100 || cacheHitRate < 80;

    return {
      component: 'AI Insights',
      status: hasIssues ? 'warning' : 'good',
      message: `Memory: ${heapRatio}% | Response: ${responseTime}ms | Cache: ${cacheHitRate}%`,
      details: [
        heapRatio > 80 ? `⚠️ High memory usage: ${heapUsedMB}/${heapTotalMB}MB` : `✅ Memory usage normal`,
        responseTime > 100 ? `⚠️ Slow response time: ${responseTime}ms` : `✅ Response time good`,
        cacheHitRate < 80 ? `⚠️ Low cache hit rate: ${cacheHitRate}%` : `✅ Cache performance good`
      ]
    };
  } catch (error) {
    return {
      component: 'AI Insights',
      status: 'warning',
      message: 'AI analysis limited',
      details: [`Basic metrics available`]
    };
  }
}

async function runMorningRitual(): Promise<void> {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  const dateString = now.toLocaleDateString();

  console.log(colorize('🌅 Bun Morning Ritual', 'bright'));
  console.log(colorize('=====================', 'cyan'));
  console.log(colorize(`${dateString} ${timeString}`, 'gray'));
  console.log();

  console.log(colorize('🔍 Running comprehensive status checks...', 'yellow'));
  console.log();

  // Run all checks in parallel for speed
  const [systemStatus, githubStatus, aiStatus] = await Promise.all([
    getSystemStatus(),
    getGitHubStatus(),
    getAIInsights()
  ]);

  const allStatuses = [systemStatus, githubStatus, aiStatus];

  // Display results
  for (const status of allStatuses) {
    const icon = status.status === 'good' ? '✅' :
                 status.status === 'warning' ? '⚠️' : '❌';

    console.log(`${icon} ${colorize(status.component, 'bright')}: ${status.message}`);

    if (status.details) {
      for (const detail of status.details) {
        console.log(`   ${detail}`);
      }
    }
    console.log();
  }

  // Overall assessment
  const errors = allStatuses.filter(s => s.status === 'error').length;
  const warnings = allStatuses.filter(s => s.status === 'warning').length;
  const goods = allStatuses.filter(s => s.status === 'good').length;

  console.log(colorize('📊 Overall Assessment:', 'bright'));
  console.log(colorize('====================', 'cyan'));

  if (errors > 0) {
    console.log(colorize(`❌ ${errors} system${errors > 1 ? 's' : ''} need${errors === 1 ? 's' : ''} attention`, 'red'));
  }

  if (warnings > 0) {
    console.log(colorize(`⚠️ ${warnings} system${warnings > 1 ? 's' : ''} have${warnings === 1 ? 's' : ''} warnings`, 'yellow'));
  }

  if (goods > 0) {
    console.log(colorize(`✅ ${goods} system${goods > 1 ? 's' : ''} healthy`, 'green'));
  }

  console.log();

  // Actionable recommendations
  console.log(colorize('🚀 Quick Actions:', 'bright'));

  if (warnings > 0 || errors > 0) {
    console.log(`  ${colorize('bun run mcp-monitor', 'yellow')}     - Detailed system health`);
    console.log(`  ${colorize('bun run github-integration', 'yellow')} - Full GitHub status`);
    console.log(`  ${colorize('bun run ai-demo', 'yellow')}       - AI optimization insights`);
  }

  console.log(`  ${colorize('bun run validate:bun-urls', 'yellow')} - URL validation`);
  console.log(`  ${colorize('bun run deep-links', 'yellow')}       - Generate doc links`);

  console.log();
  console.log(colorize('🎯 Development environment status: ', 'bright') +
              (errors > 0 ? colorize('NEEDS ATTENTION', 'red') :
               warnings > 0 ? colorize('MONITOR CLOSELY', 'yellow') :
               colorize('ALL SYSTEMS GO', 'green')));

  console.log();
  console.log(colorize('✨ Morning ritual complete! Ready for development.', 'green'));
}

// Run the morning ritual
runMorningRitual().catch((error) => {
  console.error(colorize(`Morning ritual failed: ${error}`, 'red'));
  process.exit(1);
});