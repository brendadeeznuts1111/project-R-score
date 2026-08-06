// @see https://bun.com/docs/test/writing-tests — bun:test
import { describe, expect, test } from 'bun:test';
import type { InventoryMember } from '../tools/bun-types-inventory.ts';
import {
  attributeFileText,
  selectTrackedMembers,
} from '../tools/bun-types-usage.ts';

function mem(
  partial: Partial<InventoryMember> & Pick<InventoryMember, 'setting' | 'name' | 'kind'>,
): InventoryMember {
  return {
    module: 'bun',
    depth: 0,
    parent: null,
    form: partial.setting,
    default: '—',
    notes: '—',
    source: 'bun.d.ts',
    line: 1,
    deprecated: false,
    overloads: 1,
    agentsMap: false,
    callSites: 0,
    ...partial,
  };
}

describe('selectTrackedMembers', () => {
  test('filters kinds and top-level by default', () => {
    const members = [
      mem({ setting: 'Bun.Server', name: 'Server', kind: 'interface', depth: 0 }),
      mem({ setting: 'Bun.Server.stop', name: 'stop', kind: 'method', depth: 1 }),
      mem({
        setting: 'Bun.nested.Inner',
        name: 'Inner',
        kind: 'type',
        depth: 1,
      }),
      mem({ setting: 'Bun.Glob', name: 'Glob', kind: 'class', depth: 0 }),
    ];
    const t = selectTrackedMembers(members, ['class', 'interface', 'type']);
    expect(t.map(m => m.setting).sort()).toEqual(['Bun.Glob', 'Bun.Server']);
  });
});

describe('attributeFileText', () => {
  test('counts chains, type positions, and bun imports', () => {
    const tracked = new Map<string, InventoryMember>([
      ['Bun.Server', mem({ setting: 'Bun.Server', name: 'Server', kind: 'interface' })],
      ['Bun.Glob', mem({ setting: 'Bun.Glob', name: 'Glob', kind: 'class' })],
      ['Bun.sleep', mem({ setting: 'Bun.sleep', name: 'sleep', kind: 'function' })],
    ]);
    // only Server and Glob are in map for attribution tests
    tracked.delete('Bun.sleep');

    const text = `
import { Server, Glob } from "bun";
import type { Server as Srv } from "bun";

const g = new Bun.Glob("**/*");
function handle(s: Bun.Server) {
  return s as Bun.Server;
}
void Server;
void Glob;
`;
    const hits = attributeFileText(text, tracked, {
      props: false,
      propLeaves: new Map(),
    });
    expect(hits.get('Bun.Server')!.chain).toBeGreaterThanOrEqual(2); // : Bun.Server, as Bun.Server
    expect(hits.get('Bun.Server')!.typePos).toBeGreaterThanOrEqual(1);
    expect(hits.get('Bun.Server')!.imp).toBeGreaterThanOrEqual(1);
    expect(hits.get('Bun.Glob')!.chain).toBeGreaterThanOrEqual(1);
    expect(hits.get('Bun.Glob')!.imp).toBeGreaterThanOrEqual(1);
  });

  test('prop mode attributes .leaf to property settings', () => {
    const tracked = new Map<string, InventoryMember>([
      [
        'Bun.BunLockFile.workspaces',
        mem({
          setting: 'Bun.BunLockFile.workspaces',
          name: 'workspaces',
          kind: 'property',
          depth: 1,
        }),
      ],
    ]);
    const text = `const x = lock.workspaces; const y = lock["other"];`;
    const hits = attributeFileText(text, tracked, {
      props: true,
      propLeaves: new Map([['workspaces', ['Bun.BunLockFile.workspaces']]]),
    });
    expect(hits.get('Bun.BunLockFile.workspaces')!.prop).toBe(1);
  });
});
