#!/usr/bin/env bun
/**
 * Test Runner - Excludes problematic test files
 */

import { spawn } from 'child_process';

// Run tests only on src directory to avoid problematic .claude tests
const args = ['test', 'src', '--bail'];

// Run the tests
const process = spawn('bun', args, {
  stdio: 'inherit',
  shell: true
});

// Let the process exit naturally with the test exit code
