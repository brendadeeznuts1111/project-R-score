import { describe, expect, test } from 'bun:test';

import {
  CONTROL_OVERRIDE_OWNERSHIP_MANIFEST,
  controlOverrideOwnershipIssues,
} from '../lib/security/control-override-ownership.ts';
import { evaluateControlPolicy } from '../lib/security/control-policy.ts';

describe('control override ownership manifest', () => {
  test('is structurally identical to the executable policy and every owner exists', async () => {
    expect(await controlOverrideOwnershipIssues()).toEqual([]);
    expect(CONTROL_OVERRIDE_OWNERSHIP_MANIFEST.defaultDecision).toBe('deny');
    expect(CONTROL_OVERRIDE_OWNERSHIP_MANIFEST.registryPrecedence).toEqual({
      readInstall: ['cli', 'environment', 'bunfig', 'npmrc', 'default'],
      publish: ['cli', 'environment', 'publishConfig', 'bunfig', 'npmrc'],
    });
    expect(CONTROL_OVERRIDE_OWNERSHIP_MANIFEST.residualScopes).not.toEqual([]);
  });

  test('records exact non-Bun meanings for connect, O, and R', () => {
    expect(
      CONTROL_OVERRIDE_OWNERSHIP_MANIFEST.reservedAuthoritySpellings.map(item => [
        item.spelling,
        item.meaning,
      ])
    ).toEqual([
      [
        '--connect',
        'No Bun 1.4 runtime or package-manager meaning; application-specific occurrences remain after the entrypoint.',
      ],
      [
        '-O',
        'No Bun 1.4 runtime or package-manager meaning; repository matches belong to curl/wget output behavior.',
      ],
      [
        '-R',
        'No Bun 1.4 runtime or package-manager meaning; search:smart owns -R as its runtime-list filter after the entrypoint.',
      ],
    ]);
  });

  test('rejects sensitive CLI, environment, config, and request overrides before effects', () => {
    const result = evaluateControlPolicy({
      profile: 'offline',
      command: 'runtime',
      argv: ['--preload=./unowned.ts', '--experimental-http2-fetch'],
      environment: {
        BUN_OPTIONS: '--fetch-preconnect=https://hidden.example',
        BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT: '1',
      },
      bunfig: { preload: ['./also-unowned.ts'] },
      request: { proxy: 'https://proxy.example', protocol: 'h3' },
    });

    expect(result.ok).toBe(false);
    expect(result.effective).toEqual([]);
    expect(result.rejected.map(item => `${item.source}:${item.spelling}:${item.code}`)).toEqual(
      expect.arrayContaining([
        'cli:--preload:profile-denied',
        'cli:--experimental-http2-fetch:profile-denied',
        'bun-options:BUN_OPTIONS:composite-source-denied',
        'environment:BUN_FEATURE_FLAG_EXPERIMENTAL_HTTP3_CLIENT:profile-denied',
        'request:proxy:profile-denied',
        'request:protocol:profile-denied',
      ])
    );

    const bunfigOnly = evaluateControlPolicy({
      profile: 'offline',
      command: 'runtime',
      bunfig: { preload: './also-unowned.ts' },
    });
    expect(bunfigOnly.effective).toEqual([]);
    expect(bunfigOnly.rejected).toContainEqual(
      expect.objectContaining({
        source: 'bunfig',
        spelling: 'preload',
        code: 'profile-denied',
      })
    );
  });

  test('keeps application flags after the Bun entrypoint boundary', () => {
    const result = evaluateControlPolicy({
      profile: 'production',
      command: 'runtime',
      argv: ['scripts/search-smart.ts', '-R', 'bun,ts', '--connect', '-O'],
    });

    expect(result.ok).toBe(true);
    expect(result.effective).toEqual([]);
    expect(result.applicationArgv).toEqual([
      'scripts/search-smart.ts',
      '-R',
      'bun,ts',
      '--connect',
      '-O',
    ]);
  });
});
