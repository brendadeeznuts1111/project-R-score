---
name: stdin-audit
description: "Zero-copy stdin analysis with Col-89 width compliance, SHA256 hashing, zstd artifacts"
user-invocable: false
version: 2.0.0
---

# Stdin Audit

Per-line stdin analysis: width compliance, content hashing, health scoring, compressed artifacts.

---

## APIs Used

`Bun.stdin.arrayBuffer()` · `Bun.indexOfLine()` · `Bun.stringWidth()` · `Bun.wrapAnsi()` · `Bun.CryptoHasher` · `Bun.color()` · `Bun.inspect.table()` · `Bun.zstdCompressSync()` · `Bun.gzipSync()` · `Bun.JSONL.parseChunk()` · `Bun.deepEquals()`

---

## Usage

```bash
echo -e "multi\nline\ntext" | bun stdin-audit.ts
cat README.md | bun stdin-audit.ts
cat events.jsonl | bun stdin-audit.ts --jsonl
cat source.ts | bun stdin-audit.ts --audit-width
```

---

## Output Columns

| Column | Source | Description |
|--------|--------|-------------|
| `length` | `string.length` | Character count |
| `visWidth` | `Bun.stringWidth()` | Terminal column width |
| `tension` | `calcTension()` | 0–1 multi-factor score |
| `col89` | `visWidth <= 89` | `pass` or `FAIL` |
| `wRatio` | `visWidth / length` | 1.0 = ASCII, >1 = wide |
| `type` | regex | `empty` `ws` `code` `prose` `data` |
| `sha256` | `Bun.CryptoHasher` | First 8 hex of SHA256 |
| `health` | `calcHealth()` | 0–100 composite score |
| `preview` | `Bun.escapeHTML()` | First 20 chars |
| `rgb` | `Bun.color()` | Tension gradient color |
| `ansi` | ANSI 24-bit | Visual bar |

---

## Scoring

### Tension

Multi-factor, anchored to Col-89. High = bad.

```typescript
const COL_REF = 89;
const TYPE_MULT: Record<string, number> = {
  empty: 0.0, ws: 0.1, code: 1.0, prose: 0.8, data: 0.6
};

function calcTension(visWidth: number, charLen: number, lineType: string): number {
  const wf = Math.min(1, visWidth / COL_REF);                   // 0.6 weight
  const disc = charLen > 0 ? Math.abs(1 - visWidth / charLen) : 0; // 0.2 weight
  const tf = wf * (TYPE_MULT[lineType] ?? 1.0);                 // 0.2 weight
  return Math.max(0, Math.min(1, 0.6 * wf + 0.2 * disc + 0.2 * tf));
}
// 1.0 → hsl(0 100% 50%) red    0.0 → hsl(120 100% 50%) green
```

### Health

```typescript
function calcHealth(tension: number, col89: boolean, wRatio: number): number {
  return Math.round(
    (1 - tension) * 60 +           // 60pts: low tension
    (col89 ? 25 : 0) +             // 25pts: within Col-89
    Math.max(0, (1 - Math.abs(1 - wRatio)) * 15)  // 15pts: wRatio near 1.0
  );
}
```

### Line Classifier

```typescript
function classifyLine(line: string): string {
  if (line.length === 0) return "empty";
  if (/^\s+$/.test(line)) return "ws";
  if (/^\s*(\/\/|\/\*|\*|#|import |export |const |let |var |function |class |if |for |while |return )/.test(line)) return "code";
  if (/^[\[{]/.test(line) || /[,;:{}[\]]$/.test(line.trim())) return "data";
  return "prose";
}
```

### Thresholds

| Metric | Good | Warning | Bad |
|--------|------|---------|-----|
| `tension` | < 0.3 | 0.3–0.7 | > 0.7 |
| `health` | 80–100 | 50–79 | < 50 |
| `wRatio` | 0.9–1.1 | 1.1–1.5 | > 1.5 |

---

## Core Patterns

### Stdin + Line Splitting

```typescript
const raw = await Bun.stdin.bytes();
const lines: string[] = [];
const decoder = new TextDecoder();
let offset = 0;
while (offset < raw.length) {
  const idx = Bun.indexOfLine(raw, offset);
  if (idx === -1) { lines.push(decoder.decode(raw.subarray(offset))); break; }
  lines.push(decoder.decode(raw.subarray(offset, idx)));
  offset = idx + 1;
}
```

### Width Analysis

```typescript
const visWidth = Bun.stringWidth(line, { countAnsiEscapeCodes: false });
const col89 = visWidth <= 89;
const wrapped = Bun.wrapAnsi(output, 89, { wordWrap: true, trim: true });
```

### Content Hashing

```typescript
const hasher = new Bun.CryptoHasher("sha256");
hasher.update(line);
const sha256 = hasher.digest("hex").slice(0, 8);
```

### Color Gradient

```typescript
const hue = (1 - tension) * 120;
const rgba = Bun.color(`hsl(${hue} 100% 50%)`, "rgba");
const [r, g, b] = rgba.match(/(\d+),\s*(\d+),\s*(\d+)/)!.slice(1).map(Number);
const bar = `\x1b[38;2;${r};${g};${b}m${"█".repeat(Math.max(1, Math.round(tension * 10)))}\x1b[0m`;
```

### JSONL Streaming

```typescript
const records: any[] = [];
for await (const chunk of Bun.stdin.stream()) {
  records.push(...Bun.JSONL.parseChunk(chunk));
}
```

### Snapshot + Artifacts

```typescript
// Snapshot
const snap = { version: "2.0.0", lines: stats.length, bytes: raw.byteLength };
const prev = await Bun.file("/tmp/stdin-audit-snapshot.json").json().catch(() => ({}));
if (!Bun.deepEquals(snap, prev)) {
  await Bun.write("/tmp/stdin-audit-snapshot.json", JSON.stringify(snap));
}

// Artifacts (zstd preferred, gzip fallback)
const payload = new TextEncoder().encode(JSON.stringify({ meta: snap, lines: stats }));
await Bun.write("/tmp/stdin-audit.json.zst", Bun.zstdCompressSync(payload, { level: 11 }));
await Bun.write("/tmp/stdin-audit.json.gz", Bun.gzipSync(payload, { level: 9 }));
```

---

## Artifacts

| File | Format | Read |
|------|--------|------|
| `/tmp/stdin-audit.json.zst` | Zstd (preferred) | `zstd -d --stdout FILE \| jq .` |
| `/tmp/stdin-audit.json.gz` | Gzip (legacy) | `gunzip -c FILE \| jq .` |
| `/tmp/stdin-audit-snapshot.json` | JSON | `{ version, lines, bytes }` |

```typescript
// Programmatic read (zstd)
const buf = await Bun.file("/tmp/stdin-audit.json.zst").bytes();
const report = JSON.parse(new TextDecoder().decode(Bun.zstdDecompressSync(buf)));
```

---

## Integration

```bash
# Col-89 violations
zstd -d --stdout /tmp/stdin-audit.json.zst | jq '.lines[] | select(.col89 == false)'

# Unhealthy lines
zstd -d --stdout /tmp/stdin-audit.json.zst | jq '.lines[] | select(.health < 50)'
```

```typescript
// Width audit table
const report = JSON.parse(new TextDecoder().decode(
  Bun.zstdDecompressSync(await Bun.file("/tmp/stdin-audit.json.zst").bytes())
));
const violations = report.lines.filter((l: any) => !l.col89).slice(0, 50);
if (violations.length) {
  Bun.inspect.table(violations, ["visWidth", "type", "health", "sha256", "preview"], { colors: true });
}
```

---

## File Location

```
~/.claude/stdin-audit.ts
```

---

## Version History

- **v2.0.0** (2026-02-01): Renamed from stdin-quantum. Col-89 width compliance, multi-factor tension, SHA256 hashing, zstd artifacts, health scoring, JSONL streaming
- **v1.5.2** (2026-01-18): Fixed Bun API imports, added parseRgba helper
- **v1.5.1** (2026-01-18): Initial release
