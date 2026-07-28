// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  LINEAGE_DEMO_HOST,
  dnsAccessLineageRows,
  resolveLineageInput,
} from '../lib/http/host-lineage.ts';
import { asHostId } from '../lib/types/branded.ts';

describe('host-lineage', () => {
  test('dnsAccessLineageRows covers split → access → url → back', () => {
    const host = asHostId(LINEAGE_DEMO_HOST);
    const rows = dnsAccessLineageRows(host);
    const steps = rows.map(r => r.step);
    expect(steps).toEqual([
      '1.split',
      '2.roundTrip',
      '3.https',
      '4.accessPath',
      '5.accessUrl',
      '6.accessBack',
      '7.accessWhole',
    ]);
    expect(rows.find(r => r.step === '2.roundTrip')?.note).toBe('ok');
    expect(rows.find(r => r.step === '3.https')?.to).toBe(
      'https://score.factory-wager.com/'
    );
    expect(rows.find(r => r.step === '4.accessPath')?.to).toBe(
      'score.factory-wager.com/portal'
    );
    expect(rows.find(r => r.step === '5.accessUrl')?.to).not.toContain('//portal');
    expect(rows.find(r => r.step === '6.accessBack')?.to).toBe(LINEAGE_DEMO_HOST);
  });

  test('resolveLineageInput classifies host · access · url', () => {
    expect(resolveLineageInput('score.factory-wager.com')).toMatchObject({
      kind: 'host',
      host: 'score.factory-wager.com',
    });
    expect(resolveLineageInput('score.factory-wager.com/portal')).toMatchObject({
      kind: 'access',
      host: 'score.factory-wager.com',
      access: 'score.factory-wager.com/portal',
    });
    expect(resolveLineageInput('https://score.factory-wager.com/portal/')).toMatchObject({
      kind: 'url',
      host: 'score.factory-wager.com',
    });
    expect(resolveLineageInput('not a host')).toMatchObject({ kind: 'invalid' });
  });
});
