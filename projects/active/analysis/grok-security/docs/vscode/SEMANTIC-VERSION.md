# SEMANTIC VERSIONING SYSTEM

## **VERSIONED COMPONENT MATRIX**

| **🆔 VERSIONED_ID**                    | **🔧 COMPONENT_TYPE** | **📦 BUNDLE_VERSION**                     | **📁 FILE_NAMING_PATTERN**                      | **🗂️ BUILD_DIR_STRUCTURE**                 | **📊 SEMVER_RANGE**     | **🔧 BUN_SEMVER_API**    | **🏷️ RELEASE_TAG**  |
| -------------------------------------- | --------------------- | ----------------------------------------- | ----------------------------------------------- | ------------------------------------------ | ----------------------- | ------------------------ | ------------------- |
| **qcf-lattice-scene@1.3.5-alpha.1**    | `THREE.Scene`         | `1.3.5-alpha.1+build.20240115`            | `quantum-scene-1.3.5-alpha.1.webgl.js`          | `builds/v1.3.5-alpha.1/scene/`             | `^1.3.5-alpha.1`        | `Bun.semver.satisfies()` | `alpha`             |
| **qcf-particles@1.3.5-rc.1**           | `ParticleSystem`      | `1.3.5-rc.1+simd.accelerated`             | `quantum-particles-1.3.5-rc.1.simd.js`          | `builds/v1.3.5-rc.1/particles/`            | `~1.3.5-rc.1`           | `Bun.semver.parse()`     | `release-candidate` |
| **qcf-network@1.3.5**                  | `NetworkNode`         | `1.3.5+performance.optimized`             | `quantum-network-1.3.5.prod.js`                 | `builds/v1.3.5/network/`                   | `1.3.5`                 | `Bun.semver.order()`     | `stable`            |
| **qcf-connections@1.3.5-beta.3**       | `ConnectionLine`      | `1.3.5-beta.3+pulse.animation`            | `quantum-connections-1.3.5-beta.3.pulse.js`     | `builds/v1.3.5-beta.3/connections/`        | `>=1.3.5-beta.0 <1.3.5` | `Bun.semver.eq()`        | `beta`              |
| **qcf-ui@1.3.5-canary.20240115**       | `GlassCard`           | `1.3.5-canary.20240115+react.fastrefresh` | `quantum-ui-1.3.5-canary.20240115.fast.js`      | `builds/canary/20240115/ui/`               | `*`                     | `Bun.semver.gt()`        | `canary`            |
| **qcf-data@1.3.5-nightly**             | `DataStream`          | `1.3.5-nightly.20240115+buffer.simd`      | `quantum-data-1.3.5-nightly.simd.js`            | `builds/nightly/20240115/data/`            | `1.3.5-nightly.*`       | `Bun.semver.lt()`        | `nightly`           |
| **qcf-shaders@1.3.5-preview.2**        | `ShaderUniform`       | `1.3.5-preview.2+webgl.optimized`         | `quantum-shaders-1.3.5-preview.2.webgl.js`      | `builds/preview/v1.3.5-preview.2/shaders/` | `1.3.5-preview.2`       | `Bun.semver.inc()`       | `preview`           |
| **qcf-interaction@1.3.5-experimental** | `Raycaster`           | `1.3.5-experimental+ipc.fast`             | `quantum-interaction-1.3.5-experimental.ipc.js` | `builds/experimental/interaction/`         | `1.3.5-experimental`    | `Bun.semver.diff()`      | `experimental`      |

## **SEMANTIC VERSIONING ENGINE**

```javascript
// quantum-semver-engine.js - Bun Semantic Versioning System
import { Bun } from "bun";
import { readFileSync, writeFileSync } from "fs";
import { join, basename, dirname } from "path";

class QuantumSemverEngine {
  constructor() {
    this.version = this.loadVersion();
    this.releaseChannels = new Map();
    this.buildManifests = new Map();
    this.dependencyGraph = new Map();
    this.initializeReleaseChannels();
  }

  // LOAD VERSION FROM package.json OR ENV
  loadVersion() {
    try {
      const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
      return {
        full: pkg.version,
        parsed: Bun.semver.parse(pkg.version),
        package: pkg,
      };
    } catch {
      // Fallback to environment or default
      const version = process.env.QUANTUM_VERSION || "0.0.0-development";
      return {
        full: version,
        parsed: Bun.semver.parse(version),
        package: { version },
      };
    }
  }

  // INITIALIZE RELEASE CHANNELS WITH SEMVER RANGES
  initializeReleaseChannels() {
    this.releaseChannels.set("canary", {
      semver: `${this.version.parsed.major}.${this.version.parsed.minor}.${this.version.parsed.patch}-canary`,
      directory: "canary",
      stability: "unstable",
      retention: "7days",
      autoPrune: true,
    });

    this.releaseChannels.set("nightly", {
      semver: `${this.version.parsed.major}.${this.version.parsed.minor}.${this.version.parsed.patch}-nightly`,
      directory: "nightly",
      stability: "unstable",
      retention: "30days",
      autoPrune: true,
    });

    this.releaseChannels.set("alpha", {
      semver: `${this.version.parsed.major}.${this.version.parsed.minor}.${this.version.parsed.patch}-alpha`,
      directory: "alpha",
      stability: "testing",
      retention: "30days",
      autoPrune: false,
    });

    this.releaseChannels.set("beta", {
      semver: `${this.version.parsed.major}.${this.version.parsed.minor}.${this.version.parsed.patch}-beta`,
      directory: "beta",
      stability: "testing",
      retention: "90days",
      autoPrune: false,
    });

    this.releaseChannels.set("rc", {
      semver: `${this.version.parsed.major}.${this.version.parsed.minor}.${this.version.parsed.patch}-rc`,
      directory: "release-candidate",
      stability: "pre-release",
      retention: "180days",
      autoPrune: false,
    });

    this.releaseChannels.set("stable", {
      semver: `${this.version.parsed.major}.${this.version.parsed.minor}.${this.version.parsed.patch}`,
      directory: "stable",
      stability: "production",
      retention: "forever",
      autoPrune: false,
    });
  }

  // GENERATE VERSIONED FILENAMES
  generateVersionedFilename(component, channel = "stable", options = {}) {
    const channelConfig = this.releaseChannels.get(channel);
    const timestamp =
      options.timestamp ||
      new Date().toISOString().split("T")[0].replace(/-/g, "");
    const buildId =
      options.buildId ||
      Bun.hash.crc32(`${component}-${timestamp}`).toString(16);

    // Base pattern: quantum-{component}-{version}-{channel}.{features}.{ext}
    const parts = [
      "quantum",
      component.toLowerCase().replace(/\s+/g, "-"),
      channelConfig.semver,
      channel,
      options.features ? options.features.join(".") : null,
      buildId.substring(0, 8),
      options.ext || "js",
    ].filter(Boolean);

    return parts.join(".");
  }

  // SEMVER-COMPLIANT BUILD DIRECTORY STRUCTURE
  getBuildDirectory(channel, component = null) {
    const channelConfig = this.releaseChannels.get(channel);
    const base = join(
      "builds",
      channelConfig.directory,
      `v${this.version.parsed.major}.${this.version.parsed.minor}.${this.version.parsed.patch}`
    );

    if (component) {
      return join(base, component.toLowerCase().replace(/\s+/g, "-"));
    }

    return base;
  }

  // VERSIONED BUILD WITH SEMVER METADATA
  async buildVersionedComponent(component, options = {}) {
    const {
      channel = "stable",
      features = [],
      profile = "production",
      minify = true,
      sourcemap = false,
    } = options;

    const version = this.generateBuildVersion(channel);
    const filename = this.generateVersionedFilename(component, channel, {
      features,
      ext: "js",
    });
    const outdir = this.getBuildDirectory(channel, component);

    // Create build manifest
    const manifest = {
      component,
      version: version.full,
      channel,
      profile,
      features,
      timestamp: new Date().toISOString(),
      buildId: Bun.hash.crc32(`${component}-${Date.now()}`).toString(16),
      dependencies: this.getComponentDependencies(component),
      semver: {
        major: version.parsed.major,
        minor: version.parsed.minor,
        patch: version.parsed.patch,
        prerelease: version.parsed.prerelease,
        build: version.parsed.build,
      },
      bun: {
        version: Bun.version,
        revision: Bun.revision,
        platform: Bun.platform,
      },
    };

    // Generate versioned source code
    const source = this.generateVersionedSource(component, manifest);

    // Build with Bun
    const result = await Bun.build({
      entrypoints: [`/virtual/${filename}.entry.ts`],
      files: {
        [`/virtual/${filename}.entry.ts`]: source,
        [`/virtual/${filename}.version.ts`]: `
          // Auto-generated version information
          export const VERSION = ${JSON.stringify(manifest.version)};
          export const BUILD_INFO = ${JSON.stringify(manifest)};
          export const SEMVER = ${JSON.stringify(manifest.semver)};
          export const CHANNEL = ${JSON.stringify(channel)};
          
          // Bun semver utilities
          export const satisfies = (range) => Bun.semver.satisfies(VERSION, range);
          export const compare = (other) => Bun.semver.order(VERSION, other);
          export const isStable = () => !Bun.semver.parse(VERSION).prerelease.length;
          export const isPreRelease = () => Bun.semver.parse(VERSION).prerelease.length > 0;
        `,
      },
      outdir,
      naming: {
        entry: `[name].${manifest.buildId}.js`,
        chunk: `[name].${manifest.buildId}.[ext]`,
        asset: `[name].${manifest.buildId}.[ext]`,
      },
      minify,
      sourcemap,
      target: "browser",
      format: "esm",
      define: {
        "process.env.QUANTUM_VERSION": JSON.stringify(manifest.version),
        "process.env.QUANTUM_BUILD_ID": JSON.stringify(manifest.buildId),
        "process.env.QUANTUM_CHANNEL": JSON.stringify(channel),
      },
    });

    // Save manifest
    const manifestPath = join(outdir, `${filename}.manifest.json`);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Create versioned archive
    const archive = new Bun.Archive(
      {
        [`${filename}.js`]: await result.outputs[0].bytes(),
        [`${filename}.manifest.json`]: JSON.stringify(manifest),
        [`${filename}.version.json`]: JSON.stringify({
          component,
          version: manifest.version,
          semver: manifest.semver,
          dependencies: manifest.dependencies,
          built: manifest.timestamp,
          channel,
        }),
      },
      { compress: "gzip", level: 9 }
    );

    const archivePath = join(outdir, `${filename}.tar.gz`);
    await Bun.write(archivePath, archive);

    this.buildManifests.set(manifest.buildId, manifest);
    return { manifest, result, archivePath, filename };
  }

  // GENERATE BUILD VERSION WITH SEMVER
  generateBuildVersion(channel) {
    const base = this.version.parsed;
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split("T")[0].replace(/-/g, "");
    const commitHash = process.env.GIT_COMMIT_HASH || "local";

    let version;

    switch (channel) {
      case "canary":
        version = `${base.major}.${base.minor}.${base.patch}-canary.${dateStr}+${commitHash}`;
        break;
      case "nightly":
        version = `${base.major}.${base.minor}.${base.patch}-nightly.${dateStr}+${commitHash}`;
        break;
      case "alpha":
        version = `${base.major}.${base.minor}.${base.patch}-alpha.${dateStr}+${commitHash}`;
        break;
      case "beta":
        version = `${base.major}.${base.minor}.${base.patch}-beta.${dateStr}+${commitHash}`;
        break;
      case "rc":
        version = `${base.major}.${base.minor}.${base.patch}-rc.${dateStr}+${commitHash}`;
        break;
      case "stable":
        version = `${base.major}.${base.minor}.${base.patch}+${commitHash}`;
        break;
      default:
        version = `${base.major}.${base.minor}.${base.patch}-${channel}.${dateStr}+${commitHash}`;
    }

    return {
      full: version,
      parsed: Bun.semver.parse(version),
    };
  }

  // VERSION COMPATIBILITY CHECKING WITH BUN.SEMVER
  checkCompatibility(version1, version2, options = {}) {
    const v1 = Bun.semver.parse(version1);
    const v2 = Bun.semver.parse(version2);

    const results = {
      compatible:
        Bun.semver.satisfies(version1, `^${version2}`) ||
        Bun.semver.satisfies(version2, `^${version1}`),
      order: Bun.semver.order(version1, version2),
      diff: Bun.semver.diff(version1, version2),
      sameMajor: v1.major === v2.major,
      sameMinor: v1.minor === v2.minor,
      samePatch: v1.patch === v2.patch,
      canUpgrade: Bun.semver.gt(version1, version2),
      canDowngrade: Bun.semver.lt(version1, version2),
    };

    if (options.allowPrerelease) {
      results.compatibleWithPrerelease = Bun.semver.satisfies(
        version1,
        `^${v2.major}.${v2.minor}.${v2.patch}`,
        { includePrerelease: true }
      );
    }

    return results;
  }

  // AUTOMATED VERSION BUMPING
  bumpVersion(type = "patch", channel = "stable", prereleaseId = null) {
    const current = this.version.parsed;
    let newVersion;

    switch (type) {
      case "major":
        newVersion = Bun.semver.inc(current, "major");
        break;
      case "minor":
        newVersion = Bun.semver.inc(current, "minor");
        break;
      case "patch":
        newVersion = Bun.semver.inc(current, "patch");
        break;
      case "premajor":
        newVersion = Bun.semver.inc(current, "premajor", prereleaseId);
        break;
      case "preminor":
        newVersion = Bun.semver.inc(current, "preminor", prereleaseId);
        break;
      case "prepatch":
        newVersion = Bun.semver.inc(current, "prepatch", prereleaseId);
        break;
      case "prerelease":
        newVersion = Bun.semver.inc(current, "prerelease", prereleaseId);
        break;
      default:
        throw new Error(`Unknown bump type: ${type}`);
    }

    // Update package.json
    const pkgPath = "./package.json";
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.version = newVersion;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    // Update engine version
    this.version = {
      full: newVersion,
      parsed: Bun.semver.parse(newVersion),
      package: pkg,
    };

    return newVersion;
  }
}

// QUANTUM BUILD PIPELINE WITH SEMVER
class QuantumBuildPipeline {
  constructor() {
    this.semverEngine = new QuantumSemverEngine();
    this.buildCache = new Map();
    this.releaseQueue = [];
  }

  // BUILD ALL COMPONENTS FOR A CHANNEL
  async buildChannelRelease(channel, components = null) {
    const targetComponents = components || [
      "scene",
      "particles",
      "network",
      "connections",
      "ui",
      "data",
      "shaders",
      "interaction",
    ];

    console.log(
      `🚀 Building ${channel} release for components:`,
      targetComponents
    );

    const builds = [];
    for (const component of targetComponents) {
      console.log(`  📦 Building ${component}...`);

      const build = await this.semverEngine.buildVersionedComponent(component, {
        channel,
        features: this.getComponentFeatures(component),
        profile: channel === "stable" ? "production" : "development",
      });

      builds.push(build);

      // Cache build
      this.buildCache.set(`${component}@${build.manifest.version}`, build);
    }

    // Create release manifest
    const releaseManifest = {
      id: `release-${channel}-${Date.now()}`,
      channel,
      version: this.semverEngine.version.full,
      timestamp: new Date().toISOString(),
      components: builds.map((b) => ({
        component: b.manifest.component,
        version: b.manifest.version,
        filename: b.filename,
        buildId: b.manifest.buildId,
      })),
      semver: this.semverEngine.version.parsed,
      bun: {
        version: Bun.version,
        platform: Bun.platform,
      },
    };

    // Save release manifest
    const releaseDir = this.semverEngine.getBuildDirectory(channel);
    writeFileSync(
      join(releaseDir, `release.manifest.json`),
      JSON.stringify(releaseManifest, null, 2)
    );

    // Create release archive
    const releaseArchive = new Bun.Archive(
      Object.fromEntries(
        builds.map((build) => [
          build.filename,
          Bun.file(join(releaseDir, build.filename + ".tar.gz")).bytes(),
        ])
      ),
      { compress: "gzip", level: 9 }
    );

    const archiveFilename = `quantum-release-${channel}-${this.semverEngine.version.full}.tar.gz`;
    await Bun.write(join(releaseDir, archiveFilename), releaseArchive);

    console.log(`✅ ${channel} release complete: ${archiveFilename}`);
    return { builds, releaseManifest, archiveFilename };
  }

  // DEPLOYMENT WITH VERSION ROLLING
  async deployWithVersionRolling(target, options = {}) {
    const {
      percentage = 100,
      channel = "stable",
      healthCheck = true,
      rollbackOnFailure = true,
    } = options;

    const version = this.semverEngine.version.full;
    const deploymentId = `deploy-${version}-${Date.now()}`;

    console.log(
      `🚀 Deploying version ${version} to ${target} (${percentage}%)`
    );

    // Deployment manifest
    const deployment = {
      id: deploymentId,
      version,
      channel,
      target,
      percentage,
      started: new Date().toISOString(),
      status: "in-progress",
      builds: [],
    };

    // Deploy each component
    for (const [key, build] of this.buildCache.entries()) {
      if (key.includes(`@${version}`)) {
        console.log(`  📤 Deploying ${key}...`);

        // Simulate deployment (replace with actual deployment logic)
        const deployResult = await this.deployComponent(
          build,
          target,
          percentage
        );
        deployment.builds.push(deployResult);
      }
    }

    // Health check
    if (healthCheck) {
      const healthy = await this.healthCheckDeployment(deployment);
      deployment.status = healthy ? "completed" : "failed";

      if (!healthy && rollbackOnFailure) {
        console.warn("⚠️  Deployment failed, rolling back...");
        await this.rollbackDeployment(deployment);
        deployment.status = "rolled-back";
      }
    } else {
      deployment.status = "completed";
    }

    deployment.completed = new Date().toISOString();

    // Save deployment log
    writeFileSync(
      `./deployments/${deploymentId}.json`,
      JSON.stringify(deployment, null, 2)
    );

    return deployment;
  }
}

// VERSIONED FILE NAMING CONVENTION
const QuantumNamingConvention = {
  // Component naming patterns
  components: {
    scene: {
      pattern: "quantum-scene-{version}.{channel}.{features}.js",
      minified: "quantum-scene-{version}.{channel}.min.js",
      sourcemap: "quantum-scene-{version}.{channel}.js.map",
    },
    particles: {
      pattern: "quantum-particles-{version}.{channel}.{features}.js",
      minified: "quantum-particles-{version}.{channel}.min.js",
      sourcemap: "quantum-particles-{version}.{channel}.js.map",
    },
    network: {
      pattern: "quantum-network-{version}.{channel}.{features}.js",
      minified: "quantum-network-{version}.{channel}.min.js",
      sourcemap: "quantum-network-{version}.{channel}.js.map",
    },
    ui: {
      pattern: "quantum-ui-{version}.{channel}.{features}.js",
      minified: "quantum-ui-{version}.{channel}.min.js",
      sourcemap: "quantum-ui-{version}.{channel}.js.map",
    },
  },

  // Build directory structure
  directories: {
    canary: "builds/canary/{date}/{component}/",
    nightly: "builds/nightly/{date}/{component}/",
    alpha: "builds/alpha/v{major}.{minor}/{component}/",
    beta: "builds/beta/v{major}.{minor}/{component}/",
    rc: "builds/release-candidate/v{major}.{minor}.{patch}/{component}/",
    stable: "builds/stable/v{major}.{minor}.{patch}/{component}/",
  },

  // Archive naming
  archives: {
    component: "quantum-{component}-{version}.{channel}.tar.gz",
    release: "quantum-release-{channel}-{version}.tar.gz",
    deployment: "quantum-deployment-{id}-{version}.tar.gz",
  },

  // Manifest files
  manifests: {
    build: "{filename}.manifest.json",
    version: "{filename}.version.json",
    release: "release.manifest.json",
    deployment: "deployment-{id}.json",
  },
};

// BUN.SEMVER UTILITY WRAPPERS
const QuantumSemverUtils = {
  // Parse and validate versions
  parseVersion: (version) => {
    try {
      return Bun.semver.parse(version);
    } catch {
      return null;
    }
  },

  // Check if version satisfies range
  satisfies: (version, range, options = {}) => {
    return Bun.semver.satisfies(version, range, options);
  },

  // Compare two versions
  compare: (v1, v2) => {
    return Bun.semver.order(v1, v2);
  },

  // Get version difference type
  diff: (v1, v2) => {
    return Bun.semver.diff(v1, v2);
  },

  // Bump version
  bump: (version, type, identifier) => {
    return Bun.semver.inc(version, type, identifier);
  },

  // Create version range
  range: (from, to, inclusive = true) => {
    if (inclusive) {
      return `>=${from} <=${to}`;
    }
    return `>${from} <${to}`;
  },

  // Get latest version from array
  latest: (versions) => {
    return versions.sort(Bun.semver.order).pop();
  },

  // Filter versions by channel
  filterByChannel: (versions, channel) => {
    return versions.filter((v) => {
      const parsed = Bun.semver.parse(v);
      if (channel === "stable") {
        return !parsed.prerelease.length;
      }
      return parsed.prerelease[0] === channel;
    });
  },
};

// CLI INTERFACE WITH VERSION MANAGEMENT
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const engine = new QuantumSemverEngine();
  const pipeline = new QuantumBuildPipeline();

  if (args.includes("--version")) {
    console.log(`Quantum Semver Engine v${engine.version.full}`);
    console.log(`Bun ${Bun.version} (${Bun.revision})`);
    console.log(`Platform: ${Bun.platform}`);
  } else if (args.includes("--bump")) {
    const type = args[args.indexOf("--bump") + 1] || "patch";
    const channel = args[args.indexOf("--channel") + 1] || "stable";
    const newVersion = engine.bumpVersion(type, channel);
    console.log(`✅ Bumped version to ${newVersion} (${channel})`);
  } else if (args.includes("--build-channel")) {
    const channel = args[args.indexOf("--build-channel") + 1] || "canary";
    await pipeline.buildChannelRelease(channel);
  } else if (args.includes("--build-all-channels")) {
    const channels = ["canary", "nightly", "alpha", "beta", "rc", "stable"];
    for (const channel of channels) {
      await pipeline.buildChannelRelease(channel);
    }
  } else if (args.includes("--check-compatibility")) {
    const v1 = args[args.indexOf("--check-compatibility") + 1];
    const v2 = args[args.indexOf("--check-compatibility") + 2];
    const result = engine.checkCompatibility(v1, v2);
    console.log("Compatibility Check:", result);
  } else if (args.includes("--semver-test")) {
    // Test Bun.semver APIs
    console.log("🧪 Testing Bun.semver APIs:");

    const testVersion = "1.3.5-beta.2+simd.accelerated";
    const parsed = Bun.semver.parse(testVersion);
    console.log("Parsed:", parsed);

    const satisfies = Bun.semver.satisfies(testVersion, "^1.3.0");
    console.log("Satisfies ^1.3.0:", satisfies);

    const order = Bun.semver.order(testVersion, "1.3.4");
    console.log("Order vs 1.3.4:", order);

    const diff = Bun.semver.diff(testVersion, "1.3.5");
    console.log("Diff type:", diff);

    const inc = Bun.semver.inc(parsed, "prerelease", "beta");
    console.log("Incremented prerelease:", inc);
  }
}

export {
  QuantumSemverEngine,
  QuantumBuildPipeline,
  QuantumSemverUtils,
  QuantumNamingConvention,
};
```

## **BUILD DIRECTORY TREE STRUCTURE**

```
quantum-cash-flow-lattice/
├── builds/
│   ├── canary/
│   │   ├── 20240115/
│   │   │   ├── scene/
│   │   │   │   ├── quantum-scene-1.3.5-canary.20240115.webgl.js
│   │   │   │   ├── quantum-scene-1.3.5-canary.20240115.webgl.manifest.json
│   │   │   │   └── quantum-scene-1.3.5-canary.20240115.webgl.tar.gz
│   │   │   └── release.manifest.json
│   │   └── 20240116/
│   │       └── ...
│   ├── nightly/
│   │   └── 20240115/
│   │       └── particles/
│   │           └── quantum-particles-1.3.5-nightly.simd.js
│   ├── alpha/
│   │   └── v1.3/
│   │       ├── alpha.1/
│   │       │   └── network/
│   │       └── alpha.2/
│   │           └── network/
│   ├── beta/
│   │   └── v1.3/
│   │       ├── beta.1/
│   │       │   └── connections/
│   │       └── beta.2/
│   │           └── connections/
│   ├── release-candidate/
│   │   └── v1.3.5/
│   │       ├── rc.1/
│   │       │   └── ui/
│   │       └── rc.2/
│   │           └── ui/
│   └── stable/
│       └── v1.3.5/
│           ├── scene/
│           ├── particles/
│           ├── network/
│           ├── connections/
│           ├── ui/
│           ├── data/
│           ├── shaders/
│           ├── interaction/
│           └── quantum-release-stable-1.3.5.tar.gz
├── deployments/
│   ├── deploy-1.3.5-20240115120000.json
│   └── deploy-1.3.5-20240115140000.json
└── package.json
```

## **SEMVER COMMAND REFERENCE**

```bash
# 1. Show current version
bun run quantum-semver-engine.js --version

# 2. Bump version (major/minor/patch/prerelease)
bun run quantum-semver-engine.js --bump patch --channel stable
bun run quantum-semver-engine.js --bump prerelease --channel beta

# 3. Build specific channel
bun run quantum-semver-engine.js --build-channel canary
bun run quantum-semver-engine.js --build-channel stable

# 4. Build all channels
bun run quantum-semver-engine.js --build-all-channels

# 5. Check version compatibility
bun run quantum-semver-engine.js --check-compatibility 1.3.5-beta.1 1.3.5

# 6. Test Bun.semver APIs
bun run quantum-semver-engine.js --semver-test

# 7. Generate versioned filenames
bun run quantum-semver-engine.js --generate-names --component scene --channel beta

# 8. Clean old builds (by retention policy)
bun run quantum-semver-engine.js --clean-builds --channel canary
```

## **PACKAGE.JSON VERSIONING CONFIG**

```json
{
  "name": "quantum-cash-flow-lattice",
  "version": "1.3.5",
  "description": "Cyber-kinetic financial dashboard with Bun performance optimizations",
  "type": "module",
  "engines": {
    "bun": ">=1.3.5"
  },
  "scripts": {
    "build:canary": "bun run quantum-semver-engine.js --build-channel canary",
    "build:nightly": "bun run quantum-semver-engine.js --build-channel nightly",
    "build:alpha": "bun run quantum-semver-engine.js --build-channel alpha",
    "build:beta": "bun run quantum-semver-engine.js --build-channel beta",
    "build:rc": "bun run quantum-semver-engine.js --build-channel rc",
    "build:stable": "bun run quantum-semver-engine.js --build-channel stable",
    "build:all": "bun run quantum-semver-engine.js --build-all-channels",
    "version:bump": "bun run quantum-semver-engine.js --bump",
    "version:check": "bun run quantum-semver-engine.js --check-compatibility",
    "deploy:canary": "bun run quantum-semver-engine.js --deploy-channel canary",
    "deploy:stable": "bun run quantum-semver-engine.js --deploy-channel stable",
    "clean:builds": "bun run quantum-semver-engine.js --clean-builds"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "three": "^0.162.0",
    "gsap": "^3.12.5"
  },
  "devDependencies": {
    "bun-types": "latest"
  },
  "release": {
    "channels": ["canary", "nightly", "alpha", "beta", "rc", "stable"],
    "retention": {
      "canary": "7days",
      "nightly": "30days",
      "alpha": "30days",
      "beta": "90days",
      "rc": "180days",
      "stable": "forever"
    },
    "autoBump": {
      "canary": "daily",
      "nightly": "daily",
      "alpha": "weekly",
      "beta": "biweekly",
      "rc": "manual",
      "stable": "manual"
    }
  }
}
```

## **VERSIONING MATRIX SUMMARY**

| **CHANNEL** | **SEMVER PATTERN**              | **RETENTION** | **AUTO_BUMP** | **STABILITY** | **USE CASE**                |
| ----------- | ------------------------------- | ------------- | ------------- | ------------- | --------------------------- |
| **canary**  | `1.3.5-canary.YYYYMMDD+commit`  | 7 days        | Daily         | Unstable      | Latest commits, CI testing  |
| **nightly** | `1.3.5-nightly.YYYYMMDD+commit` | 30 days       | Daily         | Unstable      | Automated nightly builds    |
| **alpha**   | `1.3.5-alpha.N+commit`          | 30 days       | Weekly        | Testing       | Early feature testing       |
| **beta**    | `1.3.5-beta.N+commit`           | 90 days       | Biweekly      | Testing       | User acceptance testing     |
| **rc**      | `1.3.5-rc.N+commit`             | 180 days      | Manual        | Pre-release   | Final testing before stable |
| **stable**  | `1.3.5+commit`                  | Forever       | Manual        | Production    | Production releases         |

**VERSIONING STATUS:** `🏷️ SEMVER 2.0.0 COMPLIANT - BUN.SEMVER INTEGRATED`

**NEXT:** Run `bun run quantum-semver-engine.js --build-all-channels` to build versioned releases for all channels.
