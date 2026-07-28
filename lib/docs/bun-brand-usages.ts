// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/blog/bun-v1.3.14#no-orphans — --no-orphans
// @see https://bun.com/blog/bun-v1.3.14#http3 — Bun.serve http3
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs — --shard
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Reviewed Bun capability declarations.
 *
 * This file is the authority for semantic relationships. Source observation is
 * supporting evidence only and must never infer a brand from file co-occurrence.
 */

import { asDocTokenId } from '../types/branded/documents.ts';
import { defineBunBrandUsages } from './bun-brand-contract.ts';

const none = (rationale: string) =>
  [{ direction: 'none' as const, brand: null, rationale }] as const;

export const BUN_BRAND_USAGES = defineBunBrandUsages([
  {
    key: 'bun-image-dod-evidence',
    token: asDocTokenId('Bun.Image'),
    variant: 'image-processing',
    scope: 'production',
    policy: 'production-approved',
    ownerLane: 'audit',
    implementations: [{ path: 'lib/dod/evidence.ts', symbol: 'buildDodEvidencePackage' }],
    consumers: [{ path: 'lib/dod/evidence.ts', symbol: 'DodEvidencePackage' }],
    relationships: [
      {
        direction: 'evidence',
        brand: 'EvidenceId',
        rationale: 'Decoded and resized image bytes are stored in an EvidenceId-addressed record.',
      },
    ],
    proofs: [
      {
        source: 'public/registry/release-features.json',
        key: 'result:terminal-methods',
        maxAgeDays: 45,
      },
    ],
  },
  {
    key: 'bun-webview-dod-evidence',
    token: asDocTokenId('Bun.WebView'),
    variant: 'headless',
    scope: 'production',
    policy: 'lab-only',
    ownerLane: 'audit',
    implementations: [{ path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.applyWatermark' }],
    consumers: [{ path: 'lib/dod/verifier.ts', symbol: 'DODVerifier.process' }],
    relationships: [
      {
        direction: 'evidence',
        brand: 'EvidenceId',
        rationale: 'Headless rendering prepares the visual payload in the DOD evidence flow.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-randomuuidv7-evidence-mint',
    token: asDocTokenId('Bun.randomUUIDv7'),
    variant: 'uuid-string',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'audit',
    implementations: [{ path: 'lib/time.ts', symbol: 'mintEvidenceId' }],
    consumers: [{ path: 'lib/dod/evidence.ts', symbol: 'buildDodEvidencePackage' }],
    relationships: [
      {
        direction: 'output',
        brand: 'EvidenceId',
        rationale: 'The owned mint converts a UUIDv7 result into EvidenceId.',
      },
    ],
    proofs: [],
  },
  {
    key: 'bun-cron-in-process-monitoring',
    token: asDocTokenId('Bun.cron'),
    variant: 'in-process',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'lib/factory/monitoring.ts', symbol: 'registerRegistryCrons' }],
    consumers: [{ path: 'lib/factory/server.ts', symbol: 'registerRegistryCrons' }],
    relationships: none(
      'The scheduler controls runtime callbacks; no domain identity crosses this boundary.'
    ),
    proofs: [],
  },
  {
    key: 'bun-cron-os-persistent',
    token: asDocTokenId('Bun.cron'),
    variant: 'os-persistent',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'lib/harness/cron.ts', symbol: 'registerOsCron' }],
    consumers: [{ path: 'tools/portal-cli.ts', symbol: 'dispatchSnapshot' }],
    relationships: none(
      'The operating-system job title is scheduler metadata and is not a FactoryWager domain ID.'
    ),
    proofs: [],
  },
  {
    key: 'bun-sliceansi-terminal-output',
    token: asDocTokenId('Bun.sliceAnsi'),
    variant: 'display-width',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'lib/console-depth.ts', symbol: 'truncateWidth' }],
    consumers: [{ path: 'lib/factory/cli.ts', symbol: 'truncateDesc' }],
    relationships: none(
      'ANSI-aware slicing transforms display text and does not create or consume an identity.'
    ),
    proofs: [],
  },
  {
    key: 'bun-terminal-pty',
    token: asDocTokenId('Bun.Terminal'),
    variant: 'pty',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'lib/terminal.ts', symbol: 'createCapturingTerminal' }],
    consumers: [{ path: 'tools/monorepo-health.ts', symbol: 'runInteractive' }],
    relationships: none(
      'The PTY object is native process infrastructure; terminal identity remains separately branded.'
    ),
    proofs: [],
  },
  {
    key: 'process-execve-capability-probe',
    token: asDocTokenId('process.execve'),
    variant: 'capability-probe',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'scripts/dx-mcp.ts', symbol: 'toolsCall' }],
    consumers: [{ path: 'scripts/dx-mcp.ts', symbol: 'dispatch' }],
    relationships: none(
      'The probe reports process replacement availability without transporting a domain identity.'
    ),
    proofs: [],
  },
  {
    key: 'no-orphans-capability-probe',
    token: asDocTokenId('--no-orphans'),
    variant: 'runtime-cli',
    scope: 'tooling',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'scripts/dx-mcp.ts', symbol: 'toolsCall' }],
    consumers: [{ path: 'scripts/dx-mcp.ts', symbol: 'dispatch' }],
    relationships: none(
      'Parent-lifetime supervision is process policy and has no domain-valued payload.'
    ),
    proofs: [
      {
        source: 'public/registry/release-features.json',
        key: 'result:no-orphans',
        maxAgeDays: 45,
      },
    ],
  },
  {
    key: 'bun-test-parallel',
    token: asDocTokenId('--parallel'),
    variant: 'bun-test',
    scope: 'config',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'package.json', symbol: 'test:parallel' }],
    consumers: [{ path: '.github/workflows/test-sharded.yml', symbol: 'tests shard' }],
    relationships: none(
      'Test scheduling changes execution topology but does not transport domain identities.'
    ),
    proofs: [],
  },
  {
    key: 'bun-test-isolate',
    token: asDocTokenId('--isolate'),
    variant: 'bun-test',
    scope: 'config',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'package.json', symbol: 'test:isolate' }],
    consumers: [{ path: 'package.json', symbol: 'scripts' }],
    relationships: none(
      'Per-file test isolation is harness configuration without a domain identity.'
    ),
    proofs: [],
  },
  {
    key: 'bun-test-shard',
    token: asDocTokenId('--shard'),
    variant: 'bun-test',
    scope: 'config',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'package.json', symbol: 'test:ci:shard' }],
    consumers: [{ path: '.github/workflows/test-sharded.yml', symbol: 'tests shard' }],
    relationships: none(
      'Shard coordinates are CI configuration rather than a FactoryWager domain value.'
    ),
    proofs: [],
  },
  {
    key: 'bun-test-changed',
    token: asDocTokenId('--changed'),
    variant: 'bun-test',
    scope: 'config',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'package.json', symbol: 'test:watch' }],
    consumers: [{ path: 'package.json', symbol: 'scripts' }],
    relationships: none('Changed-test selection consumes repository state, not a domain identity.'),
    proofs: [],
  },
  {
    key: 'fetch-http2-client',
    token: asDocTokenId('fetch protocol http2'),
    variant: 'fetch-client',
    scope: 'production',
    policy: 'optional',
    ownerLane: 'runtime-tooling',
    implementations: [
      {
        path: 'projects/active/sports-terminal-os/src/utils/h2-fetch.ts',
        symbol: 'h2Fetch',
      },
    ],
    consumers: [
      {
        path: 'projects/active/sports-terminal-os/src/utils/h2-fetch.ts',
        symbol: 'h2Fetch',
      },
    ],
    relationships: none(
      'The negotiated transport protocol changes network behavior without changing request identity.'
    ),
    proofs: [],
  },
  {
    key: 'fetch-http3-client-probe',
    token: asDocTokenId('http3'),
    variant: 'fetch-client',
    scope: 'tooling',
    policy: 'lab-only',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'scripts/dx-mcp.ts', symbol: 'toolsCall' }],
    consumers: [{ path: 'scripts/dx-mcp.ts', symbol: 'dispatch' }],
    relationships: none(
      'The experimental transport probe reports connectivity and carries no domain identity.'
    ),
    proofs: [],
  },
  {
    key: 'bun-serve-http3-probe',
    token: asDocTokenId('Bun.serve http3'),
    variant: 'quic-server',
    scope: 'tooling',
    policy: 'lab-only',
    ownerLane: 'runtime-tooling',
    implementations: [{ path: 'scripts/dx-mcp.ts', symbol: 'toolsCall' }],
    consumers: [{ path: 'scripts/dx-mcp.ts', symbol: 'dispatch' }],
    relationships: none(
      'The QUIC server probe validates runtime support without transporting a domain identity.'
    ),
    proofs: [],
  },
] as const);
