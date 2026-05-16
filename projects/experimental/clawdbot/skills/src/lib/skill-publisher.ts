/**
 * src/lib/skill-publisher.ts
 * Hybrid Skill Publisher (npm + R2)
 * - Build and upload executables to R2
 * - Publish lightweight npm package with install script
 * - Auto-download executables on npm install
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { S3ExecutableBuilder, createS3BuilderFromEnv } from "./executable-builder-s3";
import { type R2StorageConfig } from "../storage/bun-r2-storage";

// =============================================================================
// Types
// =============================================================================

export interface SkillPublishConfig {
  skillId: string;
  version?: string;
  access?: "public" | "restricted";
  tag?: string;
  dryRun?: boolean;
  tolerateRepublish?: boolean;
  otp?: string;
  registry?: string;
  // Build options
  platforms?: string[];
  compress?: boolean;
  // R2 configuration
  r2Config?: R2StorageConfig & { publicUrl?: string };
}

export interface PublishResult {
  skillId: string;
  version: string;
  npm: NpmPublishResult | null;
  r2: R2PublishResult | null;
  errors: string[];
  warnings: string[];
  totalTime: number;
}

export interface NpmPublishResult {
  success: boolean;
  version: string;
  packageName: string;
  registry: string;
  publishDir: string;
  output: string;
}

export interface R2PublishResult {
  success: boolean;
  platforms: number;
  totalSize: number;
  manifestUrl: string;
  latestUrl: string;
  workerUrl?: string;
  uploads: Array<{
    platform: string;
    status: "success" | "failed";
    size: number;
    downloadUrl: string;
    checksum: string;
  }>;
  errors: string[];
}

// =============================================================================
// SkillPublisher Class
// =============================================================================

export class SkillPublisher {
  private builder?: S3ExecutableBuilder;
  private readonly packageDir: string;

  constructor(
    private config: SkillPublishConfig,
    options: { packageDir?: string } = {}
  ) {
    this.packageDir = options.packageDir || process.cwd();

    if (config.r2Config) {
      this.builder = new S3ExecutableBuilder(
        {
          bucket: config.r2Config.bucket,
          endpoint: config.r2Config.endpoint,
          region: config.r2Config.region,
          credentials: config.r2Config.credentials,
        },
        { cacheDir: join(this.packageDir, ".build-cache") }
      );
    } else {
      // Try to create from environment
      this.builder = createS3BuilderFromEnv() || undefined;
    }
  }

  async publish(): Promise<PublishResult> {
    const startTime = performance.now();
    const results: PublishResult = {
      skillId: this.config.skillId,
      version: this.config.version || await this.detectVersion(),
      npm: null,
      r2: null,
      errors: [],
      warnings: [],
      totalTime: 0,
    };

    console.log(`Publishing ${results.skillId} v${results.version}...\n`);

    // Phase 1: Build and upload executables to R2
    if (this.builder) {
      try {
        console.log("Phase 1: Uploading executables to R2...");
        results.r2 = await this.publishToR2(results.version);

        if (results.r2.success) {
          console.log(`R2 upload complete: ${results.r2.platforms} platforms\n`);
        } else {
          results.warnings.push("R2 upload had errors but continuing...");
        }
      } catch (error: any) {
        results.errors.push(`R2 upload failed: ${error.message}`);
        console.error("R2 upload failed:", error.message);

        if (!this.config.dryRun) {
          results.warnings.push("Continuing with npm publish only...");
        }
      }
    } else {
      results.warnings.push("No R2 configuration - publishing to npm only");
    }

    // Phase 2: Prepare package with R2 metadata and publish to npm
    try {
      console.log("Phase 2: Publishing to npm registry...");
      results.npm = await this.publishToNpm(results.version, results.r2);
      console.log("npm publish complete\n");
    } catch (error: any) {
      results.errors.push(`npm publish failed: ${error.message}`);
      console.error("npm publish failed:", error.message);

      if (this.config.dryRun) {
        console.log("This was a dry run, so errors are expected");
      }
    }

    // Phase 3: Generate post-publish actions
    if (results.npm?.success && !this.config.dryRun) {
      await this.generatePostPublishActions(results);
    }

    results.totalTime = performance.now() - startTime;

    // Print comprehensive report
    this.printReport(results);

    return results;
  }

  private async publishToR2(version: string): Promise<R2PublishResult> {
    if (!this.builder) {
      throw new Error("R2 builder not configured");
    }

    const platforms = this.config.platforms || await this.detectPlatforms();

    console.log(`   Building for ${platforms.join(", ")}...`);

    const buildResult = await this.builder.buildAndUpload(
      this.config.skillId,
      {
        compress: this.config.compress ?? true,
        minify: true,
        sourcemap: false,
        target: "bun",
      },
      {
        platforms,
        compress: this.config.compress ?? true,
        downloadName: `${this.config.skillId}-v${version}`,
        metadata: {
          version,
          publishedAt: new Date().toISOString(),
          publisher: process.env.USER || process.env.GITHUB_ACTOR || "unknown",
          publisherTool: "bun-skill-publisher",
        },
      }
    );

    // Create distribution manifest
    const manifest = await this.builder.createDistributionManifest(this.config.skillId);

    return {
      success: buildResult.errors.length === 0,
      platforms: buildResult.uploads.length,
      totalSize: buildResult.totalSize,
      manifestUrl: manifest.manifestUrl,
      latestUrl: manifest.latestUrl,
      workerUrl: manifest.workerUrl,
      uploads: buildResult.uploads.map((u) => ({
        platform: u.platform,
        status: u.success ? "success" : "failed",
        size: u.size,
        downloadUrl: u.downloadUrl,
        checksum: u.checksum,
      })),
      errors: buildResult.errors,
    };
  }

  private async publishToNpm(
    version: string,
    r2Result: R2PublishResult | null
  ): Promise<NpmPublishResult> {
    // Create a clean publish directory
    const publishDir = join(this.packageDir, "dist-publish");
    mkdirSync(publishDir, { recursive: true });

    try {
      // Prepare package.json with R2 metadata
      await this.preparePackageJson(version, r2Result, publishDir);

      // Copy essential files
      await this.copyFiles(publishDir);

      // Build the publish command
      const args = ["publish"];

      if (this.config.access) {
        args.push("--access", this.config.access);
      }

      if (this.config.tag && this.config.tag !== "latest") {
        args.push("--tag", this.config.tag);
      }

      if (this.config.dryRun) {
        args.push("--dry-run");
      }

      if (this.config.tolerateRepublish) {
        args.push("--tolerate-republish");
      }

      if (this.config.otp) {
        args.push("--otp", this.config.otp);
      }

      if (this.config.registry) {
        args.push("--registry", this.config.registry);
      }

      // Add verbose flag for better debugging
      args.push("--verbose");

      // Execute from publish directory
      const proc = await $`cd ${publishDir} && bun ${args}`.quiet().nothrow();

      if (proc.exitCode !== 0) {
        throw new Error(`npm publish failed: ${proc.stderr.toString()}`);
      }

      // Extract published package info from output
      const output = proc.stdout.toString();
      const versionMatch = output.match(/\+ (.+?)@(\d+\.\d+\.\d+)/);
      const registryMatch = output.match(/Registry:\s*(.+)/);

      return {
        success: true,
        version: versionMatch ? versionMatch[2] : version,
        packageName: versionMatch ? versionMatch[1] : this.config.skillId,
        registry: registryMatch ? registryMatch[1].trim() : "https://registry.npmjs.org",
        publishDir,
        output,
      };
    } catch (error) {
      // Cleanup on failure
      await $`rm -rf ${publishDir}`.quiet().nothrow();
      throw error;
    }
  }

  private async preparePackageJson(
    version: string,
    r2Result: R2PublishResult | null,
    publishDir: string
  ): Promise<void> {
    const sourcePackageJson = join(this.packageDir, "package.json");
    const targetPackageJson = join(publishDir, "package.json");

    if (!existsSync(sourcePackageJson)) {
      throw new Error("package.json not found");
    }

    const packageJson = await Bun.file(sourcePackageJson).json();

    // Update package metadata
    packageJson.name = packageJson.name || `@skill/${this.config.skillId}`;
    packageJson.version = version;

    // Add keywords for discoverability
    packageJson.keywords = [
      ...(packageJson.keywords || []),
      "bun-skill",
      "executable",
      "cli-tool",
    ];

    // Add R2 distribution info if available
    if (r2Result?.success) {
      packageJson.executables = {
        r2: {
          manifestUrl: r2Result.manifestUrl,
          latestUrl: r2Result.latestUrl,
          workerUrl: r2Result.workerUrl,
          platforms: r2Result.uploads.map((u) => u.platform),
        },
      };

      // Add install script that downloads executable on first run
      packageJson.scripts = {
        ...packageJson.scripts,
        postinstall: "bun run scripts/install-executable.js",
      };

      // Create install script
      await this.createInstallScript(publishDir, r2Result);
    }

    // Configure publish settings
    packageJson.publishConfig = {
      ...packageJson.publishConfig,
      access: this.config.access,
      tag: this.config.tag,
      registry: this.config.registry,
    };

    // Remove dev-only fields
    delete packageJson.devDependencies;
    delete packageJson.scripts?.dev;
    delete packageJson.scripts?.build;
    delete packageJson.scripts?.test;

    // Write updated package.json
    await Bun.write(targetPackageJson, JSON.stringify(packageJson, null, 2));
  }

  private async createInstallScript(
    publishDir: string,
    r2Result: R2PublishResult
  ): Promise<void> {
    const scriptsDir = join(publishDir, "scripts");
    mkdirSync(scriptsDir, { recursive: true });

    const installScript = `#!/usr/bin/env bun
// Auto-generated install script for ${this.config.skillId}
import { mkdirSync } from 'fs';
import { join } from 'path';

const SKILL_ID = '${this.config.skillId}';
const R2_MANIFEST_URL = '${r2Result.latestUrl}';
const INSTALL_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.bun-skills', SKILL_ID);

async function main() {
  console.log(\`Installing \${SKILL_ID} executable...\`);

  try {
    // Fetch manifest
    const manifestRes = await fetch(R2_MANIFEST_URL);
    if (!manifestRes.ok) throw new Error(\`Failed to fetch manifest: \${manifestRes.status}\`);

    const manifest = await manifestRes.json();
    const latestVersion = Object.keys(manifest.versions).sort().pop();

    if (!latestVersion) {
      console.warn('No executables available for this skill');
      return;
    }

    const versionInfo = manifest.versions[latestVersion];
    const platform = detectPlatform();
    const platformInfo = versionInfo.platforms.find(p => \`\${p.platform}-\${p.arch}\` === platform);

    if (!platformInfo) {
      console.warn(\`No executable available for \${platform}\`);
      console.log('   Available platforms:', versionInfo.platforms.map(p => \`\${p.platform}-\${p.arch}\`).join(', '));
      return;
    }

    // Create install directory
    mkdirSync(INSTALL_DIR, { recursive: true });

    // Download executable
    const targetPath = join(INSTALL_DIR, SKILL_ID);
    console.log('   Downloading from R2...');

    const response = await fetch(platformInfo.downloadUrl);
    if (!response.ok) throw new Error(\`Download failed: \${response.status}\`);

    const data = new Uint8Array(await response.arrayBuffer());
    await Bun.write(targetPath, data);

    // Make executable (Unix-like)
    if (process.platform !== 'win32') {
      const proc = Bun.spawn(['chmod', '+x', targetPath]);
      await proc.exited;
    }

    // Create symlink in node_modules/.bin
    const binDir = join(__dirname, '..', '.bin');
    mkdirSync(binDir, { recursive: true });

    const symlinkPath = join(binDir, SKILL_ID);
    try {
      const unlinkProc = Bun.spawn(['rm', '-f', symlinkPath]);
      await unlinkProc.exited;
    } catch {}

    const linkProc = Bun.spawn(['ln', '-s', targetPath, symlinkPath]);
    await linkProc.exited;

    console.log(\`Installed \${SKILL_ID} v\${latestVersion} to \${targetPath}\`);

  } catch (error) {
    console.error('Installation failed:', error.message);
    process.exit(1);
  }
}

function detectPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    return \`macos-\${arch === 'arm64' ? 'arm64' : 'x64'}\`;
  } else if (platform === 'linux') {
    return \`linux-\${arch === 'arm64' ? 'arm64' : 'x64'}\`;
  } else if (platform === 'win32') {
    return 'windows-x64';
  }

  return 'linux-x64';
}

main();
`;

    await Bun.write(join(scriptsDir, "install-executable.js"), installScript);

    // Make it executable
    await $`chmod +x ${join(scriptsDir, "install-executable.js")}`.quiet().nothrow();
  }

  private async copyFiles(publishDir: string): Promise<void> {
    const essentialFiles = ["README.md", "LICENSE", "CHANGELOG.md"];

    for (const file of essentialFiles) {
      const src = join(this.packageDir, file);
      const dest = join(publishDir, file);

      if (existsSync(src)) {
        await Bun.write(dest, await Bun.file(src).text());
      }
    }

    // Copy any files from package.json "files" field
    const packageJsonPath = join(this.packageDir, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = await Bun.file(packageJsonPath).json();
      if (packageJson.files) {
        for (const pattern of packageJson.files) {
          if (!pattern.includes("*")) {
            const src = join(this.packageDir, pattern);
            const dest = join(publishDir, pattern);
            if (existsSync(src)) {
              mkdirSync(dirname(dest), { recursive: true });
              await Bun.write(dest, await Bun.file(src).bytes());
            }
          }
        }
      }
    }
  }

  private async detectVersion(): Promise<string> {
    const packageJsonPath = join(this.packageDir, "package.json");
    try {
      const file = Bun.file(packageJsonPath);
      if (await file.exists()) {
        const content = await file.json();
        return content.version || "1.0.0";
      }
    } catch {
      // Fall through to default
    }
    return "1.0.0";
  }

  private async detectPlatforms(): Promise<string[]> {
    // Read from skill.json or package.json
    const skillJsonPath = join(this.packageDir, "skill.json");
    try {
      const file = Bun.file(skillJsonPath);
      if (await file.exists()) {
        const skillJson = await file.json();
        return (
          skillJson.platforms || [
            "linux-x64",
            "linux-arm64",
            "macos-x64",
            "macos-arm64",
            "windows-x64",
          ]
        );
      }
    } catch {
      // Fall through to default
    }
    return ["linux-x64", "linux-arm64", "macos-x64", "macos-arm64", "windows-x64"];
  }

  private async generatePostPublishActions(results: PublishResult): Promise<void> {
    console.log("\nNext Steps:");
    console.log("=".repeat(80));

    if (results.npm?.success) {
      console.log(`npm install ${results.npm.packageName}`);
      console.log(`   # Install the skill package`);

      if (results.r2?.success) {
        console.log(`\nOr install executable directly:`);
        console.log(`   curl -fsSL ${results.r2.latestUrl} | bun -`);
      }
    }

    if (results.r2?.workerUrl) {
      console.log(`\nAccess via CDN:`);
      console.log(`   ${results.r2.workerUrl}/${results.skillId}`);
    }

    console.log("\nDocumentation:");
    console.log(`   ${results.npm?.registry}/${results.npm?.packageName}`);

    // Save report to file
    const reportPath = join(this.packageDir, "publish-report.json");
    await Bun.write(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nFull report saved to: ${reportPath}`);
  }

  private printReport(results: PublishResult): void {
    console.log("\n" + "=".repeat(80));
    console.log("PUBLISH REPORT");
    console.log("=".repeat(80));

    // R2 Section
    if (results.r2) {
      console.log("\nR2 Distribution:");
      console.log(`   Status: ${results.r2.success ? "Success" : "Failed"}`);
      console.log(`   Platforms: ${results.r2.platforms}`);
      console.log(`   Total Size: ${this.formatBytes(results.r2.totalSize)}`);
      console.log(`   Manifest: ${results.r2.manifestUrl}`);
      console.log(`   Latest: ${results.r2.latestUrl}`);

      if (results.r2.errors.length > 0) {
        console.log(`   Errors: ${results.r2.errors.length}`);
        results.r2.errors.forEach((e) => console.log(`     - ${e}`));
      }
    }

    // npm Section
    if (results.npm) {
      console.log("\nnpm Registry:");
      console.log(`   Status: ${results.npm.success ? "Published" : "Failed"}`);
      console.log(`   Package: ${results.npm.packageName}@${results.npm.version}`);
      console.log(`   Registry: ${results.npm.registry}`);
      console.log(`   Tag: ${this.config.tag || "latest"}`);

      if (this.config.dryRun) {
        console.log(`   Mode: DRY RUN (no actual publish)`);
      }
    }

    // Errors & Warnings
    if (results.warnings.length > 0) {
      console.log("\nWarnings:");
      results.warnings.forEach((w) => console.log(`   - ${w}`));
    }

    if (results.errors.length > 0) {
      console.log("\nErrors:");
      results.errors.forEach((e) => console.log(`   - ${e}`));
    }

    console.log(`\nTotal Time: ${(results.totalTime / 1000).toFixed(2)}s`);
    console.log("=".repeat(80));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create publisher from environment variables
 */
export function createPublisherFromEnv(
  skillId: string,
  options: Partial<SkillPublishConfig> = {}
): SkillPublisher {
  const config: SkillPublishConfig = {
    skillId,
    ...options,
  };

  // Load R2 config from environment
  if (process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    config.r2Config = {
      bucket: process.env.R2_BUCKET,
      endpoint:
        process.env.R2_ENDPOINT ||
        `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: process.env.R2_REGION || "auto",
      publicUrl: process.env.R2_PUBLIC_URL,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    };
  }

  return new SkillPublisher(config);
}

export default SkillPublisher;
