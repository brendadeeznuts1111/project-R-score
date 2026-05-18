// [84.0.0.0] PTY TERMINAL TESTS
// Tests for Bun.Terminal PTY API implementation
// Platform: POSIX only (Linux, macOS)

import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import {
  isPtySupported,
  createTerminal,
  spawnWithTerminal,
  spawnWithReusableTerminal,
} from "./pty-terminal";
import { TerminalManager } from "./terminal-manager";
import { DEFAULT_TERMINAL_CONFIG } from "./types";

describe("PTY Terminal", () => {
  describe("isPtySupported", () => {
    it("should return true on POSIX systems", () => {
      const supported = isPtySupported();
      // On macOS/Linux this should be true, on Windows false
      expect(typeof supported).toBe("boolean");
      if (process.platform !== "win32") {
        expect(supported).toBe(true);
      }
    });
  });

  describe("createTerminal", () => {
    it("should create a terminal instance on POSIX", () => {
      if (!isPtySupported()) {
        expect(() => createTerminal({ cols: 80, rows: 24 })).toThrow();
        return;
      }

      const terminal = createTerminal({
        cols: 80,
        rows: 24,
        data: () => {},
      });

      expect(terminal).toBeDefined();
      expect(typeof terminal.write).toBe("function");
      expect(typeof terminal.resize).toBe("function");
      expect(typeof terminal.close).toBe("function");

      terminal.close();
    });

    it("should use default dimensions from config", () => {
      expect(DEFAULT_TERMINAL_CONFIG.defaultDimensions.cols).toBe(80);
      expect(DEFAULT_TERMINAL_CONFIG.defaultDimensions.rows).toBe(24);
    });
  });

  describe("spawnWithTerminal", () => {
    it("should spawn a process with inline terminal", async () => {
      if (!isPtySupported()) {
        return;
      }

      let output = "";
      const proc = spawnWithTerminal(
        ["echo", "hello PTY"],
        {
          cols: 80,
          rows: 24,
          data: (_term, data) => {
            output += new TextDecoder().decode(data);
          },
        }
      );

      expect(proc.pid).toBeGreaterThan(0);
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      expect(output).toContain("hello PTY");

      proc.terminal?.close();
    });
  });

  describe("spawnWithReusableTerminal", () => {
    it("should reuse terminal across multiple processes", async () => {
      if (!isPtySupported()) {
        return;
      }

      const outputs: string[] = [];
      const terminal = createTerminal({
        cols: 80,
        rows: 24,
        data: (_term, data) => {
          outputs.push(new TextDecoder().decode(data));
        },
      });

      const proc1 = spawnWithReusableTerminal(["echo", "first"], terminal);
      await proc1.exited;

      const proc2 = spawnWithReusableTerminal(["echo", "second"], terminal);
      await proc2.exited;

      terminal.close();

      const combined = outputs.join("");
      expect(combined).toContain("first");
      expect(combined).toContain("second");
    });
  });
});

describe("TerminalManager", () => {
  it("should create and manage sessions", async () => {
    if (!isPtySupported()) {
      return;
    }

    const manager = new TerminalManager();
    const session = await manager.createSession({
      command: "echo",
      args: ["test session"],
    });

    expect(session.id).toMatch(/^term_\d+_\d+$/);
    expect(session.dimensions.cols).toBe(80);
    expect(session.dimensions.rows).toBe(24);

    await session.process.exited;
    await manager.closeAll();
    expect(manager.getAllSessions().length).toBe(0);
  });

  it("should emit events on data", async () => {
    if (!isPtySupported()) {
      return;
    }

    const manager = new TerminalManager();
    const events: string[] = [];

    manager.on("data", (event) => {
      events.push(event.type);
    });

    const session = await manager.createSession({
      command: "echo",
      args: ["event test"],
    });

    await session.process.exited;
    await manager.closeAll();

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toBe("data");
  });

  it("should resize terminal", async () => {
    if (!isPtySupported()) {
      return;
    }

    const manager = new TerminalManager();
    const session = await manager.createSession({
      command: "sleep",
      args: ["0.1"],
    });

    session.resize(120, 40);
    expect(session.dimensions.cols).toBe(120);
    expect(session.dimensions.rows).toBe(40);

    await session.process.exited;
    await manager.closeAll();
  });
});

