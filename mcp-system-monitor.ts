#!/usr/bin/env bun

/**
 * 🔍 MCP System Monitor
 *
 * Comprehensive Bun runtime and ecosystem monitoring
 * for Model Context Protocol (MCP) operations.
 *
 * Usage: bun run mcp-system-monitor.ts
 */

interface SystemStatus {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  metrics?: Record<string, any>;
}

interface MCPSnapshot {
  timestamp: string;
  runtime: {
    version: string;
    revision: string;
    platform: string;
    uptime: number;
  };
  ecosystem: {
    docs: Array<{ url: string; status: number; responseTime: number }>;
    git: { commits: number; warnings: number };
  };
  reports: {
    generated: string[];
    pending: number;
  };
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function getStatusIcon(status: SystemStatus['status']): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    default: return '❓';
  }
}

async function checkBunRuntime(): Promise<SystemStatus> {
  try {
    const version = Bun.version;
    const revision = Bun.revision.slice(0, 8);
    const platform = `${process.platform}-${process.arch}`;
    const uptime = Math.floor(process.uptime() / 3600);

    return {
      component: 'Bun Runtime',
      status: 'healthy',
      message: `v${version} (${revision}) | ${platform} | uptime ${uptime}h`,
      metrics: { version, revision, platform, uptime }
    };
  } catch (error) {
    return {
      component: 'Bun Runtime',
      status: 'error',
      message: `Failed to check runtime: ${error}`
    };
  }
}

async function checkDocumentationHealth(): Promise<SystemStatus[]> {
  const urls = [
    'https://bun.com/docs',
    'https://bun.com/reference',
    'https://bun.com/docs/api/utils',
    'https://bun.com/docs/runtime/utils',
    'https://bun.com/docs/api/globals'
  ];

  const results = await Promise.all(
    urls.map(async (url): Promise<SystemStatus> => {
      try {
        const startTime = Date.now();
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        const responseTime = Date.now() - startTime;

        const isHealthy = response.status === 200;
        const status: SystemStatus['status'] = isHealthy ? 'healthy' : 'error';

        return {
          component: `Docs: ${url.split('/').pop()}`,
          status,
          message: `${response.status} (${responseTime}ms)`,
          metrics: { url, status: response.status, responseTime }
        };
      } catch (error) {
        return {
          component: `Docs: ${url.split('/').pop()}`,
          status: 'error',
          message: `Failed: ${error}`,
          metrics: { url }
        };
      }
    })
  );

  return results;
}

async function checkGitStatus(): Promise<SystemStatus> {
  try {
    // Check for uncommitted changes
    const gitStatus = Bun.spawn(['git', 'status', '--porcelain'], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const statusOutput = await new Response(gitStatus.stdout).text();
    const changes = statusOutput.trim().split('\n').filter(line => line.length > 0).length;

    // Check for recent commits
    const gitLog = Bun.spawn(['git', 'log', '--oneline', '-10'], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const logOutput = await new Response(gitLog.stdout).text();
    const commits = logOutput.trim().split('\n').filter(line => line.length > 0).length;

    const hasChanges = changes > 0;
    const status: SystemStatus['status'] = hasChanges ? 'warning' : 'healthy';

    return {
      component: 'Git Repository',
      status,
      message: `${commits} recent commits, ${changes} uncommitted changes`,
      metrics: { commits, changes }
    };
  } catch (error) {
    return {
      component: 'Git Repository',
      status: 'warning',
      message: `Git check failed: ${error}`,
      metrics: { error: String(error) }
    };
  }
}

async function generateReportFilename(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `mcp-snapshot-${timestamp}.json`;
}

async function createMCPSnapshot(): Promise<MCPSnapshot> {
  const [runtimeStatus, docsStatuses, gitStatus] = await Promise.all([
    checkBunRuntime(),
    checkDocumentationHealth(),
    checkGitStatus()
  ]);

  const docsResults = docsStatuses.map(status => ({
    url: status.metrics?.url || '',
    status: status.metrics?.status || 0,
    responseTime: status.metrics?.responseTime || 0
  }));

  const snapshot: MCPSnapshot = {
    timestamp: new Date().toISOString(),
    runtime: {
      version: runtimeStatus.metrics?.version || '',
      revision: runtimeStatus.metrics?.revision || '',
      platform: runtimeStatus.metrics?.platform || '',
      uptime: runtimeStatus.metrics?.uptime || 0
    },
    ecosystem: {
      docs: docsResults,
      git: {
        commits: gitStatus.metrics?.commits || 0,
        warnings: gitStatus.metrics?.changes || 0
      }
    },
    reports: {
      generated: [await generateReportFilename()],
      pending: 0
    }
  };

  return snapshot;
}

async function runMCPMonitor(): Promise<void> {
  console.log(colorize('🔍 MCP System Monitor', 'bright'));
  console.log(colorize('=====================', 'cyan'));
  console.log();

  // Run all checks
  console.log(colorize('🔬 Running comprehensive system checks...', 'yellow'));
  console.log();

  const [runtimeStatus, docsStatuses, gitStatus] = await Promise.all([
    checkBunRuntime(),
    checkDocumentationHealth(),
    checkGitStatus()
  ]);

  const allStatuses = [runtimeStatus, ...docsStatuses, gitStatus];

  // Display results
  for (const status of allStatuses) {
    const icon = getStatusIcon(status.status);
    const statusColor = status.status === 'healthy' ? 'green' :
                       status.status === 'warning' ? 'yellow' : 'red';

    console.log(`${icon} ${colorize(status.component, 'bright')}: ${colorize(status.message, statusColor)}`);
  }

  console.log();

  // Summary
  const healthy = allStatuses.filter(s => s.status === 'healthy').length;
  const warnings = allStatuses.filter(s => s.status === 'warning').length;
  const errors = allStatuses.filter(s => s.status === 'error').length;

  console.log(colorize('📊 Health Summary:', 'bright'));
  console.log(`  ${colorize('Healthy', 'green')}: ${healthy}`);
  console.log(`  ${colorize('Warnings', 'yellow')}: ${warnings}`);
  console.log(`  ${colorize('Errors', 'red')}: ${errors}`);
  console.log();

  // Generate MCP snapshot
  console.log(colorize('💾 Generating MCP snapshot...', 'blue'));
  const snapshot = await createMCPSnapshot();
  const filename = await generateReportFilename();

  // Save snapshot
  await Bun.write(filename, JSON.stringify(snapshot, null, 2));
  console.log(`Snapshot saved: ${colorize(filename, 'cyan')}`);
  console.log();

  // Quick actions
  console.log(colorize('🚀 Quick Actions:', 'bright'));
  console.log(`  ${colorize('bun run validate:bun-urls', 'yellow')} - Full URL validation`);
  console.log(`  ${colorize('bun run validate:github', 'yellow')} - GitHub ecosystem checks`);
  console.log(`  ${colorize('bun run ai-demo', 'yellow')} - AI operations demo`);
  console.log();

  // Overall status
  const overallStatus = errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'healthy';
  const overallColor = overallStatus === 'healthy' ? 'green' :
                      overallStatus === 'warning' ? 'yellow' : 'red';

  console.log(colorize(`🎯 Overall Status: ${overallStatus.toUpperCase()}`, overallColor));

  if (errors > 0) {
    console.log();
    console.log(colorize('🔧 Issues detected - check components above', 'red'));
  } else if (warnings > 0) {
    console.log();
    console.log(colorize('⚠️  Minor issues detected - monitor closely', 'yellow'));
  } else {
    console.log();
    console.log(colorize('✨ All systems operational!', 'green'));
  }
}

// Run the MCP monitor
runMCPMonitor().catch((error) => {
  console.error(colorize(`MCP Monitor failed: ${error}`, 'red'));
  process.exit(1);
});