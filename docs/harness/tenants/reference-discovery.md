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
| Cloudflare two-token | `CLOUDFLARE_API_TOKEN` (Pages/API, no Zone.DNS scope) · `CLOUDFLARE_DNS_API_TOKEN` (Zone.DNS:Read/Edit) | `lib/env-check.ts` · `scripts/cloudflare-dns-sync.ts` · [`proton-integration.md`](proton-integration.md) |
| Compliance mock | `COMPLIANCE_MOCK_PORT` (server listen port) · `COMPLIANCE_MOCK_URL` (client base URL) | `tools/state-compliance-mock.ts` · `lib/operations/state-compliance-http.ts` |
| Telegram catalog cron | `TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE` (cron expr) · `TELEGRAM_CATALOG_RESEARCH_CRON_TITLE` (job/log title) | `lib/telegram/catalog-research/constants.ts` |
| Telegram catalog LLM | `TELEGRAM_CATALOG_RESEARCH_LLM_KEY` (alias → `OPENAI_API_KEY`) · `..._LLM_MODEL` · `..._LLM_URL` | `lib/telegram/catalog-research/llm-pass.ts` |

Per-pair disambiguation table: [`docs/registry-client.md`](../../registry-client.md) §Env naming: similar pairs.

New env keys: prefer SSOT helpers in `config/r2-env.ts` over raw `Bun.env` reads in harness perimeter.

## Compose

| Layer | Gate |
|-------|------|
| Harness plane | `bun run reference:discover:check` |
| Public plane | `bun run public:discover:check` |
| Both planes | `bun run discover:compose:check` |
| Agent skills | `bun run skills:validate` (definitions · metadata · links · loop registry) |
| Markdown SSOT | `bun tools/doc-map-check.ts` |
| Bun `@see` / taxonomy | `bun tools/bun-doc-refs.ts integrity` |
| Audit catalog | `bun run audit:verify` |
| Tenant gap rows | skill `audit-gap-close` · tenant gap map |
| Code symbol collisions | ast-grep `collisions` / `anchors` |
| Registry live | `bun run verify:registry-client` |
| Proof catalog | `reference-discovery-v1` · `freshRerun: discover:compose:check` |

## Audit evidence (Discovery → Audit → Re-gate)

```bash
bun run discover:compose:check
bun run reference:discover:check
bun run skills:validate
bun run audit:verify
bun tools/doc-map-check.ts
bun tools/bun-doc-refs.ts integrity
```

| Gate | Last run | Result |
|------|----------|--------|
| `discover:compose:check` | 2026-07-26 | 0 errors · harness + public |
| `reference:discover:check` | 2026-07-28 | 0 errors · 0 warn · 50 info |
| `audit:verify` | 2026-07-26 | pass · 4 findings · 5 concepts |
| `docs:map:check` | 2026-07-26 | pass |
| `bun-doc-refs integrity` | 2026-07-26 | pass · 2277 links |
| `reference-discovery --json --skip-unused` | 2026-08-04 | 0 errors · 5 warning-tier findings |
| `skills:validate` | 2026-08-04 | pass · 34 definitions · 23 loop-registry entries · optional `bet-ticker-worker` warning |
| `harness-skills-catalog` | 2026-08-04 | 34 repository skill definitions |

## Retirement

Promote to spine cron or pre-commit `--check` on staged harness paths when warn count stays at zero for two release cycles.

**Owner** `// owner: platform / docs operate`

**Fresh-rerun** `bun run docs:reference-discovery`
