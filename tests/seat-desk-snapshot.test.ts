// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { SeatIntakeRecord } from '../lib/telegram/seat-capital-desk.ts';
import {
  buildSeatCapitalDeskSnapshot,
  emptySeatCapitalDeskSummarySlice,
  exportSeatCapitalDeskSnapshot,
  loadSeatCapitalDeskSummarySlice,
  snapshotToSummarySlice,
} from '../lib/telegram/seat-desk-snapshot.ts';

const readyFixture: SeatIntakeRecord = {
  partnerCode: 'SPEN',
  callSign: 'SPEN-001',
  outs: [
    {
      book: 'parlay21.com',
      bookLogin: 'vc2013',
      password: 'htown-secret',
      paymentRail: 'Venmo',
      sendTo: '@ash-demo',
      primary: true,
      outId: 'SPEN-1',
    },
  ],
};

const blockedFixture: SeatIntakeRecord = {
  partnerCode: 'NOV',
  callSign: 'NOV-002',
  outs: [
    {
      book: 'lonestarwagering.com',
      bookLogin: 'Yungg1',
      password: 'yungg-secret',
      outId: 'NOV-1',
      primary: true,
    },
  ],
};

async function writeIntake(dir: string, record: SeatIntakeRecord): Promise<void> {
  await Bun.write(join(dir, `${record.callSign}.json`), JSON.stringify(record, null, 2));
}

describe('seat-desk-snapshot', () => {
  test('buildSeatCapitalDeskSnapshot maps intake files to redacted view models', async () => {
    const dir = join(tmpdir(), `seat-desk-snap-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeIntake(dir, readyFixture);
    await writeIntake(dir, blockedFixture);

    const snap = await buildSeatCapitalDeskSnapshot(dir);
    expect(snap.schema).toBe('factorywager.seat-capital-desk.v1');
    expect(snap.desks).toBe(2);
    // Sorted by callSign: NOV-002 before SPEN-001
    expect(snap.rows.map(r => r.callSign)).toEqual(['NOV-002', 'SPEN-001']);
    expect(snap.rows.find(r => r.callSign === 'SPEN-001')?.fundStatus).toBe('ready');
    expect(snap.rows.find(r => r.callSign === 'NOV-002')?.fundStatus).toBe('blocked');
    expect(snap.blocked).toBe(1);
    expect(snap.ready).toBe(1);
    expect(snap.incompleteOuts).toBeGreaterThan(0);

    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain('htown-secret');
    expect(serialized).not.toContain('yungg-secret');
    expect(serialized).not.toContain('password');

    await rm(dir, { recursive: true, force: true });
  });

  test('export and load round-trip', async () => {
    const root = join(tmpdir(), `seat-desk-root-${Date.now()}`);
    const intakeDir = join(root, 'reports/telegram/seat-intake');
    await mkdir(intakeDir, { recursive: true });
    await writeIntake(intakeDir, readyFixture);

    const slice = await exportSeatCapitalDeskSnapshot(root);
    expect(slice.available).toBe(true);
    expect(slice.desks).toBe(1);
    expect(slice.rows[0]?.callSign).toBe('SPEN-001');

    const loaded = loadSeatCapitalDeskSummarySlice(
      join(root, 'public/registry/seat-capital-desk.json')
    );
    expect(loaded.available).toBe(true);
    expect(loaded.desks).toBe(1);
    expect(loaded.path).toBe('/registry/seat-capital-desk.json');

    const raw = await Bun.file(join(root, 'public/registry/seat-capital-desk.json')).text();
    expect(raw).not.toContain('htown-secret');
    expect(raw).not.toContain('"password"');

    await rm(root, { recursive: true, force: true });
  });

  test('empty intake dir → snapshot with zero desks', async () => {
    const dir = join(tmpdir(), `seat-desk-empty-${Date.now()}`);
    // Do not create the directory — buildSeatCapitalDeskSnapshot must tolerate missing dirs.
    const snap = await buildSeatCapitalDeskSnapshot(dir);
    expect(snap.desks).toBe(0);
    expect(snap.rows).toEqual([]);
    expect(snap.blocked).toBe(0);
  });

  test('emptySeatCapitalDeskSummarySlice / snapshotToSummarySlice(null) are unavailable', () => {
    expect(emptySeatCapitalDeskSummarySlice().available).toBe(false);
    expect(snapshotToSummarySlice(null).available).toBe(false);
    expect(snapshotToSummarySlice(null).rows).toEqual([]);
  });

  test('loadSeatCapitalDeskSummarySlice returns empty slice when file missing', () => {
    const slice = loadSeatCapitalDeskSummarySlice('/tmp/does-not-exist-seat-desk.json');
    expect(slice.available).toBe(false);
    expect(slice.path).toBe('/registry/seat-capital-desk.json');
  });
});
