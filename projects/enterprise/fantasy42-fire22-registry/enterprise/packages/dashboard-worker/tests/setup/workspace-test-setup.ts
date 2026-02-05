/**
 * 🧪 Workspace Test Setup
 * Global setup for Fire22 workspace tests
 */

import { beforeAll, afterAll } from 'bun:test';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// Global test configuration
const TEST_WORKSPACE_DIR = join(process.cwd(), 'test-workspaces');

beforeAll(async () => {
  console.log('🏗️  Setting up test workspace environment...');

  // Create test workspace directory
  if (!existsSync(TEST_WORKSPACE_DIR)) {
    mkdirSync(TEST_WORKSPACE_DIR, { recursive: true });
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.BUN_ENV = 'test';

  console.log('✅ Test environment setup complete');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test workspace environment...');

  // Clean up test workspaces
  if (existsSync(TEST_WORKSPACE_DIR)) {
    rmSync(TEST_WORKSPACE_DIR, { recursive: true, force: true });
  }

  console.log('✨ Test cleanup complete');
});

// Export test utilities
export const testUtils = {
  TEST_WORKSPACE_DIR,
  createMockWorkspace: (name: string) => {
    const workspacePath = join(TEST_WORKSPACE_DIR, name);
    mkdirSync(workspacePath, { recursive: true });
    return workspacePath;
  },
  cleanupMockWorkspace: (name: string) => {
    const workspacePath = join(TEST_WORKSPACE_DIR, name);
    if (existsSync(workspacePath)) {
      rmSync(workspacePath, { recursive: true, force: true });
    }
  },
};
