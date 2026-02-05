#!/usr/bin/env bun
/**
 * Integration Tests for CLI Commands
 *
 * Tests CLI command functionality with real system interactions.
 */

// Debug output
console.log("[DEBUG] Test runner CWD:", process.cwd());
console.log("[DEBUG] import.meta.dir (file dir):", import.meta.dir);
console.log("[DEBUG] import.meta.path (full file):", import.meta.path);
console.log("[DEBUG] Bun.which('omega'):", Bun.which("omega") || "not found");
console.log("[DEBUG] Bun.which('kimi-shell'):", Bun.which("kimi-shell") || "not found");
console.log("[DEBUG] Bun.which('omega-tui'):", Bun.which("omega-tui") || "not found");
console.log("[DEBUG] Exists .claude/bin/omega:", await Bun.file(".claude/bin/omega").exists());
console.log("[DEBUG] Exists bin/omega (symlink):", await Bun.file("bin/omega").exists());

import { test, expect } from 'bun:test';
import { TestHelpers } from '../utils/test-helpers';

test('should run matrix CLI command successfully', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('cli-test-');

  try {
    const result = await TestHelpers.runCommand('matrix', {
      cwd: tempDir,
      timeout: 10000
    });

    // Should not have errors
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
  } finally {
    await cleanup();
  }
});

test('should run profile commands successfully', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('profile-test-');

  try {
    // Test profile list command
    const result = await TestHelpers.runCommand('matrix profile list', {
      cwd: tempDir,
      timeout: 5000
    });

    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});

test('should handle CI environment detection in commands', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('ci-test-');
  const restoreCI = TestHelpers.mockCIEnvironment('github');

  try {
    const result = await TestHelpers.runCommand('matrix', {
      cwd: tempDir,
      env: { ...process.env, CI: 'true' },
      timeout: 5000
    });

    expect(result.exitCode).toBe(0);
  } finally {
    restoreCI();
    await cleanup();
  }
});

test('should handle network operations', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('network-test-');

  try {
    // Test network-related command
    const result = await TestHelpers.runCommand('matrix links:check', {
      cwd: tempDir,
      timeout: 15000
    });

    // Should complete without network errors
    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});

test('should handle file operations', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('file-test-');

  try {
    // Create test files
    await TestHelpers.createFixtureFile(tempDir, 'test-config.json', JSON.stringify({
      name: 'test',
      version: '1.0.0'
    }));

    const result = await TestHelpers.runCommand('matrix', {
      cwd: tempDir,
      timeout: 5000
    });

    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});
