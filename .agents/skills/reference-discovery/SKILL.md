---
name: reference-discovery
description: |
  Discover unused, stale, and similarly named references in the harness perimeter.
  Use when cleaning up naming drift (REGISTRY_URL vs ROUTING_PROBE_BASE_URL), orphan
  CANONICAL_TOOLS paths, legacy domains, broken skill links, or plane mismatches.
---

# Reference discovery

Deterministic discovery for **harness perimeter** (`lib/`, `tools/`, `docs/`,
`config/`, `functions/`, `scripts/`, `tests/`, `public/registry/`,
`.agents/skills/`). Does not scan `projects/active/**`.

## Quick start

```bash
bun tools/reference-discovery.ts
bun tools/reference-discovery.ts --check          # exit 1 on error-tier (plane mismatch)
bun tools/reference-discovery.ts --check --min-severity warn  # stricter cleanup gate
bun tools/reference-discovery.ts --json --skip-unused
bun run reference:discover:check
```

## Agent cleanup workflow

1. **Run discovery** —
   `bun tools/reference-discovery.ts --json > /tmp/ref-discover.json`
2. **Triage by severity**
   - `error` · `plane-mismatch` — fix before merge (wrong host on wrong plane)
   - `warn` · `legacy-domain`, `unused-canonical`, `skill-broken-link`,
     `similar-env`
   - `info` · `naming-cluster` — consolidate docs; not blocking
3. **Apply SSOT** (registry / Pages split)
   - npm plane → `factoryWagerRegistryUrlFromEnv()` · `docs/registry-client.md`
   - Pages plane → `resolveRoutingProbeBaseUrl()` · `config/r2-env.ts`
4. **Re-run related gates**
   - `bun tools/doc-map-check.ts`
   - `bun tools/bun-doc-refs.ts integrity`
   - `bun run audit:verify`
5. **Structural overlap** (code symbols, not doc refs) — delegate to ast-grep:
   ```bash
   python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py collisions --zone agents
   python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py anchors --zone agents
   ```

## Finding kinds

| Kind                | Meaning                                   | Typical repair                                 |
| ------------------- | ----------------------------------------- | ---------------------------------------------- |
| `plane-mismatch`    | REGISTRY_URL ↔ Pages host (or inverse)    | Use correct env helper from `config/r2-env.ts` |
| `legacy-domain`     | `registry.factory-wager.co`               | Replace with `.com` SSOT                       |
| `naming-cluster`    | Multiple aliases for one plane            | Document canonical; delete duplicates          |
| `similar-env`       | Levenshtein-similar `Bun.env.*` keys      | Consolidate overrides in `r2-env.ts`           |
| `unused-canonical`  | `CANONICAL_TOOLS.*` path never referenced | Remove or wire into docs                       |
| `skill-broken-link` | Broken relative link in `SKILL.md`        | Fix path or add target file                    |

## Compose with sibling tools

- Public plane (`public/portal`, registry bake) → skill `public-discovery` ·
  `bun run public:discover:check`
- Bun `@see` / taxonomy → `bun tools/bun-doc-refs.ts` · skill `docs-integrity`
  tenant
- Bun 1.4 release graph → `bun run docs:blog-assets:check` ·
  `bun run channels:bun-1.4:check` ·
  [`BUN_1_4_MIGRATION.md`](../../../docs/BUN_1_4_MIGRATION.md) ·
  [`BUN_1_4_CHANNEL_LIFECYCLE.md`](../../../docs/BUN_1_4_CHANNEL_LIFECYCLE.md)
- Markdown SSOT paths → `bun tools/doc-map-check.ts`
- Audit orphan pages → `bun run audit:verify`
- Registry live probes → `bun run verify:registry-client`

## Doctor (skill loop)

```bash
bun tools/reference-discovery.ts --check --skip-unused
bun run public:discover:check
bun run discover:compose:check
```

Shared agent tooling:
[references/agent-tooling.md](../references/agent-tooling.md)

Runbook:
[docs/harness/tenants/reference-discovery.md](../../../docs/harness/tenants/reference-discovery.md)
