# Bun `fetch()` Proxy Environment Contract

This guide defines the repository contract for Bun runtime HTTP and HTTPS proxy
routing. The machine-readable source is
[`BUN_FETCH_PROXY_ENV_REGISTRY`](../../lib/net/proxy.ts); the Bun documentation
catalog carries the three canonical environment names so discovery and agent
guidance resolve to the same behavior.

Authority: verified on Bun 1.3.14. Bun documents `HTTP_PROXY` and `HTTPS_PROXY`
in its
[proxy guide](https://bun.com/docs/guides/http/proxy#environment-variables). Bun
1.3.12 added next-request refresh for those variables, `NO_PROXY`, and all three
lowercase spellings, as recorded in the
[1.3.12 release note](https://bun.com/blog/bun-v1.3.12#bun-apis).

## Defaults and precedence

| Canonical key | Compatible alias | Role                                                                       | Absent or empty         | Both non-empty |
| ------------- | ---------------- | -------------------------------------------------------------------------- | ----------------------- | -------------- |
| `HTTP_PROXY`  | `http_proxy`     | Proxy HTTP requests through an absolute `http://` or `https://` proxy URL  | No proxy from this key  | Lowercase wins |
| `HTTPS_PROXY` | `https_proxy`    | Proxy HTTPS requests through an absolute `http://` or `https://` proxy URL | No proxy from this key  | Lowercase wins |
| `NO_PROXY`    | `no_proxy`       | Bypass proxy routing for matching destinations                             | No bypass from this key | Lowercase wins |

“Lowercase wins” is a Bun 1.3.14 runtime observation covered by the local
contract test. Upstream documents compatibility with both spellings but does not
currently state conflict precedence. Do not configure the two spellings with
different non-empty values: choose one spelling per environment.

With no matching proxy variable and no request-level `proxy` option, native
`fetch()` connects directly. An explicit request-level `proxy` option is the
local override and does not require mutating process-wide state.

```ts
await fetch('https://api.example.com/data', {
  proxy: 'http://127.0.0.1:8080',
});
```

## Bypass behavior

The compatibility proof covers:

- an exact hostname match, such as `no_proxy=127.0.0.1`;
- `NO_PROXY=*`, which bypasses all proxy routing; and
- a runtime assignment affecting the next `fetch()` call.

Do not document unproved matching grammar—CIDR blocks, port-qualified entries,
leading dots, and wildcard suffixes require a focused Bun-version proof before
they become repository contract.

## Runtime mutation

Bun 1.3.12 and newer re-read these settings for the next request. Long-running
tools may therefore replace a value between requests. Prefer assignment over
deleting an accessor-backed `process.env` key, and restore test values in a
`finally` block.

```ts
const previous = process.env.HTTP_PROXY ?? '';

try {
  process.env.http_proxy = '';
  process.env.HTTP_PROXY = 'http://127.0.0.1:8080';
  await fetch('http://example.com');
} finally {
  process.env.HTTP_PROXY = previous;
}
```

## Registry and discovery alignment

| Layer               | Owner                                                                                          | Contract                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Runtime behavior    | [`lib/net/proxy.ts`](../../lib/net/proxy.ts)                                                   | Keys, aliases, roles, default, precedence, refresh, and value shape                              |
| Bun docs registry   | [`tools/bun-docs-curated.ts`](../../tools/bun-docs-curated.ts) → `tools/bun-docs-catalog.json` | Canonical `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` lookup entries                             |
| Reference discovery | [`lib/reference-discovery.ts`](../../lib/reference-discovery.ts)                               | Treats the three uppercase keys as one intentional family, not naming drift                      |
| Runtime proof       | [`tests/bun-proxy-env-contract.test.ts`](../../tests/bun-proxy-env-contract.test.ts)           | Lowercase precedence, explicit override, exact-host bypass, wildcard bypass, and catalog linkage |
| CONNECT proof       | [`tests/fetch-proxy-keepalive.test.ts`](../../tests/fetch-proxy-keepalive.test.ts)             | HTTPS proxy tunnel reuse and pool-key separation                                                 |
| Registry client     | [`docs/registry-client.md`](../registry-client.md)                                             | Keeps destination selection (`REGISTRY_URL`) distinct from proxy transport                       |

Proxy URLs can contain credentials. Never print environment values, include them
in generated registry artifacts, or attach them to diagnostic output. Catalog
entries describe names and semantics only.

## Local proof

```bash
bun run docs:catalog:build
bun test tests/bun-proxy-env-contract.test.ts tests/fetch-proxy-keepalive.test.ts
bun run reference:discover:check
```

FactoryWager registry clients that call native `fetch()` inherit this contract;
`REGISTRY_URL` still selects the destination and never replaces a proxy key. The
current upstream package-manager guide does not define proxy precedence for
`bun install` or `bun publish`, so this guide does not silently extend runtime
semantics to those commands. A package-manager claim needs its own loopback
registry proof before it can become repository policy.
