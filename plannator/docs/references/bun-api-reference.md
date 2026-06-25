# Bun API Reference — Plannator

Grounding card for Bun-native APIs. Prefer these over Node equivalents when building tools, scripts, or dashboards in the Plannator workspace.

## Canonical sources

- Bun docs: <https://bun.sh/docs>
- Bun API reference: <https://bun.com/reference/bun>
- Bun release notes RSS: <https://bun.com/rss.xml>

## File I/O

| Need | API | Example |
| --- | --- | --- |
| Read a small file as text | `Bun.file(path).text()` | `const text = await Bun.file("goals/abc/facts.md").text();` |
| Read JSON | `Bun.file(path).json()` | `const data = await Bun.file("interview.json").json();` |
| Read bytes | `Bun.file(path).bytes()` | `const bytes = await Bun.file("asset.png").bytes();` |
| Write text/bytes/stream | `Bun.write(path, data)` | `await Bun.write("report.html", html);` |
| Stream a large file | `Bun.file(path).stream()` | `for await (const chunk of Bun.file("log.jsonl").stream()) …` |
| Copy a file | `Bun.write(dest, Bun.file(src))` | `await Bun.write("backup.html", Bun.file("report.html"));` |
| Check existence | `Bun.file(path).size` | `(await Bun.file(path).exists())` or `file.size > 0` |

Avoid `node:fs` sync helpers in new async code. Use `Bun.file`/`Bun.write` directly.

## HTTP server

```ts
const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () => new Response("Plannator"),
    "/report": () => new Response(Bun.file("report.html")),
  },
});
```

Serve static files by passing `Bun.file(path)` to `Response` — do not read them into memory first.

## Shell / subprocess

```ts
const proc = Bun.spawn({
  cmd: ["plannotator", "annotate", "plan.md", "--gate"],
  stdout: "pipe",
  stderr: "pipe",
});
const output = await Bun.readableStreamToText(proc.stdout);
const code = await proc.exited;
```

Use `Bun.spawn` instead of `node:child_process`. Read streams with `Bun.readableStreamToText`.

## Environment

```ts
const dataDir = Bun.env.PLANNOTATOR_DATA_DIR ?? `${Bun.env.HOME}/.plannotator`;
```

Prefer `Bun.env` over `process.env` in new code.

## Path / module resolution

```ts
const resolved = import.meta.resolve("./SKILL.md");
const syncResolved = Bun.resolveSync("effect", import.meta.dir);
```

Use `import.meta.resolve` for async needs; `Bun.resolveSync` for synchronous resolution.

## Streams & JSONL

```ts
for await (const chunk of Bun.file("plans.jsonl").stream()) {
  for (const record of Bun.JSONL.parseChunk(chunk)) {
    consume(record);
  }
}
```

Use `Bun.JSONL.parseChunk` for lazy JSONL parsing without loading the whole file.

## Hash / crypto

```ts
const hasher = new Bun.CryptoHasher("sha256");
hasher.update(text);
const hash = hasher.digest("hex");
```

Use `Bun.CryptoHasher` instead of `node:crypto` for new code.

## Timing

```ts
const start = Bun.nanoseconds();
// … work …
const elapsedUs = (Bun.nanoseconds() - start) / 1000;
```

Use `Bun.nanoseconds()` for benchmarks. Do not use `Date.now()` for micro-benchmarks.

## Archive

```ts
// Compression level 9 is a good default for JSON-heavy manifests.
const archive = new Bun.Archive({ "report.html": html }, { compress: "gzip", level: 9 });
const bytes = await archive.bytes();

// Extract everything to disk
await archive.extract("/tmp/plans", { glob: ["**", "!node_modules/**"] });

// Or inspect in memory without disk I/O (great for dry-runs)
const files = await archive.files(["*.json"]);
const manifest = files.get("manifest.json");
const json = manifest ? await manifest.text() : undefined;
```

Exact signatures:

```ts
new Bun.Archive(data: ArchiveInput, options?: { compress?: "gzip"; level?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 })
archive.extract(path: string, options?: { glob?: string | readonly string[] }): Promise<number>
archive.blob(): Promise<Blob>
archive.bytes(): Promise<Uint8Array<ArrayBuffer>>
archive.files(glob?: string | readonly string[]): Promise<Map<string, File>>
```

Use `Bun.Archive` for zip/tar-style archives instead of `node:fs` + external tools. Prefer `archive.files()` for dry-runs; use `extract()` only when you need files on disk. Bun.Archive rejects absolute paths and normalizes `..`.

## Glob

```ts
const glob = new Bun.Glob("**/*-denied.md");
for await (const file of glob.scan(plansDir)) {
  process(file);
}
```

Prefer `Bun.Glob` over `node:fs` recursive walks or shell `find`.

## TOML / Markdown

```ts
const config = Bun.TOML.parse(await Bun.file("dx.config.toml").text());
const html = await Bun.markdown.html(markdown);
```

Use `Bun.TOML.parse` and `Bun.markdown.*` helpers when available.

## Inspection / tables

```ts
const rows = [
  { file: "lib/r-score.ts", status: "modify", bytes: 1247 },
  { file: "lib/governance.ts", status: "add", bytes: 89 },
];

console.log(Bun.inspect.table(rows, { colors: true }));
```

`Bun.inspect.table()` returns a formatted string. Use it for CLI dry-run output instead of hand-rolled column alignment.

## Testing

```ts
import { describe, expect, test } from "bun:test";

describe("plannator-example", () => {
  test("reads a file", async () => {
    const text = await Bun.file("README.md").text();
    expect(text).toContain("Plannator");
  });
});
```

## Anti-patterns

| Avoid | Prefer |
| --- | --- |
| `readFileSync` / `writeFileSync` from `node:fs` | `Bun.file` / `Bun.write` |
| `Buffer` | `Uint8Array` |
| `process.env` | `Bun.env` |
| `node:crypto` | `Bun.CryptoHasher` |
| `node:child_process` | `Bun.spawn` |
| `Date.now()` for micro-benchmarks | `Bun.nanoseconds()` |
| Loading large JSON/JSONL fully into memory | `Bun.file(...).stream()` + `Bun.JSONL.parseChunk` |

## Verification

Run the grounding script to verify reference files are present and canonical URLs are reachable:

```bash
bun run ground-references
```
