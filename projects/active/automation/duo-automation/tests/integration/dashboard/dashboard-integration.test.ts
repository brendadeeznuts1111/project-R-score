// tests/dashboard-integration.test.ts
/**
 * Automated tests for Empire Pro Dashboard Integration
 * Tests CLI commands, Grafana integration, and notifications
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { config } from '../utils/config';
import { validateConfig } from '../utils/config';

// Mock configuration for testing
const testConfig = {
  ...config,
  grafana: {
    ...config.grafana,
    url: 'http://localhost:3000',
    apiKey: 'test-api-key'
  },
  notifications: {
    ...config.notifications,
    slack: {
      webhookUrl: 'https://hooks.slack.com/test',
      channel: '#test'
    }
  }
};

describe('Dashboard Integration Tests', () => {
  
  beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.R2_BUCKET = 'test-bucket';
    process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
    process.env.GRAFANA_URL = testConfig.grafana.url;
    process.env.GRAFANA_API_KEY = testConfig.grafana.apiKey;
    process.env.SLACK_WEBHOOK_URL = testConfig.notifications.slack.webhookUrl;
  });

  describe('Configuration Validation', () => {
    test('should validate configuration successfully', () => {
      const validation = validateConfig();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing required configuration', () => {
      const originalBucket = process.env.R2_BUCKET;
      delete process.env.R2_BUCKET;
      const validation = validateConfig();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('R2 bucket is required');
      process.env.R2_BUCKET = originalBucket;
    });
  });

  describe('CLI Commands', () => {
    test('should show dashboard help', async () => {
      const result = await runCommand('bun run cli/commands/dashboard.ts --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('deploy');
      expect(result.stdout).toContain('serve');
    });

    test('should validate environment variables for deploy', async () => {
      // Remove required env var to test validation
      const originalBucket = process.env.R2_BUCKET;
      delete process.env.R2_BUCKET;
      
      const result = await runCommand('bun run cli/commands/dashboard.ts deploy --scope ENTERPRISE');
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('R2 bucket is required');
      
      // Restore
      if (originalBucket) process.env.R2_BUCKET = originalBucket;
    });
  });

  describe('Pattern Matrix', () => {
    test('should register patterns correctly', async () => {
      const result = await runCommand('bun run utils/pattern-matrix.ts');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Type definitions registered');
    });

    test('should include all required pattern sections', async () => {
      const result = await runCommand('bun run utils/pattern-matrix.ts');
      expect(result.stdout).toContain('registered');
      expect(result.stdout).toContain('Turbocharged');
    });
  });

  describe('Grafana Integration', () => {
    test('should validate dashboard JSON structure', () => {
      const dashboardPath = `./demos/grafana/dashboard-dashboard.json`;
      const dashboardJson = JSON.parse(readFileSync(dashboardPath, 'utf-8'));
      
      expect(dashboardJson.dashboard).toBeDefined();
      expect(dashboardJson.dashboard.title).toBe('Empire Pro §Workflow:97-100');
      expect(dashboardJson.dashboard.panels).toBeDefined();
      expect(dashboardJson.dashboard.panels.length).toBeGreaterThan(0);
      expect(dashboardJson.dashboard.templating).toBeDefined();
    });

    test('should handle Grafana update with validation', async () => {
      // This will fail gracefully with mock API, but should validate configuration
      const result = await runCommand('bun run demos/grafana/update-dashboards.ts');
      // Should fail due to mock API, but not crash
      expect(result.exitCode).toBe(1);
      expect(result.stderr + result.stdout).toContain('Error updating Grafana dashboards');
    });
  });

  describe('Notification System', () => {
    test('should show notification help', async () => {
      const result = await runCommand('bun run cli/commands/notifications.ts --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('slack');
      expect(result.stdout).toContain('email');
      expect(result.stdout).toContain('webhook');
    });

    test('should handle Slack notification without webhook', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      const originalSmtp = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;
      
      const result = await runCommand('bun run cli/commands/notifications.ts slack "test message"');
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Configuration validation failed');
      
      if (originalSmtp) process.env.SMTP_HOST = originalSmtp;
    });

    test('should validate notification priority levels', async () => {
      process.env.SLACK_WEBHOOK_URL = testConfig.notifications.slack.webhookUrl;
      
      const priorities = ['low', 'medium', 'high'];
      for (const priority of priorities) {
        const result = await runCommand(`bun run cli/commands/notifications.ts slack "test ${priority}" --priority ${priority}`);
        // Should fail due to mock API but validate priority
        expect(result.stderr + result.stdout).toContain(priority.toUpperCase());
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle missing files gracefully', async () => {
      // Temporarily move dashboard file
      const dashboardPath = `./demos/grafana/dashboard-dashboard.json`;
      const tempPath = `${dashboardPath}.tmp`;
      
      try {
        // Move file
        writeFileSync(tempPath, readFileSync(dashboardPath));
        unlinkSync(dashboardPath);
        
        const result = await runCommand('bun run demos/grafana/update-dashboards.ts');
        expect(result.exitCode).toBe(1);
        expect(result.stderr + result.stdout).toContain('ENOENT');
      } finally {
        // Restore file
        if (existsSync(tempPath)) {
          writeFileSync(dashboardPath, readFileSync(tempPath));
          unlinkSync(tempPath);
        }
      }
    });

    test('should handle invalid JSON', async () => {
      const dashboardPath = `./demos/grafana/dashboard-dashboard.json`;
      const originalContent = readFileSync(dashboardPath, 'utf-8');
      
      try {
        // Write invalid JSON
        writeFileSync(dashboardPath, '{ invalid json }');
        
        const result = await runCommand('bun run demos/grafana/update-dashboards.ts');
        expect(result.exitCode).toBe(1);
        expect(result.stderr + result.stdout).toContain('JSON');
      } finally {
        // Restore original content
        writeFileSync(dashboardPath, originalContent);
      }
    });
  });
});

// Helper function to run commands
async function runCommand(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      stdio: 'pipe',
      cwd: process.cwd(),
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code || 0,
        stdout,
        stderr
      });
    });
  });
}

// Helper function to check if file exists
function existsSync(path: string): boolean {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}
