// setup.ts - Enhanced test setup for CLI
/**
 * Global test setup for Windsurf Project CLI
 * Configures mock modes, timeouts, and test environment
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';

// Global test configuration
beforeAll(async () => {
  console.log('🧪 Setting up enhanced test environment...');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.MOCK_MODE = 'true';
  process.env.CLI_TIMEOUT = '5000'; // 5 second timeout for tests
  
  // Mock external services
  process.env.R2_BUCKET = 'test-bucket';
  process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
  process.env.GRAFANA_URL = 'http://localhost:3000';
  process.env.GRAFANA_API_KEY = 'test-api-key';
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
  process.env.SMTP_HOST = 'localhost';
  
  // Suppress console logs in tests unless explicitly needed
  if (!process.env.VERBOSE_TESTS) {
    const originalConsole = globalThis.console;
    globalThis.console = {
      ...originalConsole,
      log: (...args) => {
        if (args[0]?.includes?.('✅') || args[0]?.includes?.('❌') || args[0]?.includes?.('🧪')) {
          originalConsole.log(...args);
        }
      },
      error: (...args) => {
        if (process.env.SHOW_TEST_ERRORS) {
          originalConsole.error(...args);
        }
      },
      warn: () => {}, // Suppress warnings in tests
      info: () => {}, // Suppress info in tests
    };
  }
  
  // Mock fetch for network calls
  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  globalThis.fetch = mockFetch as typeof fetch;
  
  // Add global test utilities
  globalThis.testUtils = {
    mockDelay: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),
    createMockConfig: () => ({
      r2: { bucket: 'test-bucket', endpoint: 'https://test.r2.dev', region: 'auto' },
      grafana: { url: 'http://localhost:3000', apiKey: 'test-key', dashboardFolder: 'test' },
      notifications: {
        slack: { webhookUrl: 'https://hooks.slack.com/test', channel: '#test' },
        email: { smtp: { host: 'localhost', port: parseInt(process.env.SMTP_PORT || '587'), secure: false }, from: 'test@example.com' }
      },
      paths: { dashboards: './demos', assets: './assets', grafana: './demos/grafana', temp: './temp' },
      retry: { maxAttempts: 1, baseDelay: 100, maxDelay: 1000 },
      thresholds: { deployTimeout: 1000, grafanaTimeout: 500, notificationTimeout: 500 }
    }),
    
    // Mock CLI responses
    mockCLIResponse: (command: string, success: boolean = true) => ({
      exitCode: success ? 0 : 1,
      stdout: success ? `✅ ${command} completed successfully` : '',
      stderr: success ? '' : `❌ ${command} failed`,
    })
  };
  
  console.log('✅ Test environment ready');
});

beforeEach(async () => {
  // Reset mocks before each test
  process.env.MOCK_MODE = 'true';
});

afterEach(async () => {
  // Cleanup after each test
  delete process.env.TEST_SPECIFIC_VAR;
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Restore original console
  if (!process.env.VERBOSE_TESTS) {
    // Console will be restored automatically when process exits
  }
  
  // Clean up any test files
  try {
    await cleanupTestFiles();
  } catch (error) {
    console.warn('Warning: Could not clean up test files:', error);
  }
  
  console.log('✅ Test cleanup complete');
});

// Helper function to clean up test files
async function cleanupTestFiles() {
  const fs = await import('fs');
  const path = await import('path');
  
  const testFiles = [
    './temp/test-*.json',
    './temp/mock-*.html',
    './logs/test-*.log'
  ];
  
  for (const pattern of testFiles) {
    try {
      const files = fs.readdirSync('./temp').filter((file: string) => 
        file.includes('test-') || file.includes('mock-')
      );
      
      for (const file of files) {
        fs.unlinkSync(path.join('./temp', file));
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Export for use in other test files
export const testConfig = {
  timeout: 5000,
  mockMode: true,
  verbose: process.env.VERBOSE_TESTS === 'true',
  showErrors: process.env.SHOW_TEST_ERRORS === 'true'
};

// Type declarations for global test utilities
declare global {
  var testUtils: {
    mockDelay: (ms?: number) => Promise<void>;
    createMockConfig: () => any;
    mockCLIResponse: (command: string, success?: boolean) => { exitCode: number; stdout: string; stderr: string };
  };
}
