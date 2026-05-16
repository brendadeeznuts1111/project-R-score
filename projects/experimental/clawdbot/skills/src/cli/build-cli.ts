#!/usr/bin/env bun
/**
 * src/cli/build-cli.ts
 * Build CLI Tool for creating standalone skill executables
 */

import {
  ExecutableBuilder,
  BuildTarget,
  BuildResult,
} from "../lib/executable-builder";

class BuildCLI {
  private builder: ExecutableBuilder;

  constructor() {
    this.builder = new ExecutableBuilder();
  }

  async run(): Promise<void> {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    switch (command) {
      case "skill":
        await this.buildSkill(args);
        break;
      case "multi":
        await this.buildMulti(args);
        break;
      case "app":
        await this.buildApp(args);
        break;
      case "docker":
        await this.buildDocker(args);
        break;
      case "installer":
        await this.buildInstaller(args);
        break;
      case "list":
        await this.listBuilds();
        break;
      case "clean":
        await this.cleanCache();
        break;
      case "help":
      case "--help":
      case "-h":
      default:
        this.showHelp();
        break;
    }
  }

  async buildSkill([skillId, ...options]: string[]): Promise<void> {
    if (!skillId) {
      console.error("Usage: build skill <skill-id> [options]");
      process.exit(1);
    }

    const parsedOptions = this.parseOptions(options);

    console.log(`\n🔨 Building executable for skill: ${skillId}`);
    console.log("─".repeat(60));

    try {
      const result = await this.builder.buildSkillExecutable(
        skillId,
        parsedOptions
      );

      this.displayResult(result);

      if (result.success) {
        console.log("─".repeat(60));
        console.log(`✅ Built: ${result.executablePath}`);
        console.log(`📊 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);

        if (result.compressedSize) {
          console.log(
            `🗜️  Compressed: ${(result.compressedSize / 1024 / 1024).toFixed(2)} MB`
          );
        }
      } else {
        console.log("─".repeat(60));
        console.log("❌ Build failed");
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`❌ Build failed: ${error.message}`);
      process.exit(1);
    }
  }

  async buildMulti([skillId, targetsStr]: string[]): Promise<void> {
    if (!skillId) {
      console.error("Usage: build multi <skill-id> [targets]");
      console.error(
        "Targets: linux-x64,linux-arm64,macos-x64,macos-arm64,windows-x64"
      );
      process.exit(1);
    }

    const targets = targetsStr
      ? this.parseTargets(targetsStr)
      : ([
          "bun-linux-x64",
          "bun-linux-arm64",
          "bun-macos-x64",
          "bun-macos-arm64",
          "bun-windows-x64",
        ] as BuildTarget[]);

    console.log(`\n🎯 Building for ${targets.length} targets...`);
    console.log("═".repeat(60));

    const results = await this.builder.buildMultiTarget(skillId, targets);

    console.log("\n📊 Build Results:");
    console.log("═".repeat(60));

    let success = 0;
    let failed = 0;

    for (const [target, result] of results) {
      const status = result.success ? "✅" : "❌";
      const size = result.success
        ? `${(result.size / 1024 / 1024).toFixed(2)} MB`
        : "FAILED";

      console.log(`${status} ${target.padEnd(22)} ${size}`);

      if (result.success) {
        success++;
      } else {
        failed++;
        if (result.logs.length > 0) {
          console.log(`   └─ ${result.logs[result.logs.length - 1]}`);
        }
      }
    }

    console.log("═".repeat(60));
    console.log(`✅ Success: ${success}, ❌ Failed: ${failed}`);
  }

  async buildApp([skillId, appName, ...options]: string[]): Promise<void> {
    if (!skillId || !appName) {
      console.error("Usage: build app <skill-id> <app-name> [options]");
      process.exit(1);
    }

    const parsedOptions = this.parseOptions(options);

    console.log(`\n📦 Creating app bundle: ${appName}`);
    console.log("─".repeat(60));

    try {
      const bundlePath = await this.builder.createAppBundle(
        skillId,
        appName,
        parsedOptions
      );
      console.log(`✅ App bundle created: ${bundlePath}`);

      // Show next steps
      const platform = process.platform;
      if (platform === "darwin") {
        console.log("\n📦 To create a DMG installer:");
        console.log(
          `   hdiutil create -volname "${appName}" -srcfolder "${bundlePath}" -ov -format UDZO "${appName}.dmg"`
        );
      } else if (platform === "win32") {
        console.log("\n📦 To create an MSI installer:");
        console.log("   Use WiX Toolset or Inno Setup");
      } else {
        console.log("\n📦 To create an AppImage:");
        console.log(`   appimagetool ${bundlePath}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to create app bundle: ${error.message}`);
      process.exit(1);
    }
  }

  async buildDocker([skillId, imageName, ...options]: string[]): Promise<void> {
    if (!skillId) {
      console.error("Usage: build docker <skill-id> [image-name] [options]");
      process.exit(1);
    }

    const parsedOptions = this.parseOptions(options);

    console.log(`\n🐳 Building Docker image for: ${skillId}`);
    console.log("─".repeat(60));

    try {
      const image = await this.builder.buildDockerImage(skillId, {
        imageName: imageName || skillId,
        ...parsedOptions,
      });
      console.log(`✅ Docker image built: ${image}`);

      console.log("\n🐳 To run:");
      console.log(`   docker run -it --rm ${image}`);
      console.log("\n🐳 To push to registry:");
      console.log(`   docker push ${image}`);
    } catch (error: any) {
      console.error(`❌ Docker build failed: ${error.message}`);
      process.exit(1);
    }
  }

  async buildInstaller([skillId, ...formats]: string[]): Promise<void> {
    if (!skillId) {
      console.error("Usage: build installer <skill-id> [formats...]");
      console.error("Formats: deb, rpm, msi, dmg, appimage");
      process.exit(1);
    }

    // Separate formats from options
    const formatList: string[] = [];
    const optionArgs: string[] = [];

    for (const arg of formats) {
      if (arg.startsWith("--") || arg.startsWith("-")) {
        optionArgs.push(arg);
      } else if (["deb", "rpm", "msi", "dmg", "appimage"].includes(arg)) {
        formatList.push(arg);
      }
    }

    const options = this.parseOptions(optionArgs);
    if (formatList.length > 0) {
      options.formats = formatList;
    }

    console.log(`\n📦 Creating installers for: ${skillId}`);
    console.log("─".repeat(60));

    try {
      const installers = await this.builder.createInstaller(skillId, options);

      if (installers.length > 0) {
        console.log(`\n✅ Created ${installers.length} installers:`);
        installers.forEach((installer) => {
          console.log(`   📦 ${installer}`);
        });
      } else {
        console.log("⚠️  No installers were created");
      }
    } catch (error: any) {
      console.error(`❌ Installer build failed: ${error.message}`);
      process.exit(1);
    }
  }

  async listBuilds(): Promise<void> {
    const db = this.builder.getBuildCache();

    const builds = db
      .query("SELECT * FROM builds ORDER BY build_time DESC LIMIT 20")
      .all() as any[];

    if (builds.length === 0) {
      console.log("No builds in cache");
      return;
    }

    console.log("\n📊 Cached Builds:");
    console.log("═".repeat(90));
    console.log(
      "Skill".padEnd(18) +
        "Version".padEnd(10) +
        "Target".padEnd(18) +
        "Size".padEnd(12) +
        "Built".padEnd(22) +
        "Checksum"
    );
    console.log("─".repeat(90));

    let totalSize = 0;

    for (const build of builds) {
      const metadata = JSON.parse(build.metadata);
      const skillName = metadata.skill?.name || build.skill_id;
      const version = metadata.skill?.version || build.version;
      const size = `${(build.size / 1024 / 1024).toFixed(2)} MB`;
      const built = new Date(build.build_time).toLocaleString();
      const checksum = build.checksum.slice(0, 8) + "...";

      console.log(
        skillName.slice(0, 17).padEnd(18) +
          version.slice(0, 9).padEnd(10) +
          (build.target || "unknown").slice(0, 17).padEnd(18) +
          size.padEnd(12) +
          built.slice(0, 21).padEnd(22) +
          checksum
      );

      totalSize += build.size;
    }

    console.log("═".repeat(90));
    console.log(
      `📊 Total: ${builds.length} builds, ${(totalSize / 1024 / 1024).toFixed(2)} MB`
    );
  }

  async cleanCache(): Promise<void> {
    const cacheDir = "./.build-cache";

    const result = Bun.spawnSync(["du", "-sh", cacheDir]);
    if (result.exitCode === 0) {
      const size = result.stdout.toString().split("\t")[0];
      console.log(`🧹 Cleaning cache: ${size}`);

      Bun.spawnSync(["rm", "-rf", cacheDir]);
      console.log("✅ Cache cleaned");
    } else {
      console.log("Cache directory not found or already clean");
    }
  }

  private parseOptions(args: string[]): any {
    const options: any = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith("--")) {
        const key = arg.slice(2);
        const next = args[i + 1];

        if (key === "no-compress") {
          options.compress = false;
        } else if (key === "no-minify") {
          options.minify = false;
        } else if (key === "no-runtime") {
          options.includeRuntime = false;
        } else if (next && !next.startsWith("--")) {
          // Try to parse as JSON, otherwise use as string
          try {
            options[key] = JSON.parse(next);
          } catch {
            options[key] = next;
          }
          i++;
        } else {
          options[key] = true;
        }
      } else if (arg.startsWith("-")) {
        const key = arg.slice(1);

        // Handle short flags
        switch (key) {
          case "o":
            if (args[i + 1]) {
              options.outputDir = args[++i];
            }
            break;
          case "t":
            if (args[i + 1]) {
              options.target = this.parseTarget(args[++i]);
            }
            break;
          case "d":
            options.debug = true;
            break;
          default:
            options[key] = true;
        }
      }
    }

    return options;
  }

  private parseTarget(target: string): BuildTarget {
    const [platform, arch] = target.split("-");

    switch (platform) {
      case "linux":
        return arch === "arm64" ? "bun-linux-arm64" : "bun-linux-x64";
      case "macos":
        return arch === "arm64" ? "bun-macos-arm64" : "bun-macos-x64";
      case "windows":
        return "bun-windows-x64";
      default:
        // If already in full format
        if (target.startsWith("bun-")) {
          return target as BuildTarget;
        }
        throw new Error(`Unknown target: ${target}`);
    }
  }

  private parseTargets(targetsStr: string): BuildTarget[] {
    return targetsStr.split(",").map((t) => this.parseTarget(t.trim()));
  }

  private displayResult(result: BuildResult): void {
    if (result.logs && result.logs.length > 0) {
      console.log("\n📝 Build Logs:");
      result.logs.forEach((log: string) => {
        const prefix = log.startsWith("Build") ? "🔨" :
                      log.startsWith("Bundle") ? "📦" :
                      log.startsWith("Target") ? "🎯" :
                      log.startsWith("Output") ? "📁" :
                      log.startsWith("Using cached") ? "⚡" :
                      log.startsWith("Compressed") ? "🗜️" :
                      log.startsWith("Checksum") ? "🔐" :
                      log.startsWith("Metadata") ? "📝" :
                      log.startsWith("Runtime") ? "🚀" :
                      log.startsWith("Build completed") ? "✅" :
                      log.startsWith("Final") ? "📊" :
                      log.startsWith("Build failed") ? "❌" :
                      "  ";
        console.log(`${prefix} ${log}`);
      });
    }

    if (result.stats && result.stats.buildTime > 0) {
      console.log("\n📊 Build Statistics:");
      console.log(
        `   Build time:    ${(result.stats.buildTime / 1000).toFixed(2)}s`
      );
      console.log(
        `   Memory used:   ${(result.stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(`   Bundle files:  ${result.stats.bundleFiles}`);
      console.log(
        `   Total size:    ${(result.stats.totalSize / 1024 / 1024).toFixed(2)} MB`
      );
    }
  }

  private showHelp(): void {
    console.log(`
🔨 Skill System Build Tool
Version: ${Bun.version}

Usage: build <command> [options]

Commands:
  skill <skill-id>              Build a standalone executable
  multi <skill-id> [targets]    Build for multiple platforms
  app <skill-id> <name>         Create app bundle (.app, folder, AppDir)
  docker <skill-id> [name]      Build Docker image
  installer <skill-id> [fmts]   Create platform-specific installer
  list                          List cached builds
  clean                         Clean build cache
  help                          Show this help

Options:
  -t, --target <target>     Build target (linux-x64, macos-arm64, etc.)
  -o, --outputDir <dir>     Output directory (default: ./dist)
  --compress                Compress executable (default: true)
  --no-compress             Don't compress executable
  --minify                  Minify code (default: true)
  --no-minify               Don't minify code
  --no-runtime              Don't bundle Bun runtime
  -d, --debug               Enable debug mode
  --icon <path>             Add icon to executable
  --sign <identity>         Code signing identity (macOS only)

Targets:
  linux-x64      Linux x86_64
  linux-arm64    Linux ARM64
  macos-x64      macOS Intel
  macos-arm64    macOS Apple Silicon
  windows-x64    Windows x86_64

Installer Formats:
  deb            Debian package
  rpm            Red Hat package
  msi            Windows installer
  dmg            macOS disk image
  appimage       Linux AppImage

Examples:
  build skill weather --target linux-x64
  build skill weather -t macos-arm64 -o ./output
  build multi weather linux-x64,macos-arm64,windows-x64
  build app weather "Weather App" --icon ./icon.png
  build docker weather myregistry/weather
  build installer weather deb appimage
  build list
  build clean
    `.trim());
  }
}

// Run CLI
const cli = new BuildCLI();
cli.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
