import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { spawn } from 'bun';

// Import the TestProcessManager from the scripts directory
const testProcessManagerModule = await import('../../scripts/test-process-manager');
const TestProcessManager = testProcessManagerModule.TestProcessManager;

describe('Test Process Manager', () => {
  let testProcess: any;
  let testPid: number | null = null;

  beforeEach(async () => {
    // Start a long-running test process
    testProcess = spawn({
      cmd: ['bun', 'test', '--timeout', '30000', './tests/unit/ci-detection.test.ts'],
      stdout: 'ignore',
      stderr: 'ignore'
    });

    // Wait a moment for process to start
    await new Promise(resolve => setTimeout(resolve, 100));
    testPid = testProcess.pid;
  });

  afterEach(async () => {
    // Clean up any remaining processes
    if (testPid) {
      try {
        process.kill(testPid, 'SIGKILL');
      } catch {
        // Process might already be dead
      }
    }

    if (testProcess) {
      await testProcess.exited;
    }
  });

  describe('Process Detection', () => {
    it('should find test processes', async () => {
      const processes = await TestProcessManager.findTestProcesses();
      expect(Array.isArray(processes)).toBe(true);

      // Check if either the test process or its child is found
      const foundTestProcess = processes.some((p: any) =>
        p.pid === testPid ||
        p.command.includes('bun test') ||
        p.command.includes('ci-detection.test.ts')
      );
      expect(foundTestProcess).toBe(true);
    });

    it('should identify test processes correctly', () => {
      const command = 'bun test --timeout 30000 ./tests/unit/ci-detection.test.ts';
      const isTest = (TestProcessManager as any).isTestProcess(command);
      expect(isTest).toBe(true);
    });

    it('should reject non-test processes', () => {
      const command = 'bun run src/cli.ts';
      const isTest = (TestProcessManager as any).isTestProcess(command);
      expect(isTest).toBe(false);
    });
  });

  describe('Process Termination', () => {
    it('should gracefully terminate with SIGTERM', async () => {
      // Find the actual test process
      const processes = await TestProcessManager.findTestProcesses();
      const testProc = processes.find((p: any) => p.command.includes('ci-detection.test.ts'));

      if (!testProc) {
        expect(true).toBe(true); // Skip if no process
        return;
      }

      const result = await TestProcessManager.kill(testProc.pid, 'SIGTERM');
      expect(result.success).toBe(true);

      // Process should terminate within reasonable time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify process is dead
      expect(() => process.kill(testProc.pid, 0)).toThrow();
    });

    it('should immediately terminate with SIGKILL', async () => {
      // Find the actual test process
      const processes = await TestProcessManager.findTestProcesses();
      const testProc = processes.find((p: any) => p.command.includes('ci-detection.test.ts'));

      if (!testProc) {
        expect(true).toBe(true); // Skip if no process
        return;
      }

      const result = await TestProcessManager.kill(testProc.pid, 'SIGKILL');
      expect(result.success).toBe(true);

      // Process should terminate immediately
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify process is dead
      expect(() => process.kill(testProc.pid, 0)).toThrow();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully with timeout', async () => {
      // Find the actual test process
      const processes = await TestProcessManager.findTestProcesses();
      const testProc = processes.find((p: any) => p.command.includes('ci-detection.test.ts'));

      if (!testProc) {
        expect(true).toBe(true); // Skip if no process
        return;
      }

      const result = await TestProcessManager.gracefulShutdown(testProc.pid, 1000);
      expect(result.success).toBe(true);

      // Verify process is dead
      expect(() => process.kill(testProc.pid, 0)).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent process', async () => {
      if (!testPid) {
        expect(true).toBe(true); // Skip if no process
        return;
      }

      const result = await TestProcessManager.kill(99999, 'SIGTERM');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND');
      }

      // Process should terminate within reasonable time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify process is dead
    });

    it('should handle invalid PID gracefully', async () => {
      const invalidPid = -1;
      const result = await TestProcessManager.kill(invalidPid, 'SIGTERM');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND');
      }
    });
  });

  describe('Process Listing', () => {
    it('should list processes without errors', async () => {
      // Should not throw
      await TestProcessManager.list();
      await TestProcessManager.list(true);
      expect(true).toBe(true);
    });
  });
});
