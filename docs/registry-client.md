# Registry client SDK

Runtime-neutral HTTP SDK for the FactoryWager artifact registry read plane and
authenticated publish endpoint. Package:
[`packages/registry-client`](../packages/registry-client).

**Related:** [REGISTRY_PRODUCTION_READINESS.md](./guides/REGISTRY_PRODUCTION_READINESS.md)
· proof JSON at `/registry/registry-client-proof.json`

## URL format

The SDK and npm-compatible metadata both use the same tarball path:

```text
{baseUrl}/registry/storage/{encodedName}/{version}/artifact.tgz
```

Scoped packages encode each path segment (`@factorywager/registry-client` →
`%40factorywager/registry-client/1.0.0/artifact.tgz`).

The read plane index lives at `{baseUrl}/api/registry/registry.json`. Do not
use `/api/registry/{r2Key}` for downloads — that key is storage metadata only.

## resolve

`RegistryClient.resolve(name, selector?)` loads the index, resolves a dist-tag
(or explicit version), and returns `{ release, assetUrl }`:

```ts
import { RegistryClient } from '@factorywager/registry-client';

const client = new RegistryClient({ baseUrl: 'http://localhost:3000' });
const resolved = await client.resolve('@factorywager/registry-client', '1.0.0');
// resolved.assetUrl === packument dist.tarball on the same origin
```

## download

`RegistryClient.download(name, selector?)` fetches `assetUrl`, verifies total
bytes via `length × Uint8Array.BYTES_PER_ELEMENT` (1 byte per element) against
`release.storage.size`, and SHA-256 against `release.storage.checksum`:

```ts
const bytes = await client.download('@factorywager/registry-client', 'latest');
```

Checksum mismatch or size drift throws before returning bytes.

## publish

`RegistryClient.publish(name, version, artifact, options?)` posts multipart
FormData to the **authenticated** publish origin (`publishUrl`, default
`baseUrl`). Requires `apiKey`; the read plane rejects writes.

```ts
const client = new RegistryClient({
  baseUrl: 'https://registry.factory-wager.com',
  publishUrl: 'https://registry-write.internal.factory-wager.com',
  apiKey: process.env.FACTORY_WAGER_TOKEN,
});

await client.publish('@scope/pkg', '1.0.0', tarballBlob, {
  tags: ['latest'],
  type: 'library',
});
```

## Verification

```bash
bun tools/verify-registry-client.ts          # live probes (needs serve-public for resolve/download)
bun tools/verify-registry-client.ts --save   # write public/registry/registry-client-proof.json
bun test tests/registry-client-probes.test.ts
```

Probes:

| Probe | Proves |
|-------|--------|
| `registry-client.resolve` | `assetUrl` matches npm packument `dist.tarball` |
| `registry-client.download` | SHA-256 + size match index metadata |
| `registry-client.publish` | Missing `apiKey` fails before network |

Local resolve/download probes pass when `bun scripts/serve-public.ts` is running
and `public/registry/storage/@factorywager/registry-client/1.0.0/artifact.tgz`
exists (served from the R2-backed index).
