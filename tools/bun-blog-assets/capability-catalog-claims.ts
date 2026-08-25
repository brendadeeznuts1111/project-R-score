// Claims are attributed to Bun's release post and intentionally have no local contract paths.
import type { Bun14Capability } from './types.ts';
import { asReleaseCapabilityId } from '../../lib/types/branded.ts';

const BLOG = 'https://bun.com/blog/bun-v1.4';

export const BUN_14_CLAIM_CAPABILITIES: Bun14Capability[] = [
  {
    id: asReleaseCapabilityId('ffi-performance-claim'),
    domain: 'runtime',
    symbol: 'bun:ffi',
    changeKind: 'performance',
    adoption: 'upstream-claim',
    summary: 'Bun reports up to a threefold FFI call-speed improvement.',
    boundary: 'Release benchmark claim only; no gallery code uses FFI.',
    releaseUrl: `${BLOG}#3x-faster-bun-ffi`,
    assetIds: ['bun-1.4-ffi-3x'],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('source-map-decoding-claim'),
    domain: 'runtime',
    symbol: 'source-map decoding',
    changeKind: 'performance',
    adoption: 'upstream-claim',
    summary: 'Bun reports source-map decoding is 3.1 times faster in its release benchmark.',
    boundary: 'Release benchmark claim only; portal source maps follow deployment policy.',
    releaseUrl: `${BLOG}#source-map-decoding-is-3-1-faster`,
    assetIds: ['bun-1.4-sourcemap-decoding'],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('windows-short-timers'),
    domain: 'platform',
    symbol: 'setTimeout / setInterval',
    changeKind: 'fixed',
    adoption: 'upstream-claim',
    summary:
      'Windows timers below 15 milliseconds no longer inherit the old coarse scheduling floor.',
    boundary: 'Windows-specific release behavior; this host does not claim a local probe.',
    releaseUrl: `${BLOG}#sub-15-ms-timers-on-windows`,
    assetIds: ['bun-1.4-windows-timers'],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('production-efficiency-claims'),
    domain: 'platform',
    symbol: 'Bun runtime',
    changeKind: 'performance',
    adoption: 'upstream-claim',
    summary: 'Bun reports lower server memory, idle CPU and startup costs for the 1.4 runtime.',
    boundary:
      'Upstream workload measurements; repository gates do not present them as local benchmarks.',
    releaseUrl: `${BLOG}#production`,
    assetIds: ['bun-1.4-cpu-usage-cc', 'bun-1.4-idle-cpu', 'bun-1.4-nextjs-ssr-fetch-leak'],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('bun-1-4-overview'),
    domain: 'platform',
    symbol: 'Bun 1.4',
    changeKind: 'compatibility',
    adoption: 'upstream-claim',
    summary: 'Release-level context linking official overview media to the capability graph.',
    boundary: 'Navigation relation only; detailed claims live on their specific records.',
    releaseUrl: BLOG,
    assetIds: ['bun-1.4-og-image', 'bun-1.4-youtube-overview'],
    contractFiles: [],
  },
];
