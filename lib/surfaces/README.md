# lib/surfaces

Public edge surface inventory — hostnames and Access domains with separated brands.

| File | Role |
|------|------|
| [`inventory.ts`](./inventory.ts) | Parse-once loader for `config/surfaces.toml` → branded `SurfaceRecord`s |

## Domain brands

Import constructors from [`lib/types/branded.ts`](../types/branded.ts) (domain module
[`lib/types/branded/surfaces.ts`](../types/branded/surfaces.ts)):

| Brand | Meaning |
|-------|---------|
| `HostId` | Pure FQDN (no scheme/path) |
| `ApexDomainId` | Zone apex (`factory-wager.com`) |
| `SubdomainId` | DNS labels under apex (`score`, `@`) |
| `SurfaceId` | Inventory key (`ledger`, `score`, …) |
| `PagesProjectId` | CF Pages shortcode (`project-r-score`) ≠ ops `ProjectId` |
| `AccessDomainId` | Access app domain (`host` or `host/path`) |
| `SurfaceStatusCode` | live \| vanity \| broken \| … |
| `SurfaceAccessCode` | public \| applied \| staged \| … |

Helpers: `splitHostId`, `accessDomainFromHost`, `tryPagesProjectIdFromBackend`,
`hostIdFromUrl`, `httpsUrlForAccessDomain`.

## Usage

```ts
import {
  loadSurfacesInventory,
  appliedAccessDomains,
  findSurfaceByHost,
} from 'lib/surfaces/inventory.ts';
import { asHostId } from 'lib/types/branded.ts';

const inv = await loadSurfacesInventory('config/surfaces.toml');
const ledger = findSurfaceByHost(inv, asHostId('ledger.factory-wager.com'));
const applied = appliedAccessDomains(ledger!);
```

## Related

| Artifact | Path |
|----------|------|
| SSOT TOML | [`config/surfaces.toml`](../../config/surfaces.toml) |
| Bake | `bun run surfaces:bake` → [`scripts/bake-surfaces.ts`](../../scripts/bake-surfaces.ts) |
| Baked state | [`public/registry/surfaces-state.json`](../../public/registry/surfaces-state.json) |
| Access policy | [`.cloudflare-access.yml`](../../.cloudflare-access.yml) · [`lib/verification/cloudflare-access-policy.ts`](../verification/cloudflare-access-policy.ts) |
| Live probes | [`lib/verification/cloudflare-access-live.ts`](../verification/cloudflare-access-live.ts) |

```bash
bun tools/brand-catalog.ts surfaces
bun test tests/surfaces-inventory.test.ts
```
