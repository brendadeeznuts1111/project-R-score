// tests/setup.ts
/**
 * Test setup file for Empire Pro Dashboard Integration
 * Configures global test environment and utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { mkdir } from 'fs/promises';

// Global test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 2,
  parallel: false
};

// Test environment setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.R2_BUCKET = 'test-bucket';
  process.env.R2_ENDPOINT = 'http://localhost:9000';
  process.env.GRAFANA_URL = 'http://localhost:3000';
  process.env.GRAFANA_API_KEY = 'test-api-key';
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
  process.env.SMTP_HOST = 'localhost';
  
  // Create test directories if they don't exist
  await ensureTestDirectories();
  
  console.log('🧪 Test environment initialized');
});

// Global cleanup after all tests
afterAll(async () => {
  // Clean up test environment
  await cleanupTestEnvironment();
  console.log('🧹 Test environment cleaned up');
});

// Setup before each test
beforeEach(() => {
  // Reset any global state (Bun Test doesn't have jest.clearAllMocks)
  // Add any cleanup needed between tests here
});

// Cleanup after each test
afterEach(() => {
  // Clean up test-specific state
  delete process.env.TEST_OVERRIDE;
});

// Test utilities
async function ensureTestDirectories() {
  const testDirs = [
    './temp',
    './test-assets',
    './test-dashboards'
  ];
  
  for (const dir of testDirs) {
    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
}

async function cleanupTestEnvironment() {
  // Clean up temporary files and directories
  const tempDirs = ['./temp', './test-assets', './test-dashboards'];
  
  for (const dir of tempDirs) {
    try {
      // Use Bun.file for checking existence and remove
      const file = Bun.file(dir);
      if (await file.exists()) {
        await Bun.write(dir, ''); // Clear directory contents
      }
    } catch (error) {
      // Directory might not exist or be in use
    }
  }
}

// Global test helpers
global.testHelpers = {
  /**
   * Create a temporary test file
   */
  async createTestFile(path: string, content: string): Promise<void> {
    await Bun.write(path, content);
  },
  
  /**
   * Read test file content
   */
  async readTestFile(path: string): Promise<string> {
    return await Bun.file(path).text();
  },
  
  /**
   * Remove test file
   */
  async removeTestFile(path: string): Promise<void> {
    try {
      await Bun.write(path, ''); // Clear file content
    } catch (error) {
      // File might not exist
    }
  },
  
  /**
   * Wait for specified milliseconds
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * Generate test data
   */
  generateTestData() {
    return {
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9),
      random: Math.random()
    };
  }
};

// Export for use in tests
export { TEST_CONFIG };

// Type declarations for global helpers
declare global {
  var testHelpers: {
    createTestFile: (path: string, content: string) => Promise<void>;
    readTestFile: (path: string) => Promise<string>;
    removeTestFile: (path: string) => Promise<void>;
    wait: (ms: number) => Promise<void>;
    generateTestData: () => { timestamp: string; id: string; random: number };
  };
}
