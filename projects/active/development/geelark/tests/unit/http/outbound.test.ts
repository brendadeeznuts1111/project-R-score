import { describe, expect, it } from "bun:test";
import {
  fetchGeelarkDemoRegistryPackage,
  fetchGeelarkDemoRegistryPublish,
  fetchGeelarkGeolocation,
  fetchGeelarkWebhook,
  type GeelarkOutboundOptions,
} from "../../../src/http/outbound.ts";

const publicResolver = async () => [
  { address: "93.184.216.34", family: 4 as const, ttl: 60, source: "node-resolver" as const },
];

function options(fetcher: NonNullable<GeelarkOutboundOptions["fetcher"]>): GeelarkOutboundOptions {
  return { fetcher, resolver: publicResolver, environment: {} };
}

describe("Geelark outbound boundary", () => {
  it("owns exact registry routes without ambient credentials", async () => {
    const seen: Array<{ url: string; init?: BunFetchRequestInit }> = [];
    const fetcher = async (input: string | URL, init?: BunFetchRequestInit) => {
      seen.push({ url: input.toString(), init });
      return new Response("ok");
    };
    await fetchGeelarkDemoRegistryPackage("@scope/pkg", { method: "GET" }, options(fetcher));
    await fetchGeelarkDemoRegistryPublish({ method: "POST", body: "{}" }, options(fetcher));
    expect(seen.map(row => row.url)).toEqual([
      "https://registry.example.com/%40scope/pkg",
      "https://registry.example.com/publish",
    ]);
    expect(seen.every(row => row.init?.credentials === "omit")).toBeTrue();
    expect(seen.every(row => row.init?.redirect === "error")).toBeTrue();
  });

  it("owns exact geolocation and provider webhook authorities", async () => {
    const urls: string[] = [];
    const fetcher = async (input: string | URL) => {
      urls.push(input.toString());
      return new Response("{}");
    };
    await fetchGeelarkGeolocation("203.0.113.9", options(fetcher));
    await fetchGeelarkWebhook(
      "slack",
      "https://hooks.slack.com/services/T1/B2/token",
      { method: "POST" },
      options(fetcher),
    );
    await fetchGeelarkWebhook(
      "discord",
      "https://discord.com/api/webhooks/123/token",
      { method: "POST" },
      options(fetcher),
    );
    expect(urls[0]).toContain("http://ip-api.com/json/203.0.113.9?fields=");
    expect(urls.slice(1)).toEqual([
      "https://hooks.slack.com/services/T1/B2/token",
      "https://discord.com/api/webhooks/123/token",
    ]);
  });

  it("rejects malformed package, IP, and webhook inputs before transport", async () => {
    let effects = 0;
    const fetcher = async () => {
      effects++;
      return new Response();
    };
    expect(() => fetchGeelarkDemoRegistryPackage("../escape", {}, options(fetcher))).toThrow();
    expect(() => fetchGeelarkGeolocation("localhost", options(fetcher))).toThrow();
    expect(() =>
      fetchGeelarkWebhook(
        "slack",
        "https://evil.example/services/T/B/token",
        { method: "POST" },
        options(fetcher),
      ),
    ).toThrow();
    expect(() =>
      fetchGeelarkWebhook(
        "discord",
        "https://discord.com/api/users/123",
        { method: "POST" },
        options(fetcher),
      ),
    ).toThrow();
    expect(effects).toBe(0);
  });

  it("denies method, credentials, redirects, proxy, TLS, and H3 overrides", async () => {
    const never = async () => new Response();
    const guarded = (init: BunFetchRequestInit) =>
      fetchGeelarkDemoRegistryPackage("pkg", init, options(never));
    expect(() => guarded({ method: "POST" })).toThrow("method");
    expect(() => guarded({ headers: { Authorization: "secret" } })).toThrow("credentials");
    expect(() => guarded({ redirect: "follow" })).toThrow("redirect");
    expect(() => guarded({ proxy: "http://proxy.example" })).toThrow("proxy");
    expect(() => guarded({ tls: { rejectUnauthorized: false } })).toThrow();
    expect(() => guarded({ protocol: "http3" } as unknown as BunFetchRequestInit)).toThrow("h3");
  });

  it("denies offline execution, environment proxies, private DNS, and large responses", async () => {
    const fetcher = async () => new Response("oversized", { headers: { "content-length": "900000" } });
    expect(() =>
      fetchGeelarkDemoRegistryPackage("pkg", {}, {
        ...options(fetcher),
        networkMode: "offline-no-socket",
      }),
    ).toThrow("forbids network fetch");
    expect(() =>
      fetchGeelarkDemoRegistryPackage("pkg", {}, {
        ...options(fetcher),
        environment: { HTTPS_PROXY: "http://proxy.example" },
      }),
    ).toThrow("active proxy environment");
    await expect(
      fetchGeelarkDemoRegistryPackage("pkg", {}, {
        ...options(fetcher),
        resolver: async () => [
          { address: "127.0.0.1", family: 4, ttl: 0, source: "node-resolver" as const },
        ],
      }),
    ).rejects.toThrow();
    await expect(fetchGeelarkDemoRegistryPackage("pkg", {}, options(fetcher))).rejects.toThrow(
      "exceeds",
    );
  });
});
