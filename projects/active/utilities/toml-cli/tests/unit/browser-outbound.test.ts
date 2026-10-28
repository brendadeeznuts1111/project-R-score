import { describe, expect, test } from "bun:test";
import { postBrowserTelemetry, type BrowserFetch } from "../../src/browser-outbound.ts";

describe("TOML CLI browser telemetry authority", () => {
  test("owns the exact endpoint and request controls", async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const fetcher: BrowserFetch = async (input, init) => {
      calls.push({ input: input.toString(), init });
      return new Response("ignored");
    };
    const response = await postBrowserTelemetry("errors", "{}", { fetcher });
    expect(calls[0]?.input).toBe("https://monitoring.quantumnavigator.io/errors");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.credentials).toBe("omit");
    expect(calls[0]?.init?.redirect).toBe("error");
    expect(calls[0]?.init?.keepalive).toBe(true);
    expect(response.bodyUsed).toBe(true);
  });

  test("fails before transport for offline and unknown routes", () => {
    let calls = 0;
    const fetcher: BrowserFetch = async () => {
      calls += 1;
      return new Response();
    };
    expect(() => postBrowserTelemetry("violations", "{}", {
      fetcher,
      networkMode: "offline-no-socket",
    })).toThrow("disabled offline");
    expect(() => postBrowserTelemetry("other" as never, "{}", { fetcher }))
      .toThrow("Unknown TOML CLI browser telemetry route");
    expect(calls).toBe(0);
  });
});
