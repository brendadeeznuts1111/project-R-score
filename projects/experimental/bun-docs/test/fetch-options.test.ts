import { describe, test, expect } from "bun:test";
import { buildBunFetchOptions, type BunFetchOptionsInput } from "../src/lib/fetch-options.ts";

describe("buildBunFetchOptions", () => {
  test("returns basic headers with default User-Agent", async () => {
    const opts = await buildBunFetchOptions();
    expect(opts.headers["User-Agent"]).toBe("BunDocs/1.0 (+https://github.com/bun-docs)");
    expect(opts.headers["Accept"]).toContain("text/plain");
    expect(opts.verbose).toBeUndefined();
    expect(opts.proxy).toBeUndefined();
  });

  test("applies verbose and proxy flags", async () => {
    const opts = await buildBunFetchOptions({ verbose: true, proxy: "http://proxy:3128" });
    expect(opts.verbose).toBe(true);
    expect(opts.proxy).toBe("http://proxy:3128");
  });

  test("builds TLS options when insecure is set", async () => {
    const opts = await buildBunFetchOptions({ insecure: true });
    expect(opts.tls).toBeDefined();
    expect(opts.tls.rejectUnauthorized).toBe(false);
  });

  test("supports custom User-Agent and Accept", async () => {
    const opts = await buildBunFetchOptions({
      userAgent: "CustomBot/1.0",
      accept: "application/json",
    });
    expect(opts.headers["User-Agent"]).toBe("CustomBot/1.0");
    expect(opts.headers["Accept"]).toBe("application/json");
  });

  test("does not include tls key when no TLS options provided", async () => {
    const opts = await buildBunFetchOptions({ verbose: true });
    expect(opts.tls).toBeUndefined();
  });
});

import { isBundlerRelated, parseLlmsTxt } from "../src/lib/llms-parser.ts";
import type { DocPage } from "../src/types/doc.ts";

describe("isBundlerRelated", () => {
  test("detects bundler category from URL", () => {
    expect(isBundlerRelated("Bytecode", "https://bun.com/docs/bundler/bytecode.md", "")).toBe(true);
  });

  test("detects from known keywords in title/description", () => {
    expect(isBundlerRelated("Macros", "https://bun.com/docs/...", "Bun macros for compile-time JS")).toBe(true);
  });

  test("detects 'bun build' and 'sourcemap'", () => {
    expect(isBundlerRelated("Build API", "https://...", "Learn about bun build and sourcemap")).toBe(true);
  });

  test("returns false for runtime-only pages", () => {
    expect(isBundlerRelated("Streams", "https://bun.com/docs/runtime/streams.md", "Node.js streams in Bun")).toBe(false);
  });

  test("respects explicit category", () => {
    expect(isBundlerRelated("Foo", "https://...", "", "Bundler")).toBe(true);
  });
});

describe("parseLlmsTxt", () => {
  const sampleMarkdown = `
## Runtime
### Streams
- [Streams](https://bun.com/docs/runtime/streams.md): ReadableStream and WritableStream in Bun

## Bundler
### Loaders
- [Loaders](https://bun.com/docs/bundler/loaders.md): Built-in loaders for TypeScript, JSX, etc.
- [CSS](https://bun.com/docs/bundler/css.md): Bun's bundler has built-in support for CSS

## CLI
- [bun build](https://bun.com/docs/cli/build.md): Bundle your code with bun build
`;

  test("parses categories, subcategories and pages correctly", () => {
    const pages = parseLlmsTxt(sampleMarkdown);
    expect(pages.length).toBe(4);

    expect(pages[0].category).toBe("Runtime");
    expect(pages[0].subcategory).toBe("Streams");
    expect(pages[0].title).toBe("Streams");
    expect(pages[0].isBundlerRelated).toBe(false);

    expect(pages[1].category).toBe("Bundler");
    expect(pages[1].subcategory).toBe("Loaders");
    expect(pages[1].isBundlerRelated).toBe(true);

    expect(pages[3].title).toBe("bun build");
    expect(pages[3].isBundlerRelated).toBe(true);
  });

  test("handles missing description gracefully", () => {
    const md = "## Test\n- [Page](https://bun.com/docs/test/page.md)";
    const pages = parseLlmsTxt(md);
    expect(pages[0].description).toBeUndefined();
  });

  test("returns empty array for empty input", () => {
    expect(parseLlmsTxt("")).toEqual([]);
    expect(parseLlmsTxt("   \n\n  ")).toEqual([]);
  });

  test("parses realistic Bun documentation markdown (File Types section)", () => {
    // Properly formatted sample matching the llms.txt structure (inspired by real Bun docs)
    const realWorldMarkdown = `
## File Types

> File types and loaders supported by Bun's bundler and runtime

## Built-in loaders

### js

- [js loader](https://bun.com/docs/bundler/loaders#js): Default for .cjs and .mjs

### json

- [json loader](https://bun.com/docs/bundler/loaders#json): JSON loader. Default for .json

### toml

- [toml loader](https://bun.com/docs/bundler/loaders#toml): TOML loader. Default for .toml

### yaml

- [yaml loader](https://bun.com/docs/bundler/loaders#yaml): YAML loader. Default for .yaml and .yml

### text

- [text loader](https://bun.com/docs/bundler/loaders#text): Text loader. Default for .txt

### file

- [file loader](https://bun.com/docs/bundler/loaders#file): File loader for unrecognized types
`;

    const pages = parseLlmsTxt(realWorldMarkdown);

    expect(pages.length).toBeGreaterThanOrEqual(6);

    const jsonLoader = pages.find(p => p.title === "json loader");
    expect(jsonLoader?.category).toBe("Built-in loaders");
    expect(jsonLoader?.subcategory).toBe("json");
    expect(jsonLoader?.isBundlerRelated).toBe(true);

    const fileLoader = pages.find(p => p.title === "file loader");
    expect(fileLoader?.isBundlerRelated).toBe(true);
  });

  test("parses Content-Type handling documentation", () => {
    const contentTypeMarkdown = `
## Runtime
### Fetch

- [Content-Type handling](https://bun.com/docs/runtime/networking/fetch#content-type-handling): Bun automatically sets the Content-Type header for request bodies when not explicitly provided
- [Blob Content-Type](https://bun.com/docs/runtime/networking/fetch#blob): For Blob objects, uses the blob’s type
- [FormData Content-Type](https://bun.com/docs/runtime/networking/fetch#formdata): For FormData, sets appropriate multipart boundary
`;

    const pages = parseLlmsTxt(contentTypeMarkdown);

    expect(pages.length).toBe(3);

    const mainPage = pages.find(p => p.title === "Content-Type handling");
    expect(mainPage?.category).toBe("Runtime");
    expect(mainPage?.subcategory).toBe("Fetch");
    expect(mainPage?.description).toContain("Bun automatically sets the Content-Type header");

    const blobPage = pages.find(p => p.title === "Blob Content-Type");
    expect(blobPage?.isBundlerRelated).toBe(false);
  });
});