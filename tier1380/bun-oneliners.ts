#!/usr/bin/env bun
// tier1380/bun-oneliners.ts - Enhanced Verified Bun -e One-Liners (Bun 1.3.8)
// Every line below is a working `bun -e '...'` command.

// ═══════════════════════════════════════════════════════════════════════════
// 20 VERIFIED ONE-LINERS — copy the string inside bun -e '...'
// ═══════════════════════════════════════════════════════════════════════════

// 1. Eval + Version
// bun -e 'console.log(`${Bun.version} ⚡ ${Bun.revision.slice(0,7)}`)'
console.log("--- 1. Eval ---");
console.log(`${Bun.version} ⚡ ${Bun.revision.slice(0, 7)}`);

// 2. Color (correct 2-arg API)
// bun -e 'console.log(Bun.color("hsl(280,100%,60%)", "hex"))'
console.log("\n--- 2. Color ---");
console.log("hex:", Bun.color("hsl(280,100%,60%)", "hex"));
console.log("ansi-256:", Bun.color("hsl(280,100%,60%)", "ansi-256"));
console.log("ansi-16m:", Bun.color("hsl(280,100%,60%)", "ansi-16m"));

// 3. TOML → Table
// bun -e 'const t=Bun.TOML.parse("a=1\nb=2"); console.log(Bun.inspect.table(Object.entries(t)))'
console.log("\n--- 3. TOML → Table ---");
const tomlData = Bun.TOML.parse("tier=1380\nstatus='active'\nport=3000");
console.log(Bun.inspect.table(Object.entries(tomlData)));

// 4. Crypto Hash (crc32)
// bun -e 'console.log(Bun.hash.crc32("bun").toString(16))'
console.log("--- 4. Hash ---");
console.log("crc32:", Bun.hash.crc32("bun").toString(16));
console.log("wyhash:", Bun.hash.wyhash("bun").toString(16));
console.log("adler32:", Bun.hash.adler32("bun").toString(16));

// 5. Zstd Compress
// bun -e 'const c=Bun.zstdCompressSync(Buffer.from("x".repeat(1e4))); console.log(c.byteLength+"B / "+(100-100*c.byteLength/1e4).toFixed(1)+"%")'
console.log("\n--- 5. Zstd ---");
const zSrc = Buffer.from("x".repeat(10000));
const zOut = Bun.zstdCompressSync(zSrc);
console.log(`${zOut.byteLength}B / ${(100 - 100 * zOut.byteLength / 10000).toFixed(1)}% compression`);

// 6. Glob Async
// bun -e 'for await(const f of new Bun.Glob("**/*.ts").scan({cwd:"./tier1380"})) console.log(f)'
console.log("\n--- 6. Glob ---");
for await (const f of new Bun.Glob("*.ts").scan({ cwd: "./tier1380" })) {
  console.log(" ", f);
}

// 7. TOML + Env fallback
// bun -e 'console.log(Bun.TOML.parse(await Bun.file(Bun.env.CONFIG ?? "config.toml").text()))'
console.log("\n--- 7. TOML + Env ---");
const configPath = Bun.env.CONFIG ?? "package.json";
console.log(`CONFIG=${configPath} (override with CONFIG=path.toml)`);

// 8. DNS Resolve
// bun -e 'console.log(await Bun.dns.resolve("bun.sh", {family:4}))'
console.log("\n--- 8. DNS ---");
const dns = await Bun.dns.resolve("bun.sh", { family: 4 });
console.log("bun.sh →", dns[0]?.address);

// 9. Shell Pipe
// bun -e 'console.log((await Bun.$`ls | wc -l`).stdout.toString().trim())'
console.log("\n--- 9. Shell ---");
console.log("files:", (await Bun.$`ls tier1380 | wc -l`).stdout.toString().trim());

// 10. GC Stats (returns heap bytes as number)
// bun -e 'console.log((Bun.gc(true)/1e6).toFixed(1)+"MB heap")'
console.log("\n--- 10. GC ---");
const heap = Bun.gc(true);
console.log(`${(Number(heap) / 1e6).toFixed(1)}MB heap`);

// 11. Escape HTML in JSON
// bun -e 'console.log(JSON.stringify({html:Bun.escapeHTML("<script>")}))'
console.log("\n--- 11. EscapeHTML ---");
console.log(JSON.stringify({ html: Bun.escapeHTML('<script>alert("xss")</script>') }));

// 12. Nano Bench
// bun -e 'const t=Bun.nanoseconds();Bun.hash.crc32("x");console.log(Bun.nanoseconds()-t+"ns")'
console.log("\n--- 12. Nanoseconds ---");
const ns0 = Bun.nanoseconds();
Bun.hash.crc32("benchmark");
const ns1 = Bun.nanoseconds();
console.log(`hash.crc32: ${ns1 - ns0}ns`);

// 13. String Width (grapheme-aware)
// bun -e 'console.log(["🔥","a","日本"].map(c=>[c,Bun.stringWidth(c)]))'
console.log("\n--- 13. StringWidth ---");
for (const s of ["🔥", "a", "日本", "👨‍👩‍👧‍👦", "\x1b[31mred\x1b[0m"]) {
  const clean = s.replace(/\x1b\[[0-9;]*m/g, "");
  console.log(`  "${clean}" → ${Bun.stringWidth(s)} cols`);
}

// 14. Table with column select
// bun -e 'console.log(Bun.inspect.table([{a:1,b:2},{a:3,b:4}],["a","b"]))'
console.log("\n--- 14. Table ---");
console.log(Bun.inspect.table([
  { tier: "junior", score: 45, ms: 0.5 },
  { tier: "senior", score: 78, ms: 2.1 },
  { tier: "enterprise", score: 98, ms: 4.2 },
], ["tier", "score", "ms"]));

// 15. Inspect Circular
// bun -e 'const a={x:1};a.self=a;console.log(Bun.inspect(a,{depth:3}))'
console.log("--- 15. Circular ---");
const circ: any = { x: 1, tier: 1380 };
circ.self = circ;
console.log(Bun.inspect(circ, { depth: 3 }));

// 16. Password Hash + Verify
// bun -e 'const h=await Bun.password.hash("p",{algorithm:"bcrypt",cost:4});console.log(await Bun.password.verify("p",h))'
console.log("\n--- 16. Password ---");
const pwHash = await Bun.password.hash("tier1380", { algorithm: "bcrypt", cost: 4 });
console.log("hash:", pwHash.slice(0, 30) + "...");
console.log("verify:", await Bun.password.verify("tier1380", pwHash));

// 17. File Read
// bun -e 'console.log((await Bun.file("package.json").text()).slice(0,60))'
console.log("\n--- 17. File ---");
console.log((await Bun.file("package.json").text()).slice(0, 60));

// 18. Deep Match
// bun -e 'console.log(Bun.deepMatch({a:1,b:{c:2}},{a:1,b:{c:2}}))'
console.log("\n--- 18. DeepMatch ---");
console.log("match:", Bun.deepMatch({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }));
console.log("equals:", Bun.deepEquals({ a: 1 }, { a: 1 }));
console.log("not equal:", Bun.deepEquals({ a: 1 }, { a: 2 }));

// 19. Markdown → HTML
// bun -e 'console.log(Bun.markdown.html("# Hi\n- [x] done",{tables:true,tasklists:true}))'
console.log("\n--- 19. Markdown ---");
console.log(Bun.markdown.html("# Tier-1380\n| A | B |\n|---|---|\n| 1 | 2 |\n- [x] done", {
  tables: true, tasklists: true
}));

// 20. CryptoHasher SHA256
// bun -e 'console.log(new Bun.CryptoHasher("sha256").update("tier-1380").digest("hex"))'
console.log("--- 20. Crypto ---");
console.log("sha256:", new Bun.CryptoHasher("sha256").update("tier-1380").digest("hex"));
console.log("hmac:", new Bun.CryptoHasher("sha256", "secret").update("tier-1380").digest("hex"));

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n--- Benchmarks ---");
const benches: [string, () => void][] = [
  ["color 10K", () => { for (let i = 0; i < 10000; i++) Bun.color("red", "hex"); }],
  ["hash.crc32 10K", () => { for (let i = 0; i < 10000; i++) Bun.hash.crc32("bench"); }],
  ["escapeHTML 10K", () => { for (let i = 0; i < 10000; i++) Bun.escapeHTML("<b>x</b>"); }],
  ["stringWidth 10K", () => { for (let i = 0; i < 10000; i++) Bun.stringWidth("🔥⚡test"); }],
  ["markdown 1K", () => { for (let i = 0; i < 1000; i++) Bun.markdown.html("# Hi\n|A|B|\n|-|-|\n|1|2|", { tables: true }); }],
];

const benchResults: { op: string; ms: string; 'ops/s': string }[] = [];
for (const [name, fn] of benches) {
  const count = name.includes("1K") ? 1000 : 10000;
  const t0 = performance.now();
  fn();
  const elapsed = performance.now() - t0;
  benchResults.push({
    op: name,
    ms: elapsed.toFixed(2),
    'ops/s': (count * 1000 / elapsed).toFixed(0),
  });
}
console.log(Bun.inspect.table(benchResults));

// ═══════════════════════════════════════════════════════════════════════════
// API REFERENCE
// ═══════════════════════════════════════════════════════════════════════════

console.log("--- API Quick Reference ---");
console.log(Bun.inspect.table([
  { API: 'Bun.color(input, fmt)', Returns: '"hex"|"rgb"|"css"|"number"|"ansi-256"|"ansi-16m"' },
  { API: 'Bun.markdown.html(md, opts)', Returns: 'HTML string' },
  { API: 'new Bun.CryptoHasher(alg, key?)', Returns: '.update(s).digest("hex")' },
  { API: 'Bun.zstdCompressSync(buf)', Returns: 'Buffer (compressed)' },
  { API: 'Bun.TOML.parse(str)', Returns: 'object' },
  { API: 'Bun.dns.resolve(host, opts?)', Returns: '[{address, ttl}]' },
  { API: 'Bun.hash.crc32|wyhash|adler32', Returns: 'number' },
  { API: 'Bun.escapeHTML(str)', Returns: 'escaped string' },
  { API: 'Bun.stringWidth(str)', Returns: 'column count (grapheme-aware)' },
  { API: 'Bun.inspect.table(arr, cols?)', Returns: 'ASCII table string' },
  { API: 'Bun.password.hash(pw, opts)', Returns: 'bcrypt/argon2 hash' },
  { API: 'new Bun.Glob(pattern)', Returns: '.scan({cwd}) async iterator' },
  { API: 'Bun.$`cmd`', Returns: 'ShellOutput {stdout, exitCode}' },
  { API: 'Bun.gc(force?)', Returns: 'heap bytes (number)' },
  { API: 'Bun.nanoseconds()', Returns: 'monotonic ns (number)' },
  { API: 'Bun.deepMatch(a, b)', Returns: 'boolean (subset match)' },
  { API: 'Bun.deepEquals(a, b)', Returns: 'boolean (strict equal)' },
  { API: 'Bun.revision', Returns: 'git commit hash string' },
]));

// ═══════════════════════════════════════════════════════════════════════════
// LIVE TELEMETRY DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
// Run as: bun -e '<paste below>' for live dashboard (Ctrl+C to stop)
//
// const ansi=(c)=>Bun.color(c,"ansi-16m")??"";const R="\x1b[0m";
// const col=(c,t)=>ansi(c)+t+R;
// setInterval(()=>{const m=process.memoryUsage();const h=(m.heapUsed/1e6).toFixed(1);
// const r=(m.rss/1e6).toFixed(1);const u=(process.cpuUsage().user/1e3).toFixed(0);
// console.clear();console.log(col("hsl(280,100%,60%)","▵ TIER-1380 LIVE METRICS"));
// console.log("Heap: "+col("hsl(120,80%,50%)",h+"MB")+" | RSS: "+r+"MB | CPU: "+u+"µs");
// console.log("Uptime: "+(process.uptime()/60).toFixed(1)+"m | Bun: "+Bun.version)},1000)

// Single-shot telemetry (runs once, no interval):
console.log("\n--- Telemetry ---");
const ansi = (c: string) => Bun.color(c, "ansi-16m") ?? "";
const R = "\x1b[0m";
const col = (c: string, t: string) => ansi(c) + t + R;
const m = process.memoryUsage();
console.log(col("hsl(280,100%,60%)", "▵ TIER-1380 LIVE METRICS"));
console.log(`Heap: ${col("hsl(120,80%,50%)", (m.heapUsed / 1e6).toFixed(1) + "MB")} | RSS: ${(m.rss / 1e6).toFixed(1)}MB | CPU: ${(process.cpuUsage().user / 1e3).toFixed(0)}µs`);
console.log(`Uptime: ${(process.uptime() / 60).toFixed(1)}m | Bun: ${Bun.version}`);

// ═══════════════════════════════════════════════════════════════════════════
// SHELL ALIASES (add to .zshrc)
// ═══════════════════════════════════════════════════════════════════════════
// Note: bun -e uses argv[1], argv[2] (no -- needed)
//
// alias b='bun -e'
// alias bcol='bun -e '\''const a=Bun.color(process.argv[1],"ansi-16m");console.log((a||"")+process.argv[2]+"\x1b[0m")'\'''
// alias bhash='bun -e '\''console.log(Bun.hash.crc32(process.argv[1]).toString(16))'\'''
// alias bbench='bun -e '\''const t=Bun.nanoseconds();eval(process.argv[1]);console.log(Bun.nanoseconds()-t+"ns")'\'''
// alias bjson='bun -e '\''console.log(JSON.stringify(JSON.parse(process.argv[1]),null,2))'\'''
//
// Usage:
//   bcol green "SUCCESS"          → colored text
//   bhash "secret"                → crc32 hex
//   bbench 'for(let i=0;i<1e6;i++)Bun.hash.crc32("x")'  → 29ms
//   bjson '{"a":1,"b":{"c":2}}'  → pretty JSON
