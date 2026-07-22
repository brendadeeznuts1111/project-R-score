#!/usr/bin/env bun
/**
 * Sources Audit — verify thumbnail cache + /thumbs/:site endpoint
 *
 * Hits the mega‑liner v7 health endpoint and thumbnail endpoints,
 * reports on cache state, image sizes, and HTTP headers.
 *
 * Usage:
 *   bun run sources:audit
 *   bun run sources:audit --thumbs            (verbose thumbnail details)
 *   bun run sources:audit --url=http://localhost:3001
 */

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const BASE = args.find(a => a.startsWith("--url="))?.split("=")[1] ?? "http://localhost:3001";
const VERBOSE = args.includes("--thumbs") || args.includes("-v");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const gray = (s: string) => `\x1b[90m${s}\x1b[0m`;
const ok = (b: boolean) => b ? green("✔") : red("✘");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("");
console.log(bold("Sources Audit — Thumbnail Cache"));
console.log(gray(`  Base: ${BASE}`));
console.log("");

let failures = 0;

// 1. Health check
try {
  const res = await fetch(`${BASE}/health`);
  const health = await res.json();
  console.log(`${ok(res.ok)} Health:  ${gray(JSON.stringify(health))}`);
  if (!res.ok) failures++;
} catch (err: any) {
  console.log(`${red("✘")} Health:  ${red("unreachable — " + err.message)}`);
  failures++;
}

// 2. Thumbnail cache check
const testSites = ["demo", "nonexistent"];
for (const site of testSites) {
  try {
    const res = await fetch(`${BASE}/thumbs/${site}.jpg`);
    const size = parseInt(res.headers.get("content-length") ?? "0", 10);
    const type = res.headers.get("content-type") ?? "unknown";
    const cache = res.headers.get("cache-control") ?? "none";
    const expect404 = site === "nonexistent";

    const passed = expect404 ? res.status === 404 : res.status === 200;
    const status = `${res.status} ${size}B ${type}`;

    const icon = passed ? green("✔") : red("✘");
    console.log(
      `${icon} /thumbs/${site}.jpg → ${gray(status)} ${gray(`cache: ${cache}`)}`
    );

    if (VERBOSE && passed && res.status === 200) {
      const buf = await res.arrayBuffer();
      // Verify JPEG magic bytes
      const magic = new Uint8Array(buf).slice(0, 2);
      const isJpeg = magic[0] === 0xff && magic[1] === 0xd8;
      const w = res.headers.get("x-image-width") ?? "?";
      const h = res.headers.get("x-image-height") ?? "?";
      const fmt = res.headers.get("x-image-format") ?? "?";
      const test003 = res.headers.get("x-test-003") ?? "?";
      console.log(
        `   ${gray(`JPEG magic: ${isJpeg ? "✔ FF D8" : "✘ invalid"}`)}  |  ` +
          `${gray(`${buf.byteLength} bytes`)}  |  ` +
          `${gray(`meta ${w}×${h} ${fmt}`)}  |  ` +
          `${gray(`TEST-003=${test003}`)}`,
      );
    }

    if (!passed) failures++;
  } catch (err: any) {
    console.log(`${red("✘")} /thumbs/${site}.jpg → ${red(err.message)}`);
    failures++;
  }
}

// 3. Screenshot JSON endpoint (Bun.Image metadata + TEST-003)
for (const site of testSites) {
  try {
    const res = await fetch(`${BASE}/screenshot/${site}`);
    const expect404 = site === "nonexistent";
    const passed = expect404 ? res.status === 404 : res.status === 200;
    const icon = passed ? green("✔") : red("✘");

    if (res.status === 200) {
      const body = (await res.json()) as {
        metadata?: { width?: number; height?: number; format?: string; size?: number };
        test003?: { status?: string; code?: string };
      };
      const meta = body.metadata;
      console.log(
        `${icon} /screenshot/${site} → ${gray(
          `${res.status} ${meta?.width ?? "?"}×${meta?.height ?? "?"} ${meta?.format ?? "?"} ` +
            `${meta?.size ?? "?"}B TEST-003=${body.test003?.status ?? "?"}`,
        )}`,
      );
      if (!meta?.width || !body.test003?.code) {
        failures++;
      }
    } else {
      console.log(`${icon} /screenshot/${site} → ${gray(String(res.status))}`);
    }

    if (!passed) failures++;
  } catch (err: any) {
    console.log(`${red("✘")} /screenshot/${site} → ${red(err.message)}`);
    failures++;
  }
}

// 4. Report endpoint
try {
  const res = await fetch(`${BASE}/report`);
  const md = await res.text();
  const lines = md.split("\n").filter(l => l.startsWith("|") || l.startsWith("**"));
  console.log("");
  console.log(gray("--- Report preview ---"));
  for (const line of lines.slice(0, 8)) {
    console.log(gray(`  ${line}`));
  }
  if (!res.ok) failures++;
} catch (err: any) {
  console.log(`${red("✘")} Report: ${red(err.message)}`);
  failures++;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("");
if (failures === 0) {
  console.log(green("✔ Audit passed — 0 failures"));
} else {
  console.log(red(`✘ Audit failed — ${failures} failure(s)`));
}
console.log("");

process.exit(failures > 0 ? 1 : 0);
