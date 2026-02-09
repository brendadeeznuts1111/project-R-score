import { describe, expect, test } from 'bun:test';
import { InstrumentedDomain } from '../scripts/lib/instrumented-domain';

describe('instrumented domain', () => {
  test('records timing map and returns performance snapshot', async () => {
    const domain = new InstrumentedDomain({
      id: 'low.factory-wager.com',
      color: '#4fd1c5',
      config: { memory: 128, tension: 0.2 },
      memory: 128,
      tension: 0.2,
    });

    const snap = domain.withPerformance;
    expect(snap.id).toBe('low.factory-wager.com');
    expect(snap.generationTime).toBeGreaterThanOrEqual(0);
    expect(snap.memoryFootprint).toBeGreaterThan(0);

    const resources = await domain.loadResources();
    expect(resources.core.length).toBeGreaterThan(0);
    expect(resources.enhanced).toHaveLength(0);
    expect(resources.optional).toHaveLength(0);
    expect(domain.getTimings().has('core')).toBe(true);
  });

  test('loads enhanced and optional resources for high memory and high tension', async () => {
    const domain = new InstrumentedDomain({
      id: 'high.factory-wager.com',
      color: '#4fd1c5',
      config: { memory: 512, tension: 0.9 },
      memory: 512,
      tension: 0.9,
    });

    const resources = await domain.loadResources();
    expect(resources.core.length).toBeGreaterThan(0);
    expect(resources.enhanced.length).toBeGreaterThan(0);
    expect(resources.optional.length).toBeGreaterThan(0);
    expect(domain.getTimings().has('enhanced')).toBe(true);
    expect(domain.getTimings().has('optional')).toBe(true);
  });
});

