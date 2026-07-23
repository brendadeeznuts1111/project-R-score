#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils — Bun.gc
// @see https://bun.com/docs/runtime/utils — Bun.generateHeapSnapshot
// @see https://bun.com/docs/runtime/transpiler — Bun.Transpiler
// @see https://bun.com/docs/runtime/sql — Bun.SQL
// @see https://bun.com/docs/runtime/jsonc — Bun.JSONC
// @see https://bun.com/docs/runtime/json5 — Bun.JSON5
// @see https://bun.com/docs/runtime/jsonl — Bun.JSONL
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/toml#bun-toml-stringify — Bun.TOML.stringify
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash.crc32
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password.hash
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password.verify
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/archive#quickstart — Bun.Archive
// @see https://bun.com/docs/runtime/utils#bun-gzipsync — Bun.gzipSync
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/cookies#cookie-class — Bun.Cookie
// @see https://bun.com/docs/runtime/cookies#cookiemap-class — CookieMap
// @see https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect — Bun.connect
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns.prefetch
// @see https://bun.com/docs/runtime/networking/dns#dns-getcachestats — Bun.dns.getCacheStats
// @see https://bun.com/docs/runtime/networking/dns#dns-caching-in-bun — Bun.dns.lookup
// @see https://bun.com/docs/runtime/networking/tcp#start-a-server-bun-listen — Bun.listen
// @see https://bun.com/docs/runtime/streams#bun-arraybuffersink — Bun.ArrayBufferSink
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/bundler/plugins#usage — Bun.plugin
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/networking/udp#bind-a-udp-socket-bun-udpsocket — Bun.udpSocket
// @see https://bun.com/docs/runtime/csrf#bun-csrf-generate — Bun.CSRF
// @see https://bun.com/docs/runtime/csrf#bun-csrf-generate — Bun.CSRF.generate
// @see https://bun.com/docs/runtime/csrf#bun-csrf-verify — Bun.CSRF.verify
// @see https://bun.com/docs/runtime/redis#getting-started — RedisClient
// @see https://bun.com/docs/runtime/ffi#dlopen-usage-bunffi — bun:ffi
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/cookies#cookiemap-class — Bun.CookieMap
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-sleepsync — Bun.sleepSync
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// @see https://bun.com/docs/runtime/utils#bun-resolvesync — Bun.resolveSync
// @see https://bun.com/docs/runtime/utils#bun-fileurltopath — Bun.fileURLToPath
// @see https://bun.com/docs/runtime/utils#bun-pathtofileurl — Bun.pathToFileURL
// @see https://bun.com/docs/runtime/utils#bun-deflatesync — Bun.deflateSync
// @see https://bun.com/docs/runtime/utils#bun-gunzipsync — Bun.gunzipSync
// @see https://bun.com/docs/runtime/utils#bun-inflatesync — Bun.inflateSync
// @see https://bun.com/docs/runtime/utils#bun-zstdcompress-bun-zstdcompresssync — Bun.zstdCompressSync
// @see https://bun.com/docs/runtime/utils#bun-zstddecompress-bun-zstddecompresssync — Bun.zstdDecompressSync
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/bun-apis
/**
 * Version-aware Bun API coverage.
 *
 *   effective_total   = APIs whose `since` <= running Bun version
 *   effective_covered = covered APIs whose `since` <= running Bun version
 *   coverage          = effective_covered / effective_total
 *
 * The covered set is derived from the demo registry in oneliners.ts — single
 * source of truth, no manually-synced list.
 *
 * Usage: bun run showcase:coverage [--version 1.3.9]
 */

import { demos } from './oneliners.ts';

/** Documented Bun API surfaces with introduction version (curated, deduped). */
const APIS: Record<string, { since: string }> = {
  'Bun.version': { since: '1.0.0' },
  'Bun.revision': { since: '1.1.30' },
  'Bun.main': { since: '1.0.0' },
  'Bun.env': { since: '1.0.0' },
  'Bun.argv': { since: '1.0.0' },
  'Bun.stdin': { since: '1.0.0' },
  'Bun.stdout': { since: '1.0.0' },
  'Bun.stderr': { since: '1.0.0' },
  'Bun.file': { since: '1.0.0' },
  'Bun.write': { since: '1.0.0' },
  'Bun.TOML.parse': { since: '1.1.1' },
  'Bun.TOML.stringify': { since: '1.1.1' },
  'Bun.JSONC.parse': { since: '1.3.6' },
  'Bun.JSON5.parse': { since: '1.3.7' },
  'Bun.JSONL.parse': { since: '1.3.7' },
  'Bun.CryptoHasher': { since: '1.1.30' },
  'Bun.password.hash': { since: '1.0.19' },
  'Bun.password.verify': { since: '1.0.19' },
  'Bun.hash': { since: '1.0.0' },
  'Bun.hash.crc32': { since: '1.3.6' },
  'Bun.randomUUIDv7': { since: '1.1.34' },
  'Bun.gzipSync': { since: '1.0.0' },
  'Bun.gunzipSync': { since: '1.0.0' },
  'Bun.deflateSync': { since: '1.0.0' },
  'Bun.inflateSync': { since: '1.0.0' },
  'Bun.zstdCompressSync': { since: '1.3.14' },
  'Bun.zstdDecompressSync': { since: '1.3.14' },
  'Bun.concatArrayBuffers': { since: '1.3.14' },
  'Bun.allocUnsafe': { since: '1.0.0' },
  'Bun.ArrayBufferSink': { since: '1.0.0' },
  'Bun.escapeHTML': { since: '1.0.0' },
  'Bun.stringWidth': { since: '1.1.29' },
  'Bun.stripANSI': { since: '1.2.21' },
  'Bun.wrapAnsi': { since: '1.3.7' },
  'Bun.sliceAnsi': { since: '1.3.11' },
  'Bun.color': { since: '1.1.30' },
  'Bun.inspect': { since: '1.0.0' },
  'Bun.inspect.table': { since: '1.1.31' },
  'Bun.semver.order': { since: '1.1.11' },
  'Bun.semver.satisfies': { since: '1.1.11' },
  'Bun.markdown': { since: '1.3.8' },
  'Bun.dns.lookup': { since: '1.0.0' },
  'Bun.dns.prefetch': { since: '1.0.0' },
  'Bun.dns.getCacheStats': { since: '1.0.0' },
  'Bun.udpSocket': { since: '1.1.6' },
  'Bun.connect': { since: '1.0.0' },
  'Bun.listen': { since: '1.0.0' },
  'Bun.serve': { since: '1.0.0' },
  'Bun.$': { since: '1.0.0' },
  'Bun.which': { since: '1.0.0' },
  'Bun.spawn': { since: '1.0.0' },
  'Bun.spawnSync': { since: '1.0.0' },
  'Bun.Glob': { since: '1.0.14' },
  'Bun.FileSystemRouter': { since: '1.0.0' },
  HTMLRewriter: { since: '1.0.0' },
  'Bun.CSRF.generate': { since: '1.0.0' },
  'Bun.CSRF.verify': { since: '1.0.0' },
  'Bun.Cookie': { since: '1.0.0' },
  'Bun.CookieMap': { since: '1.0.0' },
  'bun:sqlite.Database': { since: '1.0.0' },
  'Bun.SQL': { since: '1.2.0' },
  'Bun.RedisClient': { since: '1.2.9' },
  'Bun.WebView': { since: '1.3.12' },
  'Bun.Image': { since: '1.3.14' },
  'Bun.Archive': { since: '1.3.6' },
  'Bun.cron': { since: '1.3.12' },
  'Bun.build': { since: '1.0.0' },
  'Bun.Transpiler': { since: '1.0.0' },
  'Bun.plugin': { since: '1.0.0' },
  'bun:ffi.dlopen': { since: '1.0.0' },
  Worker: { since: '1.0.0' },
  'Bun.resolveSync': { since: '1.0.0' },
  'import.meta': { since: '1.0.0' },
  'Bun.sleep': { since: '1.0.0' },
  'Bun.sleepSync': { since: '1.0.0' },
  'Bun.nanoseconds': { since: '1.0.0' },
  'Bun.readableStreamToBytes': { since: '1.0.0' },
  'Bun.readableStreamToBlob': { since: '1.0.0' },
  'Bun.readableStreamToFormData': { since: '1.0.0' },
  'Bun.readableStreamToJSON': { since: '1.0.0' },
  'Bun.readableStreamToArray': { since: '1.0.0' },
  'Bun.gc': { since: '1.0.0' },
  'Bun.generateHeapSnapshot': { since: '1.0.0' },
  'Bun.mmap': { since: '1.0.0' },
  'Bun.pathToFileURL': { since: '1.0.0' },
  'Bun.fileURLToPath': { since: '1.0.0' },
};

function parseVersionFlag(): string {
  const i = Bun.argv.indexOf('--version');
  return i >= 0 && Bun.argv[i + 1] ? Bun.argv[i + 1] : Bun.version;
}

/** Strip prerelease/build so plain ranges compare cleanly. */
const stable = (v: string): string => v.replace(/[-+].*$/, '');

const version = parseVersionFlag();
const covered = new Set(demos.flatMap(d => d.apis));

const available: string[] = [];
const missingSince: string[] = [];
for (const [api, { since }] of Object.entries(APIS)) {
  if (Bun.semver.satisfies(stable(version), `>=${since}`)) available.push(api);
  else missingSince.push(`${api} (since ${since})`);
}

const coveredCount = available.filter(a => covered.has(a)).length;
const uncovered = available.filter(a => !covered.has(a));
const pct = available.length === 0 ? 0 : Math.round((coveredCount / available.length) * 100);

console.log(`Bun version:        ${version}`);
console.log(`APIs tracked:       ${Object.keys(APIS).length}`);
console.log(`Available here:     ${available.length}`);
console.log(`Covered by demos:   ${coveredCount}`);
console.log(`Coverage:           ${pct}%`);
if (missingSince.length > 0) {
  console.log(`\nNot counted (newer than ${version}):`);
  for (const m of missingSince) console.log(`  - ${m}`);
}
if (uncovered.length > 0) {
  console.log(`\nUncovered (available, no demo):`);
  for (const u of uncovered) console.log(`  - ${u}`);
}
