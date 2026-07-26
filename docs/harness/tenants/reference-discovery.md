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
   - R2 bucket alias → `resolveR2BucketName()` in [`lib/security/r2-credentials.ts`](../../../lib/security/r2-credentials.ts) (`R2_BUCKET_NAME` / `S3_BUCKET_NAME`)
5. Re-run: `bun run reference:discover:check` · `bun tools/doc-map-check.ts`

## Similar-env allowlist (intentional)

These pairs are **not** drift — scanner skips them via `isAllowedSimilarEnvPair` in `lib/reference-discovery.ts`:

| Cluster | Keys | Owner |
|---------|------|-------|
| Secrets service IDs | `FW_INFRA_SECRETS_SERVICE` · `FW_R2_SECRETS_SERVICE` · `FW_SECRETS_SERVICE` | `lib/security/infra-secrets.ts` |
| S3-compat bucket | `R2_BUCKET_NAME` · `S3_BUCKET_NAME` | `lib/security/r2-credentials.ts` · `config/r2-env.ts` |
| Search bench pin | `SEARCH_BENCH_PIN_*` fail vs `SEARCH_BENCH_PIN_WARN_*` warn thresholds | `scripts/search-benchmark-pin.ts` |
| Search bench proxy | `SEARCH_BENCH_PROXY_URL` · `SEARCH_BENCH_PROXY_AUTH` | search bench harness |

New env keys: prefer SSOT helpers in `config/r2-env.ts` over raw `Bun.env` reads in harness perimeter.

## Compose

- Bun doc refs → `docs-integrity` tenant · `bun tools/bun-doc-refs.ts schedule --once`
- Code symbol collisions → ast-grep `collisions` / `anchors`
- Registry live → `bun run verify:registry-client`

## Retirement

Promote to spine cron or pre-commit `--check` on staged harness paths when warn count stays at zero for two release cycles.

**Owner** `// owner: platform / docs operate`

**Fresh-rerun** `bun run docs:reference-discovery`
