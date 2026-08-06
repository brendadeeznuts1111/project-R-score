// @see https://bun.com/docs/test/writing-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  diffInventories,
  renderChangelogMd,
  type MemberSnap,
} from '../tools/bun-types-changelog.ts';

function snap(partial: Partial<MemberSnap> & Pick<MemberSnap, 'setting' | 'kind'>): MemberSnap {
  return {
    module: 'bun',
    depth: 0,
    form: partial.setting,
    deprecated: false,
    overloads: 1,
    notes: '—',
    ...partial,
  };
}

describe('diffInventories', () => {
  test('classifies added removed changed unchanged', () => {
    const from = [
      snap({ setting: 'Bun.A', kind: 'class' }),
      snap({ setting: 'Bun.B', kind: 'interface', form: 'Bun.B' }),
      snap({ setting: 'Bun.C', kind: 'type', form: 'old' }),
    ];
    const to = [
      snap({ setting: 'Bun.B', kind: 'interface', form: 'Bun.B' }),
      snap({ setting: 'Bun.C', kind: 'type', form: 'new' }),
      snap({ setting: 'Bun.D', kind: 'class' }),
    ];
    const cl = diffInventories(from, to, { from: 'a', to: 'b' });
    expect(cl.summary.added).toBe(1);
    expect(cl.summary.removed).toBe(1);
    expect(cl.summary.changed).toBe(1);
    expect(cl.summary.unchanged).toBe(1);
    expect(cl.added.map(m => m.setting)).toEqual(['Bun.D']);
    expect(cl.removed.map(m => m.setting)).toEqual(['Bun.A']);
    expect(cl.changed[0]!.setting).toBe('Bun.C');
    expect(cl.changed[0]!.fields).toContain('form');
  });

  test('renderChangelogMd includes sections', () => {
    const cl = diffInventories(
      [snap({ setting: 'Bun.Old', kind: 'type' })],
      [snap({ setting: 'Bun.New', kind: 'type' })],
      { from: 'pin', to: 'tip' },
    );
    const md = renderChangelogMd(cl);
    expect(md).toContain('## Added');
    expect(md).toContain('## Removed');
    expect(md).toContain('Bun.New');
    expect(md).toContain('Bun.Old');
  });
});
