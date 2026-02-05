// Enhanced index.ts with comprehensive CLI integration and file I/O
import { swagger } from "@elysiajs/swagger";
import { argv, env } from "bun";
import { Elysia } from "elysia";

// Parse CLI arguments
const cliArgs = {
  port: parseInt(
    env.PORT ||
      argv.find((arg) => arg.startsWith("--port="))?.split("=")[1] ||
      "3000"
  ),
  hostname:
    env.HOST ||
    argv.find((arg) => arg.startsWith("--host="))?.split("=")[1] ||
    "localhost",
  watch: argv.includes("--watch"),
  hot: argv.includes("--hot"),
  inspect: argv.includes("--inspect"),
  inspectWait: argv.includes("--inspect-wait"),
  inspectBrk: argv.includes("--inspect-brk"),
  smol: argv.includes("--smol"),
  exposeGc: argv.includes("--expose-gc"),
  consoleDepth: parseInt(
    argv.find((arg) => arg.startsWith("--console-depth="))?.split("=")[1] || "2"
  ),
  define: argv.find((arg) => arg.startsWith("--define="))?.split("=")[1],
  envFile: argv.find((arg) => arg.startsWith("--env-file="))?.split("=")[1],
  title:
    argv.find((arg) => arg.startsWith("--title="))?.split("=")[1] ||
    "Systems Dashboard",
  useSystemCa: argv.includes("--use-system-ca"),
  maxHeaderSize: parseInt(
    argv.find((arg) => arg.startsWith("--max-header-size="))?.split("=")[1] ||
      "16384"
  ),
  dnsTimeout:
    argv.find((arg) => arg.startsWith("--dns-timeout="))?.split("=")[1] || "5s",
  sqlPreconnect: argv.includes("--sql-preconnect"),
  redisPreconnect: argv.includes("--redis-preconnect"),
  zeroFillBuffers: argv.includes("--zero-fill-buffers"),
  unhandledRejections:
    argv
      .find((arg) => arg.startsWith("--unhandled-rejections="))
      ?.split("=")[1] || "warn",
  breakOnStart: argv.includes("--break-on-start"),
  preload: argv.find((arg) => arg.startsWith("--preload="))?.split("=")[1],
  editor:
    argv.find((arg) => arg.startsWith("--editor="))?.split("=")[1] || "vscode",
  macro: argv.includes("--macro"),
  jsxRuntime:
    argv.find((arg) => arg.startsWith("--jsx-runtime="))?.split("=")[1] ||
    "automatic",
  jsxImportSource:
    argv.find((arg) => arg.startsWith("--jsx-import-source="))?.split("=")[1] ||
    "react",
  jsxFactory: argv
    .find((arg) => arg.startsWith("--jsx-factory="))
    ?.split("=")[1],
  jsxFragment: argv
    .find((arg) => arg.startsWith("--jsx-fragment="))
    ?.split("=")[1],
  jsxDevelopment: argv.includes("--jsx-development"),
  minify: argv.includes("--minify"),
  splitting: argv.includes("--splitting"),
  target:
    argv.find((arg) => arg.startsWith("--target="))?.split("=")[1] || "bun",
  outdir:
    argv.find((arg) => arg.startsWith("--outdir="))?.split("=")[1] || "dist",
  sourcemap:
    argv.find((arg) => arg.startsWith("--sourcemap="))?.split("=")[1] ||
    "linked",
  external: argv.find((arg) => arg.startsWith("--external="))?.split("=")[1],
  packages: argv.find((arg) => arg.startsWith("--packages="))?.split("=")[1],
  format:
    argv.find((arg) => arg.startsWith("--format="))?.split("=")[1] || "esm",
  global: argv.find((arg) => arg.startsWith("--global="))?.split("=")[1],
  alias: argv.find((arg) => arg.startsWith("--alias="))?.split("=")[1],
  manifest: argv.includes("--manifest"),
  root: argv.find((arg) => arg.startsWith("--root="))?.split("=")[1],
  publicDir: argv.find((arg) => arg.startsWith("--public-dir="))?.split("=")[1],
  entryNames: argv
    .find((arg) => arg.startsWith("--entry-names="))
    ?.split("=")[1],
  chunkNames: argv
    .find((arg) => arg.startsWith("--chunk-names="))
    ?.split("=")[1],
  assetNames: argv
    .find((arg) => arg.startsWith("--asset-names="))
    ?.split("=")[1],
  loaderExtensions: argv
    .find((arg) => arg.startsWith("--loader="))
    ?.split("=")[1],
  mainFields: argv
    .find((arg) => arg.startsWith("--main-fields="))
    ?.split("=")[1],
  conditions: argv
    .find((arg) => arg.startsWith("--conditions="))
    ?.split("=")[1],
  extensions: argv
    .find((arg) => arg.startsWith("--extensions="))
    ?.split("=")[1],
  tsconfig: argv.find((arg) => arg.startsWith("--tsconfig="))?.split("=")[1],
  tsconfigOverride: argv
    .find((arg) => arg.startsWith("--tsconfig-override="))
    ?.split("=")[1],
  platform:
    argv.find((arg) => arg.startsWith("--platform="))?.split("=")[1] || "bun",
  origin: argv.find((arg) => arg.startsWith("--origin="))?.split("=")[1],
  serve: argv.includes("--serve"),
  randomPort: argv.includes("--random-port"),
  backend: argv.includes("--backend"),
  development: argv.includes("--development") || env.NODE_ENV === "development",
  production: argv.includes("--production") || env.NODE_ENV === "production",
  stdin: argv.includes("-") || argv.includes("--stdin"),
  verbose: argv.includes("--verbose"),
  silent: argv.includes("--silent"),
  help: argv.includes("--help") || argv.includes("-h"),
  version: argv.includes("--version") || argv.includes("-v"),
};

// Configure console based on CLI args
if (cliArgs.consoleDepth > 2) {
  console.debug = (...args: any[]) => {
    console.log(
      ...args.map((arg) =>
        typeof arg === "object"
          ? Bun.inspect(arg, { depth: cliArgs.consoleDepth })
          : arg
      )
    );
  };
}

// Configure unhandled rejections
if (cliArgs.unhandledRejections) {
  process.on("unhandledRejection", (reason, promise) => {
    if (cliArgs.unhandledRejections === "strict") {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    } else if (cliArgs.unhandledRejections === "warn") {
      console.warn("Unhandled Rejection at:", promise, "reason:", reason);
    } else if (cliArgs.unhandledRejections === "silent") {
      // Silent mode - do nothing
    }
  });
}

// Expose GC if requested
if (cliArgs.exposeGc && global.gc) {
  console.log("🗑️  GC exposed globally");
}

// File I/O utilities
class FileManager {
  static async readFile(filePath: string): Promise<string> {
    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        throw new Error(`File not found: ${filePath}`);
      }
      return await file.text();
    } catch (error) {
      console.error(`❌ Error reading file ${filePath}:`, error.message);
      throw error;
    }
  }

  static async writeFile(filePath: string, content: string): Promise<number> {
    try {
      const bytes = await Bun.write(filePath, content);
      console.log(`✅ Wrote ${bytes} bytes to ${filePath}`);
      return bytes;
    } catch (error) {
      console.error(`❌ Error writing file ${filePath}:`, error.message);
      throw error;
    }
  }

  static async copyFile(sourcePath: string, destPath: string): Promise<number> {
    try {
      const sourceFile = Bun.file(sourcePath);
      if (!(await sourceFile.exists())) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
      const bytes = await Bun.write(destPath, sourceFile);
      console.log(`✅ Copied ${bytes} bytes from ${sourcePath} to ${destPath}`);
      return bytes;
    } catch (error) {
      console.error(`❌ Error copying file:`, error.message);
      throw error;
    }
  }

  static async analyzeFile(filePath: string): Promise<any> {
    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();

      return {
        path: filePath,
        exists,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        content: exists ? await file.text() : null,
      };
    } catch (error) {
      console.error(`❌ Error analyzing file ${filePath}:`, error.message);
      throw error;
    }
  }
}

// Stdin processing utilities
class StdinProcessor {
  static async processStdin(): Promise<string> {
    try {
      const stdin = Bun.stdin;
      const content = await stdin.text();

      if (cliArgs.verbose) {
        console.log("📥 Stdin input received:");
        console.log(`Length: ${content.length} characters`);
        console.log(`Type: ${typeof content}`);
      }

      return content;
    } catch (error) {
      console.error("❌ Error processing stdin:", error.message);
      throw error;
    }
  }

  static async processJsonStdin(): Promise<any> {
    const content = await this.processStdin();
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error("❌ Invalid JSON in stdin:", error.message);
      throw error;
    }
  }

  static async streamStdin(): Promise<ReadableStream<Uint8Array>> {
    return Bun.stdin.stream();
  }
}

// CLI Help and Version
function showHelp() {
  console.log(`
${cliArgs.title} - Enhanced Systems Dashboard

Usage: bun run src/index.ts [options]

Options:
  --port <number>          Server port (default: 3000)
  --host <string>          Server hostname (default: localhost)
  --watch                  Enable file watching
  --hot                    Enable hot reload
  --inspect                Enable debugging
  --inspect-wait           Wait for debugger connection
  --inspect-brk            Break on first line
  --smol                   Enable memory-optimized mode
  --expose-gc              Expose garbage collector
  --console-depth <num>    Console inspection depth (default: 2)
  --define <key:value>     Define build-time constant
  --env-file <path>        Load environment file
  --title <string>         Application title
  --use-system-ca          Use system CA certificates
  --max-header-size <num>  Max header size in bytes
  --dns-timeout <string>   DNS timeout duration
  --sql-preconnect         Pre-connect to database
  --redis-preconnect       Pre-connect to Redis
  --zero-fill-buffers      Zero-fill buffers
  --unhandled-rejections <mode>  Handle unhandled rejections (strict|warn|silent)
  --break-on-start         Break on start
  --preload <path>         Preload module
  --editor <string>        Default editor (default: vscode)
  --macro                  Enable macros
  --jsx-runtime <type>     JSX runtime (default: automatic)
  --jsx-import-source <pkg> JSX import source (default: react)
  --jsx-factory <func>     JSX factory function
  --jsx-fragment <func>    JSX fragment function
  --jsx-development        JSX development mode
  --minify                 Minify output
  --splitting              Enable code splitting
  --target <string>        Build target (default: bun)
  --outdir <path>          Output directory (default: dist)
  --sourcemap <type>       Source map type (default: linked)
  --external <pkgs>        External packages
  --packages <pkgs>        Packages to bundle
  --format <type>          Module format (default: esm)
  --global <var>           Global variable
  --alias <from:to>        Module alias
  --manifest               Generate manifest
  --root <path>            Project root
  --public-dir <path>      Public directory
  --entry-names <pattern>  Entry naming pattern
  --chunk-names <pattern>  Chunk naming pattern
  --asset-names <pattern>  Asset naming pattern
  --loader <ext:loader>    File loader
  --main-fields <fields>   Main package fields
  --conditions <conds>     Export conditions
  --extensions <exts>      File extensions
  --tsconfig <path>        TypeScript config
  --tsconfig-override <path> Override TypeScript config
  --platform <type>        Target platform (default: bun)
  --origin <url>           Module origin
  --serve                  Enable serve mode
  --random-port            Use random port
  --backend                Backend mode
  --development            Development mode
  --production             Production mode
  --stdin                  Process stdin
  --verbose                Verbose output
  --silent                 Silent mode
  --help                   Show this help
  --version                Show version

Stdin Examples:
  echo '{"name": "test"}' | bun run src/index.ts --stdin
  cat config.json | bun run src/index.ts --stdin
  tail -f log.txt | bun run src/index.ts --stdin

File I/O Examples:
  bun run src/index.ts --define=CONFIG_FILE:config.json
  bun run src/index.ts --env-file=.env.production
  bun run src/index.ts --external=react,react-dom

Debugging Examples:
  bun run src/index.ts --inspect
  bun run src/index.ts --inspect-wait
  bun run src/index.ts --inspect-brk

Performance Examples:
  bun run src/index.ts --smol --expose-gc
  bun run src/index.ts --zero-fill-buffers
  bun run src/index.ts --console-depth=5
`);
}

function showVersion() {
  console.log(`${cliArgs.title} v1.0.0`);
  console.log(`Bun: ${Bun.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Node: ${process.version}`);
}

// Main application startup
async function main() {
  // Handle help and version
  if (cliArgs.help) {
    showHelp();
    return;
  }

  if (cliArgs.version) {
    showVersion();
    return;
  }

  // Process stdin if requested
  if (cliArgs.stdin) {
    try {
      const stdinContent = await StdinProcessor.processStdin();
      console.log("📥 Stdin processed successfully");

      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(stdinContent);
        console.log("📋 JSON data received:", jsonData);

        // Use JSON data as configuration
        if (jsonData.port) cliArgs.port = jsonData.port;
        if (jsonData.hostname) cliArgs.hostname = jsonData.hostname;
        if (jsonData.title) cliArgs.title = jsonData.title;
      } catch (e) {
        console.log("📝 Plain text stdin received");
      }
    } catch (error) {
      console.error("❌ Failed to process stdin:", error.message);
      if (!cliArgs.silent) {
        process.exit(1);
      }
    }
  }

  // Log startup information
  if (!cliArgs.silent) {
    console.log(`🚀 Starting ${cliArgs.title} with:`);
    console.log(`   • Bun ${Bun.version}`);
    console.log(`   • Port: ${cliArgs.port}`);
    console.log(`   • Host: ${cliArgs.hostname}`);
    console.log(`   • Watch mode: ${cliArgs.watch}`);
    console.log(`   • Hot reload: ${cliArgs.hot}`);
    console.log(`   • Memory mode: ${cliArgs.smol ? "smol" : "normal"}`);
    console.log(`   • Console depth: ${cliArgs.consoleDepth}`);
    console.log(`   • Platform: ${cliArgs.platform}`);
    console.log(
      `   • Environment: ${cliArgs.production ? "production" : cliArgs.development ? "development" : "default"}`
    );

    if (cliArgs.define) {
      console.log(`   • Defines: ${cliArgs.define}`);
    }

    if (cliArgs.envFile) {
      console.log(`   • Env file: ${cliArgs.envFile}`);
    }

    if (cliArgs.external) {
      console.log(`   • External: ${cliArgs.external}`);
    }

    if (cliArgs.sqlPreconnect) {
      console.log(`   • SQL preconnect: enabled`);
    }

    if (cliArgs.redisPreconnect) {
      console.log(`   • Redis preconnect: enabled`);
    }
  }

  // Create Elysia app with enhanced configuration
  const app = new Elysia()
    .use(
      swagger({
        documentation: {
          info: {
            title: cliArgs.title,
            version: "1.0.0",
            description:
              "Enhanced Systems Dashboard with comprehensive CLI integration",
          },
        },
      })
    )
    .get("/", () => ({
      message: `Welcome to ${cliArgs.title}`,
      version: env.APP_VERSION || "1.0.0",
      bunVersion: Bun.version,
      cliArgs: {
        port: cliArgs.port,
        hostname: cliArgs.hostname,
        watch: cliArgs.watch,
        hot: cliArgs.hot,
        smol: cliArgs.smol,
        consoleDepth: cliArgs.consoleDepth,
        platform: cliArgs.platform,
        environment: cliArgs.production
          ? "production"
          : cliArgs.development
            ? "development"
            : "default",
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: {
        stdin: cliArgs.stdin,
        fileIO: true,
        debugging: cliArgs.inspect || cliArgs.inspectWait || cliArgs.inspectBrk,
        performance: cliArgs.smol || cliArgs.exposeGc,
        database: cliArgs.sqlPreconnect,
        redis: cliArgs.redisPreconnect,
      },
    }))
    .get("/health", () => ({
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      bun: {
        version: Bun.version,
        platform: process.platform,
        arch: process.arch,
      },
    }))
    .get("/config", () => ({
      environment: env.NODE_ENV || "development",
      port: cliArgs.port,
      hostname: cliArgs.hostname,
      cliArgs,
      features: {
        watch: cliArgs.watch,
        hot: cliArgs.hot,
        inspect: cliArgs.inspect,
        smol: cliArgs.smol,
        exposeGc: cliArgs.exposeGc,
        stdin: cliArgs.stdin,
        sqlPreconnect: cliArgs.sqlPreconnect,
        redisPreconnect: cliArgs.redisPreconnect,
      },
    }))
    .get("/files", async () => {
      // File I/O demonstration endpoint
      const packageJson = await FileManager.analyzeFile("package.json");
      const bunfig = await FileManager.analyzeFile("bunfig.toml");

      return {
        packageJson,
        bunfig,
        timestamp: new Date().toISOString(),
      };
    })
    .post("/stdin", async ({ body }) => {
      // Stdin processing demonstration
      try {
        const processed = await StdinProcessor.processJsonStdin();
        return {
          success: true,
          data: processed,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    })
    .get("/debug", () => {
      // Debug information endpoint
      return {
        process: {
          pid: process.pid,
          ppid: process.ppid,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          platform: process.platform,
          arch: process.arch,
          version: process.version,
        },
        bun: {
          version: Bun.version,
          revision: Bun.revision,
          enableSourceMaps: Bun.enableSourceMaps,
          mainField: Bun.mainField,
        },
        cliArgs,
        globals: {
          gc: typeof global.gc,
          fetch: typeof fetch,
          WebSocket: typeof WebSocket,
          Blob: typeof Blob,
          File: typeof File,
        },
        timestamp: new Date().toISOString(),
      };
    })
    .listen(cliArgs.port);

  // Enhanced startup logging
  if (!cliArgs.silent) {
    console.log(`✅ ${cliArgs.title} running at ${app.server?.url}`);
    console.log(`📖 Swagger docs available at ${app.server?.url}/swagger`);

    if (cliArgs.inspect || cliArgs.inspectWait || cliArgs.inspectBrk) {
      console.log(
        `🔍 Debugging enabled - Open Chrome DevTools at chrome://inspect`
      );
    }

    if (cliArgs.watch || cliArgs.hot) {
      console.log(`🔄 Auto-reload enabled - File changes will trigger restart`);
    }

    if (cliArgs.smol) {
      console.log(`📦 Memory optimization enabled - Running in smol mode`);
    }

    if (cliArgs.exposeGc) {
      console.log(`🗑️  Garbage collection exposed - Call global.gc() manually`);
    }

    console.log(`📊 Dashboard: ${app.server?.url}`);
    console.log(`🏥 Health: ${app.server?.url}/health`);
    console.log(`⚙️  Config: ${app.server?.url}/config`);
    console.log(`📁 Files: ${app.server?.url}/files`);
    console.log(`🔍 Debug: ${app.server?.url}/debug`);
  }

  // Handle graceful shutdown
  const gracefulShutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal} - Shutting down gracefully...`);

    if (cliArgs.exposeGc && global.gc) {
      console.log("🗑️  Running garbage collection...");
      global.gc();
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("💥 Uncaught Exception:", error);
    if (cliArgs.unhandledRejections === "strict") {
      process.exit(1);
    }
  });
}

// Error handling
main().catch((error) => {
  console.error("💥 Failed to start application:", error);
  if (!cliArgs.silent) {
    process.exit(1);
  }
});
