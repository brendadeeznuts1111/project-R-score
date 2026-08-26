import { describe, expect, test } from "bun:test";
import type { OutboundFetch } from "../../../../../../lib/http/outbound-policy.ts";
import { fetchTomlIntegration, fetchTomlRegistry } from "../../integrations/outbound-client.ts";

const publicResolver = async () => [
  { address: "93.184.216.34", family: 4 as const, ttl: 60, source: "node-resolver" as const },
];

function harness(response: () => Response = () => new Response("ok")) {
  const calls: Array<{ input: string; init?: BunFetchRequestInit }> = [];
  const fetcher: OutboundFetch = async (input, init) => {
    calls.push({ input: input.toString(), init });
    return response();
  };
  return { calls, fetcher, resolver: publicResolver, environment: {} };
}

describe("TOML CLI integration outbound authority", () => {
  test("allows only a catalogued route with owned request controls", async () => {
    const testHarness = harness();
    await fetchTomlIntegration(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1",
      { headers: { Authorization: "Bearer scoped" } },
      testHarness,
    );
    expect(testHarness.calls).toHaveLength(1);
    expect(testHarness.calls[0]?.init?.method).toBe("GET");
    expect(testHarness.calls[0]?.init?.redirect).toBe("error");
    expect(testHarness.calls[0]?.init?.credentials).toBe("omit");
    expect((testHarness.calls[0]?.init as Record<string, unknown>).protocol).toBeUndefined();
  });

  test("resolves overlapping read and mutation paths by exact method", async () => {
    const testHarness = harness();
    const requests = [
      ["https://gmail.googleapis.com/gmail/v1/users/me/messages/send", "POST"],
      ["https://graph.microsoft.com/v1.0/me/messages/message_1", "PATCH"],
      ["https://api.twilio.com/2010-04-01/Accounts/AC1/Messages/SM1.json", "DELETE"],
    ] as const;
    for (const [url, method] of requests) {
      await fetchTomlIntegration(url, {
        method,
        headers: { Authorization: "Bearer scoped" },
      }, testHarness);
    }
    expect(testHarness.calls.map(call => call.init?.method)).toEqual(["POST", "PATCH", "DELETE"]);
  });

  test("denies unknown origins, paths, methods, and ambient credentials", () => {
    const options = harness();
    expect(() => fetchTomlIntegration("https://attacker.example/token", {}, options))
      .toThrow("not in the integration catalog");
    expect(() => fetchTomlIntegration("https://api.sendgrid.com/v3/user/profile", {}, options))
      .toThrow("not in the integration catalog");
    expect(() => fetchTomlIntegration(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      { method: "DELETE", headers: { Authorization: "Bearer scoped" } },
      options,
    )).toThrow("method DELETE is not allowed");
    expect(() => fetchTomlIntegration(
      "https://oauth2.googleapis.com/token",
      { method: "POST", headers: { Cookie: "ambient=secret" } },
      options,
    )).toThrow("credentials are forbidden");
    expect(options.calls).toHaveLength(0);
  });

  test("denies proxy, protocol, redirect, offline, and private DNS before fetch", async () => {
    const options = harness();
    const url = "https://api.sendgrid.com/v3/mail/send";
    expect(() => fetchTomlIntegration(url, {
      method: "POST",
      headers: { Authorization: "Bearer scoped" },
      proxy: "https://proxy.example",
    } as BunFetchRequestInit, options)).toThrow("proxy cannot override");
    expect(() => fetchTomlIntegration(url, {
      method: "POST",
      headers: { Authorization: "Bearer scoped" },
      protocol: "http2",
    }, options)).toThrow("protocol h2 is not allowed");
    expect(() => fetchTomlIntegration(url, {
      method: "POST",
      headers: { Authorization: "Bearer scoped" },
      redirect: "follow",
    }, options)).toThrow("redirect mode cannot override");
    expect(() => fetchTomlIntegration(url, {
      method: "POST",
      headers: { Authorization: "Bearer scoped" },
    }, { ...options, networkMode: "offline-no-socket" })).toThrow("forbids network fetch");
    await expect(fetchTomlIntegration(url, {
      method: "POST",
      headers: { Authorization: "Bearer scoped" },
    }, {
      ...options,
      resolver: async () => [
        { address: "127.0.0.1", family: 4, ttl: 0, source: "node-resolver" },
      ],
    })).rejects.toThrow();
    expect(options.calls).toHaveLength(0);
  });

  test("rejects active proxy environments and oversized responses", async () => {
    const url = "https://api.sendgrid.com/v3/mail/send";
    const proxied = harness();
    expect(() => fetchTomlIntegration(url, {
      method: "POST",
      headers: { Authorization: "Bearer scoped" },
    }, { ...proxied, environment: { HTTPS_PROXY: "https://proxy.example" } }))
      .toThrow("blocked by active proxy");
    const bounded = harness(() => new Response("large", { headers: { "content-length": "4000001" } }));
    await expect(fetchTomlIntegration(url, {
      method: "POST",
      headers: { Authorization: "Bearer scoped" },
    }, bounded)).rejects.toThrow("exceeds 4000000 bytes");
  });
});

describe("TOML CLI registry outbound authority", () => {
  test("allows exact metadata and loopback health routes", async () => {
    const publicHarness = harness();
    await fetchTomlRegistry(
      "https://registry.example/team/%40scope%2fpkg",
      "https://registry.example/team",
      { method: "GET", headers: { Authorization: "Bearer scoped" } },
      publicHarness,
    );
    expect(publicHarness.calls).toHaveLength(1);
    const loopbackHarness = harness();
    await fetchTomlRegistry("http://127.0.0.1:3000/", "http://127.0.0.1:3000/", { method: "HEAD" }, loopbackHarness);
    expect(loopbackHarness.calls).toHaveLength(1);
  });

  test("denies insecure public, escaped base, arbitrary depth, and writes", () => {
    const options = harness();
    expect(() => fetchTomlRegistry("http://registry.example/pkg", "http://registry.example", { method: "GET" }, options))
      .toThrow("public HTTPS or loopback HTTP");
    expect(() => fetchTomlRegistry("https://registry.example/other/pkg", "https://registry.example/team", { method: "GET" }, options))
      .toThrow("configured base URL");
    expect(() => fetchTomlRegistry("https://registry.example/team/pkg/version", "https://registry.example/team", { method: "GET" }, options))
      .toThrow("exact health or package-metadata route");
    expect(() => fetchTomlRegistry("https://registry.example/team/pkg", "https://registry.example/team", { method: "PUT" }, options))
      .toThrow("exact health or package-metadata route");
    expect(options.calls).toHaveLength(0);
  });
});
