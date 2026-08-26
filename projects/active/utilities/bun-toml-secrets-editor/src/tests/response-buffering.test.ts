import { beforeEach, describe, expect, it } from "bun:test";
import type { ConfiguredOutboundOptions } from "../http/configured-outbound.ts";
import {
  CachedFetcher,
  optimizedFetch,
  streamingFetch,
} from "../utils/response-buffering.ts";

const ORIGIN = "https://fixture.invalid";
type TestFetch = NonNullable<ConfiguredOutboundOptions["fetcher"]>;
let activeFetch: TestFetch;

const resolver = async () => [
  { address: "93.184.216.34", family: 4 as const, ttl: 60, source: "node-resolver" as const },
];
const outbound: ConfiguredOutboundOptions = {
  environment: { TOML_OUTBOUND_ORIGINS: ORIGIN },
  resolver,
  fetcher: (input, init) => activeFetch(input, init),
};
const options = { outbound, dnsPrefetch: false, retryDelayMs: 1 };

function jsonResponse(data: unknown, status = 200): Response {
  const body = JSON.stringify(data);
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json",
      "content-length": String(body.length),
    },
  });
}

describe("Response Buffering", () => {
  beforeEach(() => {
    activeFetch = async () => jsonResponse({ test: "data" });
  });

  it("performs an authorized JSON fetch", async () => {
    const result = await optimizedFetch(`${ORIGIN}/api/test`, options);
    expect(result.data).toEqual({ test: "data" });
    expect(result.status).toBe(200);
    expect(result.cached).toBe(false);
    expect(result.size).toBeGreaterThan(0);
  });

  it("composes the configured deadline", async () => {
    activeFetch = async (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("Timeout")),
          { once: true },
        );
      });
    await expect(
      optimizedFetch(`${ORIGIN}/slow`, { ...options, timeout: 10, maxRetries: 0 }),
    ).rejects.toThrow("Timeout");
  });

  it("retries only through the same configured authority", async () => {
    let attempts = 0;
    activeFetch = async () => {
      attempts++;
      if (attempts < 3) throw new Error("Network error");
      return jsonResponse({ success: true });
    };
    const result = await optimizedFetch(`${ORIGIN}/retry`, {
      ...options,
      maxRetries: 3,
    });
    expect(result.data).toEqual({ success: true });
    expect(attempts).toBe(3);
  });

  it("caches responses and expires by TTL", async () => {
    const cache = new CachedFetcher(10);
    expect((await cache.fetch(`${ORIGIN}/cached`, options)).cached).toBe(false);
    expect((await cache.fetch(`${ORIGIN}/cached`, options)).cached).toBe(true);
    await Bun.sleep(15);
    expect((await cache.fetch(`${ORIGIN}/cached`, options)).cached).toBe(false);
  });

  it("reports cache entries", async () => {
    const cache = new CachedFetcher();
    await cache.fetch(`${ORIGIN}/one`, options);
    await cache.fetch(`${ORIGIN}/two`, options);
    expect(cache.getCacheStats().size).toBe(2);
    expect(cache.getCacheStats().entries).toHaveLength(2);
  });

  it("clears cached entries", async () => {
    const cache = new CachedFetcher();
    await cache.fetch(`${ORIGIN}/cached`, options);
    cache.clearCache();
    expect(cache.getCacheStats().size).toBe(0);
  });

  it("streams bounded response chunks", async () => {
    const chunks = [new TextEncoder().encode("one"), new TextEncoder().encode("two")];
    activeFetch = async () =>
      new Response(new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(chunk);
          controller.close();
        },
      }));
    const received: string[] = [];
    await streamingFetch(
      `${ORIGIN}/stream`,
      chunk => received.push(new TextDecoder().decode(chunk)),
      { outbound },
    );
    expect(received).toEqual(["one", "two"]);
  });

  it("buffers JSON, text, and binary content", async () => {
    activeFetch = async () => jsonResponse({ type: "json" });
    expect((await optimizedFetch(`${ORIGIN}/json`, options)).data).toEqual({ type: "json" });
    activeFetch = async () => new Response("plain text", { headers: { "content-type": "text/plain" } });
    expect((await optimizedFetch(`${ORIGIN}/text`, options)).data).toBe("plain text");
    activeFetch = async () => new Response(new Uint8Array([1, 2, 3, 4]), {
      headers: { "content-type": "application/octet-stream" },
    });
    expect((await optimizedFetch(`${ORIGIN}/binary`, options)).data).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  it("surfaces HTTP errors without an external socket", async () => {
    activeFetch = async () => new Response("missing", { status: 404 });
    await expect(
      optimizedFetch(`${ORIGIN}/missing`, { ...options, maxRetries: 0 }),
    ).rejects.toThrow("HTTP 404");
  });
});
