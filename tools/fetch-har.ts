#!/usr/bin/env bun
// tools/fetch-har.ts — Fetch a URL and its subresources, output a HAR file
//
// Usage:
//   bun fetch-har.ts <url> [output.har] [--verbose] [--no-prefetch] [--dns-ttl <seconds>]

import { dns } from "bun";

const args = process.argv.slice(2);
const flags = {
  url: "",
  outFile: "",
  verbose: false,
  prefetch: true,
  dnsTtl: 0, // 0 = use Bun default (30s)
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--verbose":
      flags.verbose = true;
      break;
    case "--no-prefetch":
      flags.prefetch = false;
      break;
    case "--dns-ttl":
      flags.dnsTtl = Number(args[++i]);
      break;
    default:
      if (!args[i].startsWith("--")) {
        if (!flags.url) flags.url = args[i];
        else if (!flags.outFile) flags.outFile = args[i];
      }
  }
}

if (!flags.url) {
  console.error(
    "Usage: bun fetch-har.ts <url> [output.har] [--verbose] [--no-prefetch] [--dns-ttl <seconds>]",
  );
  process.exit(1);
}

// Set DNS cache TTL via BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS
// Must be set before any fetches happen
if (flags.dnsTtl > 0) {
  process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS = String(flags.dnsTtl);
}

if (!flags.outFile) {
  const hostname = new URL(flags.url).hostname.replace(/\./g, "-");
  flags.outFile = `${hostname}.har`;
}

const toStdout = flags.outFile === "-";
// When piping HAR to stdout, send progress to stderr so stdout is pure JSON
const log = toStdout
  ? (...a: unknown[]) => console.error(...a)
  : (...a: unknown[]) => console.log(...a);

interface Entry {
  url: string;
  method: string;
  status: number;
  statusText: string;
  mimeType: string;
  contentEncoding: string;
  size: number;
  transferSize: number;
  startTime: number;
  totalTime: number;
  waitTime: number;
  receiveTime: number;
  responseHeaders: { name: string; value: string }[];
  requestHeaders: { name: string; value: string }[];
  resourceType: string;
  httpVersion: string;
}

async function timedFetch(
  targetUrl: string,
  resourceType: string,
): Promise<Entry | null> {
  try {
    // First fetch: decompress=false to get real wire size
    const start = performance.now();
    const rawRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br, zstd",
      },
      redirect: "follow",
      decompress: false,
      verbose: flags.verbose,
    });
    const waitDone = performance.now();
    const rawBody = await rawRes.arrayBuffer();
    const end = performance.now();

    const transferSize = rawBody.byteLength;
    const contentEncoding =
      rawRes.headers.get("content-encoding") || "identity";

    // Second fetch: normal (decompressed) to get real content size
    const decompRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br, zstd",
      },
      redirect: "follow",
    });
    const decompBody = await decompRes.arrayBuffer();
    const size = decompBody.byteLength;

    const responseHeaders = [...rawRes.headers.entries()].map(
      ([name, value]) => ({ name, value }),
    );

    // HTTPS → HTTP/2 via ALPN negotiation; plain HTTP → HTTP/1.1
    const httpVersion = targetUrl.startsWith("https:") ? "http/2.0" : "http/1.1";

    return {
      url: targetUrl,
      method: "GET",
      status: rawRes.status,
      statusText: rawRes.statusText,
      mimeType: rawRes.headers.get("content-type") || "application/octet-stream",
      contentEncoding,
      size,
      transferSize,
      startTime: start,
      totalTime: end - start,
      waitTime: waitDone - start,
      receiveTime: end - waitDone,
      responseHeaders,
      requestHeaders: [],
      resourceType,
      httpVersion,
    };
  } catch (e) {
    console.error(`  Failed: ${targetUrl} — ${e}`);
    return null;
  }
}

function guessType(_tag: string, mime: string): string {
  if (mime.includes("html")) return "document";
  if (mime.includes("javascript")) return "script";
  if (mime.includes("css")) return "stylesheet";
  if (mime.includes("image")) return "image";
  if (mime.includes("font")) return "font";
  if (mime.includes("json")) return "xhr";
  return "other";
}

function guessTypeFromTag(tag: string): string {
  if (tag === "link") return "stylesheet";
  if (tag === "script") return "script";
  if (tag === "img") return "image";
  if (tag === "media") return "media";
  if (tag === "preload") return "other";
  if (tag === "iframe") return "document";
  if (tag === "css-url") return "other";
  if (tag === "manifest") return "other";
  return "other";
}

function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function prefetchUrl(urlStr: string) {
  try {
    const u = new URL(urlStr);
    const port = u.port ? Number(u.port) : u.protocol === "https:" ? 443 : 80;
    dns.prefetch(u.hostname, port);
    return { hostname: u.hostname, port };
  } catch {
    return null;
  }
}

log(`Fetching ${flags.url} ...`);

// --- DNS prefetch for the main host ---
const main = prefetchUrl(flags.url);
if (flags.verbose && main)
  log(`  dns.prefetch("${main.hostname}", ${main.port})`);

// 1. Fetch main document
const docEntry = await timedFetch(flags.url, "document");
if (!docEntry) {
  console.error("Failed to fetch document");
  process.exit(1);
}

// Get decompressed HTML for parsing
const html = await (await fetch(flags.url)).text();
const ratio =
  docEntry.transferSize > 0
    ? ((1 - docEntry.transferSize / docEntry.size) * 100).toFixed(0)
    : "0";
log(
  `  Document: ${docEntry.status} — ${(docEntry.size / 1024).toFixed(1)}KB (${(docEntry.transferSize / 1024).toFixed(1)}KB on wire, ${docEntry.contentEncoding}, ${ratio}% saved) in ${docEntry.totalTime.toFixed(0)}ms`,
);

// 2. Extract subresource URLs from HTML
const subresources: { url: string; tag: string }[] = [];

function addSub(href: string, tag: string) {
  if (!href || href.startsWith("data:") || href.startsWith("javascript:")) return;
  const resolved = resolveUrl(flags.url, href);
  if (resolved) subresources.push({ url: resolved, tag });
}

// <link> — stylesheets, preloads, icons, manifests
for (const m of html.matchAll(/<link\s[^>]*>/gi)) {
  const tag = m[0];
  const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
  if (!href) continue;
  const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
  if (rel.includes("stylesheet")) addSub(href, "link");
  else if (rel.includes("preload") || rel.includes("modulepreload")) addSub(href, "preload");
  else if (rel.includes("icon")) addSub(href, "img");
  else if (rel.includes("manifest")) addSub(href, "manifest");
}

// <script src>
for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
  addSub(m[1], "script");
}

// <img src> and <img srcset>
for (const m of html.matchAll(/<img\s[^>]*>/gi)) {
  const tag = m[0];
  const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
  if (src) addSub(src, "img");
  const srcset = tag.match(/srcset=["']([^"']+)["']/i)?.[1];
  if (srcset) {
    for (const entry of srcset.split(",")) {
      const url = entry.trim().split(/\s+/)[0];
      if (url) addSub(url, "img");
    }
  }
}

// <source src> and <source srcset> (inside <video>, <audio>, <picture>)
for (const m of html.matchAll(/<source\s[^>]*>/gi)) {
  const tag = m[0];
  const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
  if (src) addSub(src, "media");
  const srcset = tag.match(/srcset=["']([^"']+)["']/i)?.[1];
  if (srcset) {
    for (const entry of srcset.split(",")) {
      const url = entry.trim().split(/\s+/)[0];
      if (url) addSub(url, "img");
    }
  }
}

// <video src> and <video poster>
for (const m of html.matchAll(/<video\s[^>]*>/gi)) {
  const tag = m[0];
  const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1];
  if (src) addSub(src, "media");
  const poster = tag.match(/poster=["']([^"']+)["']/i)?.[1];
  if (poster) addSub(poster, "img");
}

// <audio src>
for (const m of html.matchAll(/<audio[^>]+src=["']([^"']+)["']/gi)) {
  addSub(m[1], "media");
}

// <iframe src>
for (const m of html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)) {
  addSub(m[1], "iframe");
}

// <object data>
for (const m of html.matchAll(/<object[^>]+data=["']([^"']+)["']/gi)) {
  addSub(m[1], "object");
}

// <embed src>
for (const m of html.matchAll(/<embed[^>]+src=["']([^"']+)["']/gi)) {
  addSub(m[1], "embed");
}

// CSS url() in inline <style> blocks
for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
  for (const u of m[1].matchAll(/url\(["']?([^"')]+)["']?\)/gi)) {
    addSub(u[1], "css-url");
  }
}

// Dedupe
const seen = new Set<string>([flags.url]);
const unique = subresources.filter((s) => {
  if (seen.has(s.url)) return false;
  seen.add(s.url);
  return true;
});

// Breakdown by tag type
const tagCounts = new Map<string, number>();
for (const s of unique) tagCounts.set(s.tag, (tagCounts.get(s.tag) ?? 0) + 1);
const tagLine = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t}(${c})`).join(" ");
log(`  Found ${unique.length} subresources: ${tagLine}`);

// 3. DNS prefetch all unique hosts before fetching
if (flags.prefetch && unique.length > 0) {
  const prefetched = new Set<string>();
  for (const s of unique) {
    try {
      const u = new URL(s.url);
      const key = `${u.hostname}:${u.port || (u.protocol === "https:" ? 443 : 80)}`;
      if (!prefetched.has(key)) {
        prefetched.add(key);
        const info = prefetchUrl(s.url);
        if (flags.verbose && info)
          log(`  dns.prefetch("${info.hostname}", ${info.port})`);
      }
    } catch {}
  }

  log(`  Prefetched DNS for ${prefetched.size} host(s)`);

  // Small delay to let DNS lookups resolve before hammering requests
  await Bun.sleep(50);
}

// 4. Fetch all subresources — let Bun manage concurrency (default 256 max)
log(`  Fetching subresources...`);
const entries: Entry[] = [docEntry];
const results = await Promise.all(
  unique.map((s) => timedFetch(s.url, guessTypeFromTag(s.tag))),
);
for (const r of results) {
  if (r) {
    // Override type guess with actual mime
    r.resourceType = guessType("", r.mimeType);
    entries.push(r);
  }
}

log(`  Fetched ${entries.length} total resources`);

// DNS cache stats
const c = dns.getCacheStats();
const hitRate = c.totalCount > 0 ? ((c.cacheHitsCompleted + c.cacheHitsInflight) / c.totalCount * 100).toFixed(0) : "0";
const ttl = flags.dnsTtl > 0 ? flags.dnsTtl : 30;
log(
  `  DNS: ${c.totalCount} lookups, ${c.cacheHitsCompleted} cache hits, ${c.cacheHitsInflight} inflight hits, ${c.cacheMisses} misses (${hitRate}% hit rate)${c.errors > 0 ? `, ${c.errors} errors` : ""} [${c.size} cached, ${ttl}s TTL]`,
);

// 5. Build HAR
const epoch = Math.min(...entries.map((e) => e.startTime));
const pageStart = new Date().toISOString();
const totalPageTime =
  Math.max(...entries.map((e) => e.startTime + e.totalTime)) - epoch;

const har = {
  log: {
    version: "1.2",
    creator: { name: "bun-har-fetcher", version: "2.0" },
    pages: [
      {
        startedDateTime: pageStart,
        id: "page_1",
        title: flags.url,
        pageTimings: {
          onContentLoad: docEntry.totalTime,
          onLoad: totalPageTime,
        },
      },
    ],
    entries: entries.map((e) => ({
      cache: {},
      _resourceType: e.resourceType,
      _contentEncoding: e.contentEncoding,
      startedDateTime: new Date(
        Date.now() - (performance.now() - e.startTime),
      ).toISOString(),
      time: e.totalTime,
      request: {
        method: e.method,
        url: e.url,
        httpVersion: e.httpVersion,
        headers: e.requestHeaders,
        queryString: [],
        cookies: [],
        headersSize: -1,
        bodySize: 0,
      },
      response: {
        status: e.status,
        statusText: e.statusText,
        httpVersion: e.httpVersion,
        headers: e.responseHeaders,
        cookies: [],
        content: { size: e.size, mimeType: e.mimeType },
        redirectURL: "",
        headersSize: -1,
        bodySize: 0,
        _transferSize: e.transferSize,
      },
      timings: {
        blocked: 1,
        dns: -1,
        ssl: -1,
        connect: -1,
        send: 0.5,
        wait: e.waitTime,
        receive: e.receiveTime,
      },
    })),
  },
};

const harJson = JSON.stringify(har, null, 2);
if (toStdout) {
  // When piping, log goes to stderr so stdout is pure JSON
  await Bun.write(Bun.stdout, harJson);
} else {
  await Bun.write(flags.outFile, harJson);
  log(`  Wrote ${flags.outFile}`);
}

// Summary
const totalTransfer = entries.reduce((s, e) => s + e.transferSize, 0);
const totalSize = entries.reduce((s, e) => s + e.size, 0);
const overallRatio =
  totalSize > 0 ? ((1 - totalTransfer / totalSize) * 100).toFixed(0) : "0";
log(
  `  Total: ${(totalSize / 1024).toFixed(0)}KB uncompressed, ${(totalTransfer / 1024).toFixed(0)}KB on wire (${overallRatio}% compression savings)`,
);
