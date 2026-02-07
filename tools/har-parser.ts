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
//   --with-docs       Show documentation-aware performance analysis
//   --table           Use Bun.inspect.table() for clean tabular output

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

// --- Documentation classification ---
// Maps HAR entries to DocumentationProvider/DocumentationCategory
// from lib/docs/constants/domains.ts

type DocProvider = "bun_official" | "community";
type DocCategory = "website" | "asset";

interface DocClassification {
  provider: DocProvider;
  category: DocCategory;
}

function classifyEntry(entry: HarEntry, pageUrl?: string): DocClassification {
  const domain = getDomain(entry.request.url);
  const pageDomain = pageUrl ? getDomain(pageUrl) : "";

  // Determine provider
  const provider: DocProvider = domain === pageDomain ? "bun_official" : "community";

  // Determine category: the page document itself is WEBSITE, everything else is ASSET
  const isPageDocument =
    entry.request.url === pageUrl ||
    (resourceType(entry) === "document" && domain === pageDomain &&
      new URL(entry.request.url).pathname === "/");
  const category: DocCategory = isPageDocument ? "website" : "asset";

  return { provider, category };
}

function fmtProvider(p: DocProvider): string {
  return p === "bun_official" ? "\x1b[32mofficial\x1b[0m" : "\x1b[33mcommunity\x1b[0m";
}

function fmtCategory(c: DocCategory): string {
  return c === "website" ? "\x1b[36mwebsite\x1b[0m" : "\x1b[90masset\x1b[0m";
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

function renderDomainBreakdown(entries: HarEntry[], pageUrl?: string) {
  const domains = new Map<string, { count: number; transfer: number; size: number; time: number; ttfb: number; provider: DocProvider }>();
  for (const e of entries) {
    const d = getDomain(e.request.url);
    const cls = classifyEntry(e, pageUrl);
    const prev = domains.get(d) || { count: 0, transfer: 0, size: 0, time: 0, ttfb: 0, provider: cls.provider };
    prev.count++;
    prev.transfer += e.response._transferSize ?? e.response.content.size;
    prev.size += e.response.content.size;
    prev.time = Math.max(prev.time, e.time);
    prev.ttfb += getTtfb(e);
    domains.set(d, prev);
  }

  console.log(`\n\x1b[1m  By Domain\x1b[0m`);
  console.log(`  ${"Domain".padEnd(30)} ${"Provider".padEnd(9)} ${"Reqs".padStart(4)} ${"Transfer".padStart(9)} ${"Size".padStart(9)} ${"Avg TTFB".padStart(9)} ${"Slowest".padStart(9)}`);
  console.log("  " + "─".repeat(85));

  const sorted = [...domains.entries()].sort((a, b) => b[1].transfer - a[1].transfer);
  for (const [domain, stats] of sorted) {
    const avgTtfb = stats.ttfb / stats.count;
    console.log(
      `  ${shortenDomain(domain, 30).padEnd(30)} ${fmtProvider(stats.provider).padEnd(9 + ANSI)} ${String(stats.count).padStart(4)} ${fmtBytes(stats.transfer).padStart(9)} ${fmtBytes(stats.size).padStart(9)} ${fmtMs(avgTtfb).padStart(9)} ${fmtMs(stats.time).padStart(9)}`,
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
  withDocs: false,
  table: false,
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
    case "--with-docs": flags.withDocs = true; break;
    case "--table": flags.table = true; break;
    case "--json": flags.json = true; break;
    default:
      if (!args[i].startsWith("--")) flags.file = args[i];
  }
}

if (!flags.file) {
  // Check if stdin has data (piped input)
  if (Bun.stdin.readable) {
    flags.file = "-";
  } else {
    console.error(
      "Usage: bun tools/har-parser.ts <file.har|-|-> [--slow ms] [--status code] [--type type] [--domain host] [--sort field] [--waterfall] [--json]",
    );
    process.exit(1);
  }
}

const raw = flags.file === "-"
  ? await new Response(Bun.stdin.stream()).text()
  : await Bun.file(flags.file).text();
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

// Page context for classification
const page = har.log.pages?.[0];
const pageUrl = page?.title;

// JSON output mode
if (flags.json) {
  const data = entries.map((e) => {
    const cls = classifyEntry(e, pageUrl);
    return {
      method: e.request.method,
      url: e.request.url,
      domain: getDomain(e.request.url),
      status: e.response.status,
      protocol: e.request.httpVersion,
      mime: e.response.content.mimeType,
      type: resourceType(e),
      encoding: getContentEncoding(e),
      cache: getCacheStatus(e),
      provider: cls.provider,
      category: cls.category,
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
    };
  });
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

// Bun.inspect.table() output mode
if (flags.table) {
  const fmtMs = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  const fmtB = (b: number) => {
    if (b < 1024) return `${b}B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
    return `${(b / (1024 * 1024)).toFixed(1)}MB`;
  };
  const fmtEnc = (e: string) => e === "identity" ? "—" : e;
  const fmtPct = (size: number, transfer: number) => {
    if (size <= 0 || transfer >= size) return "—";
    return `${((1 - transfer / size) * 100).toFixed(0)}%`;
  };

  // Requests table
  const rows = entries.map((e, i) => {
    const cls = classifyEntry(e, pageUrl);
    const transfer = e.response._transferSize ?? e.response.content.size;
    const isSecure = e.request.url.startsWith("https:");
    const httpVer = e.request.httpVersion || "http/1.1";
    const proto = httpVer === "h2" || httpVer === "HTTP/2" || httpVer === "http/2.0" ? "h2"
      : httpVer === "h3" || httpVer === "HTTP/3" ? "h3"
      : "h1.1";
    return {
      "#": i + 1,
      Method: e.request.method,
      Status: e.response.status,
      Proto: proto,
      Scheme: isSecure ? "https" : "http",
      Type: resourceType(e),
      Provider: cls.provider.replace("bun_", ""),
      Cat: cls.category,
      TTFB: fmtMs(getTtfb(e)),
      Time: fmtMs(e.time),
      Size: fmtB(e.response.content.size),
      Wire: fmtB(transfer),
      Enc: fmtEnc(getContentEncoding(e)),
      Saved: fmtPct(e.response.content.size, transfer),
      Cache: getCacheStatus(e) || "—",
      URL: shortenUrl(e.request.url, 50),
    };
  });

  console.log("\n  Requests\n");
  console.log(Bun.inspect.table(rows, { colors: true }));

  // Domain breakdown table
  const domainMap = new Map<string, { Reqs: number; Transfer: number; Size: number; "Avg TTFB": number; Slowest: number; Provider: string }>();
  for (const e of entries) {
    const d = getDomain(e.request.url);
    const cls = classifyEntry(e, pageUrl);
    const prev = domainMap.get(d) || { Reqs: 0, Transfer: 0, Size: 0, "Avg TTFB": 0, Slowest: 0, Provider: cls.provider.replace("bun_", "") };
    prev.Reqs++;
    prev.Transfer += e.response._transferSize ?? e.response.content.size;
    prev.Size += e.response.content.size;
    prev["Avg TTFB"] += getTtfb(e);
    prev.Slowest = Math.max(prev.Slowest, e.time);
    domainMap.set(d, prev);
  }
  const domainRows = [...domainMap.entries()]
    .sort((a, b) => b[1].Transfer - a[1].Transfer)
    .map(([domain, s]) => ({
      Domain: domain,
      Provider: s.Provider,
      Reqs: s.Reqs,
      Transfer: fmtB(s.Transfer),
      Size: fmtB(s.Size),
      "Avg TTFB": fmtMs(s["Avg TTFB"] / s.Reqs),
      Slowest: fmtMs(s.Slowest),
    }));

  if (domainRows.length > 1) {
    console.log("\n  Domains\n");
    console.log(Bun.inspect.table(domainRows, { colors: true }));
  }

  // Timing breakdown table
  let tBlocked = 0, tDns = 0, tConnect = 0, tSsl = 0, tSend = 0, tWait = 0, tRecv = 0;
  for (const e of entries) {
    tBlocked += Math.max(0, e.timings.blocked);
    tDns += Math.max(0, e.timings.dns);
    tConnect += Math.max(0, e.timings.connect);
    tSsl += Math.max(0, e.timings.ssl);
    tSend += Math.max(0, e.timings.send);
    tWait += Math.max(0, e.timings.wait);
    tRecv += Math.max(0, e.timings.receive);
  }
  const tTotal = tBlocked + tDns + tConnect + tSsl + tSend + tWait + tRecv;
  const pct = (v: number) => tTotal > 0 ? `${((v / tTotal) * 100).toFixed(0)}%` : "0%";
  const timingRows = [
    { Phase: "Blocked", Time: fmtMs(tBlocked), "%": pct(tBlocked) },
    { Phase: "DNS", Time: fmtMs(tDns), "%": pct(tDns) },
    { Phase: "Connect", Time: fmtMs(tConnect), "%": pct(tConnect) },
    { Phase: "SSL", Time: fmtMs(tSsl), "%": pct(tSsl) },
    { Phase: "Send", Time: fmtMs(tSend), "%": pct(tSend) },
    { Phase: "Wait", Time: fmtMs(tWait), "%": pct(tWait) },
    { Phase: "Receive", Time: fmtMs(tRecv), "%": pct(tRecv) },
  ];

  console.log("\n  Timing Breakdown\n");
  console.log(Bun.inspect.table(timingRows, { colors: true }));

  // Summary stats table
  const times = entries.map((e) => e.time);
  const ttfbs = entries.map((e) => getTtfb(e));
  const totalTx = entries.reduce((s, e) => s + (e.response._transferSize ?? e.response.content.size), 0);
  const totalSz = entries.reduce((s, e) => s + e.response.content.size, 0);
  const secureCount = entries.filter(e => e.request.url.startsWith("https:")).length;
  const h2Count = entries.filter(e => {
    const v = e.request.httpVersion || "";
    return v === "h2" || v === "HTTP/2" || v === "http/2.0";
  }).length;
  const summaryRows = [{
    Requests: entries.length,
    Domains: new Set(entries.map(e => getDomain(e.request.url))).size,
    HTTPS: `${secureCount}/${entries.length}`,
    "H2+": `${h2Count}/${entries.length}`,
    Transferred: fmtB(totalTx),
    Uncompressed: fmtB(totalSz),
    "Compression": fmtPct(totalSz, totalTx),
    "Avg Time": fmtMs(times.reduce((s, t) => s + t, 0) / times.length),
    "p95 Time": fmtMs([...times].sort((a, b) => a - b)[Math.floor(times.length * 0.95)] ?? 0),
    "Avg TTFB": fmtMs(ttfbs.reduce((s, t) => s + t, 0) / ttfbs.length),
    "Max TTFB": fmtMs(Math.max(...ttfbs)),
  }];

  console.log("\n  Summary\n");
  console.log(Bun.inspect.table(summaryRows, { colors: true }));

  // Documentation analysis tables (if --with-docs)
  if (flags.withDocs) {
    const { DocumentationAwarePerformanceAnalyzer } = await import('./har-analysis');
    const analyzer = new DocumentationAwarePerformanceAnalyzer();
    const url = pageUrl || har.log.entries?.[0]?.request.url || "";
    if (url) {
      const result = analyzer.analyzeWithDocsContext(har, url);

      if (result.issues.length > 0) {
        console.log("\n  Performance Issues\n");
        console.log(Bun.inspect.table(result.issues.map(i => ({
          Severity: i.severity,
          Type: i.type,
          Details: i.details,
          Fix: i.fix,
        })), { colors: true }));
      }

      if (result.documentationGaps.length > 0) {
        console.log("\n  Documentation Gaps\n");
        console.log(Bun.inspect.table(result.documentationGaps.map(g => ({
          Priority: g.priority,
          Category: g.category,
          Gap: g.gap,
        })), { colors: true }));
      }

      if (result.recommendations.length > 0) {
        console.log("\n  Recommendations\n");
        console.log(Bun.inspect.table(result.recommendations.map(r => ({
          Priority: r.priority,
          Category: r.category,
          Title: r.title,
          Description: r.description,
        })), { colors: true }));
      }

      console.log("\n  Metrics\n");
      const m = result.bunSpecific;
      console.log(Bun.inspect.table([{
        TTFB: fmtMs(m.ttfb),
        Transfer: fmtB(m.totalTransfer),
        Size: fmtB(m.totalSize),
        "Compression": `${(m.compressionRatio * 100).toFixed(0)}%`,
        "Cache Hits": `${(m.cacheHitRate * 100).toFixed(0)}%`,
        Slow: `${m.slowRequests}/${m.totalRequests}`,
        Domains: m.domains,
        Provider: result.provider,
        Category: result.category,
        "URL Type": result.urlType,
      }], { colors: true }));
    }
  }

  console.log();
  process.exit(0);
}

// --- Summary ---

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
  `\n  \x1b[1m${"#".padStart(3)} ${"Mtd".padEnd(4)} ${"St".padEnd(3)} ${"Proto".padEnd(5)} ${"Type".padEnd(5)} ${"Provider".padEnd(9)} ${"Cat".padEnd(7)} ${"TTFB".padStart(7)} ${"Time".padStart(7)} ${"Size".padStart(8)} ${"Wire".padStart(8)} ${"Enc".padEnd(4)} ${"Svd".padEnd(4)} ${"Cache".padEnd(8)} URL\x1b[0m`,
);
console.log("  " + "─".repeat(128));

for (let i = 0; i < entries.length; i++) {
  const e = entries[i];
  const cls = classifyEntry(e, pageUrl);
  const num = String(i + 1).padStart(3);
  const method = e.request.method.slice(0, 4).padEnd(4);
  const status = statusColor(e.response.status).padEnd(3 + ANSI);
  const proto = fmtProtocol(e.request.httpVersion).padEnd(5 + ANSI);
  const type = fmtType(resourceType(e)).padEnd(5 + ANSI);
  const provider = fmtProvider(cls.provider).padEnd(9 + ANSI);
  const cat = fmtCategory(cls.category).padEnd(7 + ANSI);
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
    `  ${num} ${method} ${status} ${proto} ${type} ${provider} ${cat} ${ttfb} ${time} ${size} ${transfer} ${enc} ${saved} ${cache} ${url}${slow}`,
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
  renderDomainBreakdown(entries, pageUrl);
}

// Timing breakdown
renderTimingBreakdown(entries);

// Waterfall
if (flags.waterfall) {
  renderWaterfall(entries);
}

// Documentation-aware performance analysis
if (flags.withDocs) {
  const { DocumentationAwarePerformanceAnalyzer, printAnalysis } = await import('./har-analysis');
  const analyzer = new DocumentationAwarePerformanceAnalyzer();
  const url = pageUrl || har.log.entries?.[0]?.request.url || "";
  if (url) {
    const result = analyzer.analyzeWithDocsContext(har, url);
    printAnalysis(result, url);
  }
}

console.log();
