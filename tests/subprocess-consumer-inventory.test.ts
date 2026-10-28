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
        review?: { owner?: string; defaultDeny?: boolean; flagPassthrough?: string };
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
    const guarded = manifest.entries.filter(
      entry => entry.authority === 'guarded-process-consumer'
    );
    expect(guarded.length).toBeGreaterThanOrEqual(4);
    expect(
      guarded.every(
        entry =>
          entry.review?.defaultDeny === true &&
          Boolean(entry.review.owner) &&
          entry.review.flagPassthrough === 'control-policy'
      )
    ).toBeTrue();
  });

  test('reviews the complete lib/docs subprocess scope without claiming gaps are guarded', async () => {
    const ownership = (await Bun.file(
      new URL('../config/subprocess-consumer-ownership.json', import.meta.url)
    ).json()) as {
      profiles: Record<string, { enforcement: string; defaultDeny: boolean }>;
      entries: Array<{ id: string; owner: string; profile: string }>; // brand-ok — test fixture inventory identity
    };
    expect(ownership.entries).toHaveLength(11);
    expect(ownership.entries.every(entry => entry.id.startsWith('lib/docs/'))).toBeTrue();
    expect(ownership.entries.every(entry => entry.owner.length > 0)).toBeTrue();
    const guarded = ownership.entries.filter(
      entry => ownership.profiles[entry.profile]?.enforcement === 'guarded'
    );
    const unowned = ownership.entries.filter(
      entry => ownership.profiles[entry.profile]?.enforcement === 'unowned'
    );
    expect(guarded).toHaveLength(2);
    expect(unowned).toHaveLength(9);
    expect(
      guarded.every(entry => ownership.profiles[entry.profile]?.defaultDeny === true)
    ).toBeTrue();
    expect(
      unowned.every(entry => ownership.profiles[entry.profile]?.defaultDeny === false)
    ).toBeTrue();
  });
});
