import { describe, expect, it } from "bun:test";
import {
  fetchBrowserSameOrigin,
  fetchGeelarkServiceApi,
  type BrowserOutboundFetch,
} from "../../../src/http/browser-outbound.ts";
import { fetchAPI, fetchAPIEnvelope } from "../../../src/types/api.ts";

const ORIGIN = "https://dashboard.example";

function capture(body: unknown = { ok: true }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: BrowserOutboundFetch = async (input, init) => {
    calls.push({ url: input.toString(), init });
    return Response.json(body);
  };
  return { calls, fetcher };
}

describe("Geelark browser outbound boundary", () => {
  it("owns exact same-origin read and write routes", async () => {
    const { calls, fetcher } = capture();
    await fetchBrowserSameOrigin("/api/monitoring/ips/top?env=production&limit=10", {}, {
      baseOrigin: ORIGIN,
      fetcher,
    });
    await fetchBrowserSameOrigin(
      "/api/build/trigger",
      { method: "POST", body: "{}" },
      { baseOrigin: ORIGIN, fetcher },
    );
    expect(calls.map(call => call.url)).toEqual([
      `${ORIGIN}/api/monitoring/ips/top?env=production&limit=10`,
      `${ORIGIN}/api/build/trigger`,
    ]);
    expect(calls.every(call => call.init?.credentials === "omit")).toBeTrue();
    expect(calls.every(call => call.init?.redirect === "error")).toBeTrue();
    expect(calls.every(call => call.init?.mode === "same-origin")).toBeTrue();
    expect(calls.every(call => call.init?.signal instanceof AbortSignal)).toBeTrue();
  });

  it("injects bearer authority only on exact authentication routes", async () => {
    const { calls, fetcher } = capture();
    await fetchBrowserSameOrigin(
      "/api/auth/audit?limit=100",
      {},
      { baseOrigin: ORIGIN, bearerToken: "token.value-1", fetcher },
    );
    expect(new Headers(calls[0]?.init?.headers).get("authorization")).toBe(
      "Bearer token.value-1",
    );
    await expect(
      fetchBrowserSameOrigin("/api/auth/audit?limit=100", {}, { baseOrigin: ORIGIN, fetcher }),
    ).rejects.toThrow("requires bearer");
    await expect(
      fetchBrowserSameOrigin("/api/health", {}, {
        baseOrigin: ORIGIN,
        bearerToken: "token.value-1",
        fetcher,
      }),
    ).rejects.toThrow("bearer authority");
  });

  it("denies authority, route, query, method, credential, redirect, and mode drift", async () => {
    const { calls, fetcher } = capture();
    const run = (route: string, init: RequestInit = {}) =>
      fetchBrowserSameOrigin(route, init, { baseOrigin: ORIGIN, fetcher });
    await expect(run("https://evil.example/api/health")).rejects.toThrow("origin-relative");
    await expect(run("//evil.example/api/health")).rejects.toThrow("origin-relative");
    await expect(run("/api/unknown")).rejects.toThrow("allowlisted");
    await expect(run("/api/auth/audit?limit=999")).rejects.toThrow("allowlisted");
    await expect(run("/api/health", { method: "POST" })).rejects.toThrow("method");
    await expect(run("/api/health", { headers: { Authorization: "Bearer substitute" } })).rejects.toThrow("credential headers");
    await expect(run("/api/health", { credentials: "include" })).rejects.toThrow("ambient");
    await expect(run("/api/health", { redirect: "follow" })).rejects.toThrow("redirect");
    await expect(run("/api/health", { mode: "cors" })).rejects.toThrow("mode");
    expect(calls).toHaveLength(0);
  });

  it("bounds declared and streamed responses", async () => {
    const declared: BrowserOutboundFetch = async () =>
      new Response("x", { headers: { "content-length": "2000001" } });
    await expect(
      fetchBrowserSameOrigin("/api/health", {}, { baseOrigin: ORIGIN, fetcher: declared }),
    ).rejects.toThrow("byte limit");
    const streamed: BrowserOutboundFetch = async () =>
      new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(2_000_001));
          controller.close();
        },
      }));
    const response = await fetchBrowserSameOrigin("/api/health", {}, {
      baseOrigin: ORIGIN,
      fetcher: streamed,
    });
    await expect(response.arrayBuffer()).rejects.toThrow("byte limit");
  });
});

describe("Geelark server-style helper closure", () => {
  it("routes API helpers through injected exact authority", async () => {
    const { calls, fetcher } = capture({ status: "ok" });
    const outbound = { baseOrigin: ORIGIN, fetcher };
    expect(await (await fetchGeelarkServiceApi("/health", {}, outbound)).json()).toEqual({
      status: "ok",
    });
    expect(await fetchAPI<{ status: string }>("/api/info", {}, outbound)).toEqual({ status: "ok" });
    expect(await fetchAPIEnvelope<{ status: string }>("/api/info", {}, outbound)).toEqual({
      success: true,
      data: { status: "ok" },
    });
    expect(calls).toHaveLength(3);
    await expect(fetchAPI("https://evil.example/data", {}, outbound)).rejects.toThrow(
      "origin-relative",
    );
    await expect(fetchAPI("/api/arbitrary", {}, outbound)).rejects.toThrow("allowlisted");
    expect(calls).toHaveLength(3);
  });
});
