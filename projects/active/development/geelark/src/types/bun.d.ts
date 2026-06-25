declare const importMeta: {
  main: boolean;
  url: string;
  dir: string;
  file: string;
  path: string;
};

// Module declarations
declare module "bun:jsc" {
  export function heapStats(): any;
  export function gc(force?: boolean): void;
}

declare module "bun:bundle" {
  export function feature(flag: string): boolean;
}

declare module "bun:sqlite" {
  export class Database {
    constructor(filename: string);
    query(sql: string): any;
    exec(sql: string): void;
    close(): void;
  }
}

declare module "bun:jsx-runtime" {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}

declare module "react/jsx-runtime" {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}

declare module "bun:test" {
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: any): any;
}

declare global {
  const importMeta: {
    main: boolean;
    url: string;
    dir: string;
    file: string;
    path: string;
  };

  interface ImportMeta {
    main: boolean;
    url: string;
    dir: string;
    file: string;
    path: string;
  }

  var Bun: {
    stringWidth(text: string): number;
    env: Record<string, string | undefined>;
    version: string;
    revision: string;
    main: string;
    pid: number;
    ppid: number;
    stdout: {
      write(text: string): void;
    };
    stderr: {
      write(text: string): void;
    };
    stdin: {
      read(): Promise<Uint8Array>;
    };
    peek<T>(value: T): T;
    sleep(ms: number): Promise<void>;
    spawn(command: string, args?: string[]): {
      exited: Promise<number>;
      stdout: ReadableStream;
      stderr: ReadableStream;
      stdin: WritableStream;
      kill(): void;
    };
    file(path: string): {
      text(): Promise<string>;
      json(): Promise<any>;
      arrayBuffer(): Promise<ArrayBuffer>;
      exists(): boolean;
      size(): number;
      lastModified(): number;
      stat(): {
        isFile(): boolean;
        isDirectory(): boolean;
        size: number;
        mtime: Date;
      };
    };
    write(path: string, data: string | Uint8Array): Promise<void>;
    read(path: string): Promise<Uint8Array>;
    writeTextFile(path: string, data: string): Promise<void>;
    readTextFile(path: string): Promise<string>;
    mkdir(path: string): Promise<void>;
    cp(from: string, to: string): Promise<void>;
    rm(path: string): Promise<void>;
    readdir(path: string): Promise<string[]>;
    which(command: string): string | null;
    sh(command: string): {
      stdout: string;
      stderr: string;
      exitCode: number;
    };
    serve(options?: any): any;
    inspect(value: any): void;
    hash(data: string | Uint8Array): string;
    gc(force?: boolean): void;
  };

  const process: {
    argv: string[];
    env: Record<string, string | undefined>;
    exit(code?: number): never;
    cwd(): string;
    pid: number;
    ppid: number;
    platform: string;
    arch: string;
    version: string;
    versions: Record<string, string>;
    hrtime: {
      bigint(): bigint;
      time(): [number, number];
    };
    uptime(): number;
    memoryUsage(): {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    cpuUsage(previousValue?: { user: number; system: number }): {
      user: number;
      system: number;
    };
    nextTick(callback: () => void): void;
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    stdin: any;
    stdout: any;
    stderr: any;
  };

  const global: any;
  const Buffer: {
    from(data: string | Uint8Array, encoding?: string): InstanceType<typeof Buffer>;
    alloc(size: number): InstanceType<typeof Buffer>;
    concat(buffers: InstanceType<typeof Buffer>[], totalLength?: number): InstanceType<typeof Buffer>;
  } & {
    prototype: Buffer;
    new(data: string | Uint8Array, encoding?: string): InstanceType<typeof Buffer>;
  };

  namespace NodeJS {
    type Timeout = number;
    type Immediate = number;

    interface MemoryUsage {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    }

    interface CpuUsage {
      user: number;
      system: number;
    }

    type Platform = 'aix' | 'android' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32' | 'cygwin' | 'netbsd';

    type ReadableStream = globalThis.ReadableStream;
  }

  type Timeout = number;
  type Immediate = number;

  // JSX intrinsic elements for Bun
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }

  // JSX runtime for Bun
  namespace JSXRuntime {
    export function jsx(type: any, props: any, key?: any): any;
    export function jsxs(type: any, props: any, key?: any): any;
    export function Fragment(props: any): any;
  }
}

export = importMeta;
