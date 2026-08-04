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

## Purpose

Give a **cloud agent** (remote sandbox) a Bearer token so it can:

1. Resolve/install `@factorywager/*` (and related scopes) from the FactoryWager
   registry when scoped install is configured.
2. Publish packages to the **private write plane** when that plane is available
   (local `serve-public` or direct R2 publish — not Pages).

The public read plane on Pages does **not** require the token for GETs.

## Status: configured

| Check            | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Vault item       | `factorywager` / **FactoryWager Registry Token**                            |
| Monorepo inject  | `env.template` → `FACTORY_WAGER_TOKEN={{ pass://… }}`                       |
| Vault map note   | `config/vault-map.toml` `[env.FACTORY_WAGER_TOKEN].note`                    |
| Portal mark      | `bun run tennis:agent-auth:bake` → `public/registry/tennis/agent-auth.json` |
| Operator handoff | `~/.reasonix/tennis-hq-registry-token.env` (mode 600, not committed)        |
| Tennis HQ app    | `king-zippy-umbra-acre/.env.local` (gitignored) + `bunfig.toml` scopes      |

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

Hard-match (packument shasum ↔ local tarball) is a later gate when the version
is on the registry; soft-pass stays green when network/auth probes skip.

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

FactoryWager's current registry catalog contains `@tennis-hq/ssot@1.4.0`, which
does not contain these exports. Do not mark the v1 contracts available or add a
runtime package dependency until one canonical `1.5.0` tarball is published and
its registry size/checksum match the stored artifact.

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
