# @factorywager/registry-client

HTTP client for the FactoryWager registry. It uses Web APIs only and runs in
Bun, browsers, and Cloudflare Workers.

```ts
import { RegistryClient } from '@factorywager/registry-client';

const client = new RegistryClient({
  baseUrl: 'https://registry.factory-wager.com',
  publishUrl: 'https://registry-write.internal.factory-wager.com',
  apiKey: runtimeConfig.factoryWagerToken,
});

const artifact = await client.resolve('@factorywager/routing-algorithms');
const bytes = await client.download('@factorywager/routing-algorithms');
```

`download()` verifies both the indexed byte length and SHA-256 checksum.
Publishing targets the authenticated private registry API; the Cloudflare
Pages/R2 endpoint remains read-only. The API key is sent only to `publishUrl`;
anonymous health, index, and artifact requests never receive it.
