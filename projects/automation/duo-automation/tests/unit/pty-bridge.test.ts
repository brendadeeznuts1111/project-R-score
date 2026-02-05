import { test, expect } from "bun:test";
import { PTYBridge } from "../../server/pty/bridge";

test("PTY bridge broadcasts via manager", () => {
  const calls: Array<{ sessionId: string; payload: unknown }> = [];
  const manager = {
    broadcastToClients(sessionId: string, payload: unknown) {
      calls.push({ sessionId, payload });
    }
  };

  const bridge = new PTYBridge(manager, "session-123");
  bridge.onData("hello world");

  expect(calls.length).toBe(1);
  expect(calls[0].sessionId).toBe("session-123");
});
