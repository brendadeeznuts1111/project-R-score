import { describe, expect, test } from 'bun:test';
import {
  buildAvatarIndexFromNames,
  displayNameFromSlug,
  isSafeAvatarSlug,
  normalizePlayerSlug,
  scanWarehouseAvatars,
  toAvatarIndexDoc,
} from '../lib/tennis/avatar-index.ts';

describe('tennis avatar-index', () => {
  test('normalizePlayerSlug', () => {
    expect(normalizePlayerSlug('Jannik Sinner')).toBe('jannik-sinner');
    expect(normalizePlayerSlug('Iga Świątek')).toBe('iga-swiatek');
    expect(normalizePlayerSlug('  Carlos  Alcaraz ')).toBe('carlos-alcaraz');
    expect(normalizePlayerSlug('A'.repeat(80)).length).toBe(64);
    // Path-like input collapses; does not preserve traversal
    expect(normalizePlayerSlug('../etc/passwd')).toBe('etc-passwd');
    expect(normalizePlayerSlug('foo/bar')).toBe('foo-bar');
    expect(normalizePlayerSlug('')).toBe('player');
  });

  test('isSafeAvatarSlug rejects unsafe paths', () => {
    expect(isSafeAvatarSlug('demo-player')).toBe(true);
    expect(isSafeAvatarSlug('jannik-sinner')).toBe(true);
    expect(isSafeAvatarSlug('../etc/passwd')).toBe(false);
    expect(isSafeAvatarSlug('a/b')).toBe(false);
    expect(isSafeAvatarSlug('')).toBe(false);
    expect(isSafeAvatarSlug('-leading')).toBe(false);
    expect(isSafeAvatarSlug('has space')).toBe(false);
  });

  test('displayNameFromSlug', () => {
    expect(displayNameFromSlug('jannik-sinner')).toBe('Jannik Sinner');
    expect(displayNameFromSlug('demo-player')).toBe('Demo Player');
  });

  test('scanWarehouseAvatars finds demo-player if file exists', async () => {
    const index = await scanWarehouseAvatars();
    expect(index.kind).toBe('tennis-avatar-index');
    expect(index.schemaVersion).toBe(1);
    expect(index.sourceDir).toContain('warehouse/avatars');
    expect(index.cacheDir).toContain('public/avatars');

    const demo = index.players.find(p => p.slug === 'demo-player');
    // Warehouse ships warehouse/avatars/demo-player.png (+ cached webp).
    if (demo) {
      expect(demo.source).toBe('fixture');
      expect(demo.hasSource || demo.hasWebp).toBe(true);
      expect(isSafeAvatarSlug(demo.slug)).toBe(true);
    } else {
      // Repo without fixture still returns a valid empty-capable index.
      expect(Array.isArray(index.players)).toBe(true);
    }
  });

  test('buildAvatarIndexFromNames merges warehouse + names', async () => {
    const index = await buildAvatarIndexFromNames(['Jannik Sinner', 'demo-player']);
    const bySlug = new Map(index.players.map(p => [p.slug, p]));
    expect(bySlug.has('jannik-sinner')).toBe(true);
    const sinner = bySlug.get('jannik-sinner')!;
    expect(sinner.hasSource).toBe(false);
    expect(sinner.source).toBe('manual');
    expect(sinner.displayName).toBe('Jannik Sinner');

    const doc = toAvatarIndexDoc(index);
    expect((doc as { kind: string }).kind).toBe('tennis-avatar-index');
    expect(Array.isArray((doc as { players: unknown[] }).players)).toBe(true);
  });
});
