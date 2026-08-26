import type { Bun14Capability } from './types.ts';
import { asReleaseCapabilityId } from '../../lib/types/branded.ts';

const BLOG = 'https://bun.com/blog/bun-v1.4';

export const BUN_14_COLOR_CAPABILITIES: Bun14Capability[] = [
  {
    id: asReleaseCapabilityId('bun-color-runtime-formats'),
    domain: 'runtime',
    symbol: 'Bun.color',
    changeKind: 'fixed',
    adoption: 'integrated',
    summary:
      'Converts advanced CSS color inputs and keeps numeric alpha plus HSL/LAB round-trips correct.',
    boundary:
      'Conversions execute in Bun and are baked before Pages delivery; browser modules never assume a Bun global.',
    releaseUrl: `${BLOG}#other-behavior-changes`,
    docsUrl: 'https://bun.com/docs/runtime/color',
    assetIds: [],
    contractFiles: [
      'tests/bun-1.4.0-behavior-contract.test.ts',
      'tests/bun-1.4.0-bugfix-contract.test.ts',
      'tests/bun-color-palette-clip.test.ts',
    ],
  },
];
