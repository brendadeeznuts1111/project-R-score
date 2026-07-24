# Tenant: reference-discovery

**Tenant** `reference-discovery` (agent-operated; not on spine cron yet)
**Runs** `bun tools/reference-discovery.ts --check`
**Proof** manual / agent cleanup batch
**Skill** `.agents/skills/reference-discovery/SKILL.md`

## Signal (failure)

`bun run reference:discover:check` exits non-zero — plane mismatch, legacy domain, or warn-tier drift in harness perimeter.

## Intervention (repair)

1. Full report: `bun tools/reference-discovery.ts --json`
2. Fix **errors** first (`plane-mismatch` — REGISTRY_URL vs Pages host)
3. Fix **warnings** (`legacy-domain`, `skill-broken-link`, `unused-canonical`, high-similarity env pairs)
4. Consolidate naming on SSOT:
   - npm → `factoryWagerRegistryUrlFromEnv()` · [`docs/registry-client.md`](../../registry-client.md)
   - Pages → `resolveRoutingProbeBaseUrl()` · [`config/r2-env.ts`](../../../config/r2-env.ts)
5. Re-run: `bun run reference:discover:check` · `bun tools/doc-map-check.ts`

## Compose

- Bun doc refs → `docs-integrity` tenant · `bun tools/bun-doc-refs.ts schedule --once`
- Code symbol collisions → ast-grep `collisions` / `anchors`
- Registry live → `bun run verify:registry-client`

## Retirement

Promote to spine cron or pre-commit `--check` on staged harness paths when warn count stays at zero for two release cycles.

**Owner** `// owner: platform / docs operate`

**Fresh-rerun** `bun run docs:reference-discovery`
