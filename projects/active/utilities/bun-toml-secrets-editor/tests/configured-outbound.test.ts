import { describe, expect, test } from "bun:test";
import type { OutboundFetch } from "../../../../../lib/http/outbound-policy.ts";
import {
  fetchTomlConfigured,
  fetchTomlLoopback,
} from "../src/http/configured-outbound.ts";

const publicResolver = async () => [
  { address: "93.184.216.34", family: 4 as const, ttl: 60, source: "node-resolver" as const },
];

describe("configured TOML outbound planes", () => {
  test("requires an operator-configured exact public origin", async () => {
    const calls: BunFetchRequestInit[] = [];
    const fetcher = (async (_input, init) => {
      calls.push(init ?? {});
      return new Response("ok");
    }) as OutboundFetch;
    expect(() => fetchTomlConfigured("https://evil.example/feed", {}, {
      fetcher, resolver: publicResolver, environment: {},
    })).toThrow("not configured");
    await fetchTomlConfigured("https://feeds.example/rss", {}, {
      fetcher, resolver: publicResolver,
      environment: { TOML_OUTBOUND_ORIGINS: "https://feeds.example" },
    });
    expect(calls[0]?.redirect).toBe("error");
    expect(calls[0]?.credentials).toBe("omit");
  });

  test("denies credentials, unsafe methods, extensions, and private DNS", async () => {
    const base = { environment: {}, resolver: publicResolver,
      fetcher: (async () => new Response("ok")) as OutboundFetch };
    expect(() => fetchTomlConfigured("https://bun.com/rss.xml", {
      headers: { Authorization: "secret" },
    }, base)).toThrow("credentials are forbidden");
    expect(() => fetchTomlConfigured("https://bun.com/rss.xml", {
      method: "POST", body: "x",
    }, base)).toThrow("method POST is not allowed");
    expect(() => fetchTomlConfigured("https://bun.com/rss.xml", {
      proxy: "https://proxy.example",
    } as BunFetchRequestInit, base)).toThrow("proxy");
    await expect(fetchTomlConfigured("https://bun.com/rss.xml", {}, {
      ...base, resolver: async () => [{ address: "127.0.0.1", family: 4, ttl: 0, source: "node-resolver" }],
    })).rejects.toThrow();
  });

  test("keeps loopback on fixed origins and offline blocks before fetch", () => {
    let calls = 0;
    const options = { environment: {}, networkMode: "offline-no-socket" as const,
      fetcher: (async () => { calls++; return new Response("bad"); }) as OutboundFetch };
    expect(() => fetchTomlLoopback("http://localhost:9999/health", {}, options)).toThrow("not allowed");
    expect(() => fetchTomlLoopback("http://localhost:3001/health", {}, options)).toThrow("forbids network fetch");
    expect(calls).toBe(0);
  });
});
