#!/usr/bin/env bun

/**
 * 🔗 Bun GitHub Integration Suite
 *
 * Advanced GitHub API integration, commit validation,
 * raw file access, and deep-link generation for Bun ecosystem.
 *
 * Usage: bun run bun-github-integration.ts
 */

interface GitHubCommit {
  sha: string;
  url: string;
  html_url: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  message: string;
  tree: { sha: string; url: string };
  parents: Array<{ sha: string; url: string }>;
}

interface GitHubRef {
  ref: string;
  node_id: string;
  url: string;
  object: {
    sha: string;
    type: string;
    url: string;
  };
}

interface ValidationResult {
  check: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: any;
  url?: string;
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

async function getLatestMainCommit(): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.github.com/repos/oven-sh/bun/git/refs/heads/main");
    if (!response.ok) {
      return {
        check: 'Latest Main Commit',
        status: 'error',
        message: `GitHub API error: ${response.status}`
      };
    }

    const data: GitHubRef = await response.json();
    const commitHash = data.object.sha;

    return {
      check: 'Latest Main Commit',
      status: 'success',
      message: `Latest commit: ${colorize(commitHash.slice(0, 12), 'blue')}...`,
      data: { commitHash },
      url: `https://github.com/oven-sh/bun/commit/${commitHash}`
    };
  } catch (error) {
    return {
      check: 'Latest Main Commit',
      status: 'error',
      message: `Failed to fetch latest commit: ${error}`
    };
  }
}

async function checkBunVersionStatus(): Promise<ValidationResult> {
  const localRevision = Bun.revision;
  const latestStable = 'b64edcb490b486fb8af90cb2cb2dc51590453064';

  const isLatestStable = localRevision === latestStable;
  const status: ValidationResult['status'] = isLatestStable ? 'success' : 'warning';

  let message: string;
  if (isLatestStable) {
    message = `Running ${colorize('latest stable', 'green')} release`;
  } else {
    // Check if it's newer than stable (canary)
    const isCanary = localRevision.length === 40 && localRevision !== latestStable;
    message = `Running ${colorize(isCanary ? 'canary build' : 'custom/older', 'yellow')} (${localRevision.slice(0, 12)}...)`;
  }

  return {
    check: 'Bun Version Status',
    status,
    message,
    data: {
      localRevision,
      latestStable,
      isLatestStable,
      version: Bun.version,
      platform: `${process.platform}-${process.arch}`
    }
  };
}

async function getRawFileSnippet(path: string = 'packages/bun-types/bun.d.ts', lines: number = 5): Promise<ValidationResult> {
  try {
    const url = `https://raw.githubusercontent.com/oven-sh/bun/main/${path}`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        check: 'Raw File Content',
        status: 'error',
        message: `Failed to fetch ${path}: ${response.status}`
      };
    }

    const content = await response.text();
    const contentLines = content.split('\n');
    const snippet = contentLines.slice(0, lines).join('\n');
    const totalLines = contentLines.length;

    return {
      check: 'Raw File Content',
      status: 'success',
      message: `${path} (${totalLines} lines):\n${colorize(snippet, 'gray')}${lines < totalLines ? '\n...' : ''}`,
      data: { path, snippet, totalLines, requestedLines: lines },
      url
    };
  } catch (error) {
    return {
      check: 'Raw File Content',
      status: 'error',
      message: `Failed to fetch raw file: ${error}`
    };
  }
}

function generateDeepLink(searchText: string, page: string = 'reference'): ValidationResult {
  const baseUrl = `https://bun.com/${page}`;
  const encodedText = encodeURIComponent(searchText);
  const deepLink = `${baseUrl}#:~:text=${encodedText}`;

  return {
    check: 'Deep Link Generation',
    status: 'success',
    message: `Generated deep link for "${colorize(searchText, 'cyan')}": ${colorize(deepLink, 'blue')}`,
    data: { searchText, page, deepLink, encodedText },
    url: deepLink
  };
}

async function validateDeepLink(url: string): Promise<ValidationResult> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const isValid = response.status === 200;
    const status: ValidationResult['status'] = isValid ? 'success' : 'error';

    const message = isValid
      ? `Deep link ${colorize('valid', 'green')} (${response.status})`
      : `Deep link ${colorize('broken', 'red')} (${response.status})`;

    return {
      check: 'Deep Link Validation',
      status,
      message,
      data: { url, status: response.status, isValid },
      url
    };
  } catch (error) {
    return {
      check: 'Deep Link Validation',
      status: 'error',
      message: `Deep link check failed: ${error}`,
      data: { url }
    };
  }
}

async function validateCommit(commitHash: string): Promise<ValidationResult> {
  try {
    const response = await fetch(`https://github.com/oven-sh/bun/commit/${commitHash}`, {
      method: 'HEAD'
    });

    const exists = response.status === 200;
    const status: ValidationResult['status'] = exists ? 'success' : 'error';
    const message = exists
      ? `Commit ${colorize(commitHash.slice(0, 12), 'blue')}... ${colorize('exists', 'green')}`
      : `Commit ${colorize(commitHash.slice(0, 12), 'red')}... ${colorize('not found', 'red')} (${response.status})`;

    return {
      check: 'Commit Validation',
      status,
      message,
      data: { commitHash, exists, status: response.status },
      url: `https://github.com/oven-sh/bun/commit/${commitHash}`
    };
  } catch (error) {
    return {
      check: 'Commit Validation',
      status: 'error',
      message: `Commit check failed: ${error}`,
      data: { commitHash }
    };
  }
}

async function runGitHubIntegration(): Promise<void> {
  console.log(colorize('🔗 Bun GitHub Integration Suite', 'bright'));
  console.log(colorize('==============================', 'cyan'));
  console.log();

  console.log(colorize('🚀 Running advanced GitHub integration checks...', 'yellow'));
  console.log();

  // Run all checks
  const checks = await Promise.all([
    getLatestMainCommit(),
    checkBunVersionStatus(),
    getRawFileSnippet(),
    generateDeepLink('TypedArray'),
    validateDeepLink('https://bun.com/reference#:~:text=Bun%20API%20Reference'),
    validateCommit('af76296637931381e9509c204c5f1af9cc174534'),
    validateCommit('b64edcb490b486fb8af90cb2cb2dc51590453064')
  ]);

  // Display results
  for (const check of checks) {
    const statusIcon = check.status === 'success' ? '✅' :
                      check.status === 'warning' ? '⚠️' : '❌';

    console.log(`${statusIcon} ${colorize(check.check, 'bright')}:`);
    console.log(`   ${check.message}`);

    if (check.url) {
      console.log(`   ${colorize('URL:', 'gray')} ${check.url}`);
    }

    console.log();
  }

  // Summary
  const successCount = checks.filter(c => c.status === 'success').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const errorCount = checks.filter(c => c.status === 'error').length;

  console.log(colorize('📊 Integration Summary:', 'bright'));
  console.log(colorize('=======================', 'cyan'));
  console.log(`✅ Successful: ${colorize(successCount.toString(), 'green')}`);
  console.log(`⚠️  Warnings: ${colorize(warningCount.toString(), 'yellow')}`);
  console.log(`❌ Errors: ${colorize(errorCount.toString(), 'red')}`);
  console.log(`📈 Total checks: ${checks.length}`);

  // Key insights
  console.log();
  console.log(colorize('💡 Key Insights:', 'bright'));

  const latestCommit = checks.find(c => c.check === 'Latest Main Commit')?.data?.commitHash;
  const localRevision = checks.find(c => c.check === 'Bun Version Status')?.data?.localRevision;

  if (latestCommit && localRevision) {
    const isUpToDate = localRevision === latestCommit;
    const isCanary = localRevision !== latestCommit && localRevision.length === 40;

    if (isUpToDate) {
      console.log(`🎯 Your Bun is running the ${colorize('latest commit', 'green')} from main!`);
    } else if (isCanary) {
      console.log(`🚀 You're running a ${colorize('canary build', 'yellow')} ahead of main.`);
      console.log(`   Latest main: ${colorize(latestCommit.slice(0, 12), 'blue')}...`);
      console.log(`   Your build:  ${colorize(localRevision.slice(0, 12), 'blue')}...`);
    }
  }

  console.log();
  console.log(colorize('🔗 Useful Links:', 'bright'));
  console.log(`   ${colorize('Bun Repository:', 'gray')} https://github.com/oven-sh/bun`);
  console.log(`   ${colorize('Latest Release:', 'gray')} https://github.com/oven-sh/bun/releases/tag/bun-v1.3.8`);
  console.log(`   ${colorize('Documentation:', 'gray')} https://bun.com/docs`);
  console.log(`   ${colorize('API Reference:', 'gray')} https://bun.com/reference`);

  console.log();
  console.log(colorize('✨ GitHub integration checks complete!', 'green'));

  // Quick actions
  console.log();
  console.log(colorize('🚀 Quick Actions:', 'bright'));
  console.log(`  ${colorize('bun upgrade', 'yellow')} - Upgrade to latest stable`);
  console.log(`  ${colorize('bun run mcp-monitor', 'yellow')} - Full system monitoring`);
  console.log(`  ${colorize('bun run validate:github', 'yellow')} - Advanced GitHub validation`);
}

// Run the GitHub integration suite
runGitHubIntegration().catch((error) => {
  console.error(colorize(`GitHub integration failed: ${error}`, 'red'));
  process.exit(1);
});