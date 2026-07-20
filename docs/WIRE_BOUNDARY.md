# Wire boundary (parse once)

**SSOT for where untrusted data becomes trusted domain values.**

Enforcement code: [`config/eslint/plugin-harness/boundary.ts`](../config/eslint/plugin-harness/boundary.ts)  
ESLint entry: [`eslint.harness.config.ts`](../eslint.harness.config.ts) (re-exported by `eslint.bun-native.config.ts` for pre-commit)  
Brands: [`lib/types/branded/README.md`](../lib/types/branded/README.md)  
Package import rules (different concern): [`IMPORT_BOUNDARIES.md`](./IMPORT_BOUNDARIES.md)  
Thesis: [lopopolo/harness-engineering — domain modeling](https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/README.md) ([parse, don’t validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/))

---

## Principle

```text
  wire / CLI / env / JSON / HTTP
              │
              ▼
     ┌─────────────────┐
     │  WIRE BOUNDARY  │  parse* · decode* · is* · branded parse*
     │  (unknown OK)   │  decodeUnknownSync OK only here
     └────────┬────────┘
              │  domain types / brands only
              ▼
     ┌─────────────────┐
     │  INTERIOR       │  SessionId, UserId, Docs, …
     │  (no unknown    │  no decodeUnknown*
     │   fun args)     │  no bare string domain IDs
     └─────────────────┘
```

1. **Accept uncertainty once** at the edge (`unknown`, raw `string`, JSON).
2. **Parse into domain types** (brands, structs, enums).
3. **Interior code never re-decodes** and never takes `unknown` “just in case.”

Ryan Lopopolo (Jul 2026): *walk the AST with eslint, ban `decodeUnknownSync` anywhere except the boundary; ban `unknown` as a function argument too.*

---

## What counts as “the boundary”

### By path (file owns ingress)

| Path pattern | Role |
|--------------|------|
| `lib/types/branded/**` | Brand forge + `parse*` constructors |
| `**/boundary/**` | Explicit boundary packages/modules |
| `**/wire/**` | Wire codecs |
| `**/ingress/**` | Ingress adapters |
| `**/adapters/in/**` | Inbound adapters |
| `*boundary*.ts` / `*wire*.ts` / `*ingress*.ts` | Named boundary files |
| `lib/security/r2-credentials.ts` | Credential normalize (wire → soft brands) |

Regex SSOT: `BOUNDARY_PATH_RE` in `config/eslint/plugin-harness/boundary.ts`.

### By function name (owner is the parse step)

Even outside the paths above, these **names** may take `unknown` / call decode APIs (they *are* the edge):

| Name shape | Examples |
|------------|----------|
| `parse*`, `decode*`, `assert*`, `is*` | `parseSessionId`, `decodeBody`, `isUserId` |
| `from*`, `read*`, `load*`, `normalize*`, `coerce*` | `fromWire`, `normalizeCredentials` |
| `*FromUnknown` / `*FromWire` / `*FromJson` / `*FromEnv` | `docsFromUnknown` |
| Core brand helpers | `parseBrandId`, `tryBrandId`, `makeId` |

Regex SSOT: `BOUNDARY_FN_NAME_RE` in the same file.

### Type guards

`(value: unknown) => value is T` is boundary-shaped (ESLint allows `unknown` param when return is a type predicate).

---

## What is interior (not boundary)

| Interior | Not allowed |
|----------|-------------|
| Domain services, R2 helpers, dashboards, tools mid-stack | `function f(x: unknown)` |
| Business logic after request handling | `decodeUnknownSync(...)` / `Schema.decodeUnknown*` |
| Public APIs that already have domain types | Re-accepting raw wire as `unknown` “for flexibility” |

**Use instead:** branded params (`SessionId`), concrete interfaces, or call a named `parse*` at the true edge.

---

## Enforced rules

| Rule ID | Severity | Blocks |
|---------|----------|--------|
| `harness/no-decode-unknown-outside-boundary` | **error** (all harness paths) | `decodeUnknownSync`, `decodeUnknown`, `decodeUnknownEither` / `Option` / `Result` / `Exit` |
| `harness/no-unknown-function-param` | **warn** harness · **error** on `lib/types/**`, `lib/security/**`, `lib/core/**`, `**/boundary/**`, `**/wire/**`, `**/ingress/**`, `STRICT_INVENTORY` | Parameter typed as `unknown` outside boundary path/name/type-guard |
| Brand detector (`branded-id-check --staged --strict`) | **error** on new staged lines | Domain `*Id` / `id` as bare `string` without `// brand-ok` |
| ast-grep `no-decode-unknown-sync` | error (scan visibility) | Same decode call patterns |

```bash
bun run lint:harness
bunx eslint --config eslint.harness.config.ts path/to/file.ts
bun tools/branded-id-check.ts --staged --strict

# Organize easy violations (path:line) + open in editor (bunfig [debug].editor)
bun tools/harness-violations.ts --path lib/r2 --rule unknown
bun tools/harness-violations.ts --open=3
bun run harness:violations
```

### Suppressions (rare)

| Intent | Mechanism |
|--------|-----------|
| Opaque non-domain primary key | `// brand-ok` on that line (brand detector) |
| True temporary boundary not yet named | `// eslint-disable-next-line harness/no-unknown-function-param` + reason |
| Dual port `string \| Brand` until normalize | Prefer `try*` / dual type; detector allows `string \| XId` |

Do **not** disable decode bans to “make the interior easier.”

---

## Related boundaries (do not conflate)

| Concern | Doc / tool | Owns |
|---------|------------|------|
| **Wire / type boundary** | this file | `unknown` → domain; decode once |
| **Branded ID types** | [`lib/types/branded/README.md`](../lib/types/branded/README.md) | Nominal IDs after wire |
| **Package import boundaries** | [`IMPORT_BOUNDARIES.md`](./IMPORT_BOUNDARIES.md) | Which packages may import which roots |
| **Bun install / machine** | [`UNIFIED.md`](./UNIFIED.md) | Cache, linker, bunfig |
| **Artifact terminology** | [`.custom-instructions.md`](../.custom-instructions.md) | Prefer “artifact” over “codebase” |

---

## Agent checklist

When adding an endpoint, CLI, or env reader:

1. [ ] Put raw `unknown` / JSON only on a `parse*` / boundary file / type guard.
2. [ ] Emit brands or domain structs from that edge (`parseSessionId`, schema decode, …).
3. [ ] Interior signatures use brands/domain types only — no `unknown`, no bare `sessionId: string`.
4. [ ] No `decodeUnknownSync` outside the edge.
5. [ ] `bun run check:brands:staged` and harness ESLint clean on your paths.

---

## References

| Source | Why |
|--------|-----|
| [harness-engineering](https://github.com/lopopolo/harness-engineering) | Practice corpus |
| [domain-modeling](https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/README.md) | One owner; parse at boundary |
| [hyperbola case](https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/hyperbola.md) | Domain types replace raw strings |
| [Parse, don’t validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) | Type design premise |
| [code-is-not-the-artifact](https://hyperbo.la/w/code-is-not-the-artifact/) | Specs/contracts outlive source |
| Plugin | `config/eslint/plugin-harness/boundary.ts` |
| Path SSOT | [`lib/docs/repo-docs.ts`](../lib/docs/repo-docs.ts) (`CANONICAL_REPO_DOCS.wireBoundary`) |

*Keep this document aligned with `BOUNDARY_PATH_RE`, `BOUNDARY_FN_NAME_RE`, and `DECODE_CALLEE_NAMES` in the ESLint plugin.*
