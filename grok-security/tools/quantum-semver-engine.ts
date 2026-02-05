#!/usr/bin/env bun
/**
 * [QUANTUM][SEMVER][ENGINE]{BUN-NATIVE}
 * Semantic Versioning Engine with Bun.semver integration
 * Unified versioning for all infrastructure components
 * @version 1.0.0
 */

import { $ } from "bun";

// ===== Types =====
interface VersionInfo {
  full: string;
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
  build: string[];
}

interface ReleaseChannel {
  name: string;
  stability: "unstable" | "testing" | "pre-release" | "production";
  retention: string;
  autoPrune: boolean;
  directory: string;
}

interface BuildManifest {
  component: string;
  version: string;
  channel: string;
  timestamp: string;
  buildId: string;
  bun: { version: string; revision: string };
  git?: { commit: string; branch: string };
}

// ===== Release Channels =====
const RELEASE_CHANNELS: Record<string, ReleaseChannel> = {
  canary: {
    name: "canary",
    stability: "unstable",
    retention: "7d",
    autoPrune: true,
    directory: "canary",
  },
  nightly: {
    name: "nightly",
    stability: "unstable",
    retention: "30d",
    autoPrune: true,
    directory: "nightly",
  },
  alpha: {
    name: "alpha",
    stability: "testing",
    retention: "30d",
    autoPrune: false,
    directory: "alpha",
  },
  beta: {
    name: "beta",
    stability: "testing",
    retention: "90d",
    autoPrune: false,
    directory: "beta",
  },
  rc: {
    name: "rc",
    stability: "pre-release",
    retention: "180d",
    autoPrune: false,
    directory: "rc",
  },
  stable: {
    name: "stable",
    stability: "production",
    retention: "forever",
    autoPrune: false,
    directory: "stable",
  },
};

// ===== Components =====
const COMPONENTS = [
  { id: "headscale-proxy", path: "workers/headscale-proxy.ts", type: "worker" },
  {
    id: "headscale-server",
    path: "infrastructure/headscale-server.ts",
    type: "server",
  },
  {
    id: "tension-engine",
    path: "bun-inspect-utils/src/tension/index.ts",
    type: "library",
  },
  {
    id: "terminal-pty",
    path: "bun-inspect-utils/src/terminal/index.ts",
    type: "library",
  },
  { id: "opr-cli", path: "bin/opr", type: "cli" },
];

/**
 * [1.0.0.0] QuantumSemverEngine
 */
export class QuantumSemverEngine {
  private version: VersionInfo;
  private packagePath = "./package.json";

  constructor() {
    this.version = this.loadVersion();
  }

  // Load version from package.json
  loadVersion(): VersionInfo {
    try {
      const pkg = JSON.parse(
        Bun.file(this.packagePath).text() as unknown as string
      );
      return this.parseVersion(pkg.version || "0.0.0");
    } catch {
      return this.parseVersion(process.env.QUANTUM_VERSION || "0.0.0-dev");
    }
  }

  // Parse semver string
  parseVersion(version: string): VersionInfo {
    const match = version.match(
      /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+(.+))?$/
    );
    if (!match) {
      return {
        full: version,
        major: 0,
        minor: 0,
        patch: 0,
        prerelease: [],
        build: [],
      };
    }
    return {
      full: version,
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4]?.split(".") || [],
      build: match[5]?.split(".") || [],
    };
  }

  // Get current version
  getVersion(): VersionInfo {
    return this.version;
  }

  // Generate build version for channel
  generateBuildVersion(channel: string): string {
    const { major, minor, patch } = this.version;
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const commit = process.env.GIT_COMMIT?.slice(0, 7) || "local";

    switch (channel) {
      case "canary":
        return `${major}.${minor}.${patch}-canary.${date}+${commit}`;
      case "nightly":
        return `${major}.${minor}.${patch}-nightly.${date}+${commit}`;
      case "alpha":
        return `${major}.${minor}.${patch}-alpha.${date}+${commit}`;
      case "beta":
        return `${major}.${minor}.${patch}-beta.${date}+${commit}`;
      case "rc":
        return `${major}.${minor}.${patch}-rc.1+${commit}`;
      case "stable":
        return `${major}.${minor}.${patch}+${commit}`;
      default:
        return `${major}.${minor}.${patch}-${channel}.${date}+${commit}`;
    }
  }

  // Bump version
  async bumpVersion(
    type: "major" | "minor" | "patch" | "prerelease",
    preId?: string
  ): Promise<string> {
    let { major, minor, patch, prerelease } = this.version;

    switch (type) {
      case "major":
        major++;
        minor = 0;
        patch = 0;
        prerelease = [];
        break;
      case "minor":
        minor++;
        patch = 0;
        prerelease = [];
        break;
      case "patch":
        patch++;
        prerelease = [];
        break;
      case "prerelease":
        if (prerelease.length) {
          const num = parseInt(prerelease[prerelease.length - 1]) || 0;
          prerelease = [preId || prerelease[0], String(num + 1)];
        } else {
          prerelease = [preId || "alpha", "1"];
        }
        break;
    }

    const newVersion = prerelease.length
      ? `${major}.${minor}.${patch}-${prerelease.join(".")}`
      : `${major}.${minor}.${patch}`;

    // Update package.json
    const pkg = JSON.parse(await Bun.file(this.packagePath).text());
    pkg.version = newVersion;
    await Bun.write(this.packagePath, JSON.stringify(pkg, null, 2));

    this.version = this.parseVersion(newVersion);
    return newVersion;
  }

  // Check compatibility between versions
  checkCompatibility(
    v1: string,
    v2: string
  ): { compatible: boolean; diff: string } {
    const p1 = this.parseVersion(v1);
    const p2 = this.parseVersion(v2);

    if (p1.major !== p2.major) return { compatible: false, diff: "major" };
    if (p1.minor !== p2.minor) return { compatible: true, diff: "minor" };
    if (p1.patch !== p2.patch) return { compatible: true, diff: "patch" };
    return { compatible: true, diff: "none" };
  }

  // Generate build manifest
  generateManifest(component: string, channel: string): BuildManifest {
    return {
      component,
      version: this.generateBuildVersion(channel),
      channel,
      timestamp: new Date().toISOString(),
      buildId: Bun.hash(`${component}-${Date.now()}`).toString(16).slice(0, 12),
      bun: { version: Bun.version, revision: Bun.revision },
      git: {
        commit: process.env.GIT_COMMIT || "local",
        branch: process.env.GIT_BRANCH || "main",
      },
    };
  }

  // Get build directory for channel
  getBuildDir(channel: string, component?: string): string {
    const ch = RELEASE_CHANNELS[channel] || RELEASE_CHANNELS.stable;
    const { major, minor, patch } = this.version;
    const base = `builds/${ch.directory}/v${major}.${minor}.${patch}`;
    return component ? `${base}/${component}` : base;
  }

  // Get versioned filename
  getVersionedFilename(component: string, channel: string, ext = "js"): string {
    const version = this.generateBuildVersion(channel);
    return `quantum-${component}-${version}.${ext}`;
  }
}

/**
 * [2.0.0.0] Build Pipeline
 */
export class QuantumBuildPipeline {
  private engine: QuantumSemverEngine;

  constructor(engine?: QuantumSemverEngine) {
    this.engine = engine || new QuantumSemverEngine();
  }

  // Build a single component
  async buildComponent(
    componentId: string,
    channel: string
  ): Promise<BuildManifest> {
    const component = COMPONENTS.find((c) => c.id === componentId);
    if (!component) throw new Error(`Component not found: ${componentId}`);

    const manifest = this.engine.generateManifest(componentId, channel);
    const outdir = this.engine.getBuildDir(channel, componentId);

    console.log(`📦 Building ${componentId} → ${channel}`);

    // Ensure output directory exists
    await $`mkdir -p ${outdir}`;

    // Build based on component type
    if (component.type === "worker") {
      const result = await Bun.build({
        entrypoints: [component.path],
        outdir,
        target: "browser",
        minify: channel === "stable" || channel === "rc",
        sourcemap: channel !== "stable" ? "external" : "none",
        define: {
          "process.env.QUANTUM_VERSION": JSON.stringify(manifest.version),
          "process.env.QUANTUM_CHANNEL": JSON.stringify(channel),
          "process.env.QUANTUM_BUILD_ID": JSON.stringify(manifest.buildId),
        },
      });

      if (!result.success) {
        console.error("❌ Build failed:", result.logs);
        throw new Error("Build failed");
      }
    } else if (component.type === "server" || component.type === "library") {
      const result = await Bun.build({
        entrypoints: [component.path],
        outdir,
        target: "bun",
        minify: channel === "stable",
        sourcemap: "external",
        define: {
          "process.env.QUANTUM_VERSION": JSON.stringify(manifest.version),
          "process.env.QUANTUM_CHANNEL": JSON.stringify(channel),
        },
      });

      if (!result.success) throw new Error("Build failed");
    }

    // Write manifest
    await Bun.write(
      `${outdir}/manifest.json`,
      JSON.stringify(manifest, null, 2)
    );

    console.log(`✅ Built ${componentId}@${manifest.version}`);
    return manifest;
  }

  // Build all components for a channel
  async buildChannel(channel: string): Promise<BuildManifest[]> {
    console.log(
      `\n🚀 Building ${channel.toUpperCase()} release\n${"═".repeat(40)}`
    );

    const manifests: BuildManifest[] = [];
    for (const component of COMPONENTS) {
      try {
        const manifest = await this.buildComponent(component.id, channel);
        manifests.push(manifest);
      } catch (error) {
        console.error(`❌ Failed to build ${component.id}:`, error);
      }
    }

    // Write release manifest
    const releaseManifest = {
      channel,
      version: this.engine.getVersion().full,
      timestamp: new Date().toISOString(),
      components: manifests,
    };

    const releaseDir = this.engine.getBuildDir(channel);
    await Bun.write(
      `${releaseDir}/release.json`,
      JSON.stringify(releaseManifest, null, 2)
    );

    console.log(
      `\n✅ ${channel} release complete: ${manifests.length} components`
    );
    return manifests;
  }

  // Deploy to Cloudflare Workers
  async deployWorker(channel: string): Promise<void> {
    console.log(`\n☁️  Deploying to Cloudflare Workers (${channel})`);

    const env =
      channel === "stable"
        ? "production"
        : channel === "rc"
          ? "staging"
          : "dev";

    await $`cd infrastructure && wrangler deploy --env ${env}`;

    console.log(`✅ Deployed to ${env}`);
  }
}

// ===== CLI =====
if (import.meta.main) {
  const args = process.argv.slice(2);
  const engine = new QuantumSemverEngine();
  const pipeline = new QuantumBuildPipeline(engine);

  const command = args[0];

  switch (command) {
    case "--version":
    case "-v":
      const versionInfo = engine.getVersion();
      console.log(`Quantum v${versionInfo.full}`);
      console.log(`Bun ${Bun.version} (${Bun.revision})`);
      break;

    case "--bump":
      const type = (args[1] || "patch") as
        | "major"
        | "minor"
        | "patch"
        | "prerelease";
      const preReleaseId = args[2];
      const newVersion = await engine.bumpVersion(type, preReleaseId);
      console.log(`✅ Bumped to ${newVersion}`);
      break;

    case "--build":
      const buildChannel = args[1] || "canary";
      await pipeline.buildChannel(buildChannel);
      break;

    case "--build-component":
      const componentId = args[1];
      const compChannel = args[2] || "canary";
      if (!componentId) {
        console.error("Usage: --build-component <id> [channel]");
        process.exit(1);
      }
      await pipeline.buildComponent(componentId, compChannel);
      break;

    case "--deploy":
      const deployChannel = args[1] || "stable";
      await pipeline.deployWorker(deployChannel);
      break;

    case "--check":
      const v1 = args[1];
      const v2 = args[2];
      if (!v1 || !v2) {
        console.error("Usage: --check <version1> <version2>");
        process.exit(1);
      }
      const compat = engine.checkCompatibility(v1, v2);
      console.log(
        `Compatibility: ${compat.compatible ? "✅" : "❌"} (${compat.diff})`
      );
      break;

    case "--list-components":
      console.log("Components:");
      COMPONENTS.forEach((c) =>
        console.log(`  ${c.id} (${c.type}) → ${c.path}`)
      );
      break;

    case "--list-channels":
      console.log("Release Channels:");
      Object.entries(RELEASE_CHANNELS).forEach(([k, v]) => {
        console.log(`  ${k}: ${v.stability} (${v.retention})`);
      });
      break;

    default:
      console.log(`
Quantum Semver Engine

Usage: bun tools/quantum-semver-engine.ts <command>

Commands:
  --version, -v              Show version
  --bump <type> [preId]      Bump version (major|minor|patch|prerelease)
  --build <channel>          Build all components for channel
  --build-component <id> [ch] Build single component
  --deploy <channel>         Deploy to Cloudflare Workers
  --check <v1> <v2>          Check version compatibility
  --list-components          List all components
  --list-channels            List release channels

Channels: canary, nightly, alpha, beta, rc, stable
`);
  }
}

export { RELEASE_CHANNELS, COMPONENTS };
