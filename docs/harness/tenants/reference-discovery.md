# Tenant: reference-discovery

**Tenant** `reference-discovery` (agent-operated; not on spine cron yet)
**Runs** `bun tools/reference-discovery.ts --check` **Proof** manual / agent
cleanup batch **Skill** `.agents/skills/reference-discovery/SKILL.md`

## Signal (failure)

`bun run reference:discover:check` exits non-zero — plane mismatch, legacy
domain, or warn-tier drift in harness perimeter.

## Intervention (repair)

1. Full report: `bun tools/reference-discovery.ts --json`
2. Fix **errors** first (`plane-mismatch` — REGISTRY_URL vs Pages host)
3. Fix **warnings** (`legacy-domain`, `skill-broken-link`, `unused-canonical`,
   high-similarity env pairs)
4. Consolidate naming on SSOT:
   - npm read base → `factoryWagerNpmRegistryUrlFromEnv()`
   - artifact API origin → `factoryWagerRegistryUrlFromEnv()`
   - registry contract → [`docs/registry-client.md`](../../registry-client.md)
   - Pages → `resolveRoutingProbeBaseUrl()` ·
     [`config/r2-env.ts`](../../../config/r2-env.ts)
   - R2 bucket alias → `resolveR2BucketName()` in
     [`lib/security/r2-credentials.ts`](../../../lib/security/r2-credentials.ts)
     (`R2_BUCKET_NAME` / `S3_BUCKET_NAME`)
5. Re-run: `bun run reference:discover:check` · `bun tools/doc-map-check.ts`

## Similar-env allowlist (intentional)

These pairs are **not** drift — scanner skips them via `isAllowedSimilarEnvPair`
in `lib/reference-discovery.ts`:

| Cluster                | Keys                                                                                                           | Owner                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Secrets service IDs    | `FW_INFRA_SECRETS_SERVICE` · `FW_R2_SECRETS_SERVICE` · `FW_SECRETS_SERVICE`                                    | `lib/security/infra-secrets.ts`                                                                          |
| S3-compat bucket       | `R2_BUCKET_NAME` · `S3_BUCKET_NAME`                                                                            | `lib/security/r2-credentials.ts` · `config/r2-env.ts`                                                    |
| Search bench pin       | `SEARCH_BENCH_PIN_*` fail vs `SEARCH_BENCH_PIN_WARN_*` warn thresholds                                         | `scripts/search-benchmark-pin.ts`                                                                        |
| Search bench proxy     | `SEARCH_BENCH_PROXY_URL` · `SEARCH_BENCH_PROXY_AUTH`                                                           | search bench harness                                                                                     |
| Bun fetch proxy        | `HTTP_PROXY` · `HTTPS_PROXY` · `NO_PROXY` (plus lowercase aliases in the runtime contract)                     | `lib/net/proxy.ts` · `docs/guides/bun-fetch-proxy-environment.md`                                        |
| Cloudflare two-token   | `CLOUDFLARE_API_TOKEN` (Pages/API, no Zone.DNS scope) · `CLOUDFLARE_DNS_API_TOKEN` (Zone.DNS:Read/Edit)        | `lib/env-check.ts` · `scripts/cloudflare-dns-sync.ts` · [`proton-integration.md`](proton-integration.md) |
| Compliance mock        | `COMPLIANCE_MOCK_PORT` (server listen port) · `COMPLIANCE_MOCK_URL` (client base URL)                          | `tools/state-compliance-mock.ts` · `lib/operations/state-compliance-http.ts`                             |
| Telegram catalog cron  | `TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE` (cron expr) · `TELEGRAM_CATALOG_RESEARCH_CRON_TITLE` (job/log title) | `lib/telegram/catalog-research/constants.ts`                                                             |
| Telegram catalog LLM   | `TELEGRAM_CATALOG_RESEARCH_LLM_KEY` (alias → `OPENAI_API_KEY`) · `..._LLM_MODEL` · `..._LLM_URL`               | `lib/telegram/catalog-research/llm-pass.ts`                                                              |
| Concept audit controls | `CONCEPT_AUDIT_MIN_USAGE` · `..._MAX_USAGE`; `..._SHOW_UNUSED` · `..._SHOW_USED`; `..._SORT` · `..._STRICT`    | independent filter, display, ordering, and enforcement options in `scripts/concept-audit.ts`             |
| Concept graph controls | `CONCEPT_GRAPH_BUNPORT` · `..._PORT`; `..._FORMAT` · `..._PORT`                                                | native-default bind selector, explicit port override, and output format in `scripts/concept-graph.ts`    |
| Alert webhook bind     | `ALERT_WEBHOOK_PORT` (listen) · `ALERT_WEBHOOK_URL` (POST sink)                                                | orthogonal port vs URL — skill/cron patterns · not aliases                                               |
| Bun types CI vs tip    | `BUN_TYPES_CI` (merge-proof types step toggle) · `BUN_TYPES_TIP` (tip checkout path for tip-diff)              | `docs/design/bun-types-inventory.md` · `tools/bun-types-tip-*.ts`                                        |

Per-pair disambiguation table:
[`docs/registry-client.md`](../../registry-client.md) §Env naming: similar
pairs.

New env keys: prefer SSOT helpers in `config/r2-env.ts` over raw `Bun.env` reads
in harness perimeter.

## Compose

| Layer                  | Gate                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| Harness plane          | `bun run reference:discover:check`                                         |
| Public plane           | `bun run public:discover:check`                                            |
| Both planes            | `bun run discover:compose:check`                                           |
| Agent skills           | `bun run skills:validate` (definitions · metadata · links · loop registry) |
| Markdown SSOT          | `bun tools/doc-map-check.ts`                                               |
| Bun `@see` / taxonomy  | `bun tools/bun-doc-refs.ts integrity`                                      |
| Audit catalog          | `bun run audit:verify`                                                     |
| Tenant gap rows        | skill `audit-gap-close` · tenant gap map                                   |
| Code symbol collisions | ast-grep `collisions` / `anchors`                                          |
| Registry live          | `bun run verify:registry-client`                                           |
| Proof catalog          | `reference-discovery-v1` · `freshRerun: discover:compose:check`            |

## Audit evidence (Discovery → Audit → Re-gate)

```bash
bun run discover:compose:check
bun run reference:discover:check
bun run skills:validate
bun run audit:verify
bun tools/doc-map-check.ts
bun tools/bun-doc-refs.ts integrity
```

Do not preserve dated counts here; they become false context as skills and
catalogs change. A fresh run is the evidence. Interpret it as follows:

| Gate                                       | Merge-ready result                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `discover:compose:check`                   | Zero error- and warning-tier harness/public findings.                           |
| `reference:discover:check`                 | Zero errors and warnings; naming-cluster info remains advisory.                 |
| `audit:verify`                             | Catalog and referenced concept rows validate.                                   |
| `bun tools/doc-map-check.ts`               | All canonical paths and Markdown SSOT links resolve.                            |
| `bun-doc-refs integrity`                   | Zero bad canonical-map anchors and zero dead repository links.                  |
| ast-grep `anchors --zone agents --fail-on` | Every enforced source-backed agent anchor resolves.                             |
| `skills:validate`                          | Current definitions, metadata, links, and loop registrations validate together. |

For Bun 1.4 release pointers, append `bun run docs:blog-assets:check` and
`bun run channels:bun-1.4:check`; reference discovery does not replace their
official-source, adoption, channel-membership, or snapshot checks.

## Retirement

Promote to spine cron or pre-commit `--check` on staged harness paths when warn
count stays at zero for two release cycles.

**Owner** `// owner: platform / docs operate`

**Fresh-rerun** `bun run docs:reference-discovery`
