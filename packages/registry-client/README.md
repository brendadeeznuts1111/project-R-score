# @factorywager/registry-client

HTTP client for the FactoryWager registry. It uses Web APIs only and runs in
Bun, browsers, and Cloudflare Workers.

```ts
import { RegistryClient } from '@factorywager/registry-client';

const client = new RegistryClient({
  baseUrl: 'https://registry.factory-wager.com',
});

const artifact = await client.resolve('@factorywager/routing-algorithms');
const bytes = await client.download('@factorywager/routing-algorithms');
```

`download()` verifies both the indexed byte length and SHA-256 checksum. The
production HTTP origin is read-only. There is no production native npm or SDK
write endpoint; release artifacts are created locally and, with separate
operator authority, uploaded through `bun run factory:publish -- <archive>`.

`RegistryClient.publish()` remains available for the explicitly configured local
development gateway. Never point `publishUrl` at the production read origin.
