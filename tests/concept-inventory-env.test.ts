// @see https://bun.com/docs/test — bun:test
import { afterEach, describe, expect, test } from 'bun:test';

import { parseConceptInventoryOptions } from '../tools/concept-inventory.ts';

const ENV_KEYS = [
  'CONCEPT_INVENTORY_OUTPUT',
  'CONCEPT_INVENTORY_FILTER_GROUP',
  'CONCEPT_INVENTORY_FILTER_CATEGORY',
  'CONCEPT_INVENTORY_FILTER_DOMAIN',
  'CONCEPT_INVENTORY_FILTER_STATUS',
  'CONCEPT_INVENTORY_SHOW_UNUSED',
  'CONCEPT_INVENTORY_SORT',
  'CONCEPT_INVENTORY_DESC',
] as const;

const saved = new Map<string, string | undefined>();

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved.get(key);
    if (value === undefined) delete Bun.env[key];
    else Bun.env[key] = value;
  }
  saved.clear();
});

function setEnv(key: (typeof ENV_KEYS)[number], value: string): void {
  if (!saved.has(key)) saved.set(key, Bun.env[key]);
  Bun.env[key] = value;
}

const ARGV = ['bun', 'tools/concept-inventory.ts'];

describe('concept:inventory env fallbacks', () => {
  test('env supplies output/group/category/domain/status/unused/sort/desc when flags absent', () => {
    setEnv('CONCEPT_INVENTORY_OUTPUT', 'json');
    setEnv('CONCEPT_INVENTORY_FILTER_GROUP', 'ops.limits');
    setEnv('CONCEPT_INVENTORY_FILTER_CATEGORY', 'ui');
    setEnv('CONCEPT_INVENTORY_FILTER_DOMAIN', 'compliance');
    setEnv('CONCEPT_INVENTORY_FILTER_STATUS', 'active');
    setEnv('CONCEPT_INVENTORY_SHOW_UNUSED', '1');
    setEnv('CONCEPT_INVENTORY_SORT', 'usage');
    setEnv('CONCEPT_INVENTORY_DESC', '1');

    const opts = parseConceptInventoryOptions(ARGV);
    expect(opts.output).toBe('json');
    expect(opts.group).toBe('ops.limits');
    expect(opts.category).toBe('ui');
    expect(opts.domain).toBe('compliance');
    expect(opts.status).toBe('active');
    expect(opts.unused).toBe(true);
    expect(opts.sort).toBe('usage');
    expect(opts.desc).toBe(true);
  });

  test('flags win over env', () => {
    setEnv('CONCEPT_INVENTORY_OUTPUT', 'markdown');
    setEnv('CONCEPT_INVENTORY_FILTER_GROUP', 'ui.semantic');
    setEnv('CONCEPT_INVENTORY_FILTER_DOMAIN', 'portal');
    setEnv('CONCEPT_INVENTORY_SORT', 'id');

    const opts = parseConceptInventoryOptions([
      ...ARGV,
      '--output',
      'json',
      '--group',
      'ops.limits',
      '--domain',
      'compliance',
      '--sort',
      'usage',
    ]);
    expect(opts.output).toBe('json');
    expect(opts.group).toBe('ops.limits');
    expect(opts.domain).toBe('compliance');
    expect(opts.sort).toBe('usage');
  });

  test('SHOW_UNUSED=0 does not enable the unused filter', () => {
    setEnv('CONCEPT_INVENTORY_SHOW_UNUSED', '0');
    const opts = parseConceptInventoryOptions(ARGV);
    expect(opts.unused).toBe(false);
  });

  test('DESC=1 enables desc without the flag; flag also works alone', () => {
    setEnv('CONCEPT_INVENTORY_DESC', '1');
    expect(parseConceptInventoryOptions(ARGV).desc).toBe(true);
    delete Bun.env.CONCEPT_INVENTORY_DESC;
    saved.set('CONCEPT_INVENTORY_DESC', undefined);
    expect(parseConceptInventoryOptions([...ARGV, '--desc']).desc).toBe(true);
  });

  test('invalid env values fall back to defaults', () => {
    setEnv('CONCEPT_INVENTORY_OUTPUT', 'yaml');
    setEnv('CONCEPT_INVENTORY_FILTER_STATUS', 'archived');
    setEnv('CONCEPT_INVENTORY_SORT', 'random');
    const opts = parseConceptInventoryOptions(ARGV);
    expect(opts.output).toBe('table');
    expect(opts.status).toBeUndefined();
    expect(opts.sort).toBeUndefined();
  });

  test('no env set keeps flag-only defaults', () => {
    const opts = parseConceptInventoryOptions(ARGV);
    expect(opts.output).toBe('table');
    expect(opts.group).toBeUndefined();
    expect(opts.unused).toBe(false);
    expect(opts.desc).toBe(false);
  });
});
