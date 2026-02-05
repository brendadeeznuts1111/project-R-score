#!/usr/bin/env bun

import { describe, expectTypeOf, test } from "bun:test";

describe("🚀 Bun Runtime & Process Control - Type Safety Tests", () => {
  test("🗑️ Garbage Collection Types", () => {
    // Test Bun.gc() function
    expectTypeOf(Bun.gc).toBeFunction();
    expectTypeOf(Bun.gc()).toEqualTypeOf<void>();
    expectTypeOf(Bun.gc).toEqualTypeOf<() => void>();

    // Note: global gc() function is not available in all Bun environments
    // but Bun.gc() is always available
  });

  test("🧠 Memory Management Types", () => {
    // Test Buffer.allocUnsafe
    expectTypeOf(Buffer.allocUnsafe).toBeFunction();
    expectTypeOf(Buffer.allocUnsafe(1024)).toEqualTypeOf<Buffer>();
    expectTypeOf(Buffer.allocUnsafe).toEqualTypeOf<(size: number) => Buffer>();

    // Test Buffer.alloc (safe alternative)
    expectTypeOf(Buffer.alloc).toBeFunction();
    expectTypeOf(Buffer.alloc(1024)).toEqualTypeOf<Buffer>();
    expectTypeOf(Buffer.alloc).toEqualTypeOf<
      (
        size: number,
        fill?: string | number | Buffer,
        encoding?: BufferEncoding
      ) => Buffer
    >();

    // Test Buffer.from
    expectTypeOf(Buffer.from).toBeFunction();
    expectTypeOf(Buffer.from("hello")).toEqualTypeOf<Buffer>();
    expectTypeOf(Buffer.from).toEqualTypeOf<
      (
        data: string | ArrayBuffer | ArrayBufferView,
        encoding?: BufferEncoding
      ) => Buffer
    >();
  });

  test("🔌 Dynamic Library Types", () => {
    // Test process.dlopen
    expectTypeOf(process.dlopen).toBeFunction();
    expectTypeOf(process.dlopen).toEqualTypeOf<
      (module: any, filename: string) => any
    >();

    // Test bun:ffi module
    if (typeof Bun !== "undefined" && "FFI" in Bun) {
      expectTypeOf(Bun.FFI).toBeObject();
      expectTypeOf(Bun.FFI.CString).toBeFunction();
      expectTypeOf(new Bun.FFI.CString(BigInt(0))).toBeObject();
    }
  });

  test("⚙️ Process Configuration Types", () => {
    // Test process object
    expectTypeOf(process).toBeObject();
    expectTypeOf(process.pid).toBeNumber();
    expectTypeOf(process.ppid).toBeNumber();
    expectTypeOf(process.title).toBeString();
    expectTypeOf(process.argv).toBeArray();
    expectTypeOf(process.argv[0]).toBeString();
    expectTypeOf(process.env).toBeObject();
    expectTypeOf(process.exit).toBeFunction();
    expectTypeOf(process.exit).toEqualTypeOf<(code?: number) => never>();

    // Test process.memoryUsage
    expectTypeOf(process.memoryUsage).toBeFunction();
    expectTypeOf(process.memoryUsage()).toMatchTypeOf<{
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    }>();

    // Test process.uptime
    expectTypeOf(process.uptime).toBeFunction();
    expectTypeOf(process.uptime()).toBeNumber();
  });

  test("🖥️ System Information Types", () => {
    // Test Bun.main
    if (typeof Bun !== "undefined" && "main" in Bun) {
      expectTypeOf(Bun.main).toEqualTypeOf<string | undefined>();
    }

    // Test Bun.version
    if (typeof Bun !== "undefined" && "version" in Bun) {
      expectTypeOf(Bun.version).toBeString();
    }

    // Test Bun.revision
    if (typeof Bun !== "undefined" && "revision" in Bun) {
      expectTypeOf(Bun.revision).toBeString();
    }
  });

  test("📡 Console and Output Types", () => {
    // Test console object
    expectTypeOf(console).toBeObject();
    expectTypeOf(console.log).toBeFunction();
    expectTypeOf(console.error).toBeFunction();
    expectTypeOf(console.warn).toBeFunction();
    expectTypeOf(console.info).toBeFunction();
    expectTypeOf(console.debug).toBeFunction();

    // Test console methods signatures
    expectTypeOf(console.log).toEqualTypeOf<(...data: any[]) => void>();
    expectTypeOf(console.error).toEqualTypeOf<(...data: any[]) => void>();
    expectTypeOf(console.warn).toEqualTypeOf<(...data: any[]) => void>();
  });

  test("🔧 Runtime Flags and Configuration", () => {
    // Test that process.execPath exists
    expectTypeOf(process.execPath).toBeString();
    expectTypeOf(process.execPath).toEqualTypeOf<string>();

    // Test process.platform
    expectTypeOf(process.platform).toEqualTypeOf<NodeJS.Platform>();
    expectTypeOf(process.arch).toEqualTypeOf<string>();

    // Test process.version
    expectTypeOf(process.version).toBeString();
    expectTypeOf(process.versions).toBeObject();
    expectTypeOf(process.versions.node).toBeString();
    expectTypeOf(process.versions.v8).toBeString();
  });

  test("🛡️ Security and Sandbox Types", () => {
    // Test process.setuid and process.setgid (if available)
    if (process.setuid) {
      expectTypeOf(process.setuid).toBeFunction();
      expectTypeOf(process.setuid).toEqualTypeOf<
        (id: number | string) => void
      >();
    }

    if (process.setgid) {
      expectTypeOf(process.setgid).toBeFunction();
      expectTypeOf(process.setgid).toEqualTypeOf<
        (id: number | string) => void
      >();
    }

    // Test process.getuid and process.getgid (if available)
    if (process.getuid) {
      expectTypeOf(process.getuid).toBeFunction();
      expectTypeOf(process.getuid()).toEqualTypeOf<number>();
    }

    if (process.getgid) {
      expectTypeOf(process.getgid).toBeFunction();
      expectTypeOf(process.getgid()).toEqualTypeOf<number>();
    }
  });

  test("⚡ Performance and Monitoring Types", () => {
    // Test process.hrtime
    expectTypeOf(process.hrtime).toBeFunction();
    expectTypeOf(process.hrtime()).toEqualTypeOf<[number, number]>();
    expectTypeOf(process.hrtime.bigint).toBeFunction();
    expectTypeOf(process.hrtime.bigint()).toEqualTypeOf<bigint>();

    // Test process.cpuUsage
    expectTypeOf(process.cpuUsage).toBeFunction();
    expectTypeOf(process.cpuUsage()).toMatchTypeOf<{
      user: number;
      system: number;
    }>();

    // Test process.resourceUsage (if available)
    if (process.resourceUsage) {
      expectTypeOf(process.resourceUsage).toBeFunction();
      expectTypeOf(process.resourceUsage()).toMatchTypeOf<{
        userCPUTime: number;
        systemCPUTime: number;
        maxRSS: number;
        sharedMemorySize: number;
        unsharedDataSize: number;
        unsharedStackSize: number;
      }>();
    }
  });

  test("🔄 Signal Handling Types", () => {
    // Test process.on for signals
    expectTypeOf(process.on).toBeFunction();
    expectTypeOf(process.on).toEqualTypeOf<
      (event: string | symbol, listener: (...args: any[]) => void) => any
    >();

    // Test process.removeListener
    expectTypeOf(process.removeListener).toBeFunction();
    expectTypeOf(process.removeListener).toEqualTypeOf<
      (event: string | symbol, listener: (...args: any[]) => void) => any
    >();

    // Test process.emit
    expectTypeOf(process.emit).toBeFunction();
    expectTypeOf(process.emit).toEqualTypeOf<
      (event: string | symbol, ...args: any[]) => boolean
    >();
  });

  test("📁 File System Runtime Types", () => {
    // Test process.cwd
    expectTypeOf(process.cwd).toBeFunction();
    expectTypeOf(process.cwd()).toEqualTypeOf<string>();

    // Test process.chdir
    expectTypeOf(process.chdir).toBeFunction();
    expectTypeOf(process.chdir).toEqualTypeOf<(directory: string) => void>();

    // Test process.umask
    expectTypeOf(process.umask).toBeFunction();
    expectTypeOf(process.umask()).toEqualTypeOf<number>();
    expectTypeOf(process.umask(0)).toEqualTypeOf<number>();
  });

  test("🌐 Network and IPC Types", () => {
    // Test process.send (if available in cluster)
    if (process.send) {
      expectTypeOf(process.send).toBeFunction();
      expectTypeOf(process.send).toEqualTypeOf<
        (
          message: any,
          sendHandle?: any,
          options?: any,
          callback?: (error: Error | null) => void
        ) => boolean
      >();
    }

    // Test process.disconnect (if available in cluster)
    if (process.disconnect) {
      expectTypeOf(process.disconnect).toBeFunction();
      expectTypeOf(process.disconnect).toEqualTypeOf<() => void>();
    }

    // Test process.connected (if available in cluster)
    if ("connected" in process) {
      expectTypeOf(process.connected).toEqualTypeOf<boolean | undefined>();
    }
  });
});

describe("🔧 Bun-Specific Runtime Features", () => {
  test("🎯 Bun Shell Types", () => {
    // Test Bun.$ (shell command execution)
    if (typeof Bun !== "undefined" && "$" in Bun) {
      expectTypeOf(Bun.$).toBeFunction();
      expectTypeOf(Bun.$`echo hello`).toEqualTypeOf<
        Promise<{
          stdout: Buffer;
          stderr: Buffer;
          exitCode: number;
          signal: string | null;
        }>
      >();
    }
  });

  test("📊 Bun Performance Types", () => {
    // Test Bun.peekMemory (if available)
    if (typeof Bun !== "undefined" && "peekMemory" in Bun) {
      expectTypeOf(Bun.peekMemory).toBeFunction();
      expectTypeOf(Bun.peekMemory()).toMatchTypeOf<{
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
        arrayBuffers: number;
      }>();
    }

    // Test Bun.write (file writing)
    if (typeof Bun !== "undefined" && "write" in Bun) {
      expectTypeOf(Bun.write).toBeFunction();
      expectTypeOf(Bun.write).toEqualTypeOf<
        (path: string | URL, data: string | ArrayBufferView) => Promise<number>
      >;
    }

    // Test Bun.file (file reading)
    if (typeof Bun !== "undefined" && "file" in Bun) {
      expectTypeOf(Bun.file).toBeFunction();
      expectTypeOf(Bun.file("/path/to/file")).toEqualTypeOf<Bun.File>();
    }
  });

  test("🔍 Bun Debugging Types", () => {
    // Test Bun.inspect (if available)
    if (typeof Bun !== "undefined" && "inspect" in Bun) {
      expectTypeOf(Bun.inspect).toBeFunction();
      expectTypeOf(Bun.inspect).toEqualTypeOf<
        (value: any, options?: any) => string
      >();
    }

    // Test Bun.enableSourceMaps (if available)
    if (typeof Bun !== "undefined" && "enableSourceMaps" in Bun) {
      expectTypeOf(Bun.enableSourceMaps).toBeFunction();
      expectTypeOf(Bun.enableSourceMaps()).toEqualTypeOf<void>();
    }
  });

  test("🛠️ Bun Build Types", () => {
    // Test Bun.build (if available)
    if (typeof Bun !== "undefined" && "build" in Bun) {
      expectTypeOf(Bun.build).toBeFunction();
      expectTypeOf(Bun.build).toEqualTypeOf<
        (options: {
          entrypoints: string[];
          target?: "bun" | "node" | "browser";
          format?: "esm" | "cjs";
          splitting?: boolean;
          minify?: boolean;
          sourcemap?: boolean;
          external?: string[];
          root?: string;
          outdir?: string;
          naming?: string;
        }) => Promise<{
          success: boolean;
          outputs: Array<{
            path: string;
            size: number;
            kind: string;
          }>;
          logs: Array<{
            level: string;
            message: string;
          }>;
        }>
      >();
    }
  });

  test("🔐 Bun Security Types", () => {
    // Test Bun.password (if available)
    if (typeof Bun !== "undefined" && "password" in Bun) {
      expectTypeOf(Bun.password).toBeObject();
      expectTypeOf(Bun.password.verify).toBeFunction();
      expectTypeOf(Bun.password.hash).toBeFunction();
      expectTypeOf(Bun.password.hash).toEqualTypeOf<
        (password: string, algorithm?: string) => Promise<string>
      >;
      expectTypeOf(Bun.password.verify).toEqualTypeOf<
        (password: string, hash: string) => Promise<boolean>
      >;
    }

    // Test Bun.CryptoHash (if available)
    if (typeof Bun !== "undefined" && "CryptoHash" in Bun) {
      expectTypeOf(Bun.CryptoHash).toBeFunction();
      expectTypeOf(new Bun.CryptoHash("sha256")).toBeObject();
    }
  });

  test("🌍 Environment Variables Types", () => {
    // Test Bun.env (if available)
    if (typeof Bun !== "undefined" && "env" in Bun) {
      expectTypeOf(Bun.env).toBeObject();
      expectTypeOf(Bun.env).toEqualTypeOf<Record<string, string | undefined>>();
    }

    // Test process.env comparison
    expectTypeOf(process.env).toEqualTypeOf<
      Record<string, string | undefined>
    >();
    if (typeof Bun !== "undefined" && "env" in Bun) {
      expectTypeOf(Bun.env).toEqualTypeOf<typeof process.env>;
    }
  });

  test("📱 Platform Detection Types", () => {
    // Test platform-specific APIs
    expectTypeOf(process.platform).toEqualTypeOf<
      | "darwin"
      | "linux"
      | "win32"
      | "freebsd"
      | "openbsd"
      | "sunos"
      | "aix"
      | "android"
    >();

    // Test architecture detection
    expectTypeOf(process.arch).toEqualTypeOf<
      | "arm"
      | "arm64"
      | "ia32"
      | "mips"
      | "mipsel"
      | "ppc"
      | "ppc64"
      | "s390"
      | "s390x"
      | "x32"
      | "x64"
    >();

    // Test endianness
    if (typeof Bun !== "undefined" && "endian" in Bun) {
      expectTypeOf(Bun.endian).toEqualTypeOf<"little" | "big">();
    }
  });

  test("⚡ Worker Thread Types", () => {
    // Test Worker availability
    expectTypeOf(Worker).toBeFunction();
    expectTypeOf(Worker).toEqualTypeOf<
      (scriptURL: string | URL, options?: WorkerOptions) => Worker
    >();
  });

  test("🔄 Event Loop Types", () => {
    // Test setImmediate and clearImmediate
    expectTypeOf(setImmediate).toBeFunction();
    expectTypeOf(setImmediate).toEqualTypeOf<
      (callback: (...args: any[]) => void, ...args: any[]) => any
    >();

    expectTypeOf(clearImmediate).toBeFunction();
    expectTypeOf(clearImmediate).toEqualTypeOf<(immediateId: any) => void>();

    // Test process.nextTick
    expectTypeOf(process.nextTick).toBeFunction();
    expectTypeOf(process.nextTick).toEqualTypeOf<
      (callback: (...args: any[]) => void, ...args: any[]) => void
    >();
  });
});

describe("🧪 Runtime Type Safety - Edge Cases", () => {
  test("🚨 Error Handling Types", () => {
    // Test process.on('uncaughtException')
    expectTypeOf(
      process.on("uncaughtException", (err) => {
        expectTypeOf(err).toEqualTypeOf<Error>();
      })
    ).toBeObject();

    // Test process.on('unhandledRejection')
    expectTypeOf(
      process.on("unhandledRejection", (reason, promise) => {
        expectTypeOf(reason).toEqualTypeOf<unknown>();
        expectTypeOf(promise).toEqualTypeOf<Promise<any>>();
      })
    ).toBeObject();

    // Test process.on('warning')
    expectTypeOf(
      process.on("warning", (warning) => {
        expectTypeOf(warning).toMatchTypeOf<{
          name: string;
          message: string;
          stack?: string;
        }>();
      })
    ).toBeObject();
  });

  test("🔄 Stream Types", () => {
    // Test process.stdin
    expectTypeOf(process.stdin).toEqualTypeOf<ReadableStream | null>();

    // Test process.stdout
    expectTypeOf(process.stdout).toEqualTypeOf<WritableStream | null>();

    // Test process.stderr
    expectTypeOf(process.stderr).toEqualTypeOf<WritableStream | null>();
  });

  test("📊 Statistics Types", () => {
    // Test process.uptime returns number
    expectTypeOf(process.uptime()).toBeNumber();
    // Note: toBeGreaterThan is not available in expectTypeOf

    // Test process.memoryUsage returns object with specific structure
    const memUsage = process.memoryUsage();
    expectTypeOf(memUsage).toMatchTypeOf<{
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    }>();
    expectTypeOf(memUsage.rss).toBeNumber();
    expectTypeOf(memUsage.heapTotal).toBeNumber();
    expectTypeOf(memUsage.heapUsed).toBeNumber();
    expectTypeOf(memUsage.external).toBeNumber();
    expectTypeOf(memUsage.arrayBuffers).toBeNumber();
  });

  test("🔧 Configuration Validation", () => {
    // Test that critical process properties exist and have correct types
    expectTypeOf(process.pid).toBeNumber();
    expectTypeOf(process.ppid).toBeNumber();
    expectTypeOf(process.title).toBeString();
    expectTypeOf(process.execPath).toBeString();
    expectTypeOf(process.execArgv).toBeArray();
    expectTypeOf(process.execArgv[0]).toBeString();

    // Test version information
    expectTypeOf(process.version).toBeString();
    expectTypeOf(process.versions).toBeObject();
    expectTypeOf(process.versions.bun).toBeString();
    expectTypeOf(process.versions.v8).toBeString();
    expectTypeOf(process.versions.unicode).toBeString();
  });
});
