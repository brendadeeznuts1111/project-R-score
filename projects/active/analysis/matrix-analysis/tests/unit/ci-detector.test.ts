#!/usr/bin/env bun
/**
 * Unit Tests for CI Detector
 *
 * Tests the CI environment detection functionality.
 */

import { test, expect } from 'bun:test';
import { CIDetector } from '../../src/lib/ci-detector';

test('should detect GitHub Actions environment', async () => {
  const originalEnv = process.env.GITHUB_ACTIONS;
  process.env.GITHUB_ACTIONS = 'true';

  try {
    const detector = await CIDetector.getInstance();
    detector.refreshEnvironment(process.env); // Clear cache
    const result = await detector.detect();

    expect(result.name).toBe('GitHub Actions');
    expect(result.isCI).toBe(true);
    expect(result.isGitHubActions).toBe(true);
  } finally {
    if (originalEnv) {
      process.env.GITHUB_ACTIONS = originalEnv;
    } else {
      delete process.env.GITHUB_ACTIONS;
    }
  }
});

test('should detect GitLab CI environment', async () => {
  const originalEnv = process.env.GITLAB_CI;
  process.env.GITLAB_CI = 'true';

  try {
    const detector = await CIDetector.getInstance();
    detector.refreshEnvironment(process.env); // Clear cache
    const result = await detector.detect();

    expect(result.name).toBe('GitLab CI');
    expect(result.isCI).toBe(true);
  } finally {
    if (originalEnv) {
      process.env.GITLAB_CI = originalEnv;
    } else {
      delete process.env.GITLAB_CI;
    }
  }
});

test('should detect local environment', async () => {
  // Clear CI variables
  delete process.env.CI;
  delete process.env.GITHUB_ACTIONS;
  delete process.env.GITLAB_CI;

  const detector = await CIDetector.getInstance();
  detector.refreshEnvironment(process.env); // Clear cache
  const result = await detector.detect();

  expect(result.name).toBe('Local');
  expect(result.isCI).toBe(false);
  expect(result.isGitHubActions).toBe(false);
});

test('should detect pull request', async () => {
  const originalEnv = process.env.GITHUB_EVENT_NAME;
  process.env.GITHUB_EVENT_NAME = 'pull_request';

  try {
    const detector = await CIDetector.getInstance();
    detector.refreshEnvironment(process.env); // Clear cache
    const result = await detector.detect();

    expect(result.isPR).toBe(true);
  } finally {
    if (originalEnv) {
      process.env.GITHUB_EVENT_NAME = originalEnv;
    } else {
      delete process.env.GITHUB_EVENT_NAME;
    }
  }
});

test('should get branch name', async () => {
  const originalEnv = process.env.GITHUB_REF_NAME;
  process.env.GITHUB_REF_NAME = 'main';

  try {
    const detector = await CIDetector.getInstance();
    detector.refreshEnvironment(process.env); // Clear cache
    const result = await detector.detect();

    expect(result.branch).toBe('main');
  } finally {
    if (originalEnv) {
      process.env.GITHUB_REF_NAME = originalEnv;
    } else {
      delete process.env.GITHUB_REF_NAME;
    }
  }
});

test('should get commit hash', async () => {
  const originalEnv = process.env.GITHUB_SHA;
  process.env.GITHUB_SHA = 'abc123def456';

  try {
    const detector = await CIDetector.getInstance();
    detector.refreshEnvironment(process.env); // Clear cache
    const result = await detector.detect();

    expect(result.commit).toBe('abc123def456');
  } finally {
    if (originalEnv) {
      process.env.GITHUB_SHA = originalEnv;
    } else {
      delete process.env.GITHUB_SHA;
    }
  }
});

test('should emit annotation', async () => {
  const detector = await CIDetector.getInstance();
  const result = await detector.detect();

  // Test annotation emission (should not throw)
  expect(() => {
    detector.emitAnnotation('error', 'Test error message', {
      file: 'test.ts',
      line: 10,
      title: 'Test Error'
    });
  }).not.toThrow();
});

test('should handle singleton pattern', async () => {
  const instance1 = await CIDetector.getInstance();
  const instance2 = await CIDetector.getInstance();

  expect(instance1).toBe(instance2);
});

test('should refresh environment', async () => {
  const detector = await CIDetector.getInstance();

  // Set some environment variables
  process.env.TEST_VAR = 'test_value';

  // Refresh should not throw
  expect(() => {
    detector.refreshEnvironment(process.env);
  }).not.toThrow();
});
