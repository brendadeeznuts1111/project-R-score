import { describe, expect, test } from 'bun:test';
import { InstrumentedDomain } from '../scripts/lib/instrumented-domain';

describe('InstrumentedDomain', () => {
  test('computes performance snapshot metadata', () => {
    const domain = new InstrumentedDomain({
      id: 'factory-wager.com',
      color: '#4fd1c5',
      config: { mode: 'prod', region: 'us' },
      memory: 512,
      tension: 0.9,
    });

    const snap = domain.withPerformance;
    expect(snap.id).toBe('factory-wager.com');
    expect(snap.color).toBe('#4fd1c5');
    expect(snap.generationTime).toBeGreaterThanOrEqual(0);
    expect(snap.memoryFootprint).toBeGreaterThan(0);
  });

  test('loads only core resources on low memory and low tension', async () => {
    const domain = new InstrumentedDomain({
      id: 'low.example.com',
      color: '#111111',
      memory: 128,
      tension: 0.2,
    });

    const resources = await domain.loadResources();
    expect(resources.core).toEqual(['DOM', 'CSS', 'BASE_JS']);
    expect(resources.enhanced).toEqual([]);
    expect(resources.optional).toEqual([]);
  });

  test('loads enhanced by memory and optional by tension independently', async () => {
    const memOnly = new InstrumentedDomain({
      id: 'mem.example.com',
      color: '#222222',
      memory: 512,
      tension: 0.4,
    });
    const memResources = await memOnly.loadResources();
    expect(memResources.enhanced.length).toBeGreaterThan(0);
    expect(memResources.optional).toEqual([]);

    const tensionOnly = new InstrumentedDomain({
      id: 'tension.example.com',
      color: '#333333',
      memory: 128,
      tension: 0.9,
    });
    const tensionResources = await tensionOnly.loadResources();
    expect(tensionResources.enhanced).toEqual([]);
    expect(tensionResources.optional.length).toBeGreaterThan(0);
  });

  test('records timing map entries after resource loading', async () => {
    const domain = new InstrumentedDomain({
      id: 'timed.example.com',
      color: '#444444',
      memory: 512,
      tension: 0.9,
    });

    await domain.loadResources();
    const timings = domain.getTimings();
    expect(timings.has('core')).toBe(true);
    expect(timings.has('enhanced')).toBe(true);
    expect(timings.has('optional')).toBe(true);
  });

  test('enforces scenario boundaries at threshold edges', async () => {
    const atBoundary = new InstrumentedDomain({
      id: 'boundary.example.com',
      color: '#555555',
      memory: 256,
      tension: 0.8,
    });

    const resources = await atBoundary.loadResources();
    expect(resources.enhanced.length).toBeGreaterThan(0);
    expect(resources.optional.length).toBeGreaterThan(0);
  });
});
