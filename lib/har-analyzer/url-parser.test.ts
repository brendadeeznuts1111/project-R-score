import { test, expect, describe } from "bun:test";
import { parseURL, MIME_MAP } from "./url-parser";

describe("parseURL", () => {
  test("basic HTTPS URL", () => {
    const p = parseURL("https://example.com/path?q=1#top");
    expect(p.scheme).toBe("https:");
    expect(p.host).toBe("example.com");
    expect(p.pathname).toBe("/path");
    expect(p.query).toBe("?q=1");
    expect(p.fragment.type).toBe("anchor");
    expect(p.fragment.content.anchor).toBe("top");
    expect(p.origin).toBe("https://example.com");
    expect(p.cacheKey).toBe("https://example.com/path?q=1");
    expect(p.isDataURI).toBe(false);
    expect(p.isBlob).toBe(false);
  });

  test("extension and mimeHint extraction", () => {
    expect(parseURL("https://cdn.io/app.js").extension).toBe(".js");
    expect(parseURL("https://cdn.io/app.js").mimeHint).toBe("application/javascript");
    expect(parseURL("https://cdn.io/style.css").mimeHint).toBe("text/css");
    expect(parseURL("https://cdn.io/img.png").mimeHint).toBe("image/png");
    expect(parseURL("https://cdn.io/font.woff2").mimeHint).toBe("font/woff2");
  });

  test("no extension yields empty mimeHint", () => {
    const p = parseURL("https://api.io/users/123");
    expect(p.extension).toBe("");
    expect(p.mimeHint).toBe("");
  });

  test("data: URI", () => {
    const p = parseURL("data:image/png;base64,abc123");
    expect(p.isDataURI).toBe(true);
    expect(p.scheme).toBe("data:");
    expect(p.mimeHint).toBe("image/png");
    expect(p.host).toBe("");
  });

  test("blob: URI", () => {
    const p = parseURL("blob:https://example.com/uuid-here");
    expect(p.isBlob).toBe(true);
    expect(p.isDataURI).toBe(false);
  });

  test("fragment is excluded from cacheKey", () => {
    const a = parseURL("https://x.com/page#section");
    const b = parseURL("https://x.com/page#other");
    expect(a.cacheKey).toBe(b.cacheKey);
  });

  test("route fragment integration", () => {
    const p = parseURL("https://app.io/#/dashboard/settings");
    expect(p.fragment.type).toBe("route");
    expect(p.fragment.content.route?.path).toBe("/dashboard/settings");
  });

  test("case-insensitive extension matching", () => {
    expect(parseURL("https://x.com/FILE.JS").extension).toBe(".js");
    expect(parseURL("https://x.com/FILE.JS").mimeHint).toBe("application/javascript");
  });
});

describe("MIME_MAP", () => {
  test("is exported and has expected entries", () => {
    expect(MIME_MAP[".js"]).toBe("application/javascript");
    expect(MIME_MAP[".wasm"]).toBe("application/wasm");
    expect(Object.keys(MIME_MAP).length).toBeGreaterThanOrEqual(28);
  });
});
