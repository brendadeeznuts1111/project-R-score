// Web/platform built-ins from Bun's 1.4 "Also built in" release section.
import type { Bun14Capability } from './types.ts';
import { asReleaseCapabilityId } from '../../lib/types/branded.ts';

const RELEASE = 'https://bun.com/blog/bun-v1.4#also-built-in';

export const BUN_14_BUILTIN_WEB_CAPABILITIES: Bun14Capability[] = [
  {
    id: asReleaseCapabilityId('urlpattern-native'),
    domain: 'runtime',
    symbol: 'URLPattern',
    changeKind: 'release-window',
    adoption: 'integrated',
    summary: 'Provides component-aware URL matching and parameter extraction without a package.',
    boundary:
      'Route classification uses precompiled patterns and validates decoded values separately.',
    releaseUrl: RELEASE,
    assetIds: [],
    contractFiles: ['tests/bun-urlpattern.test.ts', 'tests/portal-url-planes.test.ts'],
  },
  {
    id: asReleaseCapabilityId('compression-streams-native'),
    domain: 'runtime',
    symbol: 'CompressionStream / DecompressionStream',
    changeKind: 'release-window',
    adoption: 'candidate',
    summary: 'Exposes Web-standard streaming compression for gzip, deflate, Brotli, and zstd.',
    boundary: 'Remote media fetches still request identity encoding and reject encoded responses.',
    releaseUrl: RELEASE,
    assetIds: [],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('response-text-stream'),
    domain: 'runtime',
    symbol: 'Response.textStream()',
    changeKind: 'release-window',
    adoption: 'candidate',
    summary: 'Streams a response body as decoded UTF-8 strings.',
    boundary: 'Binary media validation continues to consume bounded bytes, not decoded text.',
    releaseUrl: RELEASE,
    assetIds: [],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('post-quantum-webcrypto'),
    domain: 'runtime',
    symbol: 'ML-DSA / ML-KEM',
    changeKind: 'new',
    adoption: 'candidate',
    summary:
      'Adds NIST post-quantum signatures and key encapsulation to WebCrypto and node:crypto.',
    boundary: 'No protocol or stored-key migration is implied by runtime availability.',
    releaseUrl: RELEASE,
    assetIds: [],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('bun-repl-native'),
    domain: 'platform',
    symbol: 'bun repl',
    changeKind: 'release-window',
    adoption: 'candidate',
    summary:
      'Provides a native interactive REPL with history, completion, highlighting, -e and -p.',
    boundary:
      'Interactive operator surface only; automation continues to use deterministic scripts.',
    releaseUrl: RELEASE,
    docsUrl: 'https://bun.com/docs/runtime/repl',
    assetIds: [],
    contractFiles: [],
  },
  {
    id: asReleaseCapabilityId('bun-markdown-cli'),
    domain: 'platform',
    symbol: 'bun ./README.md',
    changeKind: 'release-window',
    adoption: 'contract',
    summary: 'Renders a Markdown file directly in the terminal without starting a JavaScript VM.',
    boundary: 'Local presentation only; generated public HTML keeps its separate safety policy.',
    releaseUrl: RELEASE,
    docsUrl: 'https://bun.com/docs/runtime/markdown',
    assetIds: [],
    contractFiles: ['tests/regression/bun-1.3.12.test.ts'],
  },
];
