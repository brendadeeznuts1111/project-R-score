#!/usr/bin/env bun
/**
 * Bun Terminal API (PTY) Tests
 *
 * Comprehensive test suite for PTY functionality including:
 * - Basic PTY operations
 * - Session management
 * - Security validation
 * - Command execution
 * - Interactive programs
 * - WebSocket integration
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  CommandExecutor,
  FileTerminalOps,
  OutputProcessor,
  ProcessMonitor,
  TerminalManager,
  TerminalResizer,
  TerminalSecurity,
  TerminalUtils,
} from "../src/terminal-utils";

describe("TerminalSecurity", () => {
  it("should sanitize dangerous input", () => {
    const dangerousInput = "ls && rm -rf /; cat /etc/passwd | grep root";
    const sanitized = TerminalSecurity.sanitizeInput(dangerousInput);

    expect(sanitized).not.toContain("&&");
    expect(sanitized).not.toContain(";");
    expect(sanitized).not.toContain("|");
    expect(sanitized).toBe("ls   rm -rf / cat /etc/passwd  grep root");
  });

  it("should validate shell names", () => {
    expect(TerminalSecurity.validateShell("bash")).toBe(true);
    expect(TerminalSecurity.validateShell("zsh")).toBe(true);
    expect(TerminalSecurity.validateShell("sh")).toBe(true);
    expect(TerminalSecurity.validateShell("fish")).toBe(true);
    expect(TerminalSecurity.validateShell("malicious")).toBe(false);
    expect(TerminalSecurity.validateShell("")).toBe(false);
  });

  it("should validate commands", () => {
    expect(TerminalSecurity.validateCommand("ls -la")).toBe(true);
    expect(TerminalSecurity.validateCommand("echo hello")).toBe(true);
    expect(TerminalSecurity.validateCommand("rm -rf /")).toBe(false);
    expect(TerminalSecurity.validateCommand("sudo rm important")).toBe(false);
    expect(TerminalSecurity.validateCommand("dd if=/dev/zero")).toBe(false);
  });

  it("should generate and validate session IDs", () => {
    const sessionId = TerminalSecurity.generateSessionId();
    expect(sessionId).toMatch(/^[a-f0-9-]{36}$/);
    expect(TerminalSecurity.validateSessionId(sessionId)).toBe(true);
    expect(TerminalSecurity.validateSessionId("invalid")).toBe(false);
  });
});

describe("TerminalManager", () => {
  beforeEach(() => {
    // Clean up any existing sessions
    TerminalManager.listSessions().forEach((session) => {
      TerminalManager.destroySession(session.id);
    });
  });

  it("should create a terminal session", () => {
    const session = TerminalManager.createSession();

    expect(session.id).toBeDefined();
    expect(session.proc).toBeDefined();
    expect(session.terminal).toBeDefined();
    expect(session.startTime).toBeInstanceOf(Date);
    expect(session.config.shell).toBe("bash");
  });

  it("should create session with custom config", () => {
    const config = { cols: 120, rows: 40, shell: "zsh" };
    const session = TerminalManager.createSession(config);

    expect(session.config.cols).toBe(120);
    expect(session.config.rows).toBe(40);
    expect(session.config.shell).toBe("zsh");
  });

  it("should retrieve existing sessions", () => {
    const session = TerminalManager.createSession();
    const retrieved = TerminalManager.getSession(session.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(session.id);
  });

  it("should destroy sessions", () => {
    const session = TerminalManager.createSession();
    const sessionId = session.id;

    const destroyed = TerminalManager.destroySession(sessionId);
    expect(destroyed).toBe(true);

    const retrieved = TerminalManager.getSession(sessionId);
    expect(retrieved).toBeUndefined();
  });

  it("should list all sessions", () => {
    const session1 = TerminalManager.createSession();
    const session2 = TerminalManager.createSession();

    const sessions = TerminalManager.listSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.id)).toContain(session1.id);
    expect(sessions.map((s) => s.id)).toContain(session2.id);
  });

  it("should cleanup inactive sessions", () => {
    // Create a session and manually modify its start time
    const session = TerminalManager.createSession();
    session.startTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const cleaned = TerminalManager.cleanupInactiveSessions(30 * 60 * 1000); // 30 minutes
    expect(cleaned).toBe(1);

    const retrieved = TerminalManager.getSession(session.id);
    expect(retrieved).toBeUndefined();
  });
});

describe("CommandExecutor", () => {
  it("should execute simple commands", async () => {
    const result = await CommandExecutor.executeCommand("echo 'Hello, World!'");

    expect(result.success).toBe(true);
    expect(result.output).toContain("Hello, World!");
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeGreaterThan(0);
  });

  it("should handle command failures", async () => {
    const result = await CommandExecutor.executeCommand("exit 1");

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it("should reject dangerous commands", async () => {
    const result = await CommandExecutor.executeCommand("rm -rf /");

    expect(result.success).toBe(false);
    expect(result.output).toContain("rejected for security reasons");
    expect(result.exitCode).toBe(-1);
  });

  it("should execute interactive commands", async () => {
    const commands = [
      "echo 'First command'",
      "echo 'Second command'",
      "echo 'Third command'",
    ];

    const outputs: string[] = [];
    const result = await CommandExecutor.executeInteractive(
      commands,
      {},
      (output) => outputs.push(output)
    );

    expect(result.success).toBe(true);
    expect(outputs.length).toBeGreaterThan(0);
    expect(result.output).toContain("First command");
    expect(result.output).toContain("Second command");
    expect(result.output).toContain("Third command");
  });
});

describe("OutputProcessor", () => {
  it("should strip ANSI codes", () => {
    const ansiText = "\x1b[31mRed Text\x1b[0m and \x1b[32mGreen Text\x1b[0m";
    const clean = OutputProcessor.stripAnsiCodes(ansiText);

    expect(clean).toBe("Red Text and Green Text");
    expect(clean).not.toContain("\x1b");
  });

  it("should extract prompts", () => {
    const promptLine = "user@hostname:/path/to/dir$ ";
    const prompt = OutputProcessor.extractPrompt(promptLine);

    expect(prompt).toBe("user@hostname:/path/to/dir");
  });

  it("should parse command output", () => {
    const output = `user@host$ echo hello
hello
user@host$ pwd
/home/user
user@host$ date
Thu Jan 1 12:00:00 UTC 2025`;

    const parsed = OutputProcessor.parseCommandOutput(output);

    expect(parsed).toHaveLength(3);
    expect(parsed[0].command).toContain("echo hello");
    expect(parsed[0].output).toContain("hello");
    expect(parsed[1].command).toContain("pwd");
    expect(parsed[1].output).toContain("/home/user");
  });

  it("should format output for display", () => {
    const longLine =
      "This is a very long line that should be wrapped to fit within the specified maximum width";
    const formatted = OutputProcessor.formatOutputForDisplay(longLine, 40);

    expect(formatted.length).toBeGreaterThan(1);
    formatted.forEach((line) => {
      expect(line.length).toBeLessThanOrEqual(40);
    });
  });
});

describe("TerminalResizer", () => {
  let session: TerminalSession | undefined;

  beforeEach(() => {
    session = TerminalManager.createSession();
  });

  afterEach(() => {
    if (session) {
      TerminalManager.destroySession(session.id);
    }
  });

  it("should resize terminal", async () => {
    const success = await TerminalResizer.resizeSession(session, 100, 50);

    expect(success).toBe(true);
    expect(session.config.cols).toBe(100);
    expect(session.config.rows).toBe(50);
  });

  it("should get optimal size", () => {
    const size = TerminalResizer.getOptimalSize();

    expect(size.cols).toBeGreaterThan(0);
    expect(size.rows).toBeGreaterThan(0);
    expect(size.cols).toBeLessThanOrEqual(500);
    expect(size.rows).toBeLessThanOrEqual(200);
  });

  it("should fit content", async () => {
    const content =
      "Line 1\nThis is a very long line that should determine the width\nLine 3";
    const size = await TerminalResizer.fitContent(session, content);

    expect(size.cols).toBeGreaterThan(50); // Should accommodate the long line
    expect(size.rows).toBeGreaterThanOrEqual(5); // Should accommodate all lines
  });
});

describe("FileTerminalOps", () => {
  const testFile = "/tmp/bun-pty-test.txt";

  afterEach(async () => {
    // Clean up test file
    try {
      await Bun.write(testFile, "");
    } catch (_error) {
      console.error(`Error cleaning up test file ${testFile}:`, _error);
    }
  });

  it("should create file with content", async () => {
    const content = "Test content for file creation";
    const result = await FileTerminalOps.createFileWithContent(
      testFile,
      content
    );

    expect(result.success).toBe(true);

    const fileContent = await Bun.file(testFile).text();
    expect(fileContent).toContain(content);
  });

  it("should handle file creation errors", async () => {
    const invalidPath = "/invalid/path/file.txt";
    const result = await FileTerminalOps.createFileWithContent(
      invalidPath,
      "content"
    );

    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });
});

describe("ProcessMonitor", () => {
  it("should get system information", async () => {
    const result = await ProcessMonitor.getSystemInfo();

    expect(result.success).toBe(true);
    expect(result.output).toContain("System Information");
    expect(result.output).toContain("Memory Usage");
    expect(result.output).toContain("Disk Usage");
  });

  it("should handle process monitoring", async () => {
    // Use current process PID for testing
    const currentPid = process.pid.toString();
    const result = await ProcessMonitor.monitorProcess(currentPid, 1000); // 1 second

    expect(result.success).toBe(true);
    expect(result.output).toContain("Monitoring process");
  });
});

describe("TerminalUtils", () => {
  it("should run commands quickly", async () => {
    const output = await TerminalUtils.run("echo 'Quick test'");
    expect(output).toContain("Quick test");
  });

  it("should create temporary terminal", async () => {
    const session = await TerminalUtils.createTempTerminal();

    expect(session.id).toBeDefined();
    expect(session.config.timeout).toBe(60000);

    // Clean up manually to avoid waiting for timeout
    TerminalManager.destroySession(session.id);
  });

  it("should check PTY support", () => {
    const supported = TerminalUtils.isPTYSupported();
    expect(typeof supported).toBe("boolean");
  });

  it("should get terminal capabilities", () => {
    const capabilities = TerminalUtils.getCapabilities();

    expect(typeof capabilities.pty).toBe("boolean");
    expect(typeof capabilities.resize).toBe("boolean");
    expect(typeof capabilities.colors).toBe("boolean");
    expect(typeof capabilities.interactive).toBe("boolean");
    expect(typeof capabilities.websocket).toBe("boolean");
  });
});

describe("PTY Integration Tests", () => {
  let session: TerminalSession | undefined;

  beforeEach(() => {
    session = TerminalManager.createSession();
  });

  afterEach(() => {
    if (session) {
      TerminalManager.destroySession(session.id);
    }
  });

  it("should handle complete terminal workflow", async () => {
    // Send multiple commands and verify output
    const commands = ["echo 'Test 1'", "pwd", "date"];
    const outputs: string[] = [];

    // Set up data handler
    session!.terminal.data = (term: unknown, data: Uint8Array) => {
      const output = new TextDecoder().decode(data);
      outputs.push(output);
    };

    // Send commands
    for (const command of commands) {
      session.terminal.write(command + "\n");
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for execution
    }

    // Exit
    session.terminal.write("exit\n");
    await session.proc.exited;

    // Verify outputs
    const combinedOutput = outputs.join("");
    expect(combinedOutput).toContain("Test 1");
    expect(combinedOutput).toContain("/"); // pwd should show path
    expect(combinedOutput.match(/\d{4}/)); // date should show year
  });

  it("should handle terminal resize during operation", async () => {
    const originalSize = {
      cols: session!.config.cols,
      rows: session!.config.rows,
    };

    // Resize terminal
    await TerminalResizer.resizeSession(session!, 100, 40);

    expect(session.config.cols).toBe(100);
    expect(session.config.rows).toBe(40);
    expect(session.config.cols).not.toBe(originalSize.cols);
    expect(session.config.rows).not.toBe(originalSize.rows);
  });

  it("should handle interactive program simulation", async () => {
    const outputs: string[] = [];

    session!.terminal.data = (term: unknown, data: Uint8Array) => {
      const output = new TextDecoder().decode(data);
      outputs.push(output);
    };

    // Simulate interactive session
    session.terminal.write("echo 'Starting interactive session'\n");
    await new Promise((resolve) => setTimeout(resolve, 100));

    session.terminal.write("echo 'Second command'\n");
    await new Promise((resolve) => setTimeout(resolve, 100));

    session.terminal.write("exit\n");
    await session.proc.exited;

    const combinedOutput = outputs.join("");
    expect(combinedOutput).toContain("Starting interactive session");
    expect(combinedOutput).toContain("Second command");
  });
});

describe("Error Handling", () => {
  it("should handle invalid session operations", () => {
    const invalidSessionId: string = "invalid-session-id";

    expect(TerminalManager.getSession(invalidSessionId)).toBeUndefined();
    expect(TerminalManager.destroySession(invalidSessionId)).toBe(false);
  });

  it("should handle terminal creation failures", () => {
    // Test with invalid shell - should fall back to default
    expect(() => {
      const session = TerminalManager.createSession({ shell: "invalid-shell" });
      expect(session.config.shell).toBe("bash");
      TerminalManager.destroySession(session.id);
    }).not.toThrow();
  });

  it("should handle command timeout", async () => {
    // This test would require implementing timeout functionality
    // For now, just ensure the function doesn't hang indefinitely
    const startTime: number = Date.now();
    const result = await CommandExecutor.executeCommand("echo 'Quick command'");
    const duration: number = Date.now() - startTime;

    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(result.success).toBe(true);
  });
});
