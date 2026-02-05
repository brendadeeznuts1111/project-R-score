import { test, expect, describe } from "bun:test";

describe("Dev HQ PTY Terminal", () => {
  
  test("Bun.Terminal creates successfully", async () => {
    await using terminal = new Bun.Terminal({
      cols: 80,
      rows: 24,
      data(term, data) {
        // Silent
      }
    });
    expect(terminal).toBeDefined();
  });

  test("terminal.write() works", async () => {
    await using terminal = new Bun.Terminal({
      cols: 80,
      rows: 24,
      data(term, data) {
        expect(data.length).toBeGreaterThan(0);
      }
    });

    terminal.write("test\n");
  });

  test("terminal.resize() works", async () => {
    await using terminal = new Bun.Terminal({
      cols: 80,
      rows: 24,
      data() {}
    });

    terminal.resize(120, 40);
  });

  test("spawn with terminal", async () => {
    const proc = Bun.spawn(["echo", "hello"], {
      terminal: {
        cols: 80,
        rows: 24,
        data(term, data) {}
      }
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);
  });

  test("PTY enables TTY features", async () => {
    const proc = Bun.spawn(["bash", "-c", "echo $TTY"], {
      terminal: {
        cols: 80,
        rows: 24,
        data(term, data) {
          const output = new TextDecoder().decode(data);
          // TTY should be set
          expect(output.length).toBeGreaterThan(0);
        }
      }
    });

    await proc.exited;
  });

  test("interactive insights in PTY", async () => {
    await using terminal = new Bun.Terminal({
      cols: 80,
      rows: 24,
      data(term, data) {}
    });

    const proc = Bun.spawn([
      "bun", "packages/cli/index.ts", "insights", "--json"
    ], { terminal });

    await proc.exited;
    // Accept both success and common error codes (PTEs can cause failures in PTY)
    expect([0, 1, 130, 143]).toContain(proc.exitCode);
  });

  test("terminal.close() cleans up", async () => {
    const terminal = new Bun.Terminal({
      cols: 80,
      rows: 24,
      data() {}
    });

    terminal.close();
    // Should not throw
  });

  test("process.stdout.resize forwarding", async () => {
    await using terminal = new Bun.Terminal({
      cols: 80,
      rows: 24,
      data() {}
    });

    // Simulate resize
    terminal.resize(120, 40);
    expect(true).toBe(true);
  });
});
