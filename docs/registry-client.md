# Registry client SDK

Runtime-neutral HTTP SDK for the FactoryWager artifact registry read plane and
authenticated publish endpoint. Package:
[`packages/registry-client`](../packages/registry-client).

**Related:**
[REGISTRY_PRODUCTION_READINESS.md](./guides/REGISTRY_PRODUCTION_READINESS.md) ·
proof JSON at `/registry/registry-client-proof.json`

## URL format

The SDK and npm-compatible metadata both use the same tarball path:

```text
{baseUrl}/registry/storage/{encodedName}/{version}/artifact.tgz
```

Scoped packages encode each path segment (`@factorywager/registry-client` →
`%40factorywager/registry-client/1.0.0/artifact.tgz`).

The read plane index lives at `{baseUrl}/api/registry/registry.json`. Do not use
`/api/registry/{r2Key}` for downloads — that key is storage metadata only.

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

> **Placeholder host:** `registry-write.internal.factory-wager.com` below is the
> _intended_ private publish plane — it is not provisioned (no DNS, no server).
> Today the only authenticated write origins are the local gateway
> (`http://localhost:3000`, `POST /api/registry/:scope/:name/versions`) and
> direct-to-R2 SigV4 via `bun run factory:publish -- <archive>`. See ADR-0002.

```ts
const client = new RegistryClient({
  baseUrl: 'https://registry.factory-wager.com',
  publishUrl: 'https://registry-write.internal.factory-wager.com',
  apiKey: Bun.env.FACTORY_WAGER_TOKEN,
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

| Probe                      | Proves                                          |
| -------------------------- | ----------------------------------------------- |
| `registry-client.resolve`  | `assetUrl` matches npm packument `dist.tarball` |
| `registry-client.download` | SHA-256 + size match index metadata             |
| `registry-client.publish`  | Missing `apiKey` fails before network           |

Local resolve/download probes pass when `bun scripts/serve-public.ts` is running
and `public/registry/storage/@factorywager/registry-client/1.0.0/artifact.tgz`
exists (served from the R2-backed index).

## Naming planes

Three planes share "registry" vocabulary — do not cross them. Canonical names
(scanner: `naming-cluster` findings in `bun tools/reference-discovery.ts`):

| Plane        | Canonical                                                                             | Scope                                                          |
| ------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| npm registry | `factoryWagerRegistryUrlFromEnv()` · `REGISTRY_URL` · `registry.factory-wager.com`    | artifact resolve/publish (this doc)                            |
| Pages public | `factoryWagerPagesCustomUrl()` · `ROUTING_PROBE_BASE_URL` · `score.factory-wager.com` | Pages portal + routing probes — never `bun publish --registry` |
| R2 bucket    | `factoryRegistryBucketFromEnv()` · `R2_REGISTRY_BUCKET` · `factory-wager-registry`    | object store bucket — see `config/r2-env.ts`                   |

## Env naming: similar pairs

Pairs the reference-discovery scanner flags by name similarity (≥0.82) that are
intentional, not drift. Allowlisted in `isAllowedSimilarEnvPair`
(`lib/reference-discovery.ts`); owner table in
[`docs/harness/tenants/reference-discovery.md`](harness/tenants/reference-discovery.md).

| Pair                                                                                | First                                          | Second                                                          | Why both exist                                                                                |
| ----------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` ↔ `CLOUDFLARE_DNS_API_TOKEN`                                | Pages + zone-read token, **no** Zone.DNS scope | separate token with Zone.DNS:Read/Edit                          | least-privilege split, verified 2026-07-27 — see `docs/harness/tenants/proton-integration.md` |
| `COMPLIANCE_MOCK_PORT` ↔ `COMPLIANCE_MOCK_URL`                                     | mock server listen port (default 8787)         | client base URL for report/shadow tools                         | server side vs client side of the same compliance mock                                        |
| `TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE` ↔ `TELEGRAM_CATALOG_RESEARCH_CRON_TITLE` | cron expression (default `0 7 * * *`)          | job/log title (`telegram-catalog-research`)                     | schedule vs log identity in `lib/telegram/catalog-research/constants.ts`                      |
| `TELEGRAM_CATALOG_RESEARCH_LLM_KEY` ↔ `..._LLM_MODEL` ↔ `..._LLM_URL`             | API key (canonical alias → `OPENAI_API_KEY`)   | model name (default `gpt-4o-mini`) / OpenAI-compatible base URL | three independent LLM knobs in `lib/telegram/catalog-research/llm-pass.ts`                    |
