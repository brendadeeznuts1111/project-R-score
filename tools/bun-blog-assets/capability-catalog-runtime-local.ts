// @see https://bun.com/docs/runtime/cron — Bun.cron
// @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
// @see https://bun.com/docs/runtime/ffi — bun:ffi
import type { Bun14Capability } from './types.ts';
import { asReleaseCapabilityId } from '../../lib/types/branded.ts';

const BLOG = 'https://bun.com/blog/bun-v1.4';

export const BUN_14_CRON_CAPABILITIES: Bun14Capability[] = [
  {
    id: asReleaseCapabilityId('bun-cron-scheduler'),
    domain: 'runtime',
    symbol: 'Bun.cron',
    changeKind: 'release-window',
    adoption: 'integrated',
    summary:
      'Registers OS-persistent jobs, schedules non-overlapping in-process handlers and parses cron expressions with explicit time zones.',
    boundary:
      'OS registration is an explicit local operation; in-process jobs are disposable and must not leak from tests.',
    releaseUrl: `${BLOG}#bun-cron`,
    docsUrl: 'https://bun.com/docs/runtime/cron',
    assetIds: [],
    contractFiles: ['tests/bun-cron.test.ts', 'tests/bun-1.4.0-cron-contract.test.ts'],
  },
];

export const BUN_14_LOCAL_RUNTIME_CAPABILITIES: Bun14Capability[] = [
  {
    id: asReleaseCapabilityId('bun-terminal-local-tools'),
    domain: 'platform',
    symbol: 'Bun.Terminal',
    changeKind: 'release-window',
    adoption: 'integrated',
    summary: 'Drives and captures cross-platform pseudo-terminals through Bun.spawn.',
    boundary: 'Interactive local tooling only; not a static portal or edge-runtime dependency.',
    releaseUrl: `${BLOG}#bun-terminal`,
    docsUrl: 'https://bun.com/docs/runtime/terminal',
    assetIds: [],
    contractFiles: ['tests/terminal.test.ts'],
  },
  {
    id: asReleaseCapabilityId('bun-ffi-native-contract'),
    domain: 'runtime',
    symbol: 'bun:ffi CString / buffer_length',
    changeKind: 'changed',
    adoption: 'contract',
    summary:
      'Uses JavaScriptCore-native FFI, passes typed-array lengths with buffer_length and returns cstring values as plain strings or null.',
    boundary:
      'Native-library calls remain isolated from browser, edge, XML and feed parsing boundaries.',
    releaseUrl: `${BLOG}#3x-faster-bun-ffi`,
    docsUrl: 'https://bun.com/docs/runtime/ffi',
    assetIds: [],
    contractFiles: ['tests/bun-1.4.0-breaking-changes-contract.test.ts'],
  },
];
