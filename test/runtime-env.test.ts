import { afterEach, describe, expect, test } from "bun:test";
import { RuntimeEnv } from "../lib/env/runtime";

const ENV_KEYS = [
  "DASHBOARD_HOST",
  "DASHBOARD_TEST_PORT",
  "DASHBOARD_PORT",
  "PLAYGROUND_PORT",
  "PLAYGROUND_HOST",
  "PLAYGROUND_ALLOW_PORT_FALLBACK",
  "PLAYGROUND_PORT_RANGE",
  "PLAYGROUND_RUNTIME_ORIGINS",
  "PLAYGROUND_RUNTIME_STALE_MS",
  "PLAYGROUND_WS_BROADCAST_MS",
  "PORT",
  "DASHBOARD_TEST_ALLOW_PORT_FALLBACK",
  "DASHBOARD_TEST_PORT_RANGE",
] as const;

const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]])
);

function resetEnv() {
  for (const key of ENV_KEYS) {
    const original = originalEnv.get(key);
    if (typeof original === "string") {
      process.env[key] = original;
    } else {
      delete process.env[key];
    }
  }
}

describe("RuntimeEnv", () => {
  afterEach(() => {
    resetEnv();
  });

  test("validate() resolves host/port/base from env", () => {
    process.env.DASHBOARD_HOST = "127.0.0.1";
    process.env.DASHBOARD_TEST_PORT = "3412";
    process.env.PLAYGROUND_ALLOW_PORT_FALLBACK = "true";
    process.env.PLAYGROUND_PORT_RANGE = "3412-3450";
    process.env.PLAYGROUND_RUNTIME_ORIGINS = "http://127.0.0.1:3412,http://localhost:3412";
    process.env.PLAYGROUND_RUNTIME_STALE_MS = "17000";
    process.env.PLAYGROUND_WS_BROADCAST_MS = "1200";

    const state = RuntimeEnv.validate();

    expect(state.host).toBe("127.0.0.1");
    expect(state.port).toBe(3412);
    expect(state.base).toBe("http://127.0.0.1:3412");
    expect(state.allowFallback).toBe(true);
    expect(state.portRange).toBe("3412-3450");
    expect(state.runtimeOrigins).toEqual(["http://127.0.0.1:3412", "http://localhost:3412"]);
    expect(state.runtimeStaleMs).toBe(17000);
    expect(state.wsBroadcastMs).toBe(1200);
  });

  test("validate() falls back to defaults when env absent", () => {
    for (const key of ENV_KEYS) delete process.env[key];

    const state = RuntimeEnv.validate();

    expect(state.host).toBe("127.0.0.1");
    expect(state.port).toBe(3011);
    expect(state.base).toBe("http://127.0.0.1:3011");
    expect(state.allowFallback).toBe(false);
    expect(state.portRange).toBe("3011-3011");
  });
});
