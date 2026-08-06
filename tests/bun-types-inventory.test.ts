// @see https://bun.com/docs/test/writing-tests — bun:test
import { describe, expect, test } from 'bun:test';
import {
  agentsMapHits,
  parseBunModuleDts,
  parseDtsFile,
  propertyOpensObjectBody,
  renderMarkdown,
  stableInventoryPayload,
  stripAngleGenerics,
  typeAliasOpensObjectBody,
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

  type BunLockFile = {
    lockfileVersion: 0 | 1;
    workspaces: {
      [workspace: string]: string;
    };
    overrides?: Record<string, string>;
  };

  type Component<P = {}> = string | ((props: P) => any);

  type WebSocketOptionsTLS = {
    tls: boolean;
    serverName?: string;
  };

  interface ResourceUsage {
    cpuTime: {
      user: number;
      system: number;
      total: number;
    };
    maxRSS: number;
  }

  type DeepNest = {
    outer: {
      middle: {
        leaf: string;
      };
    };
  };

  enum FFIType {
    char = 0,
    int8_t = 1,
    i8 = 1,
    buffer = 20,
  }

  const enum Direction {
    Up,
    Down,
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

    // type X = { … } fields
    expect(settings).toContain('Bun.BunLockFile');
    expect(settings).toContain('Bun.BunLockFile.lockfileVersion');
    expect(settings).toContain('Bun.BunLockFile.workspaces');
    expect(settings).toContain('Bun.BunLockFile.overrides');
    // index-signature keys still never become named children
    expect(settings.some(s => s === 'Bun.BunLockFile.workspace')).toBe(false);

    // anonymous nested object props (depth 2+)
    expect(settings).toContain('Bun.ResourceUsage.cpuTime');
    expect(settings).toContain('Bun.ResourceUsage.cpuTime.user');
    expect(settings).toContain('Bun.ResourceUsage.cpuTime.system');
    expect(settings).toContain('Bun.ResourceUsage.cpuTime.total');
    expect(settings).toContain('Bun.ResourceUsage.maxRSS');
    const cpuUser = members.find(m => m.setting === 'Bun.ResourceUsage.cpuTime.user')!;
    expect(cpuUser.kind).toBe('property');
    expect(cpuUser.depth).toBe(2);
    expect(cpuUser.parent).toBe('Bun.ResourceUsage.cpuTime');

    // triple nest → depth 3
    expect(settings).toContain('Bun.DeepNest.outer.middle.leaf');
    const leaf = members.find(m => m.setting === 'Bun.DeepNest.outer.middle.leaf')!;
    expect(leaf.depth).toBe(3);

    // enums + members
    expect(settings).toContain('Bun.FFIType');
    expect(settings).toContain('Bun.FFIType.char');
    expect(settings).toContain('Bun.FFIType.int8_t');
    expect(settings).toContain('Bun.FFIType.i8');
    expect(settings).toContain('Bun.FFIType.buffer');
    const charMem = members.find(m => m.setting === 'Bun.FFIType.char')!;
    expect(charMem.kind).toBe('enum-member');
    expect(charMem.default).toBe('0');
    expect(members.find(m => m.setting === 'Bun.FFIType')!.kind).toBe('enum');
    expect(settings).toContain('Bun.Direction.Up');
    expect(settings).toContain('Bun.Direction.Down');

    // generic default P = {} must not open as object body
    expect(settings).toContain('Bun.Component');
    expect(settings.filter(s => s.startsWith('Bun.Component.'))).toHaveLength(0);

    expect(settings).toContain('Bun.WebSocketOptionsTLS.tls');
    expect(settings).toContain('Bun.WebSocketOptionsTLS.serverName');
  });

  test('typeAliasOpensObjectBody + stripAngleGenerics', () => {
    expect(stripAngleGenerics('type Component<P = {}> = string')).toBe('type Component = string');
    expect(
      typeAliasOpensObjectBody('type Component<P = {}> = string | ((props: P) => any);', [], 0),
    ).toBe(false);
    expect(
      typeAliasOpensObjectBody('type BunLockFile = {', ['type BunLockFile = {', '  a: number;', '};'], 0),
    ).toBe(true);
    const multi = ['type Foo =', '  {', '    bar: string;', '  };'];
    expect(typeAliasOpensObjectBody(multi[0]!, multi, 0)).toBe(true);
  });

  test('propertyOpensObjectBody detects anon objects, skips unions', () => {
    expect(propertyOpensObjectBody('cpuTime: {', ['cpuTime: {', '  user: number;', '};'], 0)).toBe(
      true,
    );
    expect(propertyOpensObjectBody('maxRSS: number;', ['maxRSS: number;'], 0)).toBe(false);
    const multi = ['proxy?:', '  | string', '  | {', '    url: string;', '  };'];
    expect(propertyOpensObjectBody(multi[0]!, multi, 0)).toBe(false);
    const bare = ['connect:', '  {', '    hostname: string;', '  };'];
    expect(propertyOpensObjectBody(bare[0]!, bare, 0)).toBe(true);
  });

  test('--no-enums and --no-nested-objects flags', () => {
    const dts = `
declare module "bun" {
  enum FFIType {
    char = 0,
  }
  interface ResourceUsage {
    cpuTime: {
      user: number;
    };
  }
}
`;
    const full = parseDtsFile(dts, 'bun.d.ts');
    expect(full.some(m => m.setting === 'Bun.FFIType.char')).toBe(true);
    expect(full.some(m => m.setting === 'Bun.ResourceUsage.cpuTime.user')).toBe(true);

    const noEnum = parseDtsFile(dts, 'bun.d.ts', { enums: false });
    expect(noEnum.some(m => m.setting === 'Bun.FFIType')).toBe(true);
    expect(noEnum.some(m => m.setting === 'Bun.FFIType.char')).toBe(false);

    const noNest = parseDtsFile(dts, 'bun.d.ts', { nestedObjects: false });
    expect(noNest.some(m => m.setting === 'Bun.ResourceUsage.cpuTime')).toBe(true);
    expect(noNest.some(m => m.setting === 'Bun.ResourceUsage.cpuTime.user')).toBe(false);
  });

  test('--no-type-aliases skips type object bodies', () => {
    const dts = `
declare module "bun" {
  type Opts = {
    port: number;
  };
  interface Server {
    stop(): void;
  }
}
`;
    const withT = parseDtsFile(dts, 'bun.d.ts', { typeAliases: true });
    const noT = parseDtsFile(dts, 'bun.d.ts', { typeAliases: false });
    expect(withT.some(m => m.setting === 'Bun.Opts.port')).toBe(true);
    expect(noT.some(m => m.setting === 'Bun.Opts.port')).toBe(false);
    expect(noT.some(m => m.setting === 'Bun.Opts')).toBe(true);
    expect(noT.some(m => m.setting === 'Bun.Server.stop')).toBe(true);
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
        typeAliases: true,
        enums: true,
        nestedObjects: true,
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
