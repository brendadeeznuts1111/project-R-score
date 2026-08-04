# Registry Production Readiness

## Canonical topology

FactoryWager uses two deliberately separate registry planes:

- **Private publish plane:** the authenticated Bun registry host.
  Package-manager publishing uses the npm-compatible host; SDK writes terminate
  at `POST /api/registry/:name/versions`.
- **Public read plane:** Cloudflare Pages Functions backed by the
  `REGISTRY_BUCKET` R2 binding. It serves only allowlisted registry keys and
  never receives R2 API credentials.

Do not make the R2 bucket public and do not copy `R2_ACCESS_KEY_ID` or
`R2_SECRET_ACCESS_KEY` into Pages. The Pages binding is the read authority.

## Health

The edge probe is:

```bash
curl --fail https://registry.factory-wager.com/api/registry/health
```

It checks that the R2 binding can read and structurally parse `registry.json`.
It returns package and version counts without exposing credentials or storage
errors. The Bun host also exposes `/health` and `/-/ping`; `factory health`
performs the signed R2 probe used by operators.

## Integrity monitoring

Run a one-shot size and SHA-256 audit:

```bash
bun run factory:integrity
```

The result is written to `reports/registry-integrity.json`. A failed cycle sends
a redacted alert when `SLACK_WEBHOOK_URL`, or both `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_OPS_CHAT_ID`, are configured.

The `registry-integrity` spine tenant runs daily at `03:00` UTC. The long-lived
Bun host can also enable the in-process complement with
`REGISTRY_MONITOR=1 bun run factory:serve`. Spine remains the scheduling SSOT;
do not register both on the same host.

## Client SDK

The runtime-neutral SDK lives at `packages/registry-client`. It uses Web APIs
only and works in Bun, browsers, and Cloudflare Workers.

Full usage, URL format, and verification: [`docs/registry-client.md`](../registry-client.md)
· proof JSON at `/registry/registry-client-proof.json` ·
`bun run verify:registry-client:save`.

```bash
cd packages/registry-client
bun run build
bun publish --dry-run --access public
```

After inspecting the dry-run archive, publish through the authenticated
FactoryWager registry:

```bash
bun publish --registry https://registry.factory-wager.com --access public
```

The SDK resolves dist-tags, produces allowlisted asset URLs, and verifies both
byte length and SHA-256 on download. Its `publish()` method targets the private
multipart endpoint; the Pages/R2 read plane rejects writes.

> **Lane note (ADR-0002):** `bun publish --registry https://registry.factory-wager.com`
> does **not** work against the Pages deployment today (read-only, 405 on non-GET).
> Publish via `RegistryClient.publish` (R2) or the loopback serve-public lane,
> then refresh the snapshot.

Configure the two origins independently so the bearer token is never sent to the
public read plane. (`registry-write.internal.factory-wager.com` is a placeholder
for the intended private publish plane — not provisioned; today the write
origins are the local gateway on :3000 and direct-to-R2 SigV4, per ADR-0002.)

```ts
const client = new RegistryClient({
  baseUrl: 'https://registry.factory-wager.com',
  publishUrl: 'https://registry-write.internal.factory-wager.com',
  apiKey: runtimeConfig.registryToken,
});
```

The Bun gateway rejects writes when no `FACTORY_WAGER_TOKEN` or
`REGISTRY_SECRET` is configured, compares bearer tokens by fixed-length digests,
and enforces `REGISTRY_MAX_PUBLISH_BYTES` (50 MiB by default). Run one publish
gateway instance; the R2 index update model has a single-writer authority while
Cloudflare scales the read plane independently.

> **Bucket reality:** the R2 artifact plane was activated on 2026-08-04 with
> `@tennis-hq/ssot/1.5.0.tgz`. The 11,204-byte object and its SHA-256
> `a6c0e9502cdb1c30d37e7579ed3d90e475cc28e6e0f46e0837394524f8cc8f55`
> were verified by a direct `RegistryClient.install()` download after publish.
> The R2 index is canonical; `factory snapshot` refreshes the committed static
> fallback. The bucket remains multi-tenant (registry + Telegram channels), and
> the public read plane stays bounded by `lib/factory/http-keys.ts`, which never
> exposes `channels/*`.

## Dynamic integrations

Routing algorithms and DOD model releases are registry artifacts. Consumers must
download verified bytes, extract them into a controlled directory, and load the
declared local entry point through their normal sandbox boundary. Remote
`import()` and `eval()` of registry URLs are intentionally unsupported. DOD
snapshots stamp `modelVersion` so audit evidence remains attributable to the
verifier release.

## Deployment checklist

- Configure the private hostname and TLS termination.
- Set `REGISTRY_AUTH=token` and a strong `REGISTRY_SECRET`; never use `none` in
  production.
- Bind Pages `REGISTRY_BUCKET` to `factory-wager-registry`.
- Set Pages `REGISTRY_CORS_ORIGINS` to explicit trusted origins.
- Keep R2 API credentials only on the private Bun host and operator machines.
- Run `bun run registry:doctor`, `bun run factory:health`, and
  `bun run factory:integrity`.
- Verify the edge health URL and a known artifact download.
- Configure at least one alert channel and deliberately exercise a test alert.
- Build the SDK and inspect `bun publish --dry-run` before publishing.
- Confirm the `registry-integrity` tenant appears in spine status.

## Recovery

When integrity fails, inspect `reports/registry-integrity.json`, restore or
re-publish the named object, and rerun:

```bash
bun run spine:schedule:once -- --tenant=registry-integrity
```

Never repair an integrity failure by editing the recorded checksum to match an
untrusted object.
