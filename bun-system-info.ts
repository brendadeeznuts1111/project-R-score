#!/usr/bin/env bun

/**
 * Bun System Info & Project Analysis Script
 *
 * Comprehensive Bun runtime information and project statistics.
 * Includes version checking, git status, and codebase metrics.
 *
 * Usage: bun run bun-system-info.ts [filename]
 */

interface SystemInfo {
  category: string;
  items: Array<{
    label: string;
    value: string;
    status?: 'good' | 'warning' | 'info';
  }>;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function getStatusColor(status?: string): keyof typeof colors {
  switch (status) {
    case 'good': return 'green';
    case 'warning': return 'yellow';
    case 'info': return 'blue';
    default: return 'reset';
  }
}

async function checkBunUpdateStatus(): Promise<{ label: string; value: string; status: 'good' | 'warning' | 'info' }> {
  const currentRevision = Bun.revision.slice(0, 8);
  const latestStable = 'b64edcb4';

  if (currentRevision === latestStable) {
    return {
      label: 'Update Status',
      value: 'Latest stable release',
      status: 'good'
    };
  }

  // Check if it's a newer canary build
  try {
    const response = await fetch('https://api.github.com/repos/oven-sh/bun/git/refs/heads/main');
    const data = await response.json();
    const latestMain = data.object.sha.slice(0, 8);

    if (currentRevision === latestMain) {
      return {
        label: 'Update Status',
        value: 'Latest main branch (canary)',
        status: 'good'
      };
    }

    return {
      label: 'Update Status',
      value: `Canary build (ahead of ${latestStable.slice(0, 8)})`,
      status: 'info'
    };
  } catch {
    return {
      label: 'Update Status',
      value: 'Unable to check latest version',
      status: 'warning'
    };
  }
}

async function checkGitFileStatus(filename?: string): Promise<{ label: string; value: string; status: 'good' | 'warning' }> {
  if (!filename) {
    return {
      label: 'Git File Check',
      value: 'No file specified',
      status: 'warning'
    };
  }

  try {
    const proc = Bun.spawn(['git', 'ls-files', '--error-unmatch', filename], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const exitCode = await proc.exited;
    const isTracked = exitCode === 0;

    return {
      label: 'Git File Status',
      value: `${filename}: ${isTracked ? 'tracked' : 'untracked'}`,
      status: isTracked ? 'good' : 'warning'
    };
  } catch {
    return {
      label: 'Git File Status',
      value: 'Git check failed',
      status: 'warning'
    };
  }
}

async function countCodeLines(): Promise<{ label: string; value: string; status: 'info' }> {
  // Skip expensive line counting by default - use quick alternative
  try {
    const proc = Bun.spawn(['find', '.', '-name', '*.ts', '-o', '-name', '*.tsx', '-o', '-name', '*.js', '-o', '-name', '*.mjs'], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const output = await new Response(proc.stdout).text();
    const files = output.trim().split('\n').filter(line => line.length > 0);

    return {
      label: 'Codebase Statistics',
      value: `${files.length} TypeScript/JavaScript files found`,
      status: 'info'
    };
  } catch (error) {
    return {
      label: 'Codebase Statistics',
      value: 'Unable to scan files',
      status: 'info'
    };
  }
}

async function getGitStatus(): Promise<{ label: string; value: string; status: 'info' }> {
  try {
    const proc = Bun.spawn(['git', 'status', '--porcelain'], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const output = await new Response(proc.stdout).text();
    const lines = output.trim().split('\n').filter(line => line.length > 0);
    const changeCount = lines.length;

    return {
      label: 'Git Status',
      value: `${changeCount} uncommitted change${changeCount !== 1 ? 's' : ''}`,
      status: 'info'
    };
  } catch {
    return {
      label: 'Git Status',
      value: 'Not a git repository',
      status: 'info'
    };
  }
}

async function runSystemAnalysis(): Promise<void> {
  const filename = process.argv[2];

  console.log(colorize('🔍 Bun System Info & Project Analysis', 'bright'));
  console.log(colorize('=====================================', 'cyan'));
  console.log();

  const systemInfo: SystemInfo[] = [
    {
      category: 'Bun Runtime',
      items: [
        { label: 'Version', value: Bun.version },
        { label: 'Revision', value: `${Bun.revision.slice(0, 8)} (${Bun.revision})` },
        { label: 'Platform', value: `${process.platform}-${process.arch}` },
        await checkBunUpdateStatus()
      ]
    },
    {
      category: 'Project Analysis',
      items: [
        await getGitStatus(),
        await countCodeLines(),
        await checkGitFileStatus(filename)
      ]
    }
  ];

  for (const category of systemInfo) {
    console.log(colorize(`📊 ${category.category}:`, 'bright'));
    for (const item of category.items) {
      const statusColor = getStatusColor(item.status);
      console.log(`  ${colorize(item.label + ':', 'cyan')} ${colorize(item.value, statusColor)}`);
    }
    console.log();
  }

  // Quick actions
  console.log(colorize('🚀 Quick Actions:', 'bright'));
  console.log(`  Update Bun: ${colorize('bun upgrade', 'yellow')}`);
  console.log(`  Check all URLs: ${colorize('bun run validate:bun-urls', 'yellow')}`);
  console.log(`  Advanced validation: ${colorize('bun run validate:github', 'yellow')}`);
  console.log();

  console.log(colorize('✨ System analysis complete!', 'green'));
}

// Run the analysis
runSystemAnalysis().catch((error) => {
  console.error(colorize(`Analysis failed: ${error}`, 'red'));
  process.exit(1);
});