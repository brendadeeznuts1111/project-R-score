# @factorywager/registry-client

HTTP client for the FactoryWager registry. It uses Web APIs only and runs in
Bun, browsers, and Cloudflare Workers.

```ts
import { RegistryClient } from '@factorywager/registry-client';

const client = new RegistryClient({
  baseUrl: 'https://registry.factory-wager.com',
  grants: [
    {
      operation: 'metadata-read',
      origins: ['https://registry.factory-wager.com'],
      reason: 'resolve release metadata',
    },
    {
      operation: 'artifact-read',
      origins: ['https://registry.factory-wager.com'],
      reason: 'download verified artifacts',
    },
  ],
});

const artifact = await client.resolve('@factorywager/routing-algorithms');
const bytes = await client.download('@factorywager/routing-algorithms');
```

Every operation requires an exact-origin, operation-specific grant. Read grants
do not authorize publish or mirror writes, and URLs containing credentials are
rejected. Index JSON and artifact bodies have configurable byte ceilings;
`download()` verifies both the indexed byte length and SHA-256 checksum. The
production HTTP origin is read-only. There is no production native npm or SDK
write endpoint; release artifacts are created locally and, with separate
operator authority, uploaded through `bun run factory:publish -- <archive>`.

`RegistryClient.publish()` remains available for the explicitly configured local
development gateway. Never point `publishUrl` at the production read origin.
