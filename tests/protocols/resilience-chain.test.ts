import { describe, expect, test } from "bun:test";
import {
  ProtocolChainExhaustedError,
  ProtocolResilienceChain,
  SecurityError,
} from "../../protocols/resilience-chain";

describe("ProtocolResilienceChain", () => {
  test("falls back from https to http and records metrics", async () => {
    let attempts = 0;
    const chain = new ProtocolResilienceChain({
      fetchImpl: async (input) => {
        const url = String(input);
        attempts++;
        if (url.startsWith("https://")) {
          throw new Error("https down");
        }
        return new Response("ok", {
          status: 200,
          headers: { "content-length": "2" },
        });
      },
    });

    const response = await chain.fetchWithFallback("https://example.com/path");
    expect(response.status).toBe(200);
    expect(attempts).toBe(2);

    const httpsMetrics = chain.getMetrics("https:");
    const httpMetrics = chain.getMetrics("http:");
    if (!(httpsMetrics instanceof Map) && !(httpMetrics instanceof Map)) {
      expect(httpsMetrics.failures).toBeGreaterThanOrEqual(1);
      expect(httpMetrics.successes).toBeGreaterThanOrEqual(1);
      expect(httpMetrics.totalBytes).toBeGreaterThanOrEqual(2);
    }
  });

  test("blocks insecure file fallback path", async () => {
    const original = process.env.PROTOCOL_LOCAL_PATH;
    process.env.PROTOCOL_LOCAL_PATH = "/tmp";
    try {
      const chain = new ProtocolResilienceChain({
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.startsWith("https://") || url.startsWith("http://")) {
            throw new Error("network unavailable");
          }
          return new Response("ok");
        },
      });
      await expect(chain.fetchWithFallback("https://example.com/etc/passwd")).rejects.toBeInstanceOf(
        ProtocolChainExhaustedError
      );
      const fileMetrics = chain.getMetrics("file:");
      if (!(fileMetrics instanceof Map)) {
        expect(fileMetrics.failures).toBeGreaterThanOrEqual(1);
        const errorHit = fileMetrics.samples.some((sample) =>
          (sample.error || "").includes("Blocked by security scanner") ||
          (sample.error || "").includes("File access outside secure base")
        );
        expect(errorHit).toBe(true);
      }
    } finally {
      if (original === undefined) {
        delete process.env.PROTOCOL_LOCAL_PATH;
      } else {
        process.env.PROTOCOL_LOCAL_PATH = original;
      }
    }
  });

  test("throws security error on direct scanner use", async () => {
    const chain = new ProtocolResilienceChain({
      fetchImpl: async () => new Response("ok"),
    });
    const scanner = (chain as any).securityScanner as {
      scan: (protocol: string, url: URL) => Promise<void>;
    };
    await expect(scanner.scan("http:", new URL("http://example.com/../../etc/passwd"))).rejects.toBeInstanceOf(
      SecurityError
    );
  });
});
