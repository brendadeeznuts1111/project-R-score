import { describe, expect, test } from 'bun:test';
import {
  artifactSchemaIdentity,
  checkRegistryArtifact,
  collectObjectKeyPaths,
} from '../lib/docs/partner-surface-registry-check.ts';
import type { PartnerSurfaceRegistryBag } from '../lib/docs/partner-surface-inventory.ts';

describe('partner-surface-registry-check', () => {
  test('collectObjectKeyPaths walks nested keys (not string values)', () => {
    const paths = collectObjectKeyPaths({
      schema: 'x',
      partners: [{ outs: [{ credentials: { username: 'a' } }] }],
      omits: ['credentials', 'softBalance'],
    });
    const keys = new Set(paths.map(p => p.key));
    expect(keys.has('credentials')).toBe(true);
    expect(keys.has('username')).toBe(true);
    expect(keys.has('omits')).toBe(true);
    // omit list entries are values, not keys
    expect(paths.some(p => p.key === 'softBalance')).toBe(false);
  });

  test('artifactSchemaIdentity prefers schema over kind', () => {
    expect(artifactSchemaIdentity({ schema: 'a', kind: 'b' })).toEqual({
      field: 'schema',
      value: 'a',
    });
    expect(artifactSchemaIdentity({ kind: 'tennis-partner-contracts' })).toEqual({
      field: 'kind',
      value: 'tennis-partner-contracts',
    });
    expect(artifactSchemaIdentity({ schemaVersion: 1 })).toEqual({
      field: 'schemaVersion',
      value: '1',
    });
  });

  test('omits catch credentials object keys', () => {
    const bag: PartnerSurfaceRegistryBag = {
      schemaId: 'demo',
      schemaIdField: 'schema',
      artifactPath: 'x.json',
      omits: ['credentials', 'softBalance'],
      moneyPolicy: 'unset',
    };
    const issues = checkRegistryArtifact('row.demo', bag, {
      schema: 'demo',
      outs: [{ credentials: { username: 'x' } }],
    });
    expect(issues.some(i => i.level === 'error' && i.message.includes('credentials'))).toBe(
      true
    );
  });

  test('moneyPolicy forbidden rejects softBalance key', () => {
    const bag: PartnerSurfaceRegistryBag = {
      schemaId: 'demo',
      schemaIdField: 'schema',
      artifactPath: 'x.json',
      omits: [],
      moneyPolicy: 'forbidden',
    };
    const issues = checkRegistryArtifact('row.demo', bag, {
      schema: 'demo',
      softBalance: 12,
    });
    expect(issues.some(i => i.message.includes('moneyPolicy=forbidden'))).toBe(true);
  });

  test('moneyPolicy integerMinorUnits requires integer *Cents', () => {
    const bag: PartnerSurfaceRegistryBag = {
      schemaId: 'demo',
      schemaIdField: 'kind',
      artifactPath: 'x.json',
      omits: [],
      moneyPolicy: 'integerMinorUnits',
      requiredTopKeys: ['kind'],
    };
    const bad = checkRegistryArtifact('row.demo', bag, {
      kind: 'demo',
      limitCents: 1.5,
    });
    expect(bad.some(i => i.message.includes('limitCents'))).toBe(true);

    const good = checkRegistryArtifact('row.demo', bag, {
      kind: 'demo',
      limitCents: 150,
    });
    expect(good.filter(i => i.level === 'error')).toEqual([]);
  });

  test('moneyPolicy structuredMinorUnits requires currency and integer minorUnits', () => {
    const bag: PartnerSurfaceRegistryBag = {
      schemaId: 'demo',
      schemaIdField: 'kind',
      artifactPath: 'x.json',
      omits: [],
      moneyPolicy: 'structuredMinorUnits',
    };
    expect(
      checkRegistryArtifact('row.demo', bag, {
        kind: 'demo',
        amount: { currency: 'USD', minorUnits: 150 },
      }).filter(i => i.level === 'error')
    ).toEqual([]);
    expect(
      checkRegistryArtifact('row.demo', bag, {
        kind: 'demo',
        amount: { currency: 'USD', minorUnits: 1.5 },
      }).some(i => i.message.includes('structuredMinorUnits'))
    ).toBe(true);
  });

  test('conceptIds are not treated as JSON paths', () => {
    const bag: PartnerSurfaceRegistryBag = {
      schemaId: 'demo',
      schemaIdField: 'schema',
      artifactPath: 'x.json',
      conceptIds: ['partner.phase.active', 'out.status.*'],
      omits: [],
      moneyPolicy: 'unset',
      requiredTopKeys: ['schema'],
    };
    const issues = checkRegistryArtifact('row.demo', bag, { schema: 'demo' });
    expect(issues.filter(i => i.level === 'error')).toEqual([]);
  });

  test('checkRegistryArtifact prefers bag.schemaIdField when both schema and schemaVersion exist', () => {
    const issues = checkRegistryArtifact(
      'registry.dual-identity',
      {
        schemaId: '2',
        schemaIdField: 'schemaVersion',
        artifactPath: 'public/registry/example.json',
        omits: [],
        moneyPolicy: 'unset',
      },
      {
        schema: 'factorywager.example.v2',
        schemaVersion: 2,
        profiles: {},
      }
    );
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });

});
