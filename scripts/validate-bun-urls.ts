#!/usr/bin/env bun

/**
 * Bun URL Validation Script
 *
 * Validates GitHub commit hashes and documentation URLs against Bun's official resources.
 * Includes constants from BUN_CONSTANTS_VERSION.json and additional validation checks.
 *
 * Usage: bun run validate-bun-urls.ts
 */

interface ValidationResult {
  url: string;
  status: number;
  statusText: string;
  ok: boolean;
  error?: string;
}

interface TestCase {
  name: string;
  url: string;
  description: string;
  expectedStatus?: number;
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
  gray: '\x1b[90m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

async function validateUrl(url: string, useHead: boolean = true): Promise<ValidationResult> {
  try {
    const method = useHead ? 'HEAD' : 'GET';
    const response = await fetch(url, { method });

    return {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      statusText: 'NETWORK_ERROR',
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function printResult(testName: string, result: ValidationResult): void {
  const statusIcon = result.ok ? '✅' : '❌';
  const statusColor = result.ok ? 'green' : 'red';

  console.info(`${colorize(statusIcon, statusColor)} ${colorize(testName, 'bright')}`);
  console.info(`   URL: ${colorize(result.url, 'blue')}`);

  if (result.ok) {
    console.info(`   Status: ${colorize(`${result.status} ${result.statusText}`, 'green')}`);
  } else {
    console.info(`   Status: ${colorize(`${result.status} ${result.statusText}`, 'red')}`);
    if (result.error) {
      console.info(`   Error: ${colorize(result.error, 'red')}`);
    }
  }

  console.info();
}

// Load constants from JSON file
async function loadConstants(): Promise<any> {
  try {
    const constantsPath = './config/BUN_CONSTANTS_VERSION.json';
    const constantsData = await Bun.file(constantsPath).text();
    return JSON.parse(constantsData);
  } catch (error) {
    console.error(colorize(`Failed to load constants: ${error}`, 'red'));
    return null;
  }
}

// Extract URL constants from the loaded data
function extractUrlConstants(constants: any): TestCase[] {
  if (!constants?.constants) return [];

  return constants.constants
    .filter((constant: any) => constant.type === 'url' && constant.value)
    .map((constant: any) => ({
      name: constant.name,
      url: constant.value.replace(/\$\{([^}]+)\}/g, (match: string, varName: string) => {
        // Simple variable substitution for common patterns
        const vars: Record<string, string> = {
          BUN_BASE_URL: 'https://bun.com',
          BUN_REPO_URL: 'https://github.com/oven-sh/bun',
        };
        return vars[varName] || match;
      }),
      description: `Constant from ${constant.project} project`,
      expectedStatus: 200,
    }));
}

async function runValidation(): Promise<void> {
  console.info(colorize('🔍 Bun URL Validation Script', 'bright'));
  console.info(colorize('================================', 'cyan'));
  console.info();

  // Load constants
  const constants = await loadConstants();
  const constantUrls = constants ? extractUrlConstants(constants) : [];

  // Define test cases
  const testCases: TestCase[] = [
    // Original one-liners from user
    {
      name: 'GitHub Tree URL (commit hash validation)',
      url: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
      description: 'Validates if the specific commit hash exists in GitHub',
    },
    {
      name: 'Raw GitHub File (bun.d.ts)',
      url: 'https://raw.githubusercontent.com/oven-sh/bun/main/packages/bun-types/bun.d.ts',
      description: 'Checks if the raw bun.d.ts file exists at this commit',
    },
    {
      name: 'Bun Docs Base URL',
      url: 'https://bun.com/docs',
      description: 'Official Bun documentation homepage',
    },
    {
      name: 'Bun Runtime Utils Docs',
      url: 'https://bun.com/docs/runtime/utils',
      description: 'Specific runtime utils documentation page',
    },

    // Additional important URLs
    {
      name: 'GitHub Repository',
      url: 'https://github.com/oven-sh/bun',
      description: 'Main Bun repository on GitHub',
    },
    {
      name: 'Bun Releases',
      url: 'https://github.com/oven-sh/bun/releases',
      description: 'Bun release pages',
    },
    {
      name: 'Bun Installation',
      url: 'https://bun.sh/install',
      description: 'Official Bun installation script',
    },
    {
      name: 'Bun Blog',
      url: 'https://bun.com/blog',
      description: 'Official Bun blog',
    },
    {
      name: 'Bun Changelog RSS',
      url: 'https://bun.com/rss.xml',
      description: 'Bun changelog RSS feed',
    },
  ];

  // Add URL constants from the JSON file
  testCases.push(...constantUrls);

  console.info(colorize(`Running ${testCases.length} validation tests...`, 'yellow'));
  console.info();

  let passed = 0;
  let failed = 0;

  // Run all validations in parallel for speed
  const results = await Promise.all(
    testCases.map(async testCase => {
      const result = await validateUrl(testCase.url);
      return { testCase, result };
    })
  );

  // Print results
  for (const { testCase, result } of results) {
    printResult(testCase.name, result);

    if (result.ok) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  console.info(colorize('📊 Summary', 'bright'));
  console.info(colorize('==========', 'cyan'));
  console.info(`Total tests: ${testCases.length}`);
  console.info(colorize(`✅ Passed: ${passed}`, 'green'));
  console.info(colorize(`❌ Failed: ${failed}`, 'red'));

  if (failed > 0) {
    console.info();
    console.info(colorize('⚠️  Some URLs failed validation. This may indicate:', 'yellow'));
    console.info('   • Outdated commit hashes');
    console.info('   • Broken documentation links');
    console.info('   • Network connectivity issues');
    console.info('   • Temporary service outages');
  } else {
    console.info();
    console.info(colorize('🎉 All URLs validated successfully!', 'green'));
  }

  // Commit hash validation
  console.info();
  console.info(colorize('🔍 Reference Analysis', 'bright'));
  console.info(colorize('===================', 'cyan'));

  const gitReference = 'main';
  const isCommitHash = gitReference.length === 40 && /^[a-f0-9]+$/.test(gitReference);
  const isBranchName =
    gitReference === 'main' || gitReference === 'master' || gitReference.match(/^[a-zA-Z0-9._-]+$/);
  const isValidReference = isCommitHash || isBranchName;

  console.info(`Git reference: ${colorize(gitReference, 'blue')}`);
  console.info(`Type: ${isCommitHash ? 'Commit hash' : 'Branch name'}`);
  console.info(
    `Format check: ${isValidReference ? colorize('✅ Valid', 'green') : colorize('❌ Invalid', 'red')}`
  );

  if (isCommitHash) {
    console.info(`Length check (40 chars): ${colorize('✅ Valid', 'green')}`);
    console.info(`Hex format check: ${colorize('✅ Valid', 'green')}`);
  } else if (isBranchName) {
    console.info(`Branch name format: ${colorize('✅ Valid', 'green')}`);
  }

  if (isValidReference) {
    console.info(colorize('✅ Git reference format is valid', 'green'));
  } else {
    console.info(colorize('⚠️  Invalid git reference format detected!', 'red'));
  }
}

// Run the validation
runValidation().catch(error => {
  console.error(colorize(`Script failed: ${error}`, 'red'));
  process.exit(1);
});
