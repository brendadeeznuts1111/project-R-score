import { describe, expect, test } from 'bun:test';
import { compareSubprocessInventory } from '../lib/security/subprocess-consumer-inventory.ts';

describe('subprocess consumer inventory', () => {
  test('classifies additions, removals, and authority changes bidirectionally', () => {
    expect(
      compareSubprocessInventory(
        [
          { id: 'kept', authority: 'guarded-registry-consumer' },
          { id: 'added', authority: 'unowned' },
          { id: 'changed', authority: 'guarded-registry-consumer' },
        ],
        [
          { id: 'kept', authority: 'guarded-registry-consumer' },
          { id: 'removed', authority: 'unowned' },
          { id: 'changed', authority: 'raw-bun-package-manager-probe' },
        ]
      )
    ).toEqual({
      additions: ['added'],
      removals: ['removed'],
      classificationChanges: [
        'changed: raw-bun-package-manager-probe -> guarded-registry-consumer',
      ],
    });
  });

  test('records only controls present at exact child-launch boundaries', async () => {
    const manifest = (await Bun.file(
      new URL('../scripts/subprocess-authority-inventory.json', import.meta.url)
    ).json()) as {
      entries: Array<{
        authority: string;
        controlSpellings: string[];
        exception?: { owner: string; reason: string };
      }>;
    };
    const spellings = manifest.entries.flatMap(entry => entry.controlSpellings).sort();
    expect(spellings).toEqual(Array.from({ length: 5 }, () => '--registry'));
    const native = manifest.entries.filter(entry => entry.authority === 'intentional-native-probe');
    expect(native).toHaveLength(1);
    expect(native[0]?.exception).toEqual({
      owner: 'install-env-verification',
      reason:
        'Exercises Bun install environment behavior in disposable directories; shared policy would suppress the behavior under test.',
    });
  });
});
