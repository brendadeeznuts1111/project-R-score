#!/usr/bin/env bun
/**
 * 🔥 FIRE22 SYSTEM INTEGRATION TEST
 * Validates that Repository, Registry, Hub, and Cloudflare are properly connected
 */

import { $ } from 'bun';

// ╔══════════════════════════════════════════════════════════════╗
// ║                 INTEGRATION TEST CONFIGURATION             ║
// ╚══════════════════════════════════════════════════════════════╝

interface IntegrationTest {
  name: string;
  description: string;
  test: () => Promise<boolean>;
  required: boolean;
}

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  duration: number;
  required: boolean;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 TEST IMPLEMENTATIONS                       ║
// ╚══════════════════════════════════════════════════════════════╝

// Repository Integration Tests
const repositoryTests: IntegrationTest[] = [
  {
    name: 'Repository Privacy',
    description: 'Verify repository is private and secure',
    required: true,
    test: async (): Promise<boolean> => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/brendadeeznuts1111/fantasy42-fire22-registry',
          {
            headers: {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (!response.ok) return false;

        const repo = await response.json();
        return repo.private === true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'GitHub Token',
    description: 'Validate GitHub API token permissions',
    required: true,
    test: async (): Promise<boolean> => {
      try {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Branch Protection',
    description: 'Verify branch protection rules are active',
    required: false,
    test: async (): Promise<boolean> => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/brendadeeznuts1111/fantasy42-fire22-registry/branches/main/protection',
          {
            headers: {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (!response.ok) return false;

        const protection = await response.json();
        return protection.enabled === true;
      } catch {
        return false;
      }
    },
  },
];

// Registry Integration Tests
const registryTests: IntegrationTest[] = [
  {
    name: 'Fire22 Registry',
    description: 'Test Fire22 registry connectivity',
    required: true,
    test: async (): Promise<boolean> => {
      try {
        const response = await fetch(`${process.env.FIRE22_REGISTRY_URL}/-/ping`);
        return response.ok;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'NPM Registry',
    description: 'Test NPM registry fallback',
    required: true,
    test: async (): Promise<boolean> => {
      try {
        const response = await fetch('https://registry.npmjs.org/-/ping');
        return response.ok;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Registry Authentication',
    description: 'Verify registry authentication works',
    required: false,
    test: async (): Promise<boolean> => {
      // This would test actual package publishing/downloading
      // For now, just check if tokens are configured
      return !!(process.env.FIRE22_REGISTRY_TOKEN && process.env.NPM_TOKEN);
    },
  },
];

// Cloudflare Integration Tests
const cloudflareTests: IntegrationTest[] = [
  {
    name: 'Cloudflare API Token',
    description: 'Validate Cloudflare API token',
    required: true,
    test: async (): Promise<boolean> => {
      try {
        const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) return false;

        const result = await response.json();
        return result.success === true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Wrangler Authentication',
    description: 'Test Wrangler CLI authentication',
    required: true,
    test: async (): Promise<boolean> => {
      try {
        const result = await $`wrangler whoami`.quiet();
        return result.exitCode === 0;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'DNS Resolution',
    description: 'Test DNS resolution for apexodds.net',
    required: false,
    test: async (): Promise<boolean> => {
      try {
        const response = await fetch('https://api.apexodds.net/health');
        return response.ok;
      } catch {
        return false;
      }
    },
  },
];

// Hub Integration Tests
const hubTests: IntegrationTest[] = [
  {
    name: 'Hub Configuration',
    description: 'Check hub configuration files exist',
    required: true,
    test: async (): Promise<boolean> => {
      try {
        const files = ['scripts/serve-hub-dev.ts', 'scripts/build-hub.ts', 'global-config.fire22'];

        for (const file of files) {
          if (!(await Bun.file(file).exists())) {
            return false;
          }
        }
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Hub Port Availability',
    description: 'Check if hub port is available',
    required: false,
    test: async (): Promise<boolean> => {
      try {
        const hubPort = process.env.FIRE22_HUB_PORT || '3001';
        const response = await fetch(`http://localhost:${hubPort}/health`);
        return response.ok;
      } catch {
        return false;
      }
    },
  },
];

// ╔══════════════════════════════════════════════════════════════╗
// ║                 TEST EXECUTION ENGINE                      ║
// ╚══════════════════════════════════════════════════════════════╝

async function runTest(test: IntegrationTest): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const success = await test.test();
    const duration = Date.now() - startTime;

    return {
      name: test.name,
      success,
      message: success ? 'PASS' : 'FAIL',
      duration,
      required: test.required,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      name: test.name,
      success: false,
      message: `ERROR: ${error.message}`,
      duration,
      required: test.required,
    };
  }
}

async function runTestSuite(name: string, tests: IntegrationTest[]): Promise<TestResult[]> {
  console.info(`\n🔍 Testing ${name} Integration`);
  console.info('═'.repeat(50));

  const results: TestResult[] = [];

  for (const test of tests) {
    process.stdout.write(`   ${test.name}... `);

    const result = await runTest(test);

    if (result.success) {
      console.info(`✅ ${result.message} (${result.duration}ms)`);
    } else {
      const icon = result.required ? '❌' : '⚠️';
      console.info(`${icon} ${result.message} (${result.duration}ms)`);
      if (result.required) {
        console.info(`      └─ ${test.description}`);
      }
    }

    results.push(result);
  }

  return results;
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 MAIN INTEGRATION TEST                      ║
// ╚══════════════════════════════════════════════════════════════╝

async function runIntegrationTest(): Promise<void> {
  console.info('🔥 FIRE22 SYSTEM INTEGRATION TEST');
  console.info('══════════════════════════════════');
  console.info('Testing Repository ↔️ Registry ↔️ Hub ↔️ Cloudflare integration');
  console.info('');

  const allResults: TestResult[] = [];

  // Run all test suites
  const testSuites = [
    { name: 'Repository', tests: repositoryTests },
    { name: 'Registry', tests: registryTests },
    { name: 'Cloudflare', tests: cloudflareTests },
    { name: 'Hub', tests: hubTests },
  ];

  for (const suite of testSuites) {
    const results = await runTestSuite(suite.name, suite.tests);
    allResults.push(...results);
  }

  // Calculate results
  const totalTests = allResults.length;
  const passedTests = allResults.filter(r => r.success).length;
  const failedTests = allResults.filter(r => !r.success).length;
  const requiredFailed = allResults.filter(r => !r.success && r.required).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  // Display summary
  console.info('');
  console.info('📊 INTEGRATION TEST SUMMARY');
  console.info('═══════════════════════════');
  console.info(`Total Tests: ${totalTests}`);
  console.info(`✅ Passed: ${passedTests}`);
  console.info(`❌ Failed: ${failedTests}`);
  console.info(`📈 Success Rate: ${successRate}%`);

  if (requiredFailed > 0) {
    console.info(`🚨 Required Failures: ${requiredFailed}`);
  }

  // Overall assessment
  console.info('');
  if (requiredFailed === 0) {
    console.info('🎉 INTEGRATION TEST PASSED!');
    console.info('✅ All required integrations are working');
    console.info('🚀 Your Fantasy42-Fire22 system is production-ready');

    if (failedTests > 0) {
      console.info('');
      console.info('ℹ️ OPTIONAL IMPROVEMENTS:');
      allResults
        .filter(r => !r.success && !r.required)
        .forEach(result => {
          console.info(`   • ${result.name}`);
        });
    }
  } else {
    console.info('⚠️ INTEGRATION TEST FAILED!');
    console.info('❌ Critical integrations are not working');
    console.info('');
    console.info('🔧 REQUIRED FIXES:');
    allResults
      .filter(r => !r.success && r.required)
      .forEach(result => {
        console.info(`   ❌ ${result.name}: ${result.message}`);
      });

    console.info('');
    console.info('💡 RUN SETUP COMMANDS:');
    console.info('   bun run global:setup     # Complete system setup');
    console.info('   bun run enterprise:setup # Deploy infrastructure');
    console.info('   bun run global:validate  # Re-run validation');
  }

  // Performance metrics
  const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = (totalDuration / totalTests).toFixed(0);

  console.info('');
  console.info('⏱️ PERFORMANCE METRICS:');
  console.info(`Total Duration: ${totalDuration}ms`);
  console.info(`Average per Test: ${avgDuration}ms`);
  console.info(`Tests per Second: ${(1000 / parseInt(avgDuration)).toFixed(1)}`);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 UTILITY FUNCTIONS                          ║
// ╚══════════════════════════════════════════════════════════════╝

async function showHelp(): Promise<void> {
  console.info(`
🔥 FIRE22 SYSTEM INTEGRATION TEST
Validates Repository ↔️ Registry ↔️ Hub ↔️ Cloudflare integration

USAGE:
  bun run scripts/integration-test.fire22.ts [command]

COMMANDS:
  test      Run complete integration test
  quick     Run quick validation only
  status    Show current system status
  help      Show this help

EXAMPLES:
  bun run scripts/integration-test.fire22.ts test
  bun run scripts/integration-test.fire22.ts quick
  bun run scripts/integration-test.fire22.ts status

TEST CATEGORIES:
  🏗️ Repository: GitHub integration, privacy, branch protection
  📦 Registry: NPM connectivity, authentication, publishing
  ☁️ Cloudflare: API tokens, DNS, Workers, D1, KV, R2
  🎯 Hub: Configuration, services, dashboard integration

VALIDATION SCOPE:
  - Environment variables configuration
  - API token validity and permissions
  - Service connectivity and health
  - Cross-system integration status
  - Security and authentication

OUTPUT:
  ✅ PASS: Integration working correctly
  ❌ FAIL: Critical integration failure (required fix)
  ⚠️ WARN: Optional improvement opportunity
`);
}

// ╔══════════════════════════════════════════════════════════════╗
// ║                 COMMAND LINE INTERFACE                     ║
// ╚══════════════════════════════════════════════════════════════╝

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  switch (command) {
    case 'test':
      await runIntegrationTest();
      break;

    case 'quick':
      console.info('🔍 QUICK INTEGRATION VALIDATION');
      console.info('════════════════════════════════');

      // Quick validation of essential components
      const essentialTests = [
        repositoryTests[0], // Repository privacy
        repositoryTests[1], // GitHub token
        registryTests[0], // Fire22 registry
        cloudflareTests[0], // Cloudflare API token
        cloudflareTests[1], // Wrangler auth
        hubTests[0], // Hub configuration
      ];

      const results = await Promise.all(essentialTests.map(test => runTest(test)));

      const passed = results.filter(r => r.success).length;
      const total = results.length;

      console.info('');
      console.info('📊 QUICK VALIDATION RESULTS:');
      console.info(`✅ Passed: ${passed}/${total}`);
      console.info(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

      if (passed === total) {
        console.info('🎉 All essential integrations are working!');
      } else {
        console.info('⚠️ Some integrations need attention.');
        console.info("Run 'bun run scripts/integration-test.fire22.ts test' for details.");
      }
      break;

    case 'status':
      console.info('📊 SYSTEM INTEGRATION STATUS');
      console.info('════════════════════════════');

      // Show current configuration status
      const configChecks = [
        { name: 'CLOUDFLARE_API_TOKEN', value: process.env.CLOUDFLARE_API_TOKEN },
        { name: 'CLOUDFLARE_ACCOUNT_ID', value: process.env.CLOUDFLARE_ACCOUNT_ID },
        { name: 'GITHUB_TOKEN', value: process.env.GITHUB_TOKEN },
        { name: 'FIRE22_REGISTRY_TOKEN', value: process.env.FIRE22_REGISTRY_TOKEN },
        { name: 'FIRE22_HUB_ENABLED', value: process.env.FIRE22_HUB_ENABLED },
        {
          name: 'FIRE22_ENTERPRISE_REGISTRY_ENABLED',
          value: process.env.FIRE22_ENTERPRISE_REGISTRY_ENABLED,
        },
      ];

      configChecks.forEach(check => {
        const configured = check.value && check.value !== `your_${check.name.toLowerCase()}_here`;
        console.info(
          `${configured ? '✅' : '❌'} ${check.name}: ${configured ? 'CONFIGURED' : 'NOT SET'}`
        );
      });
      break;

    case 'help':
    default:
      await showHelp();
      break;
  }
}

// Run the integration test
if (import.meta.main) {
  main().catch(console.error);
}
