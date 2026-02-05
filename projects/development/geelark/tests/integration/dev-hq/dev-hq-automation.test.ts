#!/usr/bin/env bun

// @ts-ignore - bun types are available when running with Bun
import type { Subprocess } from "bun";
// @ts-ignore - bun:test types are available when running with Bun
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from "bun:test";
import { AutomationService } from "../../../dev-hq/core/automation";

// Type augmentation for the methods we added
declare module "../../../dev-hq/core/automation" {
  interface AutomationService {
    listProcesses(): Array<{ label: string; pid: number; killed: boolean }>;
    getProcessStatus(label: string): { exists: boolean; label: string; pid?: number; killed?: boolean; status: string };
    killProcess(label: string): { success: boolean; pid?: number; reason?: string };
    runCommand(label: string, command: string[], options?: any): Promise<any>;
  }
}

describe("🤖 Dev HQ Automation", () => {
  let automation: AutomationService;

  beforeEach(() => {
    automation = new AutomationService();
  });

  afterEach(() => {
    automation.cleanup();
  });

  describe("Basic Command Execution", () => {
    it("should execute simple commands successfully", async () => {
      const result = await automation.runCommand("test-echo", ["echo", "hello world"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("hello world");
      expect(result.stderr).toBe("");
      expect(result.error).toBe(false);
    });

    it("should handle commands with arguments", async () => {
      const result = await automation.runCommand("test-ls", ["ls", "-la"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("total");
      expect(typeof result.stdout).toBe("string");
    });

    it("should handle failing commands", async () => {
      const result = await automation.runCommand("test-fail", ["false"]);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.error).toBe(true);
    });

    it("should handle non-existent commands", async () => {
      const result = await automation.runCommand("test-missing", ["non-existent-command-12345"]);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("not found");
      expect(result.error).toBe(true);
    });
  });

  describe("Working Directory", () => {
    it("should execute commands in custom directory", async () => {
      const result = await automation.runCommand("test-pwd", ["pwd"], {
        cwd: "/tmp"
      });

      expect(result.exitCode).toBe(0);
      const normalizedPath = result.stdout.trim().replace(/^\/private/, "");
      expect(normalizedPath).toBe("/tmp");
    });

    it("should handle invalid working directory", async () => {
      const result = await automation.runCommand("test-invalid-cwd", ["pwd"], {
        cwd: "/non-existent-directory-12345"
      });

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(true);
    });
  });

  describe("Environment Variables", () => {
    it("should pass custom environment variables", async () => {
      const result = await automation.runCommand("test-env", ["printenv"], {
        env: { "CUSTOM_VAR": "test_value", "ANOTHER_VAR": "another_value" }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("CUSTOM_VAR=test_value");
      expect(result.stdout).toContain("ANOTHER_VAR=another_value");
    });

    it("should preserve existing environment", async () => {
      const result = await automation.runCommand("test-path", ["printenv", "PATH"], {
        env: { "TEST_VAR": "test" }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).not.toBe("");
      // PATH should still exist
    });
  });

  describe("Streaming Output", () => {
    it("should stream output when enabled", async () => {
      const process = await automation.runCommand("test-stream", ["echo", "streamed output"], {
        stream: true
      });

      expectTypeOf(process).toEqualTypeOf<Subprocess>();
      expect(process.pid).toBeNumber();

      // Wait for process to complete
      await process.exited;
      expect(process.exitCode).toBe(0);
    });

    it("should handle streaming errors gracefully", async () => {
      const process = await automation.runCommand("test-stream-error", ["false"], {
        stream: true
      });

      await process.exited;
      expect(process.exitCode).toBe(1);
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout long-running commands", async () => {
      const startTime = Date.now();
      const result = await automation.runCommand("test-timeout", ["sleep", "10"], {
        timeout: 1000 // 1 second timeout
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete much faster than 10 seconds
      expect(result.error).toBe(true);
    });

    it("should allow fast commands to complete", async () => {
      const result = await automation.runCommand("test-fast", ["echo", "quick"], {
        timeout: 5000
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("quick");
    });
  });

  describe("Process Management", () => {
    it("should track multiple processes", async () => {
      const command1 = automation.runCommand("proc1", ["echo", "process1"]);
      const command2 = automation.runCommand("proc2", ["echo", "process2"]);

      const processes = automation.listProcesses();
      expect(processes).toHaveLength(2);
      expect(processes).toContain("proc1");
      expect(processes).toContain("proc2");

      await Promise.all([command1, command2]);
    });

    it("should get process status", async () => {
      const label = "status-test";
      await automation.runCommand(label, ["echo", "status"]);

      const status = automation.getProcessStatus(label);
      expect(status).toBeDefined();
      expect(status.label).toBe(label);
    });

    it("should kill running processes", async () => {
      const label = "kill-test";
      const process = await automation.runCommand(label, ["sleep", "10"], {
        stream: true
      });

      const killed = automation.killProcess(label);
      expect(killed).toBe(true);

      // Process should be killed
      await process.exited;
      expect(process.killed).toBe(true);
    });

    it("should handle killing non-existent processes", () => {
      const killed = automation.killProcess("non-existent-process");
      expect(killed).toBe(false);
    });
  });

  describe("Cleanup Operations", () => {
    it("should cleanup finished processes", async () => {
      // Run some commands that finish
      await automation.runCommand("cleanup1", ["echo", "done1"]);
      await automation.runCommand("cleanup2", ["echo", "done2"]);

      let processes = automation.listProcesses();
      expect(processes.length).toBeGreaterThan(0);

      // Cleanup
      automation.cleanup();

      processes = automation.listProcesses();
      expect(processes.length).toBe(0);
    });

    it("should not kill running processes during cleanup", async () => {
      const process = await automation.runCommand("running", ["sleep", "5"], {
        stream: true
      });

      // Wait a bit to ensure the process is actually running
      await new Promise(resolve => setTimeout(resolve, 100));

      automation.cleanup();

      // Running process should still be there
      const processes = automation.listProcesses();
      expect(processes).toContain("running");

      await process.exited;
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle concurrent command execution", async () => {
      const commands = Array.from({ length: 10 }, (_, i) =>
        automation.runCommand(`concurrent-${i}`, ["echo", `message-${i}`])
      );

      const results = await Promise.all(commands);

      results.forEach((result, i) => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(`message-${i}`);
      });
    });

    it("should handle command chaining", async () => {
      const result1 = await automation.runCommand("chain1", ["echo", "step1"]);
      expect(result1.exitCode).toBe(0);

      const result2 = await automation.runCommand("chain2", ["echo", "step2"]);
      expect(result2.exitCode).toBe(0);

      expect(result1.stdout).toContain("step1");
      expect(result2.stdout).toContain("step2");
    });

    it("should handle large output", async () => {
      const result = await automation.runCommand("large-output", [
        "python3", "-c",
        "print('x' * 10000)"
      ].filter(Boolean)); // Filter out python3 if not available

      if (result.exitCode === 0) {
        expect(result.stdout.length).toBeGreaterThan(5000);
      } else {
        // Python might not be available, that's okay
        expect(result.error).toBe(true);
      }
    });
  });

  describe("Error Handling Edge Cases", () => {
    it("should handle empty command arrays", async () => {
      const result = await automation.runCommand("empty", [] as string[]);
      expect(result.error).toBe(true);
    });

    it("should handle null/undefined options", async () => {
      const result = await automation.runCommand("null-options", ["echo", "test"], null as any);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("test");
    });

    it("should handle very long command lines", async () => {
      const longArg = "a".repeat(10000);
      const result = await automation.runCommand("long-arg", ["echo", longArg]);

      if (result.exitCode === 0) {
        expect(result.stdout).toContain(longArg);
      } else {
        // Some systems have command line length limits
        expect(result.error).toBe(true);
      }
    });
  });

  describe("Type Safety", () => {
    it("should maintain proper TypeScript types", () => {
      expectTypeOf(AutomationService).toBeFunction();
      expectTypeOf(automation).toBeObject();
      expectTypeOf(automation.runCommand).toBeFunction();
      expectTypeOf(automation.killProcess).toBeFunction();
      expectTypeOf(automation.listProcesses).toBeFunction();
      expectTypeOf(automation.cleanup).toBeFunction();
    });

    it("should return properly typed results", async () => {
      const result = await automation.runCommand("type-test", ["echo", "test"]);

      expectTypeOf(result).toEqualTypeOf<{
        exitCode: number;
        stdout: string;
        stderr: string;
        error?: boolean;
        pid?: number;
        resourceUsage?: any;
        executionTime?: number;
        signalCode?: any;
      }>();

      expect(result.stdout).toBeString();
      expect(result.stderr).toBeString();
      expect(result.exitCode).toBeNumber();
    });
  });

  describe("Resource Management", () => {
    it("should not leak processes", async () => {
      const initialCount = automation.listProcesses().length;

      // Run and finish many commands
      for (let i = 0; i < 20; i++) {
        await automation.runCommand(`leak-test-${i}`, ["echo", `test-${i}`]);
      }

      // Should cleanup automatically or manually
      automation.cleanup();

      const finalCount = automation.listProcesses().length;
      expect(finalCount).toBeLessThanOrEqual(initialCount + 1); // Allow for test processes
    });
  });
});
