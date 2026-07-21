# Bun native capabilities (platform note)

> **JIT:** Feature notes. API lookup → `bun tools/bun-doc-refs.ts suggest "<api>"` · `bun run dx:catalog`.

| | |
| --- | --- |
| **Verified runtime** | Bun **1.4.0** — WebView / cron / udpSocket / `Bun.markdown` present |
| **Canonical refs** | `bun tools/bun-doc-refs.ts suggest "…"` · operate [BUN_DOCS_OPERATE.md](./BUN_DOCS_OPERATE.md) |
| **Not product desk SSOT** | Partner UI / Telegram / balance-sheet flows unless a package owns them |

## API map (homebase)

| API | Use when | Smoke / DX |
|-----|----------|------------|
| `Bun.WebView` | headless UI / automation | runtime `typeof` · catalog |
| `Bun.markdown.ansi` | terminal markdown | `bun ./file.md` · ship note 1.3.12 |
| `Bun.cron` | in-process schedule | docs operate / R2 patterns |
| `Bun.udpSocket` | UDP + ICMP/truncation | re-read when editing `lib/udp` |
| WebCrypto SHA3 / X25519 | hashing / key exchange | `tests/bun-crypto-webcrypto.test.ts` · `crypto.sha3` / `crypto.x25519` |
| `URLPattern` | URL routing (no `$N` leak) | `tests/bun-urlpattern.test.ts` |
| `Bun.Glob.scan` | tree walk; `**/X/...` boundary | `tests/bun-glob-scan.test.ts` |
| `Bun.stripANSI` / `stringWidth` | TTY width | `tests/bun-ansi-width.test.ts` — **no** npm `string-width` |

## Platform integration

| Concern | Owner |
|---------|--------|
| Install / pin | [UNIFIED.md](./UNIFIED.md) · `packageManager` bun@1.4.0 |
| Day-loop tests | `test:changed` · `test:parallel` · `test:isolate` · `test:shard` — [harness/README.md](./harness/README.md) |
| DX one-liners | `bun run dx:catalog` |
| Wire / brands | [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) |

## Release maps

Upstream: [v1.3.12](https://bun.com/blog/bun-v1.3.12) · [v1.3.13](https://bun.com/blog/bun-v1.3.13) (`--changed`). Pin **1.4.0** is a superset — do not re-document every bugfix bullet.

## References

`bun run dx:catalog` · `bun tools/bun-doc-refs.ts suggest "<api>"` · `bun run docs:refresh` · https://bun.com/docs/llms.txt

*Verified 2026-07-21 on Bun 1.4.0.*
