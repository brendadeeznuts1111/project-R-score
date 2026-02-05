#!/usr/bin/env bun
/**
 * @fileoverview Profiled Test Runner
 * @description Run tests with CPU profiling enabled
 * @version 1.1.1.1.5.0.0
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

const TEST_PROFILE_DIR = './test_profiles';
const TIMEOUT_MS = 300000; // 5 minutes

async function runProfiledTests() {
  console.log('🧪 Running tests with CPU profiling...\n');

  // Create directory for test profiles
  if (!existsSync(TEST_PROFILE_DIR)) {
    mkdirSync(TEST_PROFILE_DIR, { recursive: true });
  }

  const profileName = `test_run_${Date.now()}.cpuprofile`;
  const profilePath = `${TEST_PROFILE_DIR}/${profileName}`;

  // Run bun test with CPU profiling
  const testProcess = spawn(
    'bun',
    [
      'test',
      '--cpu-prof',
      `--cpu-prof-name=${profileName}`,
      `--cpu-prof-dir=${TEST_PROFILE_DIR}`,
      '--timeout',
      TIMEOUT_MS.toString(),
      '--reporter',
      'spec',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        BUN_TEST_PROFILING: 'true',
        NODE_ENV: 'test',
      },
    },
  );

  return new Promise<number>((resolve, reject) => {
    testProcess.on('close', (code) => {
      console.log(`\n📊 Test process exited with code ${code}`);

      if (existsSync(profilePath)) {
        console.log(`✅ Test profile saved: ${profilePath}`);

        // Analyze test profile
        console.log('\n🔍 Analyzing test performance...');
        const analyzeProcess = spawn('bun', [
          'run',
          'scripts/analyze-profile.ts',
          profilePath,
        ]);

        analyzeProcess.on('close', () => {
          resolve(code || 0);
        });
      } else {
        resolve(code || 0);
      }
    });

    testProcess.on('error', reject);
  });
}

// Run specific test suites with profiling
async function runLayerTests(layer: number) {
  console.log(`🧪 Running Layer ${layer} tests with profiling...`);

  const profileName = `layer${layer}_tests_${Date.now()}.cpuprofile`;
  const testPattern = `tests/**/layer${layer}*.test.ts`;

  const testProcess = spawn(
    'bun',
    [
      'test',
      testPattern,
      '--cpu-prof',
      `--cpu-prof-name=${profileName}`,
      `--cpu-prof-dir=${TEST_PROFILE_DIR}`,
      '--timeout',
      '60000',
    ],
    {
      stdio: 'inherit',
    },
  );

  return new Promise<number>((resolve, reject) => {
    testProcess.on('close', resolve);
    testProcess.on('error', reject);
  });
}

// Main execution
if (import.meta.main) {
  const command = process.argv[2];

  switch (command) {
    case 'all':
      runProfiledTests()
        .then((code) => process.exit(code))
        .catch(console.error);
      break;

    case 'layer':
      const layer = process.argv[3];
      if (layer && /^[1-4]$/.test(layer)) {
        runLayerTests(parseInt(layer))
          .then((code) => process.exit(code))
          .catch(console.error);
      } else {
        console.error(
          'Please specify layer 1-4: bun run run-profiled-tests.ts layer <1-4>',
        );
        process.exit(1);
      }
      break;

    default:
      console.log('Usage:');
      console.log(
        '  bun run run-profiled-tests.ts all          # Run all tests with profiling',
      );
      console.log(
        '  bun run run-profiled-tests.ts layer <1-4> # Run specific layer tests',
      );
      break;
  }
}

export { runLayerTests, runProfiledTests };

