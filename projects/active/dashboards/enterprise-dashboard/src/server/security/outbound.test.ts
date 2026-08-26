import { describe, expect, test } from "bun:test";
import type { AuthorityAddressResolver } from "../../../../../../../lib/http/ip-authority.ts";
import {
  fetchEnterpriseDashboardOutbound,
  preconnectEnterpriseDashboardOutbound,
} from "./outbound.ts";

const publicResolver: AuthorityAddressResolver = async () => [
  { address: "93.184.216.34", family: 4, ttl: 30, source: "bun" },
];
const baseOptions = {
  resolver: publicResolver,
  environment: { NO_PROXY: "*" },
  fetcher: async () => new Response("ok"),
};

describe("enterprise dashboard outbound authority", () => {
  test("owns fixed, configured, credentialed, and loopback operations", async () => {
    expect((await fetchEnterpriseDashboardOutbound("bun-news", "https://bun.com/rss.xml", {}, baseOptions)).ok).toBeTrue();
    expect((await fetchEnterpriseDashboardOutbound("configured-head", "https://storage.example/health", { method: "HEAD" }, baseOptions)).ok).toBeTrue();
    expect((await fetchEnterpriseDashboardOutbound("loopback-health", "http://localhost:8080/health", {}, baseOptions)).ok).toBeTrue();
    expect((await fetchEnterpriseDashboardOutbound("play-integrity", "https://playintegrity.googleapis.com/v1/decrypt", {
      method: "POST",
      headers: { Authorization: "Bearer fixture" },
      body: "{}",
    }, baseOptions)).ok).toBeTrue();
  });

  test("denies unknown, cross-route, lookalike, and non-loopback authorities before I/O", () => {
    let io = 0;
    const noIo = {
      ...baseOptions,
      resolver: async () => { io++; return []; },
      fetcher: async () => { io++; return new Response("unexpected"); },
    };
    expect(() => fetchEnterpriseDashboardOutbound("bun-news", "https://evil.example/rss.xml", {}, noIo)).toThrow();
    expect(() => fetchEnterpriseDashboardOutbound("play-integrity", "https://playintegrity.googleapis.com.evil.example/v1", {}, noIo)).toThrow();
    expect(() => fetchEnterpriseDashboardOutbound("route-benchmark", "https://example.com/api", {}, noIo)).toThrow();
    expect(() => fetchEnterpriseDashboardOutbound("link-check", "http://example.com", {}, noIo)).toThrow();
    expect(io).toBe(0);
  });

  test("denies CONNECT, credentials, redirect, proxy, TLS, protocol, and experimental request overrides", () => {
    const cases: BunFetchRequestInit[] = [
      { method: "CONNECT" },
      { headers: { Authorization: "Bearer leaked" } },
      { redirect: "follow" },
      { credentials: "include" },
      { proxy: "https://proxy.example" },
      { tls: { rejectUnauthorized: false } },
      { protocol: "http2" },
      { s3: { accessKeyId: "x", secretAccessKey: "y" } },
    ];
    for (const init of cases) {
      expect(() => fetchEnterpriseDashboardOutbound("benchmark-public", "https://registry.npmjs.org/bun", init, baseOptions)).toThrow();
    }
  });

  test("denies registry, connect, O/R, BUN_OPTIONS, and experimental runtime overrides", () => {
    for (const argv of [
      ["--registry=https://evil.example"], ["--connect"], ["-O"], ["-R"],
      ["--experimental-http2-fetch"], ["--experimental-http3-fetch"],
    ]) {
      expect(() => fetchEnterpriseDashboardOutbound("bun-news", "https://bun.com/rss.xml", {}, { ...baseOptions, argv })).toThrow();
    }
    for (const environment of [
      { BUN_CONFIG_REGISTRY: "https://evil.example" },
      { NPM_CONFIG_REGISTRY: "https://evil.example" },
      { BUN_OPTIONS: "--experimental-http2-fetch" },
    ]) {
      expect(() => fetchEnterpriseDashboardOutbound("bun-news", "https://bun.com/rss.xml", {}, { ...baseOptions, environment })).toThrow();
    }
  });

  test("blocks offline sockets, ambient proxies, and private DNS before transport", async () => {
    let fetches = 0;
    const fetcher = async () => { fetches++; return new Response("unexpected"); };
    expect(() => fetchEnterpriseDashboardOutbound("bun-news", "https://bun.com/rss.xml", {}, {
      ...baseOptions, fetcher, networkMode: "offline-no-socket",
    })).toThrow("forbids network fetch");
    expect(() => fetchEnterpriseDashboardOutbound("bun-news", "https://bun.com/rss.xml", {}, {
      ...baseOptions, fetcher, environment: { HTTPS_PROXY: "https://proxy.example" },
    })).toThrow("active proxy environment");
    await expect(fetchEnterpriseDashboardOutbound("bun-news", "https://bun.com/rss.xml", {}, {
      ...baseOptions, fetcher,
      resolver: async () => [{ address: "127.0.0.1", family: 4, ttl: 30, source: "bun" as const }],
    })).rejects.toThrow("DNS authority rejected");
    expect(fetches).toBe(0);
  });

  test("blocks offline and proxy preconnect while preserving an injected online transport", async () => {
    let calls = 0;
    await expect(preconnectEnterpriseDashboardOutbound("benchmark-public", "https://api.github.com", {
      environment: {}, networkMode: "offline-no-socket", preconnecter: () => { calls++; },
    })).rejects.toThrow("forbids network preconnect");
    await expect(preconnectEnterpriseDashboardOutbound("benchmark-public", "https://api.github.com", {
      environment: { HTTPS_PROXY: "https://proxy.example" }, preconnecter: () => { calls++; },
    })).rejects.toThrow("active proxy environment");
    await preconnectEnterpriseDashboardOutbound("benchmark-public", "https://api.github.com/path", {
      environment: {}, preconnecter: url => { calls++; expect(url).toBe("https://api.github.com"); },
    });
    expect(calls).toBe(1);
  });

  test("bounds response bodies and executes unsafe writes once", async () => {
    let calls = 0;
    await expect(fetchEnterpriseDashboardOutbound("admin-webhook", "https://hooks.example/alert", {
      method: "POST", body: "{}",
    }, {
      ...baseOptions,
      fetcher: async () => { calls++; return new Response("x", { headers: { "content-length": "4000001" } }); },
    })).rejects.toThrow("exceeds");
    expect(calls).toBe(1);
  });
});
