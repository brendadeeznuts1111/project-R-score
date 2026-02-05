#!/usr/bin/env bun

/**
 * Bun GitHub & Documentation Validation Script
 *
 * Advanced validation for Bun's GitHub repository and documentation URLs.
 * Includes commit hash checking, raw file validation, and deep-link testing.
 *
 * Usage: bun run bun-github-validation.ts
 */

interface GitHubValidationResult {
  check: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: any;
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

async function fetchLatestCommit(): Promise<GitHubValidationResult> {
  try {
    const response = await fetch("https://api.github.com/repos/oven-sh/bun/git/refs/heads/main");
    if (!response.ok) {
      return {
        check: 'Latest Commit Fetch',
        status: 'error',
        message: `GitHub API error: ${response.status}`
      };
    }

    const data = await response.json();
    const latestCommit = data.object.sha;

    return {
      check: 'Latest Commit Fetch',
      status: 'success',
      message: `Latest commit: ${colorize(latestCommit.slice(0, 12), 'blue')}...`,
      data: { commit: latestCommit }
    };
  } catch (error) {
    return {
      check: 'Latest Commit Fetch',
      status: 'error',
      message: `Failed to fetch latest commit: ${error}`
    };
  }
}

async function checkCommitExists(commitHash: string): Promise<GitHubValidationResult> {
  try {
    const response = await fetch(`https://github.com/oven-sh/bun/commit/${commitHash}`, {
      method: 'HEAD'
    });

    const exists = response.status === 200;
    const status = exists ? 'success' : 'error';
    const message = exists
      ? `Commit ${colorize(commitHash.slice(0, 12), 'blue')}... exists`
      : `Commit ${colorize(commitHash.slice(0, 12), 'red')}... not found (${response.status})`;

    return {
      check: 'Commit Existence Check',
      status,
      message,
      data: { exists, commit: commitHash }
    };
  } catch (error) {
    return {
      check: 'Commit Existence Check',
      status: 'error',
      message: `Failed to check commit: ${error}`,
      data: { commit: commitHash }
    };
  }
}

async function getRawFileSnippet(): Promise<GitHubValidationResult> {
  try {
    const response = await fetch("https://raw.githubusercontent.com/oven-sh/bun/main/packages/bun-types/bun.d.ts");

    if (!response.ok) {
      return {
        check: 'Raw File Content',
        status: 'error',
        message: `Failed to fetch raw file: ${response.status}`
      };
    }

    const content = await response.text();
    const snippet = content.slice(0, 100);
    const lines = content.split('\n').length;

    return {
      check: 'Raw File Content',
      status: 'success',
      message: `bun.d.ts (${lines} lines): ${colorize(snippet.replace(/\s+/g, ' ').trim(), 'gray')}`,
      data: { snippet, totalLines: lines }
    };
  } catch (error) {
    return {
      check: 'Raw File Content',
      status: 'error',
      message: `Failed to fetch raw file: ${error}`
    };
  }
}

async function checkDocsUrl(url: string, name: string): Promise<GitHubValidationResult> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const isLive = response.status === 200;
    const status = isLive ? 'success' : 'error';
    const message = isLive
      ? `${name}: ${colorize('live', 'green')}`
      : `${name}: ${colorize('404', 'red')} (${response.status})`;

    return {
      check: 'Documentation URL Check',
      status,
      message,
      data: { url, name, status: response.status }
    };
  } catch (error) {
    return {
      check: 'Documentation URL Check',
      status: 'error',
      message: `${name}: ${colorize('error', 'red')} - ${error}`,
      data: { url, name }
    };
  }
}

function generateDeepLink(name: string, fragment: string): GitHubValidationResult {
  const baseUrl = 'https://bun.com/reference';
  const deepLink = `${baseUrl}#:~:text=${encodeURIComponent(fragment)}`;

  return {
    check: 'Deep Link Generation',
    status: 'success',
    message: `${name}: ${colorize(deepLink, 'blue')}`,
    data: { deepLink, fragment }
  };
}

async function runAdvancedValidation(): Promise<void> {
  console.log(colorize('🔬 Advanced Bun GitHub & Documentation Validation', 'bright'));
  console.log(colorize('===================================================', 'cyan'));
  console.log();

  // Test cases
  const docsUrls = [
    { url: 'https://bun.com/docs/api/utils', name: 'API Utils' },
    { url: 'https://bun.com/docs/runtime/nodejs-apis', name: 'Node.js APIs' },
    { url: 'https://bun.com/docs/api/globals', name: 'Global APIs' },
    { url: 'https://bun.com/docs/runtime/utils', name: 'Runtime Utils' }
  ];

  const deepLinks = [
    { name: 'node:zlib', fragment: 'node:zlib' },
    { name: 'Bun.env', fragment: 'Bun.env' },
    { name: 'fetch API', fragment: 'fetch' }
  ];

  console.log(colorize('Running advanced validation checks...', 'yellow'));
  console.log();

  // Run all validations
  const results: GitHubValidationResult[] = [];

  // 1. Latest commit fetch
  const latestCommitResult = await fetchLatestCommit();
  results.push(latestCommitResult);
  console.log(`🔍 ${latestCommitResult.check}: ${latestCommitResult.message}`);

  // 2. Check current stable release commit
  const stableCommit = 'b64edcb490b486fb8af90cb2cb2dc51590453064';
  const commitCheckResult = await checkCommitExists(stableCommit);
  results.push(commitCheckResult);
  console.log(`🔍 ${commitCheckResult.check}: ${commitCheckResult.message}`);

  // 3. Raw file content check
  const rawFileResult = await getRawFileSnippet();
  results.push(rawFileResult);
  console.log(`🔍 ${rawFileResult.check}: ${rawFileResult.message}`);

  // 4. Documentation URL checks
  console.log();
  console.log(colorize('📚 Documentation URL Checks:', 'bright'));
  for (const { url, name } of docsUrls) {
    const result = await checkDocsUrl(url, name);
    results.push(result);
    console.log(`  ${result.message}`);
  }

  // 5. Deep link generation
  console.log();
  console.log(colorize('🔗 Generated Deep Links:', 'bright'));
  for (const { name, fragment } of deepLinks) {
    const result = generateDeepLink(name, fragment);
    results.push(result);
    console.log(`  ${result.message}`);
  }

  // Summary
  console.log();
  console.log(colorize('📊 Validation Summary', 'bright'));
  console.log(colorize('=====================', 'cyan'));

  const successCount = results.filter(r => r.status === 'success').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  console.log(`✅ Successful: ${colorize(successCount.toString(), 'green')}`);
  console.log(`⚠️  Warnings: ${colorize(warningCount.toString(), 'yellow')}`);
  console.log(`❌ Errors: ${colorize(errorCount.toString(), 'red')}`);
  console.log(`📈 Total checks: ${results.length}`);

  if (errorCount > 0) {
    console.log();
    console.log(colorize('🔧 Failed checks:', 'red'));
    results.filter(r => r.status === 'error').forEach(result => {
      console.log(`  • ${result.check}: ${result.message}`);
    });
  }

  // Latest commit info
  const latestCommitData = results.find(r => r.check === 'Latest Commit Fetch' && r.data)?.data;
  if (latestCommitData) {
    console.log();
    console.log(colorize('📋 Latest Information:', 'bright'));
    console.log(`Latest commit: ${colorize(latestCommitData.commit, 'blue')}`);
    console.log(`Short hash: ${colorize(latestCommitData.commit.slice(0, 12), 'blue')}`);
  }

  console.log();
  console.log(colorize('🎯 Advanced validation complete!', 'green'));
}

// Run the validation
runAdvancedValidation().catch((error) => {
  console.error(colorize(`Script failed: ${error}`, 'red'));
  process.exit(1);
});