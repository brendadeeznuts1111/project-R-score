// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
/**
 * QueueLaneStatus — stats table + correct inspect.custom symbol.
 */
import { describe, expect, test } from 'bun:test';
import { inspect } from 'bun';
import {
  QUEUE_LANE_STAT_KEYS,
  QUEUE_LANE_TABLE_KEYS,
  QueueLaneStatus,
  QueueLaneStatusReport,
  inspectCustom,
  inspectTable,
  queueLaneStatKeys,
} from '../lib/console/index.ts';

const sampleLanes = () => [
  new QueueLaneStatus('feed-fetcher', 12, 3, 87, 0),
  new QueueLaneStatus('image-processor', 5, 2, 43, 1),
  new QueueLaneStatus('indexer', 0, 0, 120, 0),
];

describe('QueueLaneStatus inspect.table pattern', () => {
  test('inspectCustom matches nodejs.util.inspect.custom (not Bun.inspect.custom)', () => {
    expect(inspectCustom).toBe(Symbol.for('nodejs.util.inspect.custom'));
    expect(inspectCustom).not.toBe(Symbol.for('Bun.inspect.custom'));
  });

  test('inspectTable with name + stats includes headers and a lane name', () => {
    const text = inspectTable(sampleLanes(), [...QUEUE_LANE_TABLE_KEYS], { colors: false });
    expect(text).toContain('name');
    expect(text).toContain('pending');
    expect(text).toContain('feed-fetcher');
    expect(text).toContain('image-processor');
  });

  test('stats-only columns omit name', () => {
    const text = inspectTable(sampleLanes(), [...QUEUE_LANE_STAT_KEYS], { colors: false });
    expect(text).toContain('pending');
    expect(text).toContain('processing');
    expect(text).not.toMatch(/\bname\b/);
  });

  test('queueLaneStatKeys excludes name', () => {
    const keys = queueLaneStatKeys(sampleLanes()[0]!);
    expect(keys).toEqual(['pending', 'processing', 'completed', 'errors']);
  });

  test('totals sums all lanes', () => {
    const report = new QueueLaneStatusReport(sampleLanes());
    expect(report.totals()).toEqual({
      pending: 17,
      processing: 5,
      completed: 250,
      errors: 1,
    });
  });

  test('inspectCustom renders table + totals footer via Bun.inspect', () => {
    const report = new QueueLaneStatusReport(sampleLanes());
    const text = report[inspectCustom](undefined, { colors: false });
    expect(text).toContain('QueueLaneStatusReport');
    expect(text).toContain('feed-fetcher');
    expect(text).toContain('totals · pending=17');
    expect(inspect(report, { colors: false })).toContain('feed-fetcher');
  });

  test('toJSON includes lanes and totals', () => {
    const json = new QueueLaneStatusReport(sampleLanes()).toJSON();
    expect(json.lanes).toHaveLength(3);
    expect(json.totals.completed).toBe(250);
  });
});
