# Registry Client SDK

`@factorywager/registry-client` (`packages/registry-client/`) — HTTP client for the
FactoryWager artifact registry, interoperable with `bun install` and the local
registry server (`scripts/serve-public.ts`).

## URL contract (aligned)

All three layers produce identical artifact URLs, including scoped names
(segment-preserving encoding: `@` → `%40`, `/` preserved):

```
{origin}/registry/storage/{name}/{version}/artifact.tgz
```

Example (`@factorywager/routing-algorithms@1.0.0`):

```
https://registry.factory-wager.com/registry/storage/%40factorywager/routing-algorithms/1.0.0/artifact.tgz
```

| Layer | Site | Behavior |
|-------|------|----------|
| SDK `resolve()` | `packages/registry-client/src/index.ts` | `encodePath`: split, `encodeURIComponent` per segment, rejoin |
| Server metadata (`dist.tarball`) | `scripts/serve-public.ts` (`npmPackageMetadata`) | same segment-preserving encoding |
| Disk layout | `public/registry/storage/{name}/{version}/artifact.tgz` | raw path (no encoding) |

## Usage

```ts
import { RegistryClient } from '@factorywager/registry-client';

const client = new RegistryClient({ baseUrl: 'http://localhost:3000/', apiKey: Bun.env.API_KEY });

// Resolve metadata (assetUrl + release + integrity)
const resolved = await client.resolve('@factorywager/routing-algorithms', '1.0.0');

// Download with size + SHA-256 verification built in
const bytes = await client.download('@factorywager/routing-algorithms');
```

`download()` throws on size or checksum mismatch — corrupted artifacts never
reach callers. Read-plane requests never send the API key (proven in
`tests/registry-sdk.test.ts`).

## Verification

- `tests/registry-sdk.test.ts` — resolve/download round-trip, corruption
  rejection, read-plane auth, and the server↔SDK scoped-name URL parity test.
- `bun run verify-all` — full proof pipeline (defaults, networking, release,
  package-info, install-env).
