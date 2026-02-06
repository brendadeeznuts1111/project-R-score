#!/usr/bin/env bun

// HAR file parser — reads .har files and prints useful summaries
// Usage:
//   bun tools/har-parser.ts <file.har> [options]
//
// Options:
//   --slow <ms>       Highlight requests slower than <ms> (default: 500)
//   --status <code>   Filter by HTTP status code
//   --type <type>     Filter by resource type (document, script, stylesheet, image, xhr, fetch, font, other)
//   --domain <host>   Filter by domain
//   --sort <field>    Sort by: time, size, status, url, ttfb, domain (default: time-order)
//   --waterfall       Show ASCII waterfall chart
//   --json            Output as JSON

interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: { name: string; value: string }[];
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    headers: { name: string; value: string }[];
    content: { size: number; mimeType: string };
    _transferSize?: number;
  };
  timings: {
    blocked: number;
    dns: number;
    ssl: number;
    connect: number;
    send: number;
    wait: number;
    receive: number;
  };
  serverIPAddress?: string;
  _resourceType?: string;
  _contentEncoding?: string;
  cache: Record<string, unknown>;
}

interface HarLog {
  log: {
    version: string;
    creator: { name: string; version: string };
    pages?: {
      startedDateTime: string;
      id: string;
      title: string;
      pageTimings: { onContentLoad: number; onLoad: number };
    }[];
    entries: HarEntry[];
  };
}

// --- Formatting helpers ---

function fmtMs(ms: number): string {
  if (ms < 0) return "—";
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtBytes(bytes: number): string {
  if (bytes < 0) return "—";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function statusColor(status: number): string {
  if (status < 200) return `\x1b[36m${status}\x1b[0m`;
  if (status < 300) return `\x1b[32m${status}\x1b[0m`;
  if (status < 400) return `\x1b[33m${status}\x1b[0m`;
  return `\x1b[31m${status}\x1b[0m`;
}

function shortenUrl(url: string, max = 60): string {
  try {
    const u = new URL(url);
    let path = u.pathname + u.search;
    if (path.length > max) path = path.slice(0, max - 1) + "…";
    return path;
  } catch {
    return url.length > max ? url.slice(0, max - 1) + "…" : url;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

function shortenDomain(domain: string, max = 20): string {
  if (domain.length <= max) return domain;
  // Try removing www.
  let d = domain.replace(/^www\./, "");
  if (d.length <= max) return d;
  // Truncate from left, keeping TLD
  return "…" + d.slice(-(max - 1));
}

function resourceType(entry: HarEntry): string {
  if (entry._resourceType) return entry._resourceType;
  const mime = entry.response.content.mimeType;
  if (mime.includes("html")) return "doc";
  if (mime.includes("javascript")) return "js";
  if (mime.includes("css")) return "css";
  if (mime.includes("image") || mime.includes("svg")) return "img";
  if (mime.includes("font")) return "font";
  if (mime.includes("json")) return "xhr";
  if (mime.includes("video")) return "media";
  if (mime.includes("audio")) return "media";
  return "other";
}

function fmtType(type: string): string {
  const colors: Record<string, string> = {
    doc: "\x1b[36m",
    js: "\x1b[33m",
    css: "\x1b[35m",
    img: "\x1b[32m",
    font: "\x1b[34m",
    xhr: "\x1b[31m",
    media: "\x1b[34m",
    other: "\x1b[90m",
    // Compat with old names
    document: "\x1b[36m",
    script: "\x1b[33m",
    stylesheet: "\x1b[35m",
    image: "\x1b[32m",
  };
  const c = colors[type] || "\x1b[90m";
  return `${c}${type}\x1b[0m`;
}

function getContentEncoding(entry: HarEntry): string {
  if (entry._contentEncoding) return entry._contentEncoding;
  const header = entry.response.headers?.find(
    (h) => h.name.toLowerCase() === "content-encoding",
  );
  return header?.value || "identity";
}

function getResponseHeader(entry: HarEntry, name: string): string | null {
  const header = entry.response.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return header?.value ?? null;
}

function fmtEncoding(enc: string): string {
  switch (enc) {
    case "br": return "\x1b[35mbr\x1b[0m";
    case "gzip": return "\x1b[35mgz\x1b[0m";
    case "zstd": return "\x1b[35mzstd\x1b[0m";
    case "deflate": return "\x1b[35mdefl\x1b[0m";
    case "identity": return "\x1b[90m—\x1b[0m";
    default: return enc;
  }
}

function compressionRatio(entry: HarEntry): string {
  const transfer = entry.response._transferSize ?? entry.response.content.size;
  const size = entry.response.content.size;
  if (size <= 0 || transfer <= 0 || transfer >= size) return "";
  const pct = ((1 - transfer / size) * 100).toFixed(0);
  return `\x1b[35m${pct}%\x1b[0m`;
}

function fmtProtocol(version: string): string {
  if (version.includes("2")) return "\x1b[32mh2\x1b[0m";
  if (version.includes("3")) return "\x1b[36mh3\x1b[0m";
  if (version.includes("1.1")) return "\x1b[90m1.1\x1b[0m";
  if (version.includes("1.0")) return "\x1b[90m1.0\x1b[0m";
  return version;
}

function getCacheStatus(entry: HarEntry): string {
  // CDN cache headers
  const cfCache = getResponseHeader(entry, "cf-cache-status");
  if (cfCache) return cfCache;
  const xCache = getResponseHeader(entry, "x-cache");
  if (xCache) {
    if (xCache.toLowerCase().includes("hit")) return "HIT";
    if (xCache.toLowerCase().includes("miss")) return "MISS";
    return xCache;
  }
  const cacheControl = getResponseHeader(entry, "cache-control");
  const age = getResponseHeader(entry, "age");
  if (age && Number(age) > 0) return "cached";
  if (cacheControl?.includes("no-cache") || cacheControl?.includes("no-store")) return "no-cache";
  if (entry.response.status === 304) return "304";
  return "";
}

function fmtCache(status: string): string {
  if (!status) return "\x1b[90m—\x1b[0m";
  const s = status.toUpperCase();
  if (s === "HIT" || s === "CACHED" || s === "304") return `\x1b[32m${status}\x1b[0m`;
  if (s === "MISS") return `\x1b[33m${status}\x1b[0m`;
  if (s === "NO-CACHE") return `\x1b[31m${status}\x1b[0m`;
  return status;
}

function getTtfb(entry: HarEntry): number {
  // TTFB = blocked + dns + connect + ssl + send + wait
  const t = entry.timings;
  return Math.max(0, t.blocked) + Math.max(0, t.dns) + Math.max(0, t.ssl) +
    Math.max(0, t.connect) + Math.max(0, t.send) + Math.max(0, t.wait);
}

// --- Waterfall ---

function renderWaterfall(entries: HarEntry[], width = 50) {
  if (entries.length === 0) return;

  const starts = entries.map((e) => new Date(e.startedDateTime).getTime());
  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...entries.map((e, i) => starts[i] + e.time));
  const span = maxEnd - minStart || 1;

  console.log("\n\x1b[1m  Waterfall\x1b[0m");
  console.log("  " + "─".repeat(width) + ` [${fmtMs(span)} total]`);

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const offset = ((starts[i] - minStart) / span) * width;
    const barLen = Math.max(1, Math.round((e.time / span) * width));
    const pad = Math.round(offset);

    const t = e.timings;
    const segments = [
      { ms: Math.max(0, t.blocked), color: "\x1b[90m" },
      { ms: Math.max(0, t.dns) + Math.max(0, t.connect) + Math.max(0, t.ssl), color: "\x1b[36m" },
      { ms: Math.max(0, t.send), color: "\x1b[34m" },
      { ms: Math.max(0, t.wait), color: "\x1b[33m" },
      { ms: Math.max(0, t.receive), color: "\x1b[32m" },
    ];
    const totalMs = segments.reduce((s, x) => s + x.ms, 0) || 1;

    let bar = "";
    let remaining = barLen;
    for (const seg of segments) {
      const chars = Math.max(0, Math.round((seg.ms / totalMs) * barLen));
      const take = Math.min(chars, remaining);
      if (take > 0) {
        bar += seg.color + "█".repeat(take);
        remaining -= take;
      }
    }
    if (remaining > 0) bar += "\x1b[32m" + "█".repeat(remaining);
    bar += "\x1b[0m";

    const label = `${e.request.method} ${shortenUrl(e.request.url, 40)}`;
    console.log(`  ${" ".repeat(pad)}${bar} ${statusColor(e.response.status)} ${fmtMs(e.time)} ${label}`);
  }

  console.log(
    "\n  \x1b[90m█\x1b[0m blocked  \x1b[36m█\x1b[0m dns/connect/ssl  \x1b[34m█\x1b[0m send  \x1b[33m█\x1b[0m wait  \x1b[32m█\x1b[0m receive\n",
  );
}

// --- Per-domain breakdown ---

function renderDomainBreakdown(entries: HarEntry[]) {
  const domains = new Map<string, { count: number; transfer: number; size: number; time: number; ttfb: number }>();
  for (const e of entries) {
    const d = getDomain(e.request.url);
    const prev = domains.get(d) || { count: 0, transfer: 0, size: 0, time: 0, ttfb: 0 };
    prev.count++;
    prev.transfer += e.response._transferSize ?? e.response.content.size;
    prev.size += e.response.content.size;
    prev.time = Math.max(prev.time, e.time);
    prev.ttfb += getTtfb(e);
    domains.set(d, prev);
  }

  console.log(`\n\x1b[1m  By Domain\x1b[0m`);
  console.log(`  ${"Domain".padEnd(30)} ${"Reqs".padStart(4)} ${"Transfer".padStart(9)} ${"Size".padStart(9)} ${"Avg TTFB".padStart(9)} ${"Slowest".padStart(9)}`);
  console.log("  " + "─".repeat(75));

  const sorted = [...domains.entries()].sort((a, b) => b[1].transfer - a[1].transfer);
  for (const [domain, stats] of sorted) {
    const avgTtfb = stats.ttfb / stats.count;
    console.log(
      `  ${shortenDomain(domain, 30).padEnd(30)} ${String(stats.count).padStart(4)} ${fmtBytes(stats.transfer).padStart(9)} ${fmtBytes(stats.size).padStart(9)} ${fmtMs(avgTtfb).padStart(9)} ${fmtMs(stats.time).padStart(9)}`,
    );
  }
}

// --- Timing breakdown ---

function renderTimingBreakdown(entries: HarEntry[]) {
  let totalBlocked = 0, totalDns = 0, totalConnect = 0, totalSsl = 0;
  let totalSend = 0, totalWait = 0, totalReceive = 0;
  for (const e of entries) {
    totalBlocked += Math.max(0, e.timings.blocked);
    totalDns += Math.max(0, e.timings.dns);
    totalConnect += Math.max(0, e.timings.connect);
    totalSsl += Math.max(0, e.timings.ssl);
    totalSend += Math.max(0, e.timings.send);
    totalWait += Math.max(0, e.timings.wait);
    totalReceive += Math.max(0, e.timings.receive);
  }
  const total = totalBlocked + totalDns + totalConnect + totalSsl + totalSend + totalWait + totalReceive;
  if (total <= 0) return;

  const pct = (v: number) => total > 0 ? `${((v / total) * 100).toFixed(0)}%` : "0%";
  console.log(`\n\x1b[1m  Time Breakdown\x1b[0m (cumulative across all requests)`);
  console.log(`  \x1b[90mBlocked:\x1b[0m ${fmtMs(totalBlocked).padStart(8)} ${pct(totalBlocked).padStart(4)}   \x1b[36mDNS:\x1b[0m ${fmtMs(totalDns).padStart(8)} ${pct(totalDns).padStart(4)}   \x1b[36mConnect:\x1b[0m ${fmtMs(totalConnect).padStart(8)} ${pct(totalConnect).padStart(4)}`);
  console.log(`  \x1b[36mSSL:\x1b[0m    ${fmtMs(totalSsl).padStart(8)} ${pct(totalSsl).padStart(4)}   \x1b[34mSend:\x1b[0m ${fmtMs(totalSend).padStart(7)} ${pct(totalSend).padStart(4)}   \x1b[33mWait:\x1b[0m    ${fmtMs(totalWait).padStart(8)} ${pct(totalWait).padStart(4)}`);
  console.log(`  \x1b[32mReceive:\x1b[0m ${fmtMs(totalReceive).padStart(8)} ${pct(totalReceive).padStart(4)}`);
}

// --- Main ---

const args = process.argv.slice(2);
const flags = {
  slow: 500,
  status: null as number | null,
  type: null as string | null,
  domain: null as string | null,
  sort: null as string | null,
  waterfall: false,
  json: false,
  file: "",
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--slow": flags.slow = Number(args[++i]); break;
    case "--status": flags.status = Number(args[++i]); break;
    case "--type": flags.type = args[++i]; break;
    case "--domain": flags.domain = args[++i]; break;
    case "--sort": flags.sort = args[++i]; break;
    case "--waterfall": flags.waterfall = true; break;
    case "--json": flags.json = true; break;
    default:
      if (!args[i].startsWith("--")) flags.file = args[i];
  }
}

if (!flags.file) {
  console.error(
    "Usage: bun tools/har-parser.ts <file.har> [--slow ms] [--status code] [--type type] [--domain host] [--sort field] [--waterfall] [--json]",
  );
  process.exit(1);
}

const raw = await Bun.file(flags.file).text();
const har: HarLog = JSON.parse(raw);
let entries = har.log.entries;

// Apply filters
if (flags.status !== null) {
  entries = entries.filter((e) => e.response.status === flags.status);
}
if (flags.type !== null) {
  entries = entries.filter(
    (e) => resourceType(e).toLowerCase() === flags.type!.toLowerCase(),
  );
}
if (flags.domain !== null) {
  entries = entries.filter(
    (e) => getDomain(e.request.url).includes(flags.domain!),
  );
}

// Apply sorting
if (flags.sort) {
  const sorters: Record<string, (a: HarEntry, b: HarEntry) => number> = {
    time: (a, b) => b.time - a.time,
    size: (a, b) =>
      (b.response._transferSize ?? b.response.content.size) -
      (a.response._transferSize ?? a.response.content.size),
    status: (a, b) => a.response.status - b.response.status,
    url: (a, b) => a.request.url.localeCompare(b.request.url),
    ttfb: (a, b) => getTtfb(b) - getTtfb(a),
    domain: (a, b) => getDomain(a.request.url).localeCompare(getDomain(b.request.url)),
  };
  const fn = sorters[flags.sort];
  if (fn) entries = [...entries].sort(fn);
}

// JSON output mode
if (flags.json) {
  const data = entries.map((e) => ({
    method: e.request.method,
    url: e.request.url,
    domain: getDomain(e.request.url),
    status: e.response.status,
    protocol: e.request.httpVersion,
    mime: e.response.content.mimeType,
    type: resourceType(e),
    encoding: getContentEncoding(e),
    cache: getCacheStatus(e),
    time: Math.round(e.time),
    ttfb: Math.round(getTtfb(e)),
    size: e.response.content.size,
    transferSize: e.response._transferSize ?? null,
    server: getResponseHeader(e, "server"),
    timings: {
      blocked: Math.max(0, e.timings.blocked),
      dns: Math.max(0, e.timings.dns),
      connect: Math.max(0, e.timings.connect),
      ssl: Math.max(0, e.timings.ssl),
      send: Math.max(0, e.timings.send),
      wait: Math.max(0, e.timings.wait),
      receive: Math.max(0, e.timings.receive),
    },
  }));
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

// --- Summary ---

const page = har.log.pages?.[0];
const totalTransfer = entries.reduce((s, e) => s + (e.response._transferSize ?? e.response.content.size), 0);
const totalSize = entries.reduce((s, e) => s + e.response.content.size, 0);
const statusCounts = new Map<number, number>();
const typeCounts = new Map<string, number>();
const encodingCounts = new Map<string, number>();
const domainSet = new Set<string>();
const protocolSet = new Set<string>();
for (const e of entries) {
  statusCounts.set(e.response.status, (statusCounts.get(e.response.status) ?? 0) + 1);
  const t = resourceType(e);
  typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  const enc = getContentEncoding(e);
  if (enc !== "identity") encodingCounts.set(enc, (encodingCounts.get(enc) ?? 0) + 1);
  domainSet.add(getDomain(e.request.url));
  protocolSet.add(e.request.httpVersion);
}

// Timing stats
const times = entries.map((e) => e.time);
const ttfbs = entries.map((e) => getTtfb(e));
const avgTime = times.reduce((s, t) => s + t, 0) / times.length;
const avgTtfb = ttfbs.reduce((s, t) => s + t, 0) / ttfbs.length;
const maxTime = Math.max(...times);
const maxTtfb = Math.max(...ttfbs);
const p95Time = [...times].sort((a, b) => a - b)[Math.floor(times.length * 0.95)] ?? maxTime;

console.log(`\n\x1b[1m  HAR Summary\x1b[0m — ${har.log.creator.name} ${har.log.creator.version}`);
if (page) {
  console.log(`  Page: ${page.title}`);
  console.log(
    `  DOMContentLoaded: \x1b[36m${fmtMs(page.pageTimings.onContentLoad)}\x1b[0m  Load: \x1b[36m${fmtMs(page.pageTimings.onLoad)}\x1b[0m`,
  );
}
console.log(
  `  Requests: \x1b[1m${entries.length}\x1b[0m  Domains: \x1b[1m${domainSet.size}\x1b[0m  Transferred: \x1b[1m${fmtBytes(totalTransfer)}\x1b[0m  Uncompressed: \x1b[1m${fmtBytes(totalSize)}\x1b[0m`,
);

// Compression summary
if (totalSize > 0 && totalTransfer < totalSize) {
  const overallPct = ((1 - totalTransfer / totalSize) * 100).toFixed(0);
  const encLine = [...encodingCounts.entries()].sort((a, b) => b[1] - a[1]).map(([enc, count]) => `${enc}(${count})`).join("  ");
  console.log(`  Compression: \x1b[35m${overallPct}% savings\x1b[0m  ${encLine || "none detected"}`);
}

// Timing summary
console.log(
  `  Timing: avg \x1b[36m${fmtMs(avgTime)}\x1b[0m  p95 \x1b[36m${fmtMs(p95Time)}\x1b[0m  max \x1b[36m${fmtMs(maxTime)}\x1b[0m  avg TTFB \x1b[33m${fmtMs(avgTtfb)}\x1b[0m  max TTFB \x1b[33m${fmtMs(maxTtfb)}\x1b[0m`,
);

// Status breakdown
const statusLine = [...statusCounts.entries()].sort((a, b) => a[0] - b[0]).map(([code, count]) => `${statusColor(code)}×${count}`).join("  ");
console.log(`  Status: ${statusLine}`);

// Type breakdown
const typeLine = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => `${type}(${count})`).join("  ");
const protoLine = [...protocolSet].map((p) => p.replace("http/", "")).join(", ");
console.log(`  Types: ${typeLine}  Protocol: ${protoLine}`);

// --- Request table ---
// Columns: # | Method | Status | Proto | Type | TTFB | Time | Size | Transfer | Enc | Saved | Cache | Domain | URL

const ANSI = 9; // length of one ANSI color escape pair

console.log(
  `\n  \x1b[1m${"#".padStart(3)} ${"Mtd".padEnd(4)} ${"St".padEnd(3)} ${"Proto".padEnd(5)} ${"Type".padEnd(5)} ${"TTFB".padStart(7)} ${"Time".padStart(7)} ${"Size".padStart(8)} ${"Wire".padStart(8)} ${"Enc".padEnd(4)} ${"Svd".padEnd(4)} ${"Cache".padEnd(8)} URL\x1b[0m`,
);
console.log("  " + "─".repeat(110));

for (let i = 0; i < entries.length; i++) {
  const e = entries[i];
  const num = String(i + 1).padStart(3);
  const method = e.request.method.slice(0, 4).padEnd(4);
  const status = statusColor(e.response.status).padEnd(3 + ANSI);
  const proto = fmtProtocol(e.request.httpVersion).padEnd(5 + ANSI);
  const type = fmtType(resourceType(e)).padEnd(5 + ANSI);
  const ttfb = fmtMs(getTtfb(e)).padStart(7);
  const time = fmtMs(e.time).padStart(7);
  const size = fmtBytes(e.response.content.size).padStart(8);
  const transfer = fmtBytes(e.response._transferSize ?? e.response.content.size).padStart(8);
  const enc = fmtEncoding(getContentEncoding(e)).padEnd(4 + ANSI);
  const ratio = compressionRatio(e);
  const saved = ratio ? ratio.padEnd(4 + ANSI) : "".padEnd(4);
  const cache = fmtCache(getCacheStatus(e)).padEnd(8 + ANSI);
  const url = shortenUrl(e.request.url, 42);
  const slow = e.time > flags.slow ? " \x1b[31m!!\x1b[0m" : "";
  console.log(
    `  ${num} ${method} ${status} ${proto} ${type} ${ttfb} ${time} ${size} ${transfer} ${enc} ${saved} ${cache} ${url}${slow}`,
  );
}

// Slow requests callout
const slowReqs = entries.filter((e) => e.time > flags.slow);
if (slowReqs.length > 0) {
  console.log(`\n  \x1b[33m⚠ ${slowReqs.length} request(s) over ${flags.slow}ms\x1b[0m`);
  for (const e of slowReqs.sort((a, b) => b.time - a.time)) {
    const ttfb = getTtfb(e);
    const recv = Math.max(0, e.timings.receive);
    console.log(
      `    ${fmtMs(e.time).padStart(8)} (TTFB ${fmtMs(ttfb)}, recv ${fmtMs(recv)})  ${e.request.method} ${shortenUrl(e.request.url, 60)}`,
    );
  }
}

// Domain breakdown
if (domainSet.size > 1) {
  renderDomainBreakdown(entries);
}

// Timing breakdown
renderTimingBreakdown(entries);

// Waterfall
if (flags.waterfall) {
  renderWaterfall(entries);
}

console.log();
