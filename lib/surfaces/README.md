# lib/surfaces

Public edge surface inventory — hostnames, shortcodes, and type codes stay separated.

| File | Role |
|------|------|
| [`inventory.ts`](./inventory.ts) | Parse-once loader for `config/surfaces.toml` → branded `SurfaceRecord`s + indexes |

## Domain brands

Import from [`lib/types/branded.ts`](../types/branded.ts)
([`surfaces.ts`](../types/branded/surfaces.ts)):

| Brand | Meaning |
|-------|---------|
| `HostId` | Pure FQDN (no scheme/path) |
| `ApexDomainId` | Zone apex (`factory-wager.com`, `pages.dev`) |
| `SubdomainId` | DNS labels under apex (`score`, `@`) — ≠ `SurfaceId` |
| `SurfaceId` | Inventory key (`ledger`, `pages_dev`) |
| `PagesProjectId` | CF Pages shortcode (`project-r-score`) — ≠ ops `ProjectId` |
| `PublishLaneId` | ADR-0002 lane (`prod-write`, `local-gateway`) |
| `AccessDomainId` | Access app domain (`host` or `host/path`) |
| `SurfaceStatusCode` | live \| vanity \| broken \| … |
| `SurfaceAccessCode` | public \| applied \| staged \| … |
| `SurfaceBackendCode` | cloudflare-pages \| cloudflared \| github-pages \| … |

## Inventory depth

Every `SurfaceRecord` carries derived shortcodes at parse time:

- `apex` / `subdomain` from `splitHostId(host)`
- `backendCode` from `surfaceBackendCodeFromBackend(backend)`
- `pagesProject` when backend is `cloudflare-pages:…`

Indexes: `byId`, `byHost`, `bySubdomain`, `byPagesProject`, `byStatus`, `byAccess`,
`byBackendCode`. Queries: `surfacesForSubdomain`, `surfacesForStatus`,
`surfacesForBackendCode`, `summarizeInventory`.

## Usage

```ts
import {
  loadSurfacesInventory,
  surfacesForSubdomain,
  summarizeInventory,
} from 'lib/surfaces/inventory.ts';
import { asSubdomainId, hostIdFromParts, FACTORY_WAGER_APEX } from 'lib/types/branded.ts';

const inv = await loadSurfacesInventory('config/surfaces.toml');
const scoreHosts = surfacesForSubdomain(inv, asSubdomainId('score'));
const summary = summarizeInventory(inv);
// summary.apexes · byBackendCode · accessDomains · pagesProjects
```

Access live hosts are composed the same way:

```ts
hostIdFromParts(FACTORY_WAGER_APEX, asSubdomainId('ledger'));
// pagesDevHostForProject(PROJECT_R_SCORE_PAGES)
```

## Related

| Artifact | Path |
|----------|------|
| SSOT TOML | [`config/surfaces.toml`](../../config/surfaces.toml) |
| Bake (schema v2) | `bun run surfaces:bake` → [`scripts/bake-surfaces.ts`](../../scripts/bake-surfaces.ts) |
| Baked state | [`public/registry/surfaces-state.json`](../../public/registry/surfaces-state.json) |
| Portal board | [`/portal/surfaces/`](../../public/portal/surfaces/) |
| Doctor check | `infra-surfaces-state` · [`doctor-check.ts`](./doctor-check.ts) |
| Access policy | [`.cloudflare-access.yml`](../../.cloudflare-access.yml) |
| Live probes | [`lib/verification/cloudflare-access-live.ts`](../verification/cloudflare-access-live.ts) |

```bash
bun tools/brand-catalog.ts surfaces
bun run surfaces:bake
bun test tests/surfaces-inventory.test.ts tests/surfaces-doctor.test.ts
```
