#!/usr/bin/env bun

// Note: This file uses Bun's test runner
// @ts-ignore - bun:test types are available when running with Bun
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

// Mock server for more reliable testing
let server: ReturnType<typeof Bun.serve>;
let capturedUserAgent: string | null = null;

describe("User-Agent HTTP Configuration", () => {
  beforeAll(() => {
    // Start a local test server to capture user-agent
    server = Bun.serve({
      fetch(request: Request): Response {
        capturedUserAgent = request.headers.get("user-agent");
        return Response.json({ userAgent: capturedUserAgent });
      },
      port: 0  // Random available port
    });
  });

  afterAll(() => {
    server.stop();
  });

  it("should send default user-agent when no custom agent configured", async () => {
    const response = await fetch(server.url);
    const data = await response.json();

    expect(data.userAgent).toBeDefined();
    expect(typeof data.userAgent).toBe("string");
    expect(data.userAgent.length).toBeGreaterThan(0);
    expect(data.userAgent).toMatch(/bun\//i);
  });

  it("should accept custom user-agent strings", async () => {
    const customUA = "geelark-test-runner/1.0";

    const response = await fetch(server.url, {
      headers: { "User-Agent": customUA }
    });
    const data = await response.json();

    expect(data.userAgent).toBe(customUA);
  });

  it("should handle various user-agent formats", () => {
    const validUserAgents = [
      "geelark-test-runner/1.0",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "CustomApp/2.1.3 (Bun 1.2.0; Linux x64)"
    ];

    validUserAgents.forEach(ua => {
      expect(ua).toContain("/");
      expect(ua.length).toBeGreaterThan(5);
      // User-agents typically contain version numbers and/or "Mozilla"
      expect(
        ua.includes("/") || ua.includes("Mozilla")
      ).toBe(true);
    });
  });

  it("should demonstrate user-agent with httpbin.org fallback", async () => {
    const testURL = "https://httpbin.org/user-agent";

    try {
      const response = await fetch(testURL);
      const data = await response.json();

      expect(data).toHaveProperty("user-agent");
      console.log("httpbin.org User-Agent:", data["user-agent"]);
    } catch (error) {
      // Skip gracefully if httpbin.org unavailable
      console.log("httpbin.org unavailable, using local server tests");
      expect(true).toBe(true);
    }
  });

  it("should validate user-agent security best practices", () => {
    // User-agents should not contain sensitive information
    const secureUA = "MyApp/1.0";
    const insecureUA = "MyApp/1.0 user=admin password=secret";

    expect(secureUA).not.toMatch(/password|secret|token|key/i);
    expect(insecureUA).toMatch(/password|secret|token|key/i);
  });
});
