# Wire boundary (parse once)

> **JIT:** Parse-once / `unknown` / brands at the edge. Unresolved → this file only.

**SSOT** for untrusted → trusted domain values. Code: [`config/eslint/plugin-harness/boundary.ts`](../config/eslint/plugin-harness/boundary.ts) · brands: [`lib/types/branded/README.md`](../lib/types/branded/README.md) · thesis: [parse, don’t validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/).

## Principle

```text
wire / CLI / env / JSON / HTTP
        →  BOUNDARY (parse* · decode* · is* · unknown OK)
        →  INTERIOR (brands / domain types only — no unknown args, no re-decode)
```

## Boundary (where `unknown` / decode OK)

| Kind | SSOT |
|------|------|
| Paths | `BOUNDARY_PATH_RE` — `lib/types/branded/**`, `**/boundary|wire|ingress/**`, `*boundary|wire|ingress*.ts`, `lib/security/r2-credentials.ts` |
| Names | `BOUNDARY_FN_NAME_RE` — `parse*` · `decode*` · `assert*` · `is*` · `from*` · `*FromUnknown|Wire|Json|Env` |
| Guards | `(v: unknown) => v is T` |

## Interior (not allowed)

| Ban | Prefer |
|-----|--------|
| `function f(x: unknown)` | brands / concrete types |
| `decodeUnknown*` mid-stack | call named `parse*` at the edge |
| bare `sessionId: string` | `SessionId` + `parse*` / `as*` / `try*` |

## Rules

| Rule | Severity |
|------|----------|
| `harness/no-decode-unknown-outside-boundary` | **error** |
| `harness/no-unknown-function-param` | **error** on `HARNESS_PATHS` (see `eslint.harness.config.ts`) |
| `branded-id-check --staged --strict` | **error** on new bare `*Id` / opaque `id` without `// brand-ok` |

```bash
bun run lint:harness
bun tools/branded-id-check.ts --staged --strict
bun tools/harness-violations.ts --path lib --rule unknown
```

Suppress only with reason: `// brand-ok` or targeted eslint-disable on a true edge.

## Checklist

1. Raw `unknown`/JSON only on `parse*` / boundary path / type guard  
2. Emit brands/structs from that edge  
3. Interior uses brands only  
4. No `decodeUnknownSync` outside the edge  
5. Partner limits rows: when the backend lands `lifecycleState` / `derivesFrom`, parse via `parseLimitRowWire` per [partner-limits E3 wire contract](./harness/tenants/partner-limits.md#e3-wire-contract-pending)  

**Spine parse examples:** `parseImageEvidenceMeta` / `isImageEvidenceMeta` in [`lib/image-metadata.ts`](../lib/image-metadata.ts) — wire JSON → `ImageEvidenceMeta` (TEST-003 evidence) via `parse*` / `is*` name rules; no extra path allowlist.

Package imports ≠ wire: [IMPORT_BOUNDARIES.md](./IMPORT_BOUNDARIES.md). Install ≠ wire: [UNIFIED.md](./UNIFIED.md).
