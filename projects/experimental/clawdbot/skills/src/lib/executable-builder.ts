/**
 * src/lib/executable-builder.ts
 * Executable Builder for creating standalone skill binaries
 * - Multi-platform support (Linux, macOS, Windows)
 * - Runtime bundling for standalone executables
 * - Code signing (macOS)
 * - Compression and caching
 * - Docker and installer support
 */

import { Database } from "bun:sqlite";
import * as os from "os";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildOptions {
  target?: BuildTarget;
  outputDir?: string;
  compress?: boolean;
  includeRuntime?: boolean;
  minify?: boolean;
  sourcemap?: boolean | "inline" | "external";
  bundleDependencies?: boolean;
  runtimeVersion?: string;
  executablePath?: string;
  icon?: string | Buffer;
  metadata?: Record<string, any>;
  strip?: boolean;
  debug?: boolean;
  signing?: {
    identity?: string;
    keychain?: string;
    entitlements?: string;
  };
}

export type BuildTarget =
  | "bun-linux-x64"
  | "bun-linux-arm64"
  | "bun-macos-x64"
  | "bun-macos-arm64"
  | "bun-windows-x64"
  | "node-linux-x64"
  | "node-linux-arm64"
  | "node-macos-x64"
  | "node-macos-arm64"
  | "node-windows-x64"
  | "standalone";

export interface BuildResult {
  success: boolean;
  executablePath: string;
  bundlePath?: string;
  size: number;
  compressedSize?: number;
  metadata: {
    target: BuildTarget;
    platform: string;
    arch: string;
    bunVersion: string;
    nodeVersion?: string;
    buildTime: string;
    checksum: string;
    dependencies: string[];
  };
  stats: {
    buildTime: number;
    memoryUsage: number;
    bundleFiles: number;
    totalSize: number;
  };
  logs: string[];
}

export interface SkillConfig {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  enabled?: boolean;
  priority?: string;
  autoUpdate?: boolean;
  settings?: Record<string, any>;
  requires?: string[];
  tags?: string[];
  type?: string;
  commands?: Record<string, string>;
  health?: number;
  lastUsed?: string;
  installedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function runCommand(
  cmd: string[],
  options: { cwd?: string; silent?: boolean } = {}
): { success: boolean; stdout: string; stderr: string } {
  const result = Bun.spawnSync(cmd, {
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    success: result.exitCode === 0,
    stdout: result.stdout?.toString() || "",
    stderr: result.stderr?.toString() || "",
  };
}

async function ensureDir(dir: string): Promise<void> {
  const result = Bun.spawnSync(["mkdir", "-p", dir]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to create directory: ${dir}`);
  }
}

async function removeDir(dir: string): Promise<void> {
  Bun.spawnSync(["rm", "-rf", dir]);
}

async function copyFile(src: string, dest: string): Promise<void> {
  const result = Bun.spawnSync(["cp", src, dest]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to copy ${src} to ${dest}`);
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  const result = Bun.spawnSync(["cp", "-r", src, dest]);
  if (result.exitCode !== 0) {
    throw new Error(`Failed to copy directory ${src} to ${dest}`);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  return Bun.file(filePath).exists();
}

async function listFiles(dir: string): Promise<string[]> {
  const result = Bun.spawnSync(["find", dir, "-type", "f"]);
  if (result.exitCode !== 0) return [];
  return result.stdout
    .toString()
    .split("\n")
    .filter((f) => f.trim());
}

// ═══════════════════════════════════════════════════════════════════════════
// ExecutableBuilder Class
// ═══════════════════════════════════════════════════════════════════════════

export class ExecutableBuilder {
  private buildCache: Database;
  private cacheDir: string;
  private runtimeCache: Map<string, Uint8Array> = new Map();

  constructor(options: { cacheDir?: string } = {}) {
    this.cacheDir = options.cacheDir || "./.build-cache";
    Bun.spawnSync(["mkdir", "-p", this.cacheDir]);

    // Initialize build cache database
    this.buildCache = new Database(`${this.cacheDir}/builds.db`);
    this.initCache();
  }

  private initCache(): void {
    this.buildCache.run(`
      CREATE TABLE IF NOT EXISTS builds (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        target TEXT NOT NULL,
        version TEXT NOT NULL,
        executable_path TEXT NOT NULL,
        size INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        build_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT NOT NULL
      )
    `);

    this.buildCache.run(`
      CREATE INDEX IF NOT EXISTS idx_skill_target ON builds(skill_id, target)
    `);

    this.buildCache.run(`
      CREATE INDEX IF NOT EXISTS idx_checksum ON builds(checksum)
    `);

    this.buildCache.run(`
      CREATE TABLE IF NOT EXISTS runtimes (
        id TEXT PRIMARY KEY,
        target TEXT NOT NULL,
        version TEXT NOT NULL,
        path TEXT NOT NULL,
        checksum TEXT NOT NULL,
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(target, version)
      )
    `);
  }

  /**
   * Build a standalone executable for a skill
   */
  async buildSkillExecutable(
    skillId: string,
    options: BuildOptions = {}
  ): Promise<BuildResult> {
    const startTime = performance.now();
    const logs: string[] = [];

    // Default options - filter out undefined values from options
    const cleanOptions = Object.fromEntries(
      Object.entries(options).filter(([_, v]) => v !== undefined)
    );

    const opts: BuildOptions = {
      target: this.detectTarget(),
      outputDir: "./dist",
      compress: true,
      includeRuntime: true,
      minify: true,
      sourcemap: false,
      bundleDependencies: true,
      debug: false,
      ...cleanOptions,
    };

    const skill = await this.loadSkill(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    logs.push(`Building executable for: ${skill.name} v${skill.version}`);
    logs.push(`Target: ${opts.target}`);
    logs.push(`Output: ${opts.outputDir}`);

    // Check cache first
    const cacheKey = this.getCacheKey(skillId, skill.version, opts);
    const cached = await this.checkCache(cacheKey);

    if (cached && !opts.debug) {
      logs.push(
        `Using cached build from ${new Date(cached.build_time).toLocaleString()}`
      );
      return {
        success: true,
        executablePath: cached.executable_path,
        size: cached.size,
        metadata: JSON.parse(cached.metadata),
        stats: {
          buildTime: 0,
          memoryUsage: 0,
          bundleFiles: 0,
          totalSize: cached.size,
        },
        logs,
      };
    }

    // Prepare build directory
    const buildId = crypto.randomUUID().slice(0, 8);
    const buildDir = `${this.cacheDir}/build-${buildId}`;
    await removeDir(buildDir);
    await ensureDir(buildDir);

    try {
      // 1. Prepare the skill bundle
      const bundle = await this.prepareSkillBundle(skill, buildDir, opts);
      logs.push(`Bundle prepared: ${bundle.files.length} files`);

      // 2. Build the main executable
      const buildResult = await this.buildExecutable(
        skill,
        bundle,
        buildDir,
        opts
      );
      logs.push(...buildResult.logs);

      // 3. Package with runtime if needed
      let executablePath = buildResult.executablePath;

      if (opts.includeRuntime && opts.target?.startsWith("bun-")) {
        const bundledPath = await this.bundleWithRuntime(executablePath, opts);
        if (bundledPath !== executablePath) {
          executablePath = bundledPath;
          logs.push(`Runtime bundled: ${executablePath}`);
        }
      }

      // 4. Add metadata
      await this.addMetadata(executablePath, skill, opts);
      logs.push(`Metadata embedded`);

      // 5. Compress if requested
      let compressedSize: number | undefined;
      if (opts.compress) {
        const compressed = await this.compressExecutable(executablePath);
        compressedSize = compressed.size;
        executablePath = compressed.path;
        logs.push(`Compressed: ${compressed.ratio.toFixed(2)}x ratio`);
      }

      // 6. Code signing (macOS only)
      if (process.platform === "darwin" && opts.signing?.identity) {
        await this.signExecutable(executablePath, opts.signing);
        logs.push(`Code signed`);
      }

      // 7. Calculate checksum
      const checksum = await this.calculateChecksum(executablePath);
      logs.push(`Checksum: ${checksum.slice(0, 16)}...`);

      // 8. Move to final location
      const finalPath = await this.moveToFinalLocation(
        executablePath,
        skill,
        opts,
        buildId
      );

      // 9. Get final size
      const finalSize = (await Bun.file(finalPath).stat()).size;

      // 10. Update cache
      const buildTime = performance.now() - startTime;
      await this.updateCache(
        cacheKey,
        skill,
        finalPath,
        checksum,
        opts,
        buildTime
      );

      const result: BuildResult = {
        success: true,
        executablePath: finalPath,
        bundlePath: bundle.path,
        size: finalSize,
        compressedSize,
        metadata: {
          target: opts.target!,
          platform: this.getPlatform(opts.target!),
          arch: this.getArch(opts.target!),
          bunVersion: Bun.version,
          buildTime: new Date().toISOString(),
          checksum,
          dependencies: skill.dependencies || [],
        },
        stats: {
          buildTime,
          memoryUsage: process.memoryUsage().heapUsed,
          bundleFiles: bundle.files.length,
          totalSize: bundle.totalSize,
        },
        logs,
      };

      logs.push(`Build completed in ${(buildTime / 1000).toFixed(2)}s`);
      logs.push(`Final size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);

      // Cleanup
      await removeDir(buildDir);

      return result;
    } catch (error: any) {
      logs.push(`Build failed: ${error.message}`);
      await removeDir(buildDir);

      return {
        success: false,
        executablePath: "",
        size: 0,
        metadata: {
          target: opts.target!,
          platform: "",
          arch: "",
          bunVersion: Bun.version,
          buildTime: new Date().toISOString(),
          checksum: "",
          dependencies: [],
        },
        stats: {
          buildTime: performance.now() - startTime,
          memoryUsage: 0,
          bundleFiles: 0,
          totalSize: 0,
        },
        logs,
      };
    }
  }

  /**
   * Build executables for multiple targets
   */
  async buildMultiTarget(
    skillId: string,
    targets: BuildTarget[],
    options: Omit<BuildOptions, "target"> = {}
  ): Promise<Map<BuildTarget, BuildResult>> {
    const results = new Map<BuildTarget, BuildResult>();
    const errors: string[] = [];

    // Build in parallel with concurrency limit
    const concurrency = 3;
    const queue = [...targets];

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);

      await Promise.all(
        batch.map(async (target) => {
          try {
            const result = await this.buildSkillExecutable(skillId, {
              ...options,
              target,
            });

            results.set(target, result);
          } catch (error: any) {
            errors.push(`${target}: ${error.message}`);
            results.set(target, {
              success: false,
              executablePath: "",
              size: 0,
              metadata: {
                target,
                platform: "",
                arch: "",
                bunVersion: Bun.version,
                buildTime: new Date().toISOString(),
                checksum: "",
                dependencies: [],
              },
              stats: {
                buildTime: 0,
                memoryUsage: 0,
                bundleFiles: 0,
                totalSize: 0,
              },
              logs: [`Failed: ${error.message}`],
            });
          }
        })
      );
    }

    if (errors.length > 0) {
      console.warn("Some builds failed:", errors);
    }

    return results;
  }

  /**
   * Create a portable app bundle (macOS .app, Windows folder)
   */
  async createAppBundle(
    skillId: string,
    appName: string,
    options: BuildOptions & {
      bundleResources?: string[];
      plist?: Record<string, any>;
      manifest?: Record<string, any>;
      installer?: boolean;
    } = {}
  ): Promise<string> {
    const skill = await this.loadSkill(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // Build the executable first
    const buildResult = await this.buildSkillExecutable(skillId, options);
    if (!buildResult.success) {
      throw new Error("Failed to build executable");
    }

    const platform = this.getPlatform(options.target || this.detectTarget());
    const bundleDir = `${options.outputDir || "./dist"}/${appName}`;

    await removeDir(bundleDir);

    switch (platform) {
      case "darwin":
        return await this.createMacOSAppBundle(
          appName,
          buildResult.executablePath,
          bundleDir,
          skill,
          options
        );

      case "win32":
        return await this.createWindowsAppBundle(
          appName,
          buildResult.executablePath,
          bundleDir,
          skill,
          options
        );

      case "linux":
        return await this.createLinuxAppBundle(
          appName,
          buildResult.executablePath,
          bundleDir,
          skill,
          options
        );

      default:
        throw new Error(`Unsupported platform for app bundle: ${platform}`);
    }
  }

  /**
   * Build a skill into a Docker container
   */
  async buildDockerImage(
    skillId: string,
    options: {
      imageName?: string;
      tag?: string;
      dockerfile?: string;
      platforms?: string[];
      push?: boolean;
      registry?: string;
    } = {}
  ): Promise<string> {
    const skill = await this.loadSkill(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const imageName = options.imageName || skill.name.toLowerCase();
    const tag = options.tag || skill.version;
    const fullImageName = options.registry
      ? `${options.registry}/${imageName}:${tag}`
      : `${imageName}:${tag}`;

    // Create Dockerfile if not provided
    const dockerfile =
      options.dockerfile || this.generateDockerfile(skill);

    // Build for Linux x64
    const buildResult = await this.buildSkillExecutable(skillId, {
      target: "bun-linux-x64",
      includeRuntime: false,
      compress: false,
    });

    if (!buildResult.success) {
      throw new Error("Failed to build executable for Docker");
    }

    // Create temporary build context
    const contextDir = `${this.cacheDir}/docker-${crypto.randomUUID().slice(0, 8)}`;
    await ensureDir(contextDir);

    try {
      // Copy executable and Dockerfile
      await Bun.write(`${contextDir}/Dockerfile`, dockerfile);
      await copyFile(buildResult.executablePath, `${contextDir}/app`);
      Bun.spawnSync(["chmod", "+x", `${contextDir}/app`]);

      // Add skill resources if any
      const skillDir = `./skills/${skillId}`;
      if (await fileExists(skillDir)) {
        await copyDir(skillDir, `${contextDir}/skill-data`);
      }

      // Build Docker image
      console.log(`Building Docker image: ${fullImageName}`);

      const buildCmd = [
        "docker",
        "build",
        "-t",
        fullImageName,
        contextDir,
      ];

      const result = runCommand(buildCmd);
      if (!result.success) {
        throw new Error(`Docker build failed: ${result.stderr}`);
      }

      if (options.push) {
        console.log(`Pushing to registry: ${fullImageName}`);
        const pushResult = runCommand(["docker", "push", fullImageName]);
        if (!pushResult.success) {
          throw new Error(`Docker push failed: ${pushResult.stderr}`);
        }
      }

      console.log(`Docker image built: ${fullImageName}`);
      return fullImageName;
    } finally {
      await removeDir(contextDir);
    }
  }

  /**
   * Create cross-platform installers
   */
  async createInstaller(
    skillId: string,
    options: {
      outputDir?: string;
      formats?: ("deb" | "rpm" | "msi" | "dmg" | "appimage")[];
      company?: string;
      license?: string;
    } = {}
  ): Promise<string[]> {
    const skill = await this.loadSkill(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const formats = options.formats || this.detectPlatformFormats();
    const installers: string[] = [];
    const outputDir = options.outputDir || "./dist/installers";
    await ensureDir(outputDir);

    for (const format of formats) {
      try {
        const installerPath = await this.buildInstallerFormat(
          skill,
          format,
          outputDir,
          options
        );
        installers.push(installerPath);
        console.log(`${format.toUpperCase()} installer: ${installerPath}`);
      } catch (error: any) {
        console.warn(`Failed to build ${format} installer:`, error.message);
      }
    }

    return installers;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private async loadSkill(skillId: string): Promise<SkillConfig | null> {
    const skillPath = `./skills/${skillId}`;
    const skillJson = `${skillPath}/skill.json`;
    const configJson = `${skillPath}/config.jsonc`;

    if (!(await fileExists(skillJson))) {
      return null;
    }

    const skill = JSON.parse(await Bun.file(skillJson).text());

    let config: Partial<SkillConfig> = {};
    if (await fileExists(configJson)) {
      const configText = await Bun.file(configJson).text();
      config = Bun.JSONC.parse(configText);
    }

    return {
      id: skill.id || skillId,
      name: skill.name,
      version: skill.version,
      description: skill.description,
      author: skill.author,
      dependencies: skill.dependencies || [],
      enabled: config.enabled ?? true,
      priority: config.priority || "medium",
      autoUpdate: config.autoUpdate ?? false,
      settings: config.settings || {},
      requires: config.requires || [],
      tags: config.tags || [],
      type: config.type || "utility",
      commands: config.commands || {},
      health: config.health || 100,
      lastUsed: config.lastUsed,
      installedAt: config.installedAt || new Date().toISOString(),
    };
  }

  private detectTarget(): BuildTarget {
    const platform = process.platform;
    const arch = process.arch;

    if (platform === "darwin") {
      return arch === "arm64" ? "bun-macos-arm64" : "bun-macos-x64";
    } else if (platform === "linux") {
      return arch === "arm64" ? "bun-linux-arm64" : "bun-linux-x64";
    } else if (platform === "win32") {
      return "bun-windows-x64";
    }

    return "bun-linux-x64";
  }

  private getCacheKey(
    skillId: string,
    version: string,
    options: BuildOptions
  ): string {
    return Bun.hash
      .crc32(`${skillId}:${version}:${JSON.stringify(options)}`)
      .toString(16);
  }

  private async checkCache(cacheKey: string): Promise<any> {
    const cached = this.buildCache
      .query("SELECT * FROM builds WHERE id = ?")
      .get(cacheKey) as any;

    if (!cached) return null;

    // Check if executable still exists
    if (!(await fileExists(cached.executable_path))) {
      this.buildCache.run("DELETE FROM builds WHERE id = ?", [cacheKey]);
      return null;
    }

    // Verify checksum
    const currentChecksum = await this.calculateChecksum(cached.executable_path);
    if (currentChecksum !== cached.checksum) {
      this.buildCache.run("DELETE FROM builds WHERE id = ?", [cacheKey]);
      return null;
    }

    return cached;
  }

  private async prepareSkillBundle(
    skill: SkillConfig,
    buildDir: string,
    options: BuildOptions
  ): Promise<{ path: string; files: string[]; totalSize: number }> {
    const skillDir = `./skills/${skill.id}`;
    const bundleFiles: string[] = [];
    let totalSize = 0;

    await ensureDir(`${buildDir}/skill`);

    // Collect all files
    const files = await listFiles(skillDir);
    for (const entry of files) {
      const relativePath = entry.replace(`${skillDir}/`, "");

      // Skip build artifacts and node_modules
      if (
        relativePath.includes("node_modules/") ||
        relativePath.includes(".git/") ||
        relativePath.includes("dist/") ||
        relativePath.endsWith(".map")
      ) {
        continue;
      }

      bundleFiles.push(relativePath);

      const stats = await Bun.file(entry).stat();
      totalSize += stats.size || 0;

      // Copy to build directory
      const destPath = `${buildDir}/skill/${relativePath}`;
      await ensureDir(path.dirname(destPath));
      await copyFile(entry, destPath);
    }

    // Create entry point wrapper
    await this.createEntryPoint(skill, buildDir, options);
    bundleFiles.push("index.js");

    return {
      path: `${buildDir}/skill`,
      files: bundleFiles,
      totalSize,
    };
  }

  private async createEntryPoint(
    skill: SkillConfig,
    buildDir: string,
    _options: BuildOptions
  ): Promise<string> {
    const entryTemplate = `#!/usr/bin/env node
'use strict';

// Skill: ${skill.name}
// Version: ${skill.version}
// Built: ${new Date().toISOString()}

const { performance } = require('perf_hooks');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Load skill configuration
const configPath = join(__dirname, 'skill', 'config.jsonc');
let config = {};
try {
  if (existsSync(configPath)) {
    const configText = readFileSync(configPath, 'utf8');
    // Simple JSONC parser (strip comments)
    const jsonText = configText
      .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')
      .replace(/\\/\\/.*$/gm, '');
    config = JSON.parse(jsonText);
  }
} catch (err) {
  // Use default config
}

// Try to import the skill
let SkillModule;
const possiblePaths = [
  join(__dirname, 'skill', 'index.js'),
  join(__dirname, 'skill', 'index.ts'),
  join(__dirname, 'skill', 'main.js'),
  join(__dirname, 'skill', 'main.ts'),
];

for (const skillPath of possiblePaths) {
  try {
    if (existsSync(skillPath)) {
      SkillModule = require(skillPath);
      break;
    }
  } catch (err) {
    // Try next path
  }
}

if (!SkillModule) {
  console.error('Failed to load skill: No entry point found');
  process.exit(1);
}

const SkillClass = SkillModule.default || SkillModule;

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    command: 'help',
    args: [],
    options: {},
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];

      if (next && !next.startsWith('-')) {
        result.options[key] = next;
        i++;
      } else {
        result.options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      result.options[key] = true;
    } else if (!result.command || result.command === 'help') {
      result.command = arg;
    } else {
      result.args.push(arg);
    }
  }

  return result;
}

// Show help
function showHelp() {
  console.log(\`
${skill.name} v${skill.version}
${skill.description || ''}

Usage: ${skill.name} <command> [args...] [options]

Commands:\`);

  const commands = ${JSON.stringify(skill.commands || {})};
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(\`  \${cmd.padEnd(20)} \${desc}\`);
  });

  console.log(\`
Options:
  --help, -h           Show this help
  --version, -v        Show version
  --debug              Enable debug mode
  --json               Output as JSON
\`);
}

// Execute the skill
async function execute() {
  const { command, args, options } = parseArgs();

  if (options.help || options.h || command === 'help') {
    showHelp();
    return;
  }

  if (options.version || options.v) {
    console.log('${skill.version}');
    return;
  }

  let skillInstance;

  if (typeof SkillClass === 'function') {
    skillInstance = new SkillClass({ ...config, ...options });
  } else {
    skillInstance = SkillClass;
  }

  if (!skillInstance[command] && typeof skillInstance.execute !== 'function' && typeof skillInstance.run !== 'function') {
    console.error(\`Unknown command: \${command}\`);
    showHelp();
    process.exit(1);
  }

  const startTime = performance.now();

  try {
    let result;

    if (skillInstance[command]) {
      result = await skillInstance[command](...args);
    } else if (skillInstance.execute) {
      result = await skillInstance.execute(command, ...args);
    } else if (skillInstance.run) {
      result = await skillInstance.run(command, ...args);
    }

    const endTime = performance.now();

    if (options.json && result) {
      result._metadata = {
        executionTime: endTime - startTime,
        command,
        timestamp: new Date().toISOString(),
        skill: '${skill.name}',
        version: '${skill.version}',
      };
      console.log(JSON.stringify(result, null, 2));
    } else if (result !== undefined) {
      if (typeof result === 'object') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result);
      }
    }

  } catch (error) {
    console.error(\`Command failed: \${error.message}\`);

    if (options.debug || config.debug) {
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Handle signals
process.on('SIGINT', () => {
  console.log('\\nInterrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\nTerminated');
  process.exit(0);
});

// Run the skill
if (require.main === module) {
  execute().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = SkillClass;
`;

    const entryPath = `${buildDir}/index.js`;
    await Bun.write(entryPath, entryTemplate);
    Bun.spawnSync(["chmod", "+x", entryPath]);

    return entryPath;
  }

  private async buildExecutable(
    skill: SkillConfig,
    bundle: { path: string; files: string[]; totalSize: number },
    buildDir: string,
    options: BuildOptions
  ): Promise<{ executablePath: string; logs: string[] }> {
    const logs: string[] = [];

    // Find the skill's actual entry point (TypeScript source preferred)
    const skillDir = `./skills/${skill.id}`;
    const possibleEntryPoints = [
      skill.entrypoint ? `${skillDir}/${skill.entrypoint}` : null,
      `${skillDir}/src/index.ts`,
      `${skillDir}/src/main.ts`,
      `${skillDir}/index.ts`,
      `${skillDir}/main.ts`,
      `${skillDir}/src/index.js`,
      `${skillDir}/index.js`,
    ].filter(Boolean) as string[];

    let entryPoint: string | null = null;
    for (const ep of possibleEntryPoints) {
      if (await Bun.file(ep).exists()) {
        entryPoint = ep;
        break;
      }
    }

    if (!entryPoint) {
      throw new Error(`No entry point found for skill: ${skill.id}`);
    }

    logs.push(`Building with Bun v${Bun.version}`);
    logs.push(`Entry point: ${entryPoint}`);

    // Determine output filename based on target
    const isWindows = options.target?.includes("windows");
    const executableName = isWindows ? `${skill.id}.exe` : skill.id;
    const executablePath = `${buildDir}/${executableName}`;

    // Use bun build --compile for native executables
    const args = [
      "build",
      "--compile",
      entryPoint,
      `--outfile=${executablePath}`,
    ];

    // Add cross-compilation target if specified
    if (options.target && options.target.startsWith("bun-")) {
      args.push(`--target=${options.target}`);
      logs.push(`Cross-compiling for: ${options.target}`);
    }

    // Add minification
    if (options.minify) {
      args.push("--minify");
    }

    // Add sourcemap if requested
    if (options.sourcemap) {
      args.push("--sourcemap=external");
    }

    logs.push(`Running: bun ${args.join(" ")}`);

    const result = Bun.spawnSync(["bun", ...args], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        SKILL_ID: skill.id,
        SKILL_VERSION: skill.version,
        SKILL_BUILD: new Date().toISOString(),
      },
    });

    if (result.exitCode !== 0) {
      const stderr = result.stderr?.toString() || "Unknown error";
      logs.push(`Build failed: ${stderr}`);
      throw new Error(`Build failed: ${stderr}`);
    }

    const stdout = result.stdout?.toString() || "";
    if (stdout) {
      logs.push(stdout.trim());
    }

    // Verify the executable was created
    const execFile = Bun.file(executablePath);
    if (!(await execFile.exists())) {
      throw new Error(`Executable not created: ${executablePath}`);
    }

    const size = (await execFile.stat()).size;
    logs.push(`Executable created: ${executablePath} (${(size / 1024 / 1024).toFixed(2)} MB)`);

    return {
      executablePath,
      logs,
    };
  }

  private async bundleWithRuntime(
    executablePath: string,
    options: BuildOptions
  ): Promise<string> {
    // Runtime is now bundled via bun build --compile --target
    // No additional bundling needed
    return executablePath;
  }

  private async addMetadata(
    executablePath: string,
    skill: SkillConfig,
    options: BuildOptions
  ): Promise<void> {
    const metadata = {
      skill: {
        id: skill.id,
        name: skill.name,
        version: skill.version,
        description: skill.description,
        author: skill.author,
        built: new Date().toISOString(),
        target: options.target,
      },
      build: {
        bunVersion: Bun.version,
        buildTime: new Date().toISOString(),
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      ...options.metadata,
    };

    const metadataPath = executablePath + ".meta.json";
    await Bun.write(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async compressExecutable(
    executablePath: string
  ): Promise<{ path: string; size: number; ratio: number }> {
    const file = Bun.file(executablePath);
    const originalSize = (await file.stat()).size;
    const compressedPath = executablePath + ".gz";

    // Use gzip compression
    const data = await file.arrayBuffer();
    const compressed = Bun.gzipSync(new Uint8Array(data));

    await Bun.write(compressedPath, compressed);

    const compressedSize = compressed.length;
    const ratio = originalSize / compressedSize;

    return {
      path: compressedPath,
      size: compressedSize,
      ratio,
    };
  }

  private async signExecutable(
    executablePath: string,
    signing: BuildOptions["signing"]
  ): Promise<void> {
    if (process.platform !== "darwin" || !signing?.identity) {
      return;
    }

    try {
      const signCmd = [
        "codesign",
        "--force",
        "--sign",
        signing.identity,
        executablePath,
      ];

      if (signing.entitlements) {
        signCmd.push("--entitlements", signing.entitlements);
      }

      const result = runCommand(signCmd);
      if (!result.success) {
        console.warn("Code signing failed:", result.stderr);
      }
    } catch (error: any) {
      console.warn("Code signing failed:", error.message);
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const file = Bun.file(filePath);
    const data = await file.arrayBuffer();
    return Bun.hash.crc32(new Uint8Array(data)).toString(16);
  }

  private async moveToFinalLocation(
    executablePath: string,
    skill: SkillConfig,
    options: BuildOptions,
    _buildId: string
  ): Promise<string> {
    const outputDir = options.outputDir || "./dist";
    const platform = this.getPlatform(options.target || this.detectTarget());
    const arch = this.getArch(options.target || this.detectTarget());

    await ensureDir(outputDir);

    let finalName = `${skill.name}-${platform}-${arch}`;

    if (platform === "win32") {
      finalName += ".cmd";
    }

    if (executablePath.endsWith(".gz")) {
      finalName += ".gz";
    }

    const finalPath = `${outputDir}/${finalName}`;

    // Move the executable
    Bun.spawnSync(["mv", executablePath, finalPath]);

    // Also move the executable package if it exists
    const pkgDir = path.dirname(executablePath) + "/executable-pkg";
    if (await fileExists(pkgDir)) {
      const pkgDest = `${outputDir}/${skill.name}-${platform}-${arch}-pkg`;
      await removeDir(pkgDest);
      Bun.spawnSync(["mv", pkgDir, pkgDest]);
    }

    // Move metadata
    const metaPath = executablePath.replace(".gz", "") + ".meta.json";
    if (await fileExists(metaPath)) {
      Bun.spawnSync([
        "mv",
        metaPath,
        `${outputDir}/${skill.name}-${platform}-${arch}.meta.json`,
      ]);
    }

    return finalPath;
  }

  private async updateCache(
    cacheKey: string,
    skill: SkillConfig,
    executablePath: string,
    checksum: string,
    options: BuildOptions,
    buildTime: number
  ): Promise<void> {
    const metadata = {
      skill: {
        id: skill.id,
        name: skill.name,
        version: skill.version,
      },
      build: {
        target: options.target,
        buildTime: new Date().toISOString(),
        duration: buildTime,
      },
    };

    const size = (await Bun.file(executablePath).stat()).size;

    this.buildCache.run(
      `INSERT OR REPLACE INTO builds
       (id, skill_id, target, version, executable_path, size, checksum, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cacheKey,
        skill.id,
        options.target,
        skill.version,
        executablePath,
        size,
        checksum,
        JSON.stringify(metadata),
      ]
    );
  }

  private getPlatform(target: BuildTarget): string {
    if (target.includes("macos")) return "darwin";
    if (target.includes("linux")) return "linux";
    if (target.includes("windows")) return "win32";
    return process.platform;
  }

  private getArch(target: BuildTarget): string {
    if (target.includes("arm64")) return "arm64";
    if (target.includes("x64")) return "x64";
    return process.arch;
  }

  private detectPlatformFormats(): ("deb" | "rpm" | "msi" | "dmg" | "appimage")[] {
    const platform = process.platform;

    if (platform === "darwin") return ["dmg"];
    if (platform === "win32") return ["msi"];
    if (platform === "linux") return ["deb", "appimage"];

    return [];
  }

  private async buildInstallerFormat(
    skill: SkillConfig,
    format: string,
    outputDir: string,
    _options: any
  ): Promise<string> {
    const installerPath = `${outputDir}/${skill.name}-${skill.version}.${format}`;

    // Create a placeholder installer script
    let content: string;

    switch (format) {
      case "deb":
        content = this.generateDebControl(skill);
        break;
      case "rpm":
        content = this.generateRpmSpec(skill);
        break;
      case "appimage":
        content = this.generateAppImageDesktop(skill);
        break;
      default:
        content = `# ${format} installer for ${skill.name} v${skill.version}`;
    }

    await Bun.write(installerPath, content);

    if (format !== "dmg" && format !== "msi") {
      Bun.spawnSync(["chmod", "+x", installerPath]);
    }

    return installerPath;
  }

  private generateDebControl(skill: SkillConfig): string {
    return `Package: ${skill.name.toLowerCase()}
Version: ${skill.version}
Section: utils
Priority: optional
Architecture: amd64
Depends: nodejs (>= 18)
Maintainer: ${skill.author || "Unknown"}
Description: ${skill.description || "A skill for the skill system"}
 ${skill.description || ""}
`;
  }

  private generateRpmSpec(skill: SkillConfig): string {
    return `Name: ${skill.name.toLowerCase()}
Version: ${skill.version}
Release: 1
Summary: ${skill.description || "A skill"}
License: MIT
Group: Applications/System

%description
${skill.description || "A skill for the skill system"}

%install
mkdir -p %{buildroot}/usr/local/bin
cp %{_sourcedir}/${skill.name} %{buildroot}/usr/local/bin/

%files
/usr/local/bin/${skill.name}
`;
  }

  private generateAppImageDesktop(skill: SkillConfig): string {
    return `[Desktop Entry]
Type=Application
Name=${skill.name}
Comment=${skill.description || ""}
Exec=AppRun
Icon=${skill.name}
Categories=Utility;
Terminal=true
`;
  }

  private async createMacOSAppBundle(
    appName: string,
    executablePath: string,
    bundleDir: string,
    skill: SkillConfig,
    options: any
  ): Promise<string> {
    const appDir = `${bundleDir}.app`;
    const contentsDir = `${appDir}/Contents`;

    await ensureDir(`${contentsDir}/MacOS`);
    await ensureDir(`${contentsDir}/Resources`);

    // Copy executable
    await copyFile(executablePath, `${contentsDir}/MacOS/${appName}`);
    Bun.spawnSync(["chmod", "+x", `${contentsDir}/MacOS/${appName}`]);

    // Copy executable package if it exists
    const pkgDir = executablePath.replace(/[^/]+$/, "") + "executable-pkg";
    if (await fileExists(pkgDir)) {
      await copyDir(pkgDir, `${contentsDir}/MacOS/executable`);
    }

    // Create Info.plist
    const plist = options.plist || {
      CFBundleName: appName,
      CFBundleDisplayName: appName,
      CFBundleIdentifier: `com.${appName.toLowerCase().replace(/\s+/g, "")}.app`,
      CFBundleVersion: skill.version,
      CFBundleShortVersionString: skill.version,
      CFBundlePackageType: "APPL",
      CFBundleSignature: "????",
      CFBundleExecutable: appName,
      LSMinimumSystemVersion: "10.15",
      NSHumanReadableCopyright: `Copyright ${new Date().getFullYear()} ${skill.author || ""}`,
    };

    await Bun.write(`${contentsDir}/Info.plist`, this.objectToPlist(plist));

    // Copy resources if provided
    if (options.bundleResources) {
      for (const resource of options.bundleResources) {
        if (await fileExists(resource)) {
          await copyDir(resource, `${contentsDir}/Resources/`);
        }
      }
    }

    return appDir;
  }

  private objectToPlist(obj: Record<string, any>): string {
    const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
    lines.push(
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
    );
    lines.push('<plist version="1.0">');
    lines.push("<dict>");

    for (const [key, value] of Object.entries(obj)) {
      lines.push(`  <key>${key}</key>`);
      if (typeof value === "string") {
        lines.push(`  <string>${value}</string>`);
      } else if (typeof value === "number") {
        lines.push(`  <integer>${value}</integer>`);
      } else if (typeof value === "boolean") {
        lines.push(`  <${value}/>`);
      }
    }

    lines.push("</dict>");
    lines.push("</plist>");

    return lines.join("\n");
  }

  private async createWindowsAppBundle(
    appName: string,
    executablePath: string,
    bundleDir: string,
    _skill: SkillConfig,
    options: any
  ): Promise<string> {
    await ensureDir(bundleDir);

    // Copy executable
    const exeName = `${appName}.cmd`;
    await copyFile(executablePath, `${bundleDir}/${exeName}`);

    // Copy executable package
    const pkgDir = executablePath.replace(/[^/]+$/, "") + "executable-pkg";
    if (await fileExists(pkgDir)) {
      await copyDir(pkgDir, `${bundleDir}/executable`);
    }

    // Create batch launcher
    const batchScript = `@echo off
cd /d "%~dp0"
node executable\\index.js %*
`;
    await Bun.write(`${bundleDir}/Launch.bat`, batchScript);

    // Create manifest if provided
    if (options.manifest) {
      await Bun.write(
        `${bundleDir}/app.manifest`,
        JSON.stringify(options.manifest, null, 2)
      );
    }

    return bundleDir;
  }

  private async createLinuxAppBundle(
    appName: string,
    executablePath: string,
    bundleDir: string,
    skill: SkillConfig,
    _options: any
  ): Promise<string> {
    // Linux AppDir structure
    await ensureDir(bundleDir);
    await ensureDir(`${bundleDir}/usr/bin`);
    await ensureDir(`${bundleDir}/usr/share/applications`);

    // Copy executable as AppRun
    await copyFile(executablePath, `${bundleDir}/AppRun`);
    Bun.spawnSync(["chmod", "+x", `${bundleDir}/AppRun`]);

    // Copy executable package
    const pkgDir = executablePath.replace(/[^/]+$/, "") + "executable-pkg";
    if (await fileExists(pkgDir)) {
      await copyDir(pkgDir, `${bundleDir}/executable`);
    }

    // Create desktop entry
    const desktopEntry = `[Desktop Entry]
Type=Application
Name=${appName}
Comment=${skill.description || ""}
Exec=AppRun
Icon=${appName}
Categories=Utility;
Terminal=true
`;

    await Bun.write(`${bundleDir}/${appName}.desktop`, desktopEntry);

    return bundleDir;
  }

  private generateDockerfile(skill: SkillConfig): string {
    return `# Dockerfile for ${skill.name}
FROM oven/bun:1.3.6-alpine

WORKDIR /app

# Copy skill files
COPY skill-data /app/skill
COPY app /app/skill-executable

# Make executable
RUN chmod +x /app/skill-executable

# Create non-root user
RUN addgroup -g 1001 -S skill && \\
    adduser -u 1001 -S skill -G skill && \\
    chown -R skill:skill /app

USER skill

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD /app/skill-executable --version || exit 1

# Run the skill
ENTRYPOINT ["/app/skill-executable"]
`;
  }

  // Public method to get build cache for CLI
  getBuildCache(): Database {
    return this.buildCache;
  }
}
