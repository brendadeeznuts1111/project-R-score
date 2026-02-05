/**
 * src/debugger/visual-debugger.ts
 * Visual Debugger with Chrome DevTools Integration
 * - Launch Chrome DevTools for visual debugging
 * - Source map generation
 * - Auto-open DevTools URL
 * - Suggested breakpoints
 * - Cross-platform browser launch
 */

// =============================================================================
// Types
// =============================================================================

export interface VisualDebugOptions {
  port?: number; // Debug port (default: 9229)
  autoOpen?: boolean; // Auto-open Chrome DevTools (default: true)
  watch?: boolean; // Watch mode (default: false)
  autoBreak?: boolean; // Set initial breakpoints (default: false)
  sourceMaps?: boolean; // Generate source maps (default: true)
}

export interface Breakpoint {
  file: string;
  line: number;
  reason: string;
}

// =============================================================================
// VisualDebugger Class
// =============================================================================

export class VisualDebugger {
  private static readonly DEFAULT_PORT = 9229;

  /**
   * Launch Chrome DevTools for visual debugging
   */
  static async launchDevTools(
    skillId: string,
    options: VisualDebugOptions = {}
  ): Promise<void> {
    const {
      port = this.DEFAULT_PORT,
      autoOpen = true,
      watch = false,
      autoBreak = false,
      sourceMaps = true,
    } = options;

    const skillPath = `./skills/${skillId}`;
    const debugOutDir = `${skillPath}/.debug`;

    console.log(`Starting visual debug session for: ${skillId}`);
    console.log(`Debug port: ${port}`);
    console.log("");

    // Build with source maps
    if (sourceMaps) {
      console.log("Building with source maps...");
      await this.buildWithSourceMaps(skillId, debugOutDir);
    }

    // Prepare inspector args
    const inspectorArgs = [`--inspect=${port}`];

    if (watch) {
      inspectorArgs.push("--watch");
    }

    // Entry point (relative to skillPath since cwd is skillPath)
    const entryPoint = sourceMaps ? `.debug/index.js` : `src/index.ts`;

    console.log(`Entry point: ${skillPath}/${entryPoint}`);
    console.log("");

    // Create standalone terminal (Bun v1.3.5+ API)
    const terminal = new (Bun as any).Terminal({
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      data: (term: any, data: Uint8Array) => {
        const output = new TextDecoder().decode(data);

        // Look for debugger URL
        if (output.includes("Debugger listening on")) {
          const wsUrl = output.match(
            /ws:\/\/127\.0\.0\.1:\d+\/[a-f0-9-]+/
          )?.[0];

          if (wsUrl && autoOpen) {
            console.log("\nOpening Chrome DevTools...");
            this.openChromeDevTools(wsUrl);
          }
        }

        process.stdout.write(data);
      },
    });

    // Spawn with the standalone terminal
    const proc = Bun.spawn(["node", ...inspectorArgs, entryPoint], {
      terminal,
      cwd: skillPath,
      env: {
        ...process.env,
        NODE_OPTIONS: "--enable-source-maps",
        SKILL_DEBUG: "true",
        NODE_ENV: "development",
      },
    });

    // Auto-set breakpoints
    if (autoBreak) {
      setTimeout(async () => {
        const breakpoints = await this.findRecommendedBreakpoints(skillId);
        console.log("\nRecommended breakpoints:");
        for (const bp of breakpoints) {
          console.log(`  ${bp.file}:${bp.line} - ${bp.reason}`);
        }
      }, 2000);
    }

    // Handle terminal resize
    const resizeHandler = () => {
      terminal.resize(process.stdout.columns, process.stdout.rows);
    };
    process.stdout.on("resize", resizeHandler);

    // Forward stdin if TTY
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const stdinHandler = (chunk: Buffer) => {
        terminal.write(chunk);
      };
      process.stdin.on("data", stdinHandler);

      await proc.exited;

      process.stdin.removeListener("data", stdinHandler);
      process.stdin.setRawMode(false);
    } else {
      await proc.exited;
    }

    process.stdout.removeListener("resize", resizeHandler);
    terminal.close();

    console.log("\nDebug session ended");
  }

  /**
   * Build skill with source maps
   */
  private static async buildWithSourceMaps(
    skillId: string,
    outDir: string
  ): Promise<void> {
    const skillPath = `./skills/${skillId}`;

    const result = await Bun.build({
      entrypoints: [`${skillPath}/src/index.ts`],
      outdir: outDir,
      target: "node",
      sourcemap: "external",
      minify: false,
      naming: "[name].[ext]",
      define: {
        "process.env.NODE_ENV": '"development"',
        "process.env.DEBUG": '"true"',
      },
    });

    if (!result.success) {
      console.error("Build failed:");
      result.logs.forEach((log) => console.error(log));
      throw new Error("Build failed");
    }

    console.log("Build complete with source maps");
  }

  /**
   * Open Chrome DevTools for a WebSocket URL
   */
  private static openChromeDevTools(wsUrl: string): void {
    const devtoolsUrl = `devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=${wsUrl.replace("ws://", "")}`;

    console.log(`DevTools URL: ${devtoolsUrl}`);

    // Platform-specific browser launch
    const platform = process.platform;

    try {
      if (platform === "darwin") {
        // macOS
        Bun.spawn(["open", "-a", "Google Chrome", devtoolsUrl], {
          stdout: "ignore",
          stderr: "ignore",
        });
      } else if (platform === "linux") {
        // Linux - try various browsers
        const browsers = [
          "google-chrome",
          "chromium-browser",
          "chromium",
          "google-chrome-stable",
        ];

        for (const browser of browsers) {
          try {
            Bun.spawn([browser, devtoolsUrl], {
              stdout: "ignore",
              stderr: "ignore",
            });
            break;
          } catch {
            continue;
          }
        }
      } else if (platform === "win32") {
        // Windows
        Bun.spawn(["cmd", "/c", "start", devtoolsUrl], {
          stdout: "ignore",
          stderr: "ignore",
        });
      }
    } catch (error) {
      console.log("Could not auto-open browser. Please open manually:");
      console.log(devtoolsUrl);
    }
  }

  /**
   * Find recommended breakpoints in skill source
   */
  static async findRecommendedBreakpoints(
    skillId: string
  ): Promise<Breakpoint[]> {
    const skillPath = `./skills/${skillId}/src/index.ts`;
    const breakpoints: Breakpoint[] = [];

    try {
      const content = await Bun.file(skillPath).text();
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Main function entry
        if (
          line.includes("async") &&
          (line.includes("execute") ||
            line.includes("main") ||
            line.includes("run"))
        ) {
          breakpoints.push({
            file: "index.ts",
            line: lineNum,
            reason: "Main entry point",
          });
        }

        // Error handling
        if (line.includes("throw ") || line.includes("throw(")) {
          breakpoints.push({
            file: "index.ts",
            line: lineNum,
            reason: "Error throw site",
          });
        }

        // API calls
        if (
          line.includes("fetch(") ||
          line.includes("await fetch") ||
          line.includes(".get(") ||
          line.includes(".post(")
        ) {
          breakpoints.push({
            file: "index.ts",
            line: lineNum,
            reason: "External API call",
          });
        }

        // Console output
        if (line.includes("console.log") || line.includes("console.error")) {
          breakpoints.push({
            file: "index.ts",
            line: lineNum,
            reason: "Console output",
          });
        }

        // Process args
        if (line.includes("process.argv") || line.includes("parseArgs")) {
          breakpoints.push({
            file: "index.ts",
            line: lineNum,
            reason: "Argument parsing",
          });
        }
      }

      // Limit to top 10 most relevant
      return breakpoints.slice(0, 10);
    } catch {
      return [];
    }
  }

  /**
   * Generate a debugger launch configuration
   */
  static generateLaunchConfig(skillId: string, port = 9229): object {
    return {
      version: "0.2.0",
      configurations: [
        {
          name: `Debug ${skillId}`,
          type: "node",
          request: "launch",
          runtimeExecutable: "bun",
          runtimeArgs: ["run", `./skills/${skillId}/src/index.ts`],
          console: "integratedTerminal",
          internalConsoleOptions: "neverOpen",
          sourceMaps: true,
          outFiles: [`\${workspaceFolder}/skills/${skillId}/.debug/**/*.js`],
          env: {
            NODE_ENV: "development",
            SKILL_DEBUG: "true",
          },
        },
        {
          name: `Attach to ${skillId}`,
          type: "node",
          request: "attach",
          port,
          address: "localhost",
          sourceMaps: true,
          localRoot: "${workspaceFolder}",
          remoteRoot: "${workspaceFolder}",
        },
      ],
    };
  }

  /**
   * Get the inspector URL for an already running process
   */
  static async getInspectorUrl(port = 9229): Promise<string | null> {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      const data = (await response.json()) as Array<{ webSocketDebuggerUrl?: string }>;

      if (data.length > 0 && data[0].webSocketDebuggerUrl) {
        return data[0].webSocketDebuggerUrl;
      }
    } catch {
      // Inspector not available
    }

    return null;
  }
}

export default VisualDebugger;
