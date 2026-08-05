# Tenant: Tennis HQ · FactoryWager registry auth

**Consumer** Tennis HQ cloud agent (remote sandbox)

**Token env** `FACTORY_WAGER_TOKEN`

**Vault** `pass://factorywager/FactoryWager Registry Token/password`

**Registry** `https://registry.factory-wager.com/`

**Status artifact**
[`/registry/tennis/agent-auth.json`](../../../public/registry/tennis/agent-auth.json)
(`status: configured`)

**Portal** [`/portal/tennis/`](../../../public/portal/tennis/) ·
[`/portal/env/`](../../../public/portal/env/)

**Producer runtime** [`https://tennis.factory-wager.com`](https://tennis.factory-wager.com)
· Cloudflare Worker `tennis-hq`

**Partner contracts join** live/offline bake →
[`/registry/tennis/partner-contracts.json`](../../../public/registry/tennis/partner-contracts.json)
· tool `bun tools/bake-tennis-partner-contracts.ts` · resilience notes
[`bake-resilience.md`](bake-resilience.md)

## Purpose

Give a **cloud agent** (remote sandbox) a Bearer token so it can:

1. Resolve/install `@factorywager/*` (and related scopes) from the FactoryWager
   registry when scoped install is configured.
2. Publish packages to the **private write plane** when that plane is available
   (local `serve-public` or direct R2 publish — not Pages).

The public read plane on Pages does **not** require the token for GETs.

## Operator-owned producer runtime

The canonical Tennis HQ runtime is deployed directly by FactoryWager operators;
it is not delegated to an external Git integration. Cloudflare owns DNS and TLS
for the Worker Custom Domain, while this repository owns its inventory and
consumer evidence.

| Proof | Value |
| ----- | ----- |
| Runtime | `https://tennis.factory-wager.com` |
| Worker | `tennis-hq` |
| Producer merge | `cb09198929929ed7b9970eed7f27bb3a82c964d2` |
| Worker version | `9aaae6ba-7293-4cda-b2ab-41cd068a76ca` |
| Verified | 2026-08-04 · identity, shell, glossary, fail-closed v1 auth |
| Inventory | `config/surfaces.toml` → `/registry/surfaces-state.json` |
| Cross-host probe | `bun run verify:weave -- --subdomains` → version, glossary, fail-closed v1 read |

Producer service auth is a distinct boundary from FactoryWager registry auth.
`FACTORY_WAGER_TOKEN` is not sent to Tennis HQ. The producer accepts its own
`PARTNER_API_TOKEN` (Proton Pass + Worker secret). Unauthenticated v1 reads
return HTTP **401** `unauthorized` when the secret is configured, or **503**
`contract_auth_unconfigured` only when the secret is missing from the Worker.

## Status: configured

| Check            | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Vault item       | `factorywager` / **FactoryWager Registry Token**                            |
| Monorepo inject  | `env.template` → `FACTORY_WAGER_TOKEN={{ pass://… }}`                       |
| Vault map note   | `config/vault-map.toml` `[env.FACTORY_WAGER_TOKEN].note`                    |
| Portal mark      | `bun run tennis:agent-auth:bake` → `public/registry/tennis/agent-auth.json` |
| Operator handoff | `~/.reasonix/tennis-hq-registry-token.env` (mode 600, not committed)        |
| Tennis HQ app    | `plum-spruce-dawn-dune1` (canonical) · Worker `tennis-hq`                   |

### Producer service auth (`PARTNER_API_TOKEN`) — configured 2026-08-05

| Check | Value |
| ----- | ----- |
| Vault item | `factorywager` / **Tennis HQ Partner API Token** |
| Vault map | `config/vault-map.toml` `[env.PARTNER_API_TOKEN]` |
| Worker secret | `wrangler secret put PARTNER_API_TOKEN --name tennis-hq` |
| Handoff | `~/.reasonix/tennis-hq-partner-api-token.env` (mode 600) |
| Smoke | `curl -H "Authorization: Bearer $PARTNER_API_TOKEN" https://tennis.factory-wager.com/api/v1/research/status` → 200 |
| Unauth smoke | no bearer → **401** `unauthorized` (not 503) |

```bash
# Load partner service token (never print)
set -a && source ~/.reasonix/tennis-hq-partner-api-token.env && set +a
# Or: bun run portal-cli secret get 'pass://factorywager/Tennis HQ Partner API Token/password'

curl -fsS -H "Authorization: Bearer $PARTNER_API_TOKEN" \
  https://tennis.factory-wager.com/api/v1/marketdata/desk | head -c 200
```

Do **not** put the secret in git, portal HTML, or agent chat logs that get
committed.

## Cloud agent setup (remote sandbox)

```bash
# 1) Inject token (from operator / vault / CI secret) — never hardcode in repo
export FACTORY_WAGER_TOKEN='…'   # same value as vault "FactoryWager Registry Token"
export REGISTRY_URL='https://registry.factory-wager.com/'

# 2) bunfig.toml (project or sandbox)
# [install.scopes]
# "@factorywager" = { url = "https://registry.factory-wager.com/", token = "$FACTORY_WAGER_TOKEN" }
# "@factory-wager" = { url = "https://registry.factory-wager.com/", token = "$FACTORY_WAGER_TOKEN" }
# "@factory" = { url = "https://registry.factory-wager.com/", token = "$FACTORY_WAGER_TOKEN" }

# 3) Optional .npmrc
# //registry.factory-wager.com/:_authToken=${FACTORY_WAGER_TOKEN}
# registry=https://registry.factory-wager.com/

# 4) Smoke read plane (no token required)
curl -fsS "$REGISTRY_URL/api/registry/health"
```

SDK write path (when publish origin is reachable):

```ts
import { RegistryClient } from '@factorywager/registry-client';

const client = new RegistryClient({
  baseUrl: Bun.env.REGISTRY_URL ?? 'https://registry.factory-wager.com',
  apiKey: Bun.env.FACTORY_WAGER_TOKEN,
});
// await client.publish(name, version, tarballBlob, { tags: ['latest'] });
```

## Operator: mint / re-export handoff

```bash
# Vault → shell (no secret printed by map commands)
bun run portal-cli secret get 'pass://factorywager/FactoryWager Registry Token/password'

# Or monorepo inject (writes .env — keep gitignored)
bun run proton:inject:factorywager:reasonix

# Local handoff file for agents (created when provisioning Tennis HQ)
# ~/.reasonix/tennis-hq-registry-token.env
set -a && source ~/.reasonix/tennis-hq-registry-token.env && set +a
```

## Portal / bake

| Surface                                                                                              | Command / path                                                                   |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Agent auth bake                                                                                      | `bun run tennis:agent-auth:bake` / `tennis:agent-auth:check`                     |
| Vault map bake                                                                                       | `bun run env:inventory:bake` → `/registry/vault-map.json`                        |
| Tennis board                                                                                         | `/portal/tennis/` loads agent-auth KPI                                           |
| Tenant packages                                                                                      | `/registry/tennis/registry.json` (`bun run ops:seed:toc` / seed tenants)         |
| SSOT soft-pass (`artifactId` `ssot-flow-soft`, concept `publish.ssot_flow_soft` → colorKey `tennis`) | `bun run ssot:flow:soft` → `/registry/ssot-flow-soft.json` · `/portal/packages/` |
| PM publish-plane proof (`artifactId` `pm-proof`, concept `publish.pm_proof` → colorKey `kalshi`)     | `bun run verify:pm:save` → `/registry/pm-proof.json` · same board strip          |

### SSOT soft-pass (offline pack)

Offline only: Tennis HQ `ssot:build` → `ssot:check` → `ssot:pack` (no
`bun publish`). Resolves the gitignored checkout via `TENNIS_HQ_ROOT` or
`king-zippy-umbra-acre` next to the monorepo (worktrees use the git common-dir
sibling). Version bumps stay operator-controlled (`bun pm version` inside Tennis
HQ, not root `factorywager-enterprise`).

```bash
bun run ssot:flow:soft
bun run verify:pm:save   # @factorywager/registry-client publish-plane soft-pass
```

The canonical R2 release is verified by `RegistryClient.install()` against the
stored size and SHA-256. Pages packument/tarball hard-match follows deployment
of the refreshed snapshot and `@tennis-hq/*` read allowlist; soft-pass stays
green when network/auth probes skip.

### Versioned domain contracts

Tennis HQ `@tennis-hq/ssot@1.5.0` adds a transport-only `tennis-hq/v1` manifest
and JSON Schemas. FactoryWager consumes the immutable packed package; it must
not import files from the sibling Tennis HQ source tree. The soft-pass extracts
`package/registry/contracts/v1/manifest.json` from the tarball and requires
package-version parity plus exactly these five authenticated read domains:

| Domain     | Runtime path                     | Contract package export               |
| ---------- | -------------------------------- | ------------------------------------- |
| marketdata | `GET /api/v1/marketdata/desk`    | `contracts/v1/marketdata.schema.json` |
| research   | `GET /api/v1/research/status`    | `contracts/v1/research.schema.json`   |
| trading    | `GET /api/v1/trading/executions` | `contracts/v1/trading.schema.json`    |
| partners   | `GET /api/v1/partners/capacity`  | `contracts/v1/partners.schema.json`   |
| accounting | `GET /api/v1/accounting/finance` | `contracts/v1/accounting.schema.json` |

Runtime reads require a Tennis HQ provider token (`PARTNER_API_TOKEN`, with
provider-side `OPERATOR_API_TOKEN` alias) and fail closed when it is absent.
`FACTORY_WAGER_TOKEN` remains registry/package authentication and is not a
runtime API credential.

FactoryWager's registry catalog now contains the canonical
`@tennis-hq/ssot@1.5.0` tarball with all five v1 contract exports. The stored
artifact is `11,204` bytes with SHA-256
`a6c0e9502cdb1c30d37e7579ed3d90e475cc28e6e0f46e0837394524f8cc8f55`;
the root and Tennis tenant registry metadata must retain that exact size and
checksum.

### Package and version authority

Tennis HQ is a separate producer repository, not a FactoryWager Bun workspace.
That separation is deliberate: FactoryWager consumes the immutable package
artifact and never resolves the producer through `workspace:*`.

| Layer | Authority | Version behavior |
| ----- | --------- | ---------------- |
| FactoryWager workspaces | root `package.json#workspaces` | Local packages use `workspace:*`; no publish version is inferred |
| Third-party dependencies | root `package.json#catalog` | `catalog:` centralizes dependency versions such as TypeScript and Bun types |
| Tennis package | producer `packages/tennis-hq-ssot/package.json` | Producer owns the explicit semver bump and immutable tarball |
| FactoryWager registry | root `registry.json` release + dist-tag | Stores every release, the `latest` tag, byte size, and SHA-256 |
| Tennis consumer slice | `/registry/tennis/registry.json` | Derived from the root registry; must not carry an independent version decision |

Run `bun run tennis:ssot:release:check` for the offline parity gate used by
`bun:ci`. Run `bun run tennis:ssot:release:check:live` after publishing or
deploying; it downloads the canonical registry tarball and verifies its exact
size and SHA-256 without reading the sibling producer source tree.

### Weave

Both proofs are first-class portal-weave artifacts (`purpose: ui`, owned by
`/portal/packages/` via `relatedArtifactIds` + `related.ssotFlowSoft` /
`related.pmProof`) with `artifactId` / `artifactName` / `conceptId` / `colorKey`
/ hex+token from the partner-ops kernel. Weave payload also exposes
`publishPlane` (board · colorKernel · artifacts · scripts · related). Soft-pass
parity is checked by `bun run verify:weave` (`publish-plane soft-pass` row):
full hard parity when `publishPlane` is on the edge; soft-skip while Pages lags
(`publishPlane pending on edge`). Packages board renders the soft-pass table +
`publishPlane` footer (hex swatches from weave or proof rows).

## Related

- [`docs/registry-client.md`](../../registry-client.md)
- [`docs/guides/REGISTRY_PRODUCTION_READINESS.md`](../../guides/REGISTRY_PRODUCTION_READINESS.md)
- [`docs/harness/tenants/proton-integration.md`](proton-integration.md) — vault
  inject
