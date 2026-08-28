// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @updated --env-file · changed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @verified --env-file · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files
// @see https://bun.com/docs/runtime/environment-variables#disabling-automatic-env-loading — --no-env-file
// @verified --no-env-file · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/environment-variables#disabling-automatic-env-loading
// Official Bun 1.4 dev-tooling and transport facts. Experimental protocols stay unadopted.
import type { Bun14Capability } from './types.ts';
import { asReleaseCapabilityId } from '../../lib/types/branded.ts';

const BLOG = 'https://bun.com/blog/bun-v1.4';
const SERVER_DOCS = 'https://bun.com/docs/runtime/http/server';
const FETCH_DOCS = 'https://bun.com/docs/runtime/networking/fetch';

export const BUN_14_DEV_NETWORK_CAPABILITIES: Bun14Capability[] = [
  {
    id: asReleaseCapabilityId('native-async-stack-traces'),
    domain: 'observability',
    symbol: 'async native I/O stack traces',
    changeKind: 'release-window',
    adoption: 'contract',
    summary: 'Native I/O failures retain the JavaScript await site in their async stack trace.',
    boundary:
      'Diagnostic behavior only; stack contents can contain local paths and remain private.',
    releaseUrl: `${BLOG}#dev-tooling`,
    assetIds: [],
    contractFiles: ['tests/regression/bun-1.3.12.test.ts'],
  },
  {
    id: asReleaseCapabilityId('bun-no-env-file'),
    domain: 'platform',
    symbol: '--no-env-file / bunfig env = false',
    changeKind: 'release-window',
    adoption: 'contract',
    summary: 'Disables automatic dotenv loading while preserving explicit --env-file inputs.',
    boundary:
      'Runtime configuration only; secrets remain externally managed and value-free in proof.',
    releaseUrl: `${BLOG}#dev-tooling`,
    docsUrl: 'https://bun.com/docs/runtime/environment-variables',
    assetIds: [],
    contractFiles: [
      'tests/bun-env-loading.test.ts',
      'tests/bun-runtime-global-flags.test.ts',
      'tests/portal-cli-bun-flags.test.ts',
    ],
  },
  {
    id: asReleaseCapabilityId('bun-serve-http3-experimental'),
    domain: 'server',
    symbol: 'Bun.serve({ http3: true })',
    changeKind: 'release-window',
    adoption: 'candidate',
    summary: 'Adds an experimental HTTP/3 listener beside TLS HTTP/1.1 on the same port.',
    boundary: 'Not enabled in production, Pages Functions, serve-public, or gallery verification.',
    releaseUrl: `${BLOG}#http-3-in-bun-serve-experimental`,
    docsUrl: SERVER_DOCS,
    assetIds: [],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('fetch-http2-http3-experimental'),
    domain: 'network',
    symbol: 'fetch({ protocol: "http2" | "http3" })',
    changeKind: 'release-window',
    adoption: 'candidate',
    summary: 'Selects experimental HTTP/2 or HTTP/3 transports for fetch requests.',
    boundary: 'The asset pipeline stays on default HTTPS behavior; no experimental protocol flags.',
    releaseUrl: `${BLOG}#http-2-http-3-in-fetch-experimental`,
    docsUrl: FETCH_DOCS,
    assetIds: [],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('bun-serve-production-sourcemaps'),
    domain: 'server',
    symbol: 'Bun.serve HTML route sourcemaps',
    changeKind: 'changed',
    adoption: 'candidate',
    summary: 'Production HTML routes no longer serve source maps unless explicitly configured.',
    boundary: 'Cloudflare deployment owns public sourcemap policy; this is not a Pages setting.',
    releaseUrl: `${BLOG}#html-routes-sourcemaps-disabled-in-production`,
    docsUrl: SERVER_DOCS,
    assetIds: [],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('fetch-proxy-headers'),
    domain: 'network',
    symbol: 'fetch({ proxy: { url, headers } })',
    changeKind: 'release-window',
    adoption: 'candidate',
    summary: 'Allows proxy-specific headers for HTTP and HTTPS destinations.',
    boundary: 'Credentials must come from the vault and must never enter manifests or feed output.',
    releaseUrl: `${BLOG}#fetch-proxy-headers`,
    docsUrl: FETCH_DOCS,
    assetIds: [],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('fetch-tls-session-resumption'),
    domain: 'network',
    symbol: 'fetch TLS session cache',
    changeKind: 'performance',
    adoption: 'upstream-claim',
    summary: 'Bun reports a per-origin BoringSSL session cache for one-RTT cold reconnections.',
    boundary: 'Transport optimization is upstream-owned and is not treated as a local benchmark.',
    releaseUrl: `${BLOG}#tls-session-resumption`,
    docsUrl: FETCH_DOCS,
    assetIds: [],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('fetch-connection-reuse'),
    domain: 'network',
    symbol: 'fetch connection pooling',
    changeKind: 'performance',
    adoption: 'upstream-claim',
    summary: 'Bun reports connection reuse through HTTPS proxies and custom TLS configurations.',
    boundary: 'Pooling is runtime-owned; request correctness never depends on a reused connection.',
    releaseUrl: `${BLOG}#connection-reuse`,
    docsUrl: FETCH_DOCS,
    assetIds: [],
    contractFiles: [],
  },
];
