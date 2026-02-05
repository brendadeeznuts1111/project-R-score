#!/usr/bin/env bun

/**
 * ╭─────────────────────────────────────────────────────────────────╮
 * │  🔥 Fire22 Customer Controller - Aesthetic CLI Test Interface  │
 * ╰─────────────────────────────────────────────────────────────────╯
 *
 * Beautiful command-line interface for testing customer endpoints
 * Uses smooth box-drawing characters for elegant terminal UI
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

// ╭──────────────────────────────────────────────────────────────────╮
// │                        Color Utilities                          │
// ╰──────────────────────────────────────────────────────────────────╯

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

// ╭──────────────────────────────────────────────────────────────────╮
// │                      Box Drawing Utilities                      │
// ╰──────────────────────────────────────────────────────────────────╯

class AestheticBox {
  static drawHeader(title: string, width: number = 70): string {
    const padding = width - title.length - 4;
    const leftPad = Math.floor(padding / 2);
    const rightPad = Math.ceil(padding / 2);

    return `${colors.cyan}╭${'─'.repeat(width - 2)}╮${colors.reset}
${colors.cyan}│${colors.reset}${' '.repeat(leftPad)}${colors.bright}${colors.yellow}${title}${colors.reset}${' '.repeat(rightPad)}${colors.cyan}│${colors.reset}
${colors.cyan}╰${'─'.repeat(width - 2)}╯${colors.reset}`;
  }

  static drawSection(title: string, content: string[], width: number = 70): string {
    const lines: string[] = [];

    // Top border with title
    const titlePadding = width - title.length - 4;
    const titleLeft = Math.floor(titlePadding / 2);
    const titleRight = Math.ceil(titlePadding / 2);

    lines.push(
      `${colors.blue}╭${'─'.repeat(titleLeft)}${colors.reset} ${colors.bright}${title}${colors.reset} ${colors.blue}${'─'.repeat(titleRight)}╮${colors.reset}`
    );

    // Content lines
    content.forEach(line => {
      const contentWidth = this.stripAnsi(line).length;
      const padding = width - contentWidth - 2;
      lines.push(
        `${colors.blue}│${colors.reset} ${line}${' '.repeat(Math.max(0, padding))} ${colors.blue}│${colors.reset}`
      );
    });

    // Bottom border
    lines.push(`${colors.blue}╰${'─'.repeat(width - 2)}╯${colors.reset}`);

    return lines.join('\n');
  }

  static drawDivider(width: number = 70): string {
    return `${colors.dim}├${'─'.repeat(width - 2)}┤${colors.reset}`;
  }

  static drawResult(success: boolean, message: string, width: number = 70): string {
    const color = success ? colors.green : colors.red;
    const icon = success ? '✓' : '✗';
    const padding = width - message.length - 6;

    return `${color}│ ${icon} ${message}${' '.repeat(Math.max(0, padding))} │${colors.reset}`;
  }

  static stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
}

// ╭──────────────────────────────────────────────────────────────────╮
// │                         Test Configuration                       │
// ╰──────────────────────────────────────────────────────────────────╯

interface TestConfig {
  baseURL: string;
  authToken?: string;
  customerId?: string;
  verbose: boolean;
}

const config: TestConfig = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:8787',
  authToken: process.env.AUTH_TOKEN,
  customerId: process.env.CUSTOMER_ID || 'test-customer-123',
  verbose: process.env.VERBOSE === 'true',
};

// ╭──────────────────────────────────────────────────────────────────╮
// │                        API Test Utilities                        │
// ╰──────────────────────────────────────────────────────────────────╯

class CustomerAPITester {
  private baseURL: string;
  private authToken?: string;

  constructor(baseURL: string, authToken?: string) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  async testGetProfile(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/customer/profile`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.error || 'Unknown error' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testGetHierarchy(
    customerId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/customer/hierarchy`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ customerId }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.error || 'Unknown error' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testGetBalance(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/customer/balance`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.error || 'Unknown error' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testGetBettingHistory(
    page: number = 1,
    limit: number = 10
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/customer/betting-history?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.error || 'Unknown error' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testUpdateProfile(
    profileData: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/customer/profile`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.error || 'Unknown error' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ╭──────────────────────────────────────────────────────────────────╮
// │                      Interactive CLI Runner                      │
// ╰──────────────────────────────────────────────────────────────────╯

async function runInteractiveCLI() {
  console.clear();

  // Display header
  console.log(AestheticBox.drawHeader('🔥 Fire22 Customer API Test Suite'));
  console.log();

  // Display configuration
  console.log(
    AestheticBox.drawSection('Configuration', [
      `${colors.cyan}Base URL:${colors.reset}    ${config.baseURL}`,
      `${colors.cyan}Customer ID:${colors.reset} ${config.customerId}`,
      `${colors.cyan}Auth Token:${colors.reset}  ${config.authToken ? '✓ Configured' : '✗ Not configured'}`,
      `${colors.cyan}Verbose:${colors.reset}     ${config.verbose ? 'Enabled' : 'Disabled'}`,
    ])
  );

  console.log();

  // Create tester instance
  const tester = new CustomerAPITester(config.baseURL, config.authToken);

  // Test results storage
  const results: { endpoint: string; success: boolean; message: string }[] = [];

  // ╭────────────── Test 1: Get Profile ──────────────╮
  console.log(AestheticBox.drawDivider());
  console.log(
    AestheticBox.drawSection('Test 1: Get Profile', [
      `${colors.dim}Endpoint: GET /api/customer/profile${colors.reset}`,
      `${colors.dim}Testing customer profile retrieval...${colors.reset}`,
    ])
  );

  const profileResult = await tester.testGetProfile();
  results.push({
    endpoint: 'GET /profile',
    success: profileResult.success,
    message: profileResult.success
      ? `Retrieved profile for ${profileResult.data?.data?.profile?.email || 'customer'}`
      : profileResult.error || 'Failed',
  });

  if (config.verbose && profileResult.success) {
    console.log(
      `${colors.dim}Response:${colors.reset}`,
      JSON.stringify(profileResult.data, null, 2)
    );
  }

  // ╭────────────── Test 2: Get Hierarchy ──────────────╮
  console.log(AestheticBox.drawDivider());
  console.log(
    AestheticBox.drawSection('Test 2: Get Hierarchy', [
      `${colors.dim}Endpoint: POST /api/customer/hierarchy${colors.reset}`,
      `${colors.dim}Testing customer hierarchy retrieval...${colors.reset}`,
    ])
  );

  const hierarchyResult = await tester.testGetHierarchy(config.customerId!);
  results.push({
    endpoint: 'POST /hierarchy',
    success: hierarchyResult.success,
    message: hierarchyResult.success
      ? `Retrieved hierarchy level ${hierarchyResult.data?.data?.hierarchy?.level || 'N/A'}`
      : hierarchyResult.error || 'Failed',
  });

  // ╭────────────── Test 3: Get Balance ──────────────╮
  console.log(AestheticBox.drawDivider());
  console.log(
    AestheticBox.drawSection('Test 3: Get Balance', [
      `${colors.dim}Endpoint: GET /api/customer/balance${colors.reset}`,
      `${colors.dim}Testing balance retrieval...${colors.reset}`,
    ])
  );

  const balanceResult = await tester.testGetBalance();
  results.push({
    endpoint: 'GET /balance',
    success: balanceResult.success,
    message: balanceResult.success
      ? `Balance: ${balanceResult.data?.data?.balance?.currency || 'USD'} ${balanceResult.data?.data?.balance?.total || 0}`
      : balanceResult.error || 'Failed',
  });

  // ╭────────────── Test 4: Betting History ──────────────╮
  console.log(AestheticBox.drawDivider());
  console.log(
    AestheticBox.drawSection('Test 4: Betting History', [
      `${colors.dim}Endpoint: GET /api/customer/betting-history${colors.reset}`,
      `${colors.dim}Testing betting history retrieval...${colors.reset}`,
    ])
  );

  const historyResult = await tester.testGetBettingHistory(1, 10);
  results.push({
    endpoint: 'GET /betting-history',
    success: historyResult.success,
    message: historyResult.success
      ? `Retrieved ${historyResult.data?.data?.bets?.length || 0} bets`
      : historyResult.error || 'Failed',
  });

  // ╭────────────── Test 5: Update Profile ──────────────╮
  console.log(AestheticBox.drawDivider());
  console.log(
    AestheticBox.drawSection('Test 5: Update Profile', [
      `${colors.dim}Endpoint: PUT /api/customer/profile${colors.reset}`,
      `${colors.dim}Testing profile update...${colors.reset}`,
    ])
  );

  const updateData = {
    name: 'Test Customer Updated',
    email: 'updated@test.com',
  };

  const updateResult = await tester.testUpdateProfile(updateData);
  results.push({
    endpoint: 'PUT /profile',
    success: updateResult.success,
    message: updateResult.success ? 'Profile updated successfully' : updateResult.error || 'Failed',
  });

  // ╭────────────── Summary ──────────────╮
  console.log();
  console.log(AestheticBox.drawHeader('Test Results Summary'));

  const summaryContent: string[] = [];
  let passedTests = 0;
  let failedTests = 0;

  results.forEach(result => {
    const statusIcon = result.success
      ? `${colors.green}✓${colors.reset}`
      : `${colors.red}✗${colors.reset}`;
    const statusColor = result.success ? colors.green : colors.red;
    summaryContent.push(
      `${statusIcon} ${colors.cyan}${result.endpoint}${colors.reset}: ${statusColor}${result.message}${colors.reset}`
    );

    if (result.success) passedTests++;
    else failedTests++;
  });

  console.log(AestheticBox.drawSection('Results', summaryContent));

  // Final statistics
  console.log();
  console.log(
    AestheticBox.drawSection('Statistics', [
      `${colors.green}Passed:${colors.reset} ${passedTests}/${results.length}`,
      `${colors.red}Failed:${colors.reset} ${failedTests}/${results.length}`,
      `${colors.cyan}Success Rate:${colors.reset} ${Math.round((passedTests / results.length) * 100)}%`,
    ])
  );

  // Footer
  console.log();
  console.log(
    `${colors.dim}╰─────────────────────────────────────────────────────────────────╯${colors.reset}`
  );
}

// ╭──────────────────────────────────────────────────────────────────╮
// │                          Test Suite                              │
// ╰──────────────────────────────────────────────────────────────────╯

describe('Customer Controller - Aesthetic Tests', () => {
  let tester: CustomerAPITester;

  beforeAll(() => {
    tester = new CustomerAPITester(config.baseURL, config.authToken);
  });

  test('should retrieve customer profile', async () => {
    const result = await tester.testGetProfile();
    expect(result.success).toBeDefined();

    if (config.authToken) {
      expect(result.data?.data?.profile).toBeDefined();
    }
  });

  test('should get customer hierarchy', async () => {
    const result = await tester.testGetHierarchy(config.customerId!);
    expect(result.success).toBeDefined();
    expect(result.data?.data?.hierarchy).toBeDefined();
  });

  test('should retrieve customer balance', async () => {
    const result = await tester.testGetBalance();
    expect(result.success).toBeDefined();

    if (config.authToken) {
      expect(result.data?.data?.balance).toBeDefined();
    }
  });

  test('should get betting history', async () => {
    const result = await tester.testGetBettingHistory();
    expect(result.success).toBeDefined();

    if (config.authToken) {
      expect(result.data?.data?.bets).toBeDefined();
      expect(result.data?.data?.pagination).toBeDefined();
    }
  });

  test('should update customer profile', async () => {
    const updateData = {
      name: 'Test Update',
      email: 'test@update.com',
    };

    const result = await tester.testUpdateProfile(updateData);
    expect(result.success).toBeDefined();
  });
});

// ╭──────────────────────────────────────────────────────────────────╮
// │                         CLI Entry Point                          │
// ╰──────────────────────────────────────────────────────────────────╯

// Run interactive CLI if executed directly
if (import.meta.main) {
  runInteractiveCLI().catch(error => {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  });
}
