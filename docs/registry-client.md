# Registry client SDK

Runtime-neutral HTTP SDK for the FactoryWager artifact registry read plane and
the local development publish gateway. Package:
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
FormData to an explicitly configured local development gateway. It requires an
`apiKey`; the production read plane rejects writes and must never be supplied as
`publishUrl`.

There is no provisioned production SDK or native npm write endpoint. The
production write route is direct-to-R2 SigV4 via
`bun run factory:publish -- <archive>` and requires separate operator authority.
See ADR-0002.

```ts
const client = new RegistryClient({
  baseUrl: 'http://localhost:3000',
  publishUrl: 'http://localhost:3000',
  apiKey: localDevelopmentToken,
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

| Plane                | Canonical                                                                                                    | Scope                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| npm read             | `factoryWagerNpmRegistryUrlFromEnv()` · `FACTORY_WAGER_NPM_REGISTRY_URL` · `/api/npm`                        | tokenless `bun info` and scoped installs; GET/HEAD only             |
| artifact read origin | `factoryWagerRegistryUrlFromEnv()` · `FACTORY_WAGER_REGISTRY_ORIGIN` · `registry.factory-wager.com`          | public index and verified artifact downloads                        |
| local SDK write      | `factoryWagerLocalRegistryWriteUrlFromEnv()` · `FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL` · HTTP loopback only | authenticated development multipart writes                          |
| production write     | `factoryRegistryBucketFromEnv()` · `R2_REGISTRY_BUCKET` · `factory-wager-registry`                           | separately authorized direct-to-R2 SigV4; no HTTP registry endpoint |
| Pages public         | `factoryWagerPagesCustomUrl()` · `ROUTING_PROBE_BASE_URL` · `score.factory-wager.com`                        | portal and routing probes                                           |

### Proxy transport

Registry clients implemented with Bun's native `fetch()` use the repository
[`HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` contract](./guides/bun-fetch-proxy-environment.md).
`FACTORY_WAGER_NPM_REGISTRY_URL` chooses the read destination; proxy variables
choose the transport route and must never replace or rewrite it. Proxy URLs may
contain credentials, so diagnostics and baked registry artifacts record only
variable names and behavior—not values.

## Env naming: similar pairs

Pairs the reference-discovery scanner flags by name similarity (≥0.82) that are
intentional, not drift. Allowlisted in `isAllowedSimilarEnvPair`
(`lib/reference-discovery.ts`); owner table in
[`docs/harness/tenants/reference-discovery.md`](harness/tenants/reference-discovery.md).

| Pair                                                                               | First                                          | Second                                                          | Why both exist                                                                                |
| ---------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` ↔ `CLOUDFLARE_DNS_API_TOKEN`                                | Pages + zone-read token, **no** Zone.DNS scope | separate token with Zone.DNS:Read/Edit                          | least-privilege split, verified 2026-07-27 — see `docs/harness/tenants/proton-integration.md` |
| `COMPLIANCE_MOCK_PORT` ↔ `COMPLIANCE_MOCK_URL`                                     | mock server listen port (default 8787)         | client base URL for report/shadow tools                         | server side vs client side of the same compliance mock                                        |
| `TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE` ↔ `TELEGRAM_CATALOG_RESEARCH_CRON_TITLE` | cron expression (default `0 7 * * *`)          | job/log title (`telegram-catalog-research`)                     | schedule vs log identity in `lib/telegram/catalog-research/constants.ts`                      |
| `TELEGRAM_CATALOG_RESEARCH_LLM_KEY` ↔ `..._LLM_MODEL` ↔ `..._LLM_URL`              | API key (canonical alias → `OPENAI_API_KEY`)   | model name (default `gpt-4o-mini`) / OpenAI-compatible base URL | three independent LLM knobs in `lib/telegram/catalog-research/llm-pass.ts`                    |
