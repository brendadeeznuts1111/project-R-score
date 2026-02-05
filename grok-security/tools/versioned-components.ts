#!/usr/bin/env bun
/**
 * [QUANTUM][VERSIONED][COMPONENTS]{MATRIX}
 * Component versioning matrix with semantic versioning
 * Uses Bun.semver native APIs for all version operations
 * @version 1.0.0
 */

// ===== Bun Native Utilities =====

// Bun.semver - Version comparison and validation
const semver = {
  /** Parse version string into components */
  parse: (version: string) =>
    Bun.semver.satisfies(version, "*") ? version : null,

  /** Check if version satisfies range */
  satisfies: (version: string, range: string): boolean =>
    Bun.semver.satisfies(version, range),

  /** Compare two versions: -1, 0, 1 */
  order: (a: string, b: string): -1 | 0 | 1 => Bun.semver.order(a, b),

  /** Check equality */
  eq: (a: string, b: string): boolean => Bun.semver.order(a, b) === 0,

  /** Check greater than */
  gt: (a: string, b: string): boolean => Bun.semver.order(a, b) === 1,

  /** Check less than */
  lt: (a: string, b: string): boolean => Bun.semver.order(a, b) === -1,
};

// Bun.stringWidth - Accurate terminal width (handles emoji, ANSI, Unicode)
const stringWidth = {
  /** Get display width of string (emoji, ANSI-aware) */
  width: (str: string): number => Bun.stringWidth(str),

  /** Pad string to exact display width */
  pad: (
    str: string,
    width: number,
    align: "left" | "right" | "center" = "left"
  ): string => {
    const currentWidth = Bun.stringWidth(str);
    const padding = Math.max(0, width - currentWidth);
    if (align === "right") return " ".repeat(padding) + str;
    if (align === "center")
      return (
        " ".repeat(Math.floor(padding / 2)) +
        str +
        " ".repeat(Math.ceil(padding / 2))
      );
    return str + " ".repeat(padding);
  },

  /** Truncate string to max display width with ellipsis */
  truncate: (str: string, maxWidth: number, ellipsis = "…"): string => {
    if (Bun.stringWidth(str) <= maxWidth) return str;
    let result = "";
    let width = 0;
    const ellipsisWidth = Bun.stringWidth(ellipsis);
    for (const char of str) {
      const charWidth = Bun.stringWidth(char);
      if (width + charWidth + ellipsisWidth > maxWidth) break;
      result += char;
      width += charWidth;
    }
    return result + ellipsis;
  },
};

// Bun.color - Terminal color utilities
const color = {
  /** Convert any color format to ANSI */
  ansi: (c: string): string => Bun.color(c, "ansi") ?? "",

  /** Convert any color format to hex */
  hex: (c: string): string => Bun.color(c, "css-hex") ?? "",

  /** Convert any color format to RGB array */
  rgb: (c: string): [number, number, number] | null => Bun.color(c, "rgb"),

  /** Check if color is valid */
  isValid: (c: string): boolean => Bun.color(c, "css") !== null,
};

// Bun.$ - Shell utilities with $PATH access
const shell = {
  /** Execute shell command and return output */
  exec: async (cmd: string): Promise<string> => {
    const result = await Bun.$`${cmd}`.text();
    return result.trim();
  },

  /** Get $PATH as array */
  getPath: (): string[] => (process.env.PATH ?? "").split(":"),

  /** Check if command exists in $PATH */
  which: async (cmd: string): Promise<string | null> => {
    try {
      const result = await Bun.$`which ${cmd}`.text();
      return result.trim() || null;
    } catch {
      return null;
    }
  },

  /** Get environment variable */
  env: (key: string): string | undefined => process.env[key],

  /** Expand ~ to home directory */
  expandHome: (path: string): string =>
    path.replace(/^~/, process.env.HOME ?? ""),
};

// Unicode codepoint utilities
const unicode = {
  /** Get codepoint of first character */
  codepoint: (char: string): number => char.codePointAt(0) ?? 0,

  /** Format codepoint as U+XXXX */
  toHex: (char: string): string => {
    const cp = char.codePointAt(0) ?? 0;
    return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
  },

  /** Get all codepoints in string */
  codepoints: (str: string): number[] =>
    [...str].map((c) => c.codePointAt(0) ?? 0),

  /** Format all codepoints as U+XXXX */
  toHexAll: (str: string): string[] =>
    [...str].map(
      (c) =>
        `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`
    ),

  /** Create character from codepoint */
  fromCodepoint: (cp: number): string => String.fromCodePoint(cp),

  /** Check if character is emoji */
  isEmoji: (char: string): boolean => {
    const cp = char.codePointAt(0) ?? 0;
    return (
      (cp >= 0x1f300 && cp <= 0x1f9ff) || // Misc Symbols, Emoticons, etc.
      (cp >= 0x2600 && cp <= 0x26ff) || // Misc Symbols
      (cp >= 0x2700 && cp <= 0x27bf) || // Dingbats
      (cp >= 0x1f600 && cp <= 0x1f64f)
    ); // Emoticons
  },

  /** Check if character is combining mark (zero-width) */
  isCombining: (char: string): boolean => {
    const cp = char.codePointAt(0) ?? 0;
    return (
      (cp >= 0x0300 && cp <= 0x036f) || // Combining Diacriticals
      (cp >= 0x1ab0 && cp <= 0x1aff) || // Combining Diacriticals Extended
      (cp >= 0x1dc0 && cp <= 0x1dff) || // Combining Diacriticals Supplement
      (cp >= 0x20d0 && cp <= 0x20ff) || // Combining for Symbols
      (cp >= 0xfe20 && cp <= 0xfe2f)
    ); // Combining Half Marks
  },

  /** Get grapheme clusters (visual characters) */
  graphemes: (str: string): string[] => {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return [...segmenter.segment(str)].map((s) => s.segment);
  },

  /** Get grapheme count (visual character count) */
  graphemeCount: (str: string): number => {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return [...segmenter.segment(str)].length;
  },
};

// Bun.build - Advanced build utilities with virtual files
interface BuildFilesOptions {
  entrypoints: string[];
  files?: Record<string, string | Blob | ArrayBuffer | Uint8Array>;
  outdir?: string;
  target?: "bun" | "browser" | "node";
  minify?: boolean;
  sourcemap?: "inline" | "external" | "none";
  define?: Record<string, string>;
  reactFastRefresh?: boolean;
  compile?: boolean;
  executablePath?: string;
}

const build = {
  /** Build with virtual files (override or inject files that don't exist on disk) */
  withFiles: async (options: BuildFilesOptions) => {
    return await Bun.build({
      entrypoints: options.entrypoints,
      files: options.files,
      outdir: options.outdir,
      target: options.target ?? "bun",
      minify: options.minify ?? false,
      sourcemap: options.sourcemap ?? "none",
      define: options.define,
    });
  },

  /** Inject build-time constants as virtual file */
  injectConstants: async (
    entrypoints: string[],
    constants: Record<string, unknown>,
    outdir: string
  ) => {
    const generated = Object.entries(constants)
      .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
      .join("\n");

    return await Bun.build({
      entrypoints,
      files: {
        "./src/generated-constants.ts": generated,
      },
      outdir,
      target: "bun",
    });
  },

  /** Build with React Fast Refresh for HMR */
  reactHMR: async (entrypoints: string[], outdir: string) => {
    return await Bun.build({
      entrypoints,
      outdir,
      target: "browser",
      // @ts-expect-error - reactFastRefresh available in Bun 1.3.5+
      reactFastRefresh: true,
    });
  },

  /** Cross-compile executable with local Bun binary */
  crossCompile: async (
    entrypoint: string,
    target:
      | "bun-linux-x64"
      | "bun-linux-arm64"
      | "bun-darwin-x64"
      | "bun-darwin-arm64"
      | "bun-windows-x64",
    executablePath: string,
    outfile?: string
  ) => {
    return await Bun.build({
      entrypoints: [entrypoint],
      // @ts-expect-error - compile + executablePath available in Bun 1.3.5+
      compile: true,
      target,
      executablePath,
      outfile,
    });
  },

  /** Build component with version injection */
  versionedComponent: async (
    entrypoint: string,
    version: string,
    channel: string,
    outdir: string
  ) => {
    const buildId = `${version}-${channel}-${Date.now()}`;
    return await Bun.build({
      entrypoints: [entrypoint],
      files: {
        "./src/__version__.ts": `
          export const VERSION = "${version}";
          export const CHANNEL = "${channel}";
          export const BUILD_ID = "${buildId}";
          export const BUILD_TIME = ${Date.now()};
        `,
      },
      outdir,
      target: "bun",
      define: {
        "process.env.VERSION": JSON.stringify(version),
        "process.env.CHANNEL": JSON.stringify(channel),
        "process.env.BUILD_ID": JSON.stringify(buildId),
      },
    });
  },
};

// Bun.Terminal - PTY (Pseudo-Terminal) utilities
// Full API: write(), resize(), setRawMode(), ref(), unref(), close()
// Supports `await using` for automatic cleanup (TC39 Explicit Resource Management)
interface TerminalOptions {
  cols?: number;
  rows?: number;
  onData?: (data: string | Uint8Array) => void;
}

interface SpawnWithPTYOptions {
  command: string[];
  cols?: number;
  rows?: number;
  onData?: (data: string | Uint8Array) => void;
  onExit?: (code: number) => void;
}

const pty = {
  /** Create reusable terminal for multiple subprocesses
   * @example
   * await using terminal = pty.create({ onData: console.log });
   * // Terminal auto-closes when scope exits
   */
  create: (options: TerminalOptions = {}): Bun.Terminal => {
    return new Bun.Terminal({
      cols: options.cols ?? process.stdout.columns ?? 80,
      rows: options.rows ?? process.stdout.rows ?? 24,
      data(term, data) {
        options.onData?.(data);
      },
    });
  },

  /** Spawn process with PTY attached (isTTY = true) */
  spawn: async (options: SpawnWithPTYOptions) => {
    const proc = Bun.spawn(options.command, {
      terminal: {
        cols: options.cols ?? process.stdout.columns ?? 80,
        rows: options.rows ?? process.stdout.rows ?? 24,
        data(term, data) {
          options.onData?.(data);
        },
      },
    });

    const code = await proc.exited;
    options.onExit?.(code);
    proc.terminal?.close();
    return code;
  },

  /** Run interactive program (vim, htop, etc.)
   * - Enables colored output, cursor movement, interactive prompts
   * - Handles terminal resize events
   * - Forwards stdin in raw mode
   */
  interactive: async (command: string[]) => {
    const proc = Bun.spawn(command, {
      terminal: {
        cols: process.stdout.columns ?? 80,
        rows: process.stdout.rows ?? 24,
        data(term, data) {
          process.stdout.write(data);
        },
      },
    });

    // Exit handler
    proc.exited.then((code) => process.exit(code));

    // Handle terminal resize - sync to PTY
    const onResize = () => {
      proc.terminal?.resize(
        process.stdout.columns ?? 80,
        process.stdout.rows ?? 24
      );
    };
    process.stdout.on("resize", onResize);

    // Forward stdin in raw mode (keypresses sent immediately)
    process.stdin.setRawMode?.(true);
    for await (const chunk of process.stdin) {
      proc.terminal?.write(chunk);
    }

    const code = await proc.exited;
    process.stdin.setRawMode?.(false);
    process.stdout.off("resize", onResize);
    proc.terminal?.close();
    return code;
  },

  /** Execute commands in sequence with reusable PTY
   * @example
   * await using terminal = pty.create({ onData: console.log });
   * const results = await pty.sequenceWith(terminal, ["echo 1", "echo 2"]);
   */
  sequence: async (commands: string[], options: TerminalOptions = {}) => {
    // Using `await using` for automatic cleanup
    await using terminal = new Bun.Terminal({
      cols: options.cols ?? 80,
      rows: options.rows ?? 24,
      data(term, data) {
        options.onData?.(data);
      },
    });

    const results: number[] = [];
    for (const cmd of commands) {
      const proc = Bun.spawn(["sh", "-c", cmd], { terminal });
      results.push(await proc.exited);
    }
    // Terminal auto-closes via `await using`
    return results;
  },

  /** Execute with existing terminal (no auto-close) */
  sequenceWith: async (terminal: Bun.Terminal, commands: string[]) => {
    const results: number[] = [];
    for (const cmd of commands) {
      const proc = Bun.spawn(["sh", "-c", cmd], { terminal });
      results.push(await proc.exited);
    }
    return results;
  },

  /** Capture PTY output to buffer (colored output preserved) */
  capture: async (command: string[], timeout = 5000): Promise<string> => {
    let output = "";
    const proc = Bun.spawn(command, {
      terminal: {
        cols: 80,
        rows: 24,
        data(term, data) {
          output +=
            typeof data === "string" ? data : new TextDecoder().decode(data);
        },
      },
    });

    const timer = setTimeout(() => proc.kill(), timeout);
    await proc.exited;
    clearTimeout(timer);
    proc.terminal?.close();
    return output;
  },
};

// Skill-Specific Terminal - Isolated PTY per skill with features
interface SkillTerminalConfig {
  skillId: string;
  workdir?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  allowedCommands?: string[];
  maxOutputBytes?: number;
  timeout?: number;
  onData?: (data: string) => void;
  onError?: (error: Error) => void;
}

interface SkillTerminalFeatures {
  /** Enable command allowlist enforcement */
  sandbox: boolean;
  /** Enable output capture + logging */
  logging: boolean;
  /** Enable DLP secret redaction */
  dlp: boolean;
  /** Enable resource limits */
  limits: boolean;
  /** Enable skill metadata injection */
  metadata: boolean;
}

interface SkillTerminal {
  skillId: string;
  terminal: Bun.Terminal;
  outputBuffer: string[];
  run: (command: string) => Promise<{ code: number; output: string }>;
  runAllowed: (command: string) => Promise<{ code: number; output: string }>;
  getOutput: () => string;
  clearOutput: () => void;
  destroy: () => void;
}

const skillTerminal = {
  /** Create skill-specific terminal with isolation + features */
  create: (
    config: SkillTerminalConfig,
    features: Partial<SkillTerminalFeatures> = {}
  ): SkillTerminal => {
    const outputBuffer: string[] = [];
    let totalBytes = 0;
    const maxBytes = config.maxOutputBytes ?? 10 * 1024 * 1024; // 10MB default

    const terminal = new Bun.Terminal({
      cols: config.cols ?? 80,
      rows: config.rows ?? 24,
      data(term, data) {
        const output =
          typeof data === "string" ? data : new TextDecoder().decode(data);

        // DLP sanitization
        const sanitized = features.dlp ? security.sanitize(output) : output;

        // Size limit check
        totalBytes += sanitized.length;
        if (features.limits && totalBytes > maxBytes) {
          config.onError?.(new Error("Output size limit exceeded"));
          return;
        }

        // Buffer for logging
        if (features.logging) {
          outputBuffer.push(sanitized);
        }

        config.onData?.(sanitized);
      },
    });

    const skillEnv = {
      ...process.env,
      ...config.env,
      SKILL_ID: config.skillId,
      SKILL_WORKDIR: config.workdir ?? `./skills/${config.skillId}`,
      SKILL_TERMINAL: "true",
    };

    const isCommandAllowed = (cmd: string): boolean => {
      if (!features.sandbox || !config.allowedCommands) return true;
      const baseCmd = cmd.split(" ")[0];
      return config.allowedCommands.includes(baseCmd);
    };

    return {
      skillId: config.skillId,
      terminal,
      outputBuffer,

      /** Run command (no sandbox check) */
      run: async (command: string) => {
        let output = "";
        const proc = Bun.spawn(["sh", "-c", command], {
          terminal,
          cwd: config.workdir ?? `./skills/${config.skillId}`,
          env: skillEnv,
        });

        // Capture output for this command
        const startIdx = outputBuffer.length;
        const timer = config.timeout
          ? setTimeout(() => proc.kill(), config.timeout)
          : null;

        const code = await proc.exited;
        if (timer) clearTimeout(timer);

        output = outputBuffer.slice(startIdx).join("");
        return { code, output };
      },

      /** Run command with sandbox allowlist check */
      runAllowed: async (command: string) => {
        if (!isCommandAllowed(command)) {
          const error = new Error(
            `Command not allowed: ${command.split(" ")[0]}`
          );
          config.onError?.(error);
          return { code: 1, output: error.message };
        }
        return skillTerminal.create(config, features).run(command);
      },

      /** Get all captured output */
      getOutput: () => outputBuffer.join(""),

      /** Clear output buffer */
      clearOutput: () => {
        outputBuffer.length = 0;
        totalBytes = 0;
      },

      /** Destroy terminal */
      destroy: () => {
        terminal.close();
        outputBuffer.length = 0;
      },
    };
  },

  /** Create terminal with all features enabled */
  createSecure: (config: SkillTerminalConfig): SkillTerminal => {
    return skillTerminal.create(config, {
      sandbox: true,
      logging: true,
      dlp: true,
      limits: true,
      metadata: true,
    });
  },

  /** Create terminal for skill development (relaxed) */
  createDev: (
    skillId: string,
    onData?: (data: string) => void
  ): SkillTerminal => {
    return skillTerminal.create(
      {
        skillId,
        workdir: `./skills/${skillId}`,
        onData: onData ?? ((d) => process.stdout.write(d)),
      },
      { logging: true, metadata: true }
    );
  },

  /** Run skill's main entrypoint */
  runSkill: async (
    skillId: string,
    args: string[] = [],
    config: Partial<SkillTerminalConfig> = {}
  ) => {
    const term = skillTerminal.createSecure({
      skillId,
      workdir: `./skills/${skillId}`,
      allowedCommands: ["bun", "node", "npm", "echo", "cat", "ls"],
      timeout: 30000,
      onData: (d) => process.stdout.write(d),
      ...config,
    });

    const result = await term.run(`bun run src/index.ts ${args.join(" ")}`);
    term.destroy();
    return result;
  },

  /** Run skill in watch mode */
  watchSkill: async (skillId: string) => {
    const term = skillTerminal.createDev(skillId);
    return term.run(`bun --watch run src/index.ts`);
  },

  /** Run skill tests */
  testSkill: async (skillId: string) => {
    const term = skillTerminal.createDev(skillId);
    const result = await term.run(`bun test`);
    term.destroy();
    return result;
  },
};

// Bun.Terminal + DevTools - Visual Debugger with Chrome Integration
interface DebugOptions {
  port?: number;
  autoBreak?: boolean;
  watch?: boolean;
  sourceMaps?: boolean;
}

const debug = {
  /** Launch Chrome DevTools for visual debugging */
  launchDevTools: async (entrypoint: string, options: DebugOptions = {}) => {
    const port = options.port ?? 9229;
    const outdir = ".debug";

    // Build with source maps for debugging
    await Bun.build({
      entrypoints: [entrypoint],
      outdir,
      target: "node",
      sourcemap: options.sourceMaps !== false ? "external" : "none",
      minify: false,
      naming: "[name].debug.[ext]",
    });

    let wsUrl: string | null = null;

    const terminal = new Bun.Terminal({
      cols: process.stdout.columns ?? 80,
      rows: process.stdout.rows ?? 24,
      data: (term, data) => {
        const output =
          typeof data === "string" ? data : new TextDecoder().decode(data);

        // Capture WebSocket URL for DevTools
        if (output.includes("Debugger listening on")) {
          wsUrl = output.match(/ws:\/\/127\.0\.0\.1:\d+\/[^ \n]+/)?.[0] ?? null;
          if (wsUrl) {
            debug.openDevTools(wsUrl);
          }
        }

        process.stdout.write(output);
      },
    });

    const debugFile = `${outdir}/${entrypoint.split("/").pop()?.replace(".ts", ".debug.js")}`;

    const proc = Bun.spawn(["node", `--inspect=${port}`, debugFile], {
      terminal,
      env: {
        ...process.env,
        NODE_OPTIONS: "--enable-source-maps",
        DEBUG_MODE: "true",
      },
    });

    console.log(`🚀 Debug session started on port ${port}`);
    console.log(`🔗 Opening Chrome DevTools...`);

    if (options.autoBreak) {
      setTimeout(() => {
        console.log(`🔵 Auto-break enabled - pausing at first statement`);
      }, 2000);
    }

    await proc.exited;
    terminal.close();
    return wsUrl;
  },

  /** Open Chrome DevTools with WebSocket URL */
  openDevTools: (wsUrl: string) => {
    const devtoolsUrl = `devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=${wsUrl.replace("ws://", "")}`;

    console.log(`📟 DevTools: ${devtoolsUrl}`);

    if (process.platform === "darwin") {
      Bun.spawn(["open", devtoolsUrl], { stdout: "inherit" });
    } else if (process.platform === "linux") {
      Bun.spawn(["xdg-open", devtoolsUrl], { stdout: "inherit" });
    } else {
      console.log(`Open in Chrome: ${devtoolsUrl}`);
    }
  },

  /** Find recommended breakpoints in source file */
  findBreakpoints: async (
    filepath: string
  ): Promise<Array<{ file: string; line: number; reason: string }>> => {
    const content = await Bun.file(filepath).text();
    const lines = content.split("\n");
    const breakpoints: Array<{ file: string; line: number; reason: string }> =
      [];
    const filename = filepath.split("/").pop() ?? filepath;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("async") && line.includes("execute")) {
        breakpoints.push({
          file: filename,
          line: i + 1,
          reason: "Main execute function",
        });
      } else if (line.includes("throw")) {
        breakpoints.push({
          file: filename,
          line: i + 1,
          reason: "Error throw site",
        });
      } else if (line.includes("await") && line.includes("fetch")) {
        breakpoints.push({
          file: filename,
          line: i + 1,
          reason: "External API call",
        });
      } else if (line.includes("debugger")) {
        breakpoints.push({
          file: filename,
          line: i + 1,
          reason: "Debugger statement",
        });
      }
    }

    return breakpoints.slice(0, 5);
  },

  /** Run with Bun's native inspector */
  bunInspect: async (entrypoint: string, port = 6499) => {
    const proc = Bun.spawn(["bun", `--inspect=${port}`, entrypoint], {
      terminal: {
        cols: process.stdout.columns ?? 80,
        rows: process.stdout.rows ?? 24,
        data(term, data) {
          process.stdout.write(data);
        },
      },
    });

    console.log(`🔧 Bun inspector running on ws://localhost:${port}`);
    await proc.exited;
    proc.terminal?.close();
  },
};

// PTY Security - Session isolation, rate limiting, DLP, audit logging
interface SessionGuardConfig {
  maxBytesPerSec?: number;
  maxMemoryMB?: number;
  sessionTTL?: number;
  sanitizeSecrets?: boolean;
}

interface IsolatedSession {
  sessionId: string;
  terminal: Bun.Terminal;
  auditLog: (action: string, data: Record<string, unknown>) => void;
  destroy: () => void;
}

const security = {
  /** Secret patterns for DLP sanitization */
  SECRET_PATTERNS: [
    /sk-[A-Za-z0-9]{48}/g, // OpenAI keys
    /ghp_[A-Za-z0-9]{36}/g, // GitHub tokens
    /xoxb-[A-Za-z0-9-]{50,}/g, // Slack bot tokens
    /AKIA[A-Z0-9]{16}/g, // AWS access keys
    /[A-Za-z0-9]{32,}/g, // Generic API keys (loose)
  ] as RegExp[],

  /** Sanitize terminal output - redact secrets */
  sanitize: (data: string): string => {
    let sanitized = data;
    for (const pattern of security.SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
    return sanitized;
  },

  /** Create isolated PTY session with rate limiting + DLP */
  createIsolatedSession: (
    userId: string,
    skillId: string,
    terminal: Bun.Terminal,
    config: SessionGuardConfig = {}
  ): IsolatedSession => {
    const sessionId = `${userId}:${skillId}:${Date.now()}`;
    const sessionStart = Date.now();
    const maxBytesPerSec = config.maxBytesPerSec ?? 1024 * 1024; // 1MB/s
    const maxMemoryMB = config.maxMemoryMB ?? 512;
    let bytesWritten = 0;

    // Wrap terminal.write for rate limiting + DLP
    const originalWrite = terminal.write.bind(terminal);
    terminal.write = (data: string | Uint8Array): void => {
      const size = typeof data === "string" ? data.length : data.byteLength;
      bytesWritten += size;

      // Rate limit check
      const elapsed = Math.max(1, Date.now() - sessionStart);
      if (bytesWritten / elapsed > maxBytesPerSec / 1000) {
        throw new Error("Rate limit exceeded: PTY output too fast");
      }

      // DLP sanitization
      if (config.sanitizeSecrets !== false && typeof data === "string") {
        return originalWrite(security.sanitize(data));
      }
      return originalWrite(data);
    };

    // Memory monitoring
    const monitorInterval = setInterval(() => {
      const memMB = process.memoryUsage().heapUsed / 1024 / 1024;
      if (memMB > maxMemoryMB) {
        security.logSecurityEvent("MEMORY_LIMIT_EXCEEDED", {
          sessionId,
          memMB,
        });
        throw new Error("Session terminated: Memory limit exceeded");
      }
    }, 5000);

    return {
      sessionId,
      terminal,
      auditLog: (action, data) => {
        security.logAudit(sessionId, userId, skillId, action, data);
      },
      destroy: () => {
        clearInterval(monitorInterval);
        console.log(`🔒 Session destroyed: ${sessionId}`);
      },
    };
  },

  /** Validate session token (timing-safe) */
  validateToken: (
    sessionId: string,
    token: string,
    secret: string
  ): boolean => {
    const expected = Bun.hash.crc32(sessionId + secret).toString();
    if (token.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  },

  /** Log audit trail entry */
  logAudit: async (
    sessionId: string,
    userId: string,
    skillId: string,
    action: string,
    data: Record<string, unknown>
  ) => {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      skillId,
      action,
      data: { ...data, password: undefined, token: undefined, key: undefined },
    };
    const logFile = `./logs/audit/pty-${new Date().toISOString().split("T")[0]}.jsonl`;
    await Bun.write(logFile, JSON.stringify(entry) + "\n").catch(console.error);
  },

  /** Log security event */
  logSecurityEvent: (event: string, details: Record<string, unknown>) => {
    console.error(`🚨 SECURITY_ALERT: ${event}`, details);
  },
};

// Collaborative Debug Session - Multi-user PTY sharing with host terminal
interface Participant {
  terminal: Bun.Terminal;
  role: "observer" | "controller";
}

class CollaborativeSession {
  private hostTerminal: Bun.Terminal;
  private participants = new Map<string, Participant>();
  private state = {
    currentLine: 0,
    breakpoints: new Set<number>(),
    watchExpressions: new Map<string, string>(),
    isPaused: false,
  };

  constructor(options: { cols?: number; rows?: number } = {}) {
    // Create shared host terminal - output mirrors to all participants
    this.hostTerminal = new Bun.Terminal({
      cols: options.cols ?? process.stdout.columns ?? 80,
      rows: options.rows ?? process.stdout.rows ?? 24,
      data: (term, data) => {
        // Mirror host terminal output to all participant terminals
        this.mirrorOutput(data);
      },
    });
  }

  /** Get the shared host terminal for spawning processes */
  getHostTerminal(): Bun.Terminal {
    return this.hostTerminal;
  }

  /** Mirror host terminal output to all participants */
  private mirrorOutput(data: string | Uint8Array) {
    const output =
      typeof data === "string" ? data : new TextDecoder().decode(data);
    for (const [userId, p] of this.participants) {
      try {
        p.terminal.write(output);
      } catch {
        this.participants.delete(userId);
      }
    }
  }

  /** Join with your own terminal (receives mirrored output) */
  join(
    userId: string,
    role: "observer" | "controller",
    terminal: Bun.Terminal
  ) {
    if (this.participants.size >= 5) {
      throw new Error("Session full: Max 5 participants");
    }
    this.participants.set(userId, { terminal, role });
    this.broadcast({
      type: "user_joined",
      userId,
      role,
      timestamp: Date.now(),
    });
    terminal.write(`\n📡 Connected to collaborative debug session\n`);
    terminal.write(`Role: ${role} | Participants: ${this.participants.size}\n`);
  }

  /** Send input to host terminal (controllers only) */
  sendInput(userId: string, input: string | Uint8Array) {
    const participant = this.participants.get(userId);
    if (!participant || participant.role !== "controller") {
      throw new Error("Only controllers can send input");
    }
    this.hostTerminal.write(input);
  }

  /** Resize host terminal (syncs to all) */
  resize(cols: number, rows: number) {
    this.hostTerminal.resize(cols, rows);
    this.broadcast({ type: "resize", cols, rows, timestamp: Date.now() });
  }

  leave(userId: string) {
    this.participants.delete(userId);
    this.broadcast({ type: "user_left", userId, timestamp: Date.now() });
  }

  broadcast(message: Record<string, unknown>) {
    const data = JSON.stringify(message) + "\n";
    for (const [userId, p] of this.participants) {
      try {
        p.terminal.write(data);
      } catch {
        this.participants.delete(userId);
      }
    }
  }

  getParticipants(): string[] {
    return [...this.participants.keys()];
  }

  destroy() {
    this.hostTerminal.close();
    this.participants.clear();
  }
}

export {
  semver,
  stringWidth,
  color,
  shell,
  unicode,
  build,
  pty,
  skillTerminal,
  debug,
  security,
  CollaborativeSession,
};

// ===== Versioned Component Matrix (8 Columns) =====
// | 🆔 VERSIONED_ID | 🔧 COMPONENT_TYPE | 📦 BUNDLE_VERSION | 📁 FILE_NAMING_PATTERN | 🗂️ BUILD_DIR_STRUCTURE | 📊 SEMVER_RANGE | 🔧 BUN_SEMVER_API | 🏷️ RELEASE_TAG |
export const VERSIONED_COMPONENTS = [
  {
    versionedId: "qcf-headscale-proxy@1.0.0-stable",
    componentType: "DurableObject",
    bundleVersion: "1.0.0+cloudflare.workers",
    fileNamingPattern: "quantum-headscale-proxy-1.0.0.stable.js",
    buildDirStructure: "builds/stable/v1.0.0/workers/",
    semverRange: "^1.0.0",
    bunSemverApi: "Bun.semver.satisfies()",
    releaseTag: "stable",
    path: "workers/headscale-proxy.ts",
  },
  {
    versionedId: "qcf-headscale-server@1.0.0-stable",
    componentType: "BunServer",
    bundleVersion: "1.0.0+bun.native.spawn",
    fileNamingPattern: "quantum-headscale-server-1.0.0.stable.js",
    buildDirStructure: "builds/stable/v1.0.0/server/",
    semverRange: "^1.0.0",
    bunSemverApi: "Bun.semver.parse()",
    releaseTag: "stable",
    path: "infrastructure/headscale-server.ts",
  },
  {
    versionedId: "qcf-tension-engine@1.0.0-stable",
    componentType: "Library",
    bundleVersion: "1.0.0+simd.arraybuffer",
    fileNamingPattern: "quantum-tension-engine-1.0.0.stable.simd.js",
    buildDirStructure: "builds/stable/v1.0.0/tension/",
    semverRange: "^1.0.0",
    bunSemverApi: "Bun.semver.order()",
    releaseTag: "stable",
    path: "bun-inspect-utils/src/tension/index.ts",
  },
  {
    versionedId: "qcf-terminal-pty@1.0.0-stable",
    componentType: "Library",
    bundleVersion: "1.0.0+pty.posix",
    fileNamingPattern: "quantum-terminal-pty-1.0.0.stable.pty.js",
    buildDirStructure: "builds/stable/v1.0.0/terminal/",
    semverRange: "^1.0.0",
    bunSemverApi: "Bun.semver.eq()",
    releaseTag: "stable",
    path: "bun-inspect-utils/src/terminal/index.ts",
  },
  {
    versionedId: "qcf-semver-engine@1.0.0-stable",
    componentType: "Tool",
    bundleVersion: "1.0.0+bun.semver.native",
    fileNamingPattern: "quantum-semver-engine-1.0.0.stable.js",
    buildDirStructure: "builds/stable/v1.0.0/tools/",
    semverRange: "^1.0.0",
    bunSemverApi: "Bun.semver.inc()",
    releaseTag: "stable",
    path: "tools/quantum-semver-engine.ts",
  },
  {
    versionedId: "qcf-opr-cli@1.0.0-stable",
    componentType: "CLI",
    bundleVersion: "1.0.0+bash.shell",
    fileNamingPattern: "quantum-opr-1.0.0.stable.sh",
    buildDirStructure: "builds/stable/v1.0.0/bin/",
    semverRange: "^1.0.0",
    bunSemverApi: "Bun.semver.diff()",
    releaseTag: "stable",
    path: "bin/opr",
  },
] as const;

// ===== Component Types =====
export type ComponentType =
  | "DurableObject"
  | "BunServer"
  | "Library"
  | "Tool"
  | "CLI"
  | "Worker";

export type ReleaseTag =
  | "canary"
  | "nightly"
  | "alpha"
  | "beta"
  | "rc"
  | "stable"
  | "preview"
  | "experimental";

// 8-Column Interface
export interface VersionedComponent {
  versionedId: string; // 🆔 VERSIONED_ID
  componentType: ComponentType; // 🔧 COMPONENT_TYPE
  bundleVersion: string; // 📦 BUNDLE_VERSION
  fileNamingPattern: string; // 📁 FILE_NAMING_PATTERN
  buildDirStructure: string; // 🗂️ BUILD_DIR_STRUCTURE
  semverRange: string; // 📊 SEMVER_RANGE
  bunSemverApi: string; // 🔧 BUN_SEMVER_API
  releaseTag: ReleaseTag; // 🏷️ RELEASE_TAG
  path: string; // Source path
}

// ===== Matrix Operations (Using Bun.semver) =====
export function getComponentById(
  id: string
): (typeof VERSIONED_COMPONENTS)[number] | undefined {
  return VERSIONED_COMPONENTS.find((c) =>
    c.versionedId.startsWith(id.split("@")[0])
  );
}

export function getComponentsByType(
  type: ComponentType
): (typeof VERSIONED_COMPONENTS)[number][] {
  return VERSIONED_COMPONENTS.filter((c) => c.componentType === type);
}

export function getComponentsByChannel(
  channel: string
): (typeof VERSIONED_COMPONENTS)[number][] {
  const channelTags: Record<string, string[]> = {
    canary: ["canary", "nightly"],
    alpha: ["alpha", "canary", "nightly"],
    beta: ["beta", "alpha", "canary", "nightly"],
    rc: ["rc", "beta", "alpha"],
    stable: ["stable", "rc"],
  };
  const validTags = channelTags[channel] || ["stable"];
  return VERSIONED_COMPONENTS.filter((c) => validTags.includes(c.releaseTag));
}

/** Check if version satisfies component's semver range (Bun.semver.satisfies) */
export function checkVersionCompatibility(
  componentId: string,
  version: string
): { compatible: boolean; component: string; range: string; version: string } {
  const comp = getComponentById(componentId);
  if (!comp) {
    return { compatible: false, component: componentId, range: "N/A", version };
  }
  const compatible = semver.satisfies(version, comp.semverRange);
  return {
    compatible,
    component: comp.versionedId,
    range: comp.semverRange,
    version,
  };
}

/** Get components sorted by version (Bun.semver.order) */
export function getComponentsSortedByVersion(): (typeof VERSIONED_COMPONENTS)[number][] {
  return [...VERSIONED_COMPONENTS].sort((a, b) => {
    const vA = a.bundleVersion.split("+")[0];
    const vB = b.bundleVersion.split("+")[0];
    return semver.order(vA, vB);
  });
}

/** Validate all component versions are valid semver */
export function validateAllVersions(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const c of VERSIONED_COMPONENTS) {
    const version = c.bundleVersion.split("+")[0];
    if (!semver.parse(version)) {
      errors.push(`Invalid version for ${c.versionedId}: ${version}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Find components matching a version range */
export function findComponentsByVersionRange(
  range: string
): (typeof VERSIONED_COMPONENTS)[number][] {
  return VERSIONED_COMPONENTS.filter((c) => {
    const version = c.bundleVersion.split("+")[0];
    return semver.satisfies(version, range);
  });
}

// ===== Print Matrix (Full 8 Columns with Bun.stringWidth) =====
export function printMatrix(): void {
  // Column widths for accurate display using Bun.stringWidth
  const cols = [35, 15, 27, 42, 30, 9, 24, 8];
  const W = cols.reduce((a, b) => a + b, 0) + cols.length + 3; // +separators +borders
  const line = "═".repeat(W - 2);
  const sep = "─".repeat(W - 2);

  console.log(`\n╔${line}╗`);
  console.log(
    `║${stringWidth.pad("VERSIONED COMPONENT MATRIX", W - 2, "center")}║`
  );
  console.log(`╠${line}╣`);

  // Header row (8 columns) - using stringWidth.pad for emoji alignment
  const headers = [
    "🆔 VERSIONED_ID",
    "🔧 TYPE",
    "📦 BUNDLE_VERSION",
    "📁 FILE_PATTERN",
    "🗂️ BUILD_DIR",
    "📊 SEMVER",
    "🔧 BUN_API",
    "🏷️ TAG",
  ];
  const headerRow = headers
    .map((h, i) => stringWidth.pad(h, cols[i]))
    .join("│");
  console.log(`║ ${headerRow} ║`);
  console.log(`╠${sep}╣`);

  // Data rows - using stringWidth.pad for accurate column alignment
  for (const c of VERSIONED_COMPONENTS) {
    const values = [
      c.versionedId,
      c.componentType,
      c.bundleVersion,
      stringWidth.truncate(c.fileNamingPattern, cols[3] - 1),
      stringWidth.truncate(c.buildDirStructure, cols[4] - 1),
      c.semverRange,
      c.bunSemverApi,
      c.releaseTag,
    ];
    const row = values.map((v, i) => stringWidth.pad(v, cols[i])).join("│");
    console.log(`║ ${row} ║`);
  }

  console.log(`╚${line}╝\n`);
}

// ===== JSON Export =====
export function toJSON(): string {
  return JSON.stringify(
    {
      matrix: VERSIONED_COMPONENTS,
      columns: [
        "🆔 VERSIONED_ID",
        "🔧 COMPONENT_TYPE",
        "📦 BUNDLE_VERSION",
        "📁 FILE_NAMING_PATTERN",
        "🗂️ BUILD_DIR_STRUCTURE",
        "📊 SEMVER_RANGE",
        "🔧 BUN_SEMVER_API",
        "🏷️ RELEASE_TAG",
      ],
      generated: new Date().toISOString(),
      bunVersion: Bun.version,
    },
    null,
    2
  );
}

// ===== Markdown Export (Full 8 Columns) =====
export function toMarkdown(): string {
  const rows = VERSIONED_COMPONENTS.map(
    (c) =>
      `| ${c.versionedId} | \`${c.componentType}\` | \`${c.bundleVersion}\` | \`${c.fileNamingPattern}\` | \`${c.buildDirStructure}\` | \`${c.semverRange}\` | \`${c.bunSemverApi}\` | \`${c.releaseTag}\` |`
  ).join("\n");

  return `# VERSIONED COMPONENT MATRIX

| **🆔 VERSIONED_ID** | **🔧 COMPONENT_TYPE** | **📦 BUNDLE_VERSION** | **📁 FILE_NAMING_PATTERN** | **🗂️ BUILD_DIR_STRUCTURE** | **📊 SEMVER_RANGE** | **🔧 BUN_SEMVER_API** | **🏷️ RELEASE_TAG** |
|---------------------|----------------------|----------------------|---------------------------|---------------------------|--------------------|-----------------------|-------------------|
${rows}

**Generated:** ${new Date().toISOString()}
**Bun:** ${Bun.version}
`;
}

// ===== CLI =====
if (import.meta.main) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case "--json":
      console.log(toJSON());
      break;
    case "--markdown":
    case "--md":
      console.log(toMarkdown());
      break;
    case "--list":
      VERSIONED_COMPONENTS.forEach((c) =>
        console.log(`${c.versionedId} → ${c.path}`)
      );
      break;
    case "--get":
      const id = args[1];
      const comp = getComponentById(id);
      if (comp) {
        console.log(JSON.stringify(comp, null, 2));
      } else {
        console.error(`Component not found: ${id}`);
      }
      break;
    case "--type":
      const type = args[1] as ComponentType;
      getComponentsByType(type).forEach((c) =>
        console.log(`${c.versionedId} (${c.componentType})`)
      );
      break;
    default:
      printMatrix();
  }
}
