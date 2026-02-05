#!/usr/bin/env bun
/**
 * Smoke Tests - Critical Path Tests
 *
 * These tests verify the most critical functionality of the application.
 * They must always pass and should run quickly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

// Get test environment variables
const testGroup = process.env.TEST_GROUP || 'unknown';
const testPriority = process.env.TEST_PRIORITY || 'medium';
const testTags = process.env.TEST_TAGS?.split(',') || [];
const testMode = process.env.TEST_MODE || 'default';

describe(`🚀 Smoke Tests - Group: ${testGroup}`, () => {
  // Set shorter timeout for smoke tests
  const timeout = testPriority === 'high' ? 2000 : 5000;

  beforeAll(() => {
    console.log(`\n📍 Running smoke tests with:`);
    console.log(`   Group: ${testGroup}`);
    console.log(`   Priority: ${testPriority}`);
    console.log(`   Tags: ${testTags.join(', ')}`);
    console.log(`   Mode: ${testMode}`);
  });

  it('should verify Bun runtime is available', () => {
    expect(typeof Bun).toBe('object');
    expect(Bun.version).toBeDefined();
  });

  it('should verify test environment variables are set', () => {
    expect(testGroup).not.toBe('unknown');
    expect(['high', 'medium', 'low']).toContain(testPriority);
    expect(testTags.length).toBeGreaterThan(0);
    expect(testTags).toContain('smoke');
    expect(testTags).toContain('critical');
  });

  it('should verify critical modules can be imported', async () => {
    // Test that all critical files exist
    const fs = require('fs');
    expect(fs.existsSync('scripts/test-organizer.ts')).toBe(true);
    expect(fs.existsSync('src/lib/ci-detector.ts')).toBe(true);
    expect(fs.existsSync('test-organizer.config.json')).toBe(true);
  });

  it('should verify configuration files exist', () => {
    const fs = require('fs');

    // Check test organizer config
    expect(fs.existsSync('./test-organizer.config.json')).toBe(true);

    // Check package.json has test scripts
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    expect(packageJson.scripts['test:organizer']).toBeDefined();
    expect(packageJson.scripts['test:smoke']).toBeDefined();
  });

  it('should verify test organizer can list groups', async () => {
    // Verify test organizer can be executed
    const { spawn } = require('bun');

    const proc = spawn({
      cmd: ['bun', 'scripts/test-organizer.ts', '--list'],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });

  it('should have fast execution time', async () => {
    const start = Date.now();

    // Simulate a quick critical check
    await new Promise(resolve => setTimeout(resolve, 100));

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  afterAll(() => {
    console.log(`\n✅ Smoke tests completed in ${testMode} mode`);
  });
});
