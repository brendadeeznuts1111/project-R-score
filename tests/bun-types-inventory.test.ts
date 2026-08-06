// @see https://bun.com/docs/test/writing-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  agentsMapHits,
  parseBunModuleDts,
  parseDtsFile,
  renderMarkdown,
  stableInventoryPayload,
  type InventoryResult,
} from '../tools/bun-types-inventory.ts';

describe('parseDtsFile deep v3', () => {
  test('extracts nested namespace, class methods, interface methods + properties', () => {
    const dts = `
declare module "bun" {
  /**
   * Sleep async.
   * @default 0
   */
  function sleep(ms: number | Date): Promise<void>;

  namespace peek {
    function status(promise: Promise<unknown>): string;
  }

  namespace inspect {
    const custom: unique symbol;
    function table(data: unknown): string;
  }

  class Glob {
    constructor(pattern: string);
    scan(options?: object): AsyncIterable<string>;
    static scanSync(pattern: string): string[];
  }

  interface Server {
    /**
     * Stop the server.
     * @default false
     */
    stop(closeActiveConnections?: boolean): Promise<void>;
    readonly url: URL;
    port: number;
    reload(options: object): void;
  }

  namespace outer {
    namespace inner {
      function deep(): void;
    }
  }
}
`;
    const members = parseDtsFile(dts, 'bun.d.ts');
    const settings = members.map(m => m.setting);

    expect(settings).toContain('Bun.sleep');
    expect(settings).toContain('Bun.peek.status');
    expect(settings).toContain('Bun.inspect.table');
    expect(settings).toContain('Bun.Glob.scan');
    expect(settings).toContain('Bun.Glob.scanSync');

    // interface body
    expect(settings).toContain('Bun.Server');
    expect(settings).toContain('Bun.Server.stop');
    expect(settings).toContain('Bun.Server.url');
    expect(settings).toContain('Bun.Server.port');
    expect(settings).toContain('Bun.Server.reload');

    const stop = members.find(m => m.setting === 'Bun.Server.stop')!;
    expect(stop.kind).toBe('method');
    expect(stop.depth).toBe(1);
    expect(stop.parent).toBe('Bun.Server');
    expect(stop.default).toBe('false');

    const url = members.find(m => m.setting === 'Bun.Server.url')!;
    expect(url.kind).toBe('property');

    // multi-depth namespace
    expect(settings).toContain('Bun.outer');
    expect(settings).toContain('Bun.outer.inner');
    expect(settings).toContain('Bun.outer.inner.deep');
    const deep = members.find(m => m.setting === 'Bun.outer.inner.deep')!;
    expect(deep.depth).toBe(2);
  });

  test('--no-interfaces skips interface body harvest', () => {
    const dts = `
declare module "bun" {
  interface Server {
    stop(): void;
    port: number;
  }
  class Glob {
    scan(): void;
  }
}
`;
    const withI = parseDtsFile(dts, 'bun.d.ts', { interfaces: true });
    const noI = parseDtsFile(dts, 'bun.d.ts', { interfaces: false });
    expect(withI.some(m => m.setting === 'Bun.Server.stop')).toBe(true);
    expect(noI.some(m => m.setting === 'Bun.Server.stop')).toBe(false);
    expect(noI.some(m => m.setting === 'Bun.Server')).toBe(true); // interface row itself
    expect(noI.some(m => m.setting === 'Bun.Glob.scan')).toBe(true);
  });

  test('--no-props keeps methods only', () => {
    const dts = `
declare module "bun" {
  interface Server {
    stop(): void;
    port: number;
  }
}
`;
    const members = parseDtsFile(dts, 'bun.d.ts', { properties: false });
    expect(members.some(m => m.setting === 'Bun.Server.stop')).toBe(true);
    expect(members.some(m => m.setting === 'Bun.Server.port')).toBe(false);
  });

  test('shallow skips nested members', () => {
    const dts = `
declare module "bun" {
  namespace peek {
    function status(p: Promise<unknown>): string;
  }
  function sleep(ms: number): Promise<void>;
}
`;
    const deep = parseDtsFile(dts, 'bun.d.ts', { shallow: false });
    const shallow = parseDtsFile(dts, 'bun.d.ts', { shallow: true });
    expect(deep.some(m => m.setting === 'Bun.peek.status')).toBe(true);
    expect(shallow.some(m => m.setting === 'Bun.peek.status')).toBe(false);
  });

  test('parses satellite module bun:jsc', () => {
    const dts = `
declare module "bun:jsc" {
  function serialize(value: any): SharedArrayBuffer;
  function deserialize(value: ArrayBufferLike): any;
}
`;
    const members = parseDtsFile(dts, 'jsc.d.ts');
    expect(members.map(m => m.setting)).toEqual(
      expect.arrayContaining(['bun:jsc.serialize', 'bun:jsc.deserialize']),
    );
  });
});

describe('parseBunModuleDts compat', () => {
  test('wraps bare fixture in declare module bun', () => {
    const members = parseBunModuleDts(`function which(bin: string): string | null;`, 'bun.d.ts');
    expect(members.some(m => m.setting === 'Bun.which')).toBe(true);
  });
});

describe('agentsMapHits', () => {
  test('detects Bun.name without spawn/spawnSync false friend', () => {
    const hay = '| **x** | `Bun.spawn` | Terminal |';
    expect(agentsMapHits(hay, 'Bun.spawn', 'spawn')).toBe(true);
    expect(agentsMapHits(hay, 'Bun.spawnSync', 'spawnSync')).toBe(false);
  });
});

describe('render + stable payload v3', () => {
  test('markdown includes tipDiff section; stable omits absolute root', () => {
    const inv: InventoryResult = {
      schema: 'factorywager/bun-types-inventory/v3',
      generated: '2026-01-01T00:00:00.000Z',
      runtime: { bunVersion: '1.3.14', bunRevision: 'abc' },
      types: {
        package: 'bun-types',
        version: '1.4.0-canary',
        root: '/tmp/bun-types',
        files: ['bun.d.ts'],
      },
      mode: {
        shallow: false,
        interfaces: true,
        properties: true,
        counted: true,
        moduleFilter: null,
        kindFilter: null,
      },
      scan: { roots: ['lib'], counted: true },
      summary: {
        total: 2,
        topLevel: 1,
        nested: 1,
        byKind: { function: 1, method: 1 },
        byModule: { bun: 2 },
        byDepth: { '0': 1, '1': 1 },
        agentsMapHits: 0,
        withCallSites: 1,
        zeroCallSites: 1,
        maxDepth: 1,
      },
      tipDiff: {
        tipRoot: '/tmp/tip',
        tipRevision: 'deadbeef',
        pinOnly: ['Bun.old'],
        tipOnly: ['Bun.Server.stop'],
        shared: 1,
      },
      members: [
        {
          kind: 'function',
          name: 'sleep',
          parent: null,
          setting: 'Bun.sleep',
          module: 'bun',
          depth: 0,
          form: 'Bun.sleep(ms)',
          default: '—',
          notes: 'async delay',
          source: 'bun.d.ts',
          line: 1,
          deprecated: false,
          overloads: 1,
          agentsMap: false,
          callSites: 3,
        },
        {
          kind: 'method',
          name: 'stop',
          parent: 'Bun.Server',
          setting: 'Bun.Server.stop',
          module: 'bun',
          depth: 1,
          form: 'Bun.Server.stop()',
          default: '—',
          notes: 'stop server',
          source: 'serve.d.ts',
          line: 2,
          deprecated: false,
          overloads: 1,
          agentsMap: false,
          callSites: 0,
        },
      ],
    };
    const md = renderMarkdown(inv);
    expect(md).toContain('Bun.Server.stop');
    expect(md).toContain('Tip vs pin');
    expect(md).toContain('Tip-only');
    const stable = stableInventoryPayload(inv) as {
      types: { root?: string };
      tipDiff?: unknown;
      members: unknown[];
    };
    expect(stable.types.root).toBeUndefined();
    expect(stable.tipDiff).toBeUndefined();
    expect(stable.members).toHaveLength(2);
  });
});
