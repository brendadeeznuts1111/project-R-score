import { describe, expect, mock, spyOn, test } from 'bun:test';
import { generatePalette } from '../lib/utils/advanced-hsl-colors';

const brandSeedProvider = {
  getSeed: () => 210,
};

function buildPalette(seed: number) {
  return generatePalette({ h: seed, s: 90, l: 60 });
}

describe('brand seed generation', () => {
  test('using + spyOn auto-restores default provider', () => {
    {
      using seedSpy = spyOn(brandSeedProvider, 'getSeed').mockReturnValue(135);
      const themed = buildPalette(brandSeedProvider.getSeed());
      expect(themed.base.h).toBe(135);
      expect(seedSpy).toHaveBeenCalledTimes(1);
    }

    const restored = buildPalette(brandSeedProvider.getSeed());
    expect(restored.base.h).toBe(210);
  });

  for (const seed of [0, 45, 90, 135, 180, 210, 270, 315]) {
    test.concurrent(`seed ${seed} keeps palette + contrast contract`, () => {
      using seedMock = mock(() => seed);
      const palette = buildPalette(seedMock());

      expect(palette.base.h).toBe(seed);
      expect(palette.palette.primary.startsWith('#')).toBe(true);
      expect(palette.palette.analogous.length).toBe(2);
      expect(palette.palette.triadic.length).toBe(2);
      expect(palette.palette.complementary.startsWith('#')).toBe(true);
      expect(palette.accessible.ratio).toBeGreaterThanOrEqual(4.5);
    });
  }
});
