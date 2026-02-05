/**
 * src/lib/executable-builder-r2.ts
 * Executable Builder with R2 Integration
 * - Build and deploy to Cloudflare R2
 * - Version management with rollback support
 * - Integrity verification
 * - CDN distribution
 */

import { ExecutableBuilder, type BuildOptions, type BuildResult } from "./executable-builder";
import { SkillIntegrity, type FileManifest } from "./hash-utils";
import { R2Storage, type R2Config, type CDNConfig, type UploadResult } from "../storage/r2-storage";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface VersionedBuild {
  skillId: string;
  version: string;
  buildId: string;
  timestamp: string;
  manifest: FileManifest;
  buildResult: {
    success: boolean;
    executablePath: string;
    size: number;
    checksum: string;
  };
  dependencies: DependencyInfo[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: "dependency" | "devDependency" | "peerDependency";
  resolved: string | null;
}

export interface DeploymentInfo {
  uploaded: boolean;
  cdnConfigured: boolean;
  urls: string[];
  uploadResult?: UploadResult;
  cdnConfig?: CDNConfig;
  error?: string;
}

export interface BuildAndDeployOptions extends BuildOptions {
  deployToR2?: boolean;
  cdnEnabled?: boolean;
  compressBundle?: boolean;
}

export interface BuildAndDeployResult extends BuildResult {
  deployment?: DeploymentInfo;
}

// ═══════════════════════════════════════════════════════════════════════════
// R2ExecutableBuilder Class
// ═══════════════════════════════════════════════════════════════════════════

export class R2ExecutableBuilder extends ExecutableBuilder {
  private r2Storage: R2Storage | null = null;
  private versionsDir: string;

  constructor(
    r2Config?: R2Config,
    options: { cacheDir?: string } = {}
  ) {
    super(options);
    this.versionsDir = "./.build-cache/versions";

    if (r2Config) {
      this.r2Storage = new R2Storage(r2Config);
    }

    // Ensure versions directory exists
    this.ensureVersionsDir();
  }

  private async ensureVersionsDir(): Promise<void> {
    const dir = Bun.file(this.versionsDir);
    if (!(await dir.exists())) {
      await Bun.write(`${this.versionsDir}/.gitkeep`, "");
    }
  }

  /**
   * Build and optionally deploy to R2
   */
  async buildAndDeploy(
    skillId: string,
    options: BuildAndDeployOptions = {}
  ): Promise<BuildAndDeployResult> {
    const startTime = performance.now();

    // 1. Build the executable
    const buildResult = await this.buildSkillExecutable(skillId, options);

    if (!buildResult.success) {
      return { ...buildResult, deployment: undefined };
    }

    const deployment: DeploymentInfo = {
      uploaded: false,
      cdnConfigured: false,
      urls: [],
    };

    // 2. Upload to R2 if requested and configured
    if (options.deployToR2 && this.r2Storage) {
      try {
        // Get the bundle path (executable or compressed)
        const bundlePath = buildResult.compressedPath || buildResult.executablePath;

        const uploadResult = await this.r2Storage.uploadSkillBundle(
          skillId,
          bundlePath,
          {
            version: buildResult.metadata.skill?.version || "1.0.0",
            compress: options.compressBundle && !buildResult.compressedPath,
            metadata: {
              build: buildResult.metadata,
              stats: buildResult.stats,
              integrityHash: SkillIntegrity.calculateSkillHash(`./skills/${skillId}`),
            },
            public: true,
          }
        );

        if (uploadResult.success) {
          deployment.uploaded = true;
          deployment.uploadResult = uploadResult;
          deployment.urls.push(uploadResult.url);

          // 3. Configure CDN if requested
          if (options.cdnEnabled) {
            const cdnConfig = await this.r2Storage.createSkillCDN(skillId, {
              enableCompression: options.compressBundle,
            });

            deployment.cdnConfigured = true;
            deployment.cdnConfig = cdnConfig;
            deployment.urls.push(`https://${cdnConfig.domain}`);
          }

          // 4. Update build cache with R2 info
          await this.updateBuildCacheWithR2(skillId, buildResult, deployment);
        } else {
          deployment.error = uploadResult.error;
        }
      } catch (error: any) {
        console.warn(`R2 deployment failed: ${error.message}`);
        deployment.error = error.message;
      }
    } else if (options.deployToR2 && !this.r2Storage) {
      deployment.error = "R2 storage not configured";
    }

    const totalTime = performance.now() - startTime;

    return {
      ...buildResult,
      deployment,
      stats: {
        ...buildResult.stats,
        totalTime,
        deploymentTime: totalTime - (buildResult.stats?.buildTime || 0),
      },
    };
  }

  /**
   * Create a versioned build with manifest
   */
  async createVersionedBuild(
    skillId: string,
    version: string,
    options: BuildOptions = {}
  ): Promise<VersionedBuild> {
    // 1. Create manifest for current skill state
    const skillDir = `./skills/${skillId}`;
    const manifest = await SkillIntegrity.createFileManifest(skillDir);

    // 2. Build executable with version info
    const buildOptions: BuildOptions = {
      ...options,
      metadata: {
        ...options.metadata,
        version,
        manifestHash: manifest.manifestHash,
        buildType: "versioned",
      },
    };

    const buildResult = await this.buildSkillExecutable(skillId, buildOptions);

    // 3. Store version metadata
    const versionedBuild: VersionedBuild = {
      skillId,
      version,
      buildId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      manifest,
      buildResult: {
        success: buildResult.success,
        executablePath: buildResult.executablePath,
        size: buildResult.size,
        checksum: buildResult.metadata.checksum || "",
      },
      dependencies: await this.extractDependencies(skillId),
    };

    // 4. Store in version history
    await this.storeVersionHistory(skillId, versionedBuild);

    return versionedBuild;
  }

  /**
   * Get version history for a skill
   */
  async getVersionHistory(skillId: string): Promise<VersionedBuild[]> {
    const historyPath = `${this.versionsDir}/${skillId}.json`;
    const file = Bun.file(historyPath);

    if (!(await file.exists())) {
      return [];
    }

    try {
      return JSON.parse(await file.text());
    } catch {
      return [];
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(
    skillId: string,
    targetVersion: string
  ): Promise<boolean> {
    // 1. Get version history
    const history = await this.getVersionHistory(skillId);
    const targetBuild = history.find((v) => v.version === targetVersion);

    if (!targetBuild) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    // 2. Verify integrity of target version
    const skillDir = `./skills/${skillId}`;
    const verification = await SkillIntegrity.verifyManifest(
      targetBuild.manifest,
      skillDir
    );

    if (!verification.valid) {
      console.warn(`Integrity check failed for version ${targetVersion}`);
      console.warn("Mismatched files:", verification.mismatchedFiles);
      console.warn("Missing files:", verification.missingFiles);
    }

    // 3. Check if executable exists, restore from R2 if not
    const executableExists = await Bun.file(targetBuild.buildResult.executablePath).exists();

    if (!executableExists && this.r2Storage) {
      console.log(`Downloading version ${targetVersion} from R2...`);

      const tempPath = `/tmp/${skillId}-${targetVersion}`;
      const download = await this.r2Storage.downloadSkillBundle(
        skillId,
        targetVersion,
        tempPath
      );

      if (!download.success) {
        throw new Error(`Failed to download version ${targetVersion}: ${download.error}`);
      }

      targetBuild.buildResult.executablePath = tempPath;
    } else if (!executableExists) {
      throw new Error(
        `Executable not found and R2 not configured for version ${targetVersion}`
      );
    }

    // 4. Switch to this version
    await this.switchVersion(skillId, targetBuild);

    return true;
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    skillId: string,
    versionA: string,
    versionB: string
  ): Promise<{
    added: string[];
    removed: string[];
    modified: string[];
    unchanged: string[];
  }> {
    const history = await this.getVersionHistory(skillId);
    const buildA = history.find((v) => v.version === versionA);
    const buildB = history.find((v) => v.version === versionB);

    if (!buildA || !buildB) {
      throw new Error("One or both versions not found");
    }

    return SkillIntegrity.compareManifests(buildA.manifest, buildB.manifest);
  }

  /**
   * Clean old versions, keeping only the latest N
   */
  async pruneVersions(skillId: string, keepCount: number = 5): Promise<number> {
    const history = await this.getVersionHistory(skillId);

    if (history.length <= keepCount) {
      return 0;
    }

    // Sort by timestamp (newest first)
    history.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const toKeep = history.slice(0, keepCount);
    const toDelete = history.slice(keepCount);

    // Delete old versions from R2
    if (this.r2Storage) {
      for (const version of toDelete) {
        try {
          await this.r2Storage.deleteVersion(skillId, version.version);
        } catch (error) {
          console.warn(`Failed to delete version ${version.version} from R2`);
        }
      }
    }

    // Update history
    const historyPath = `${this.versionsDir}/${skillId}.json`;
    await Bun.write(historyPath, JSON.stringify(toKeep, null, 2));

    return toDelete.length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private async updateBuildCacheWithR2(
    skillId: string,
    buildResult: BuildResult,
    deployment: DeploymentInfo
  ): Promise<void> {
    // Store deployment info in the build metadata
    const db = this.getBuildCache();

    try {
      db.run(
        `UPDATE builds
         SET metadata = json_set(metadata, '$.r2', ?)
         WHERE skill_id = ? AND target = ?`,
        [
          JSON.stringify(deployment),
          skillId,
          buildResult.metadata.target || "default",
        ]
      );
    } catch (error) {
      // Ignore update errors
    }
  }

  private async storeVersionHistory(
    skillId: string,
    versionedBuild: VersionedBuild
  ): Promise<void> {
    const historyPath = `${this.versionsDir}/${skillId}.json`;
    let history: VersionedBuild[] = [];

    const file = Bun.file(historyPath);
    if (await file.exists()) {
      try {
        history = JSON.parse(await file.text());
      } catch {
        history = [];
      }
    }

    // Remove existing entry for this version
    history = history.filter((v) => v.version !== versionedBuild.version);

    // Add new entry
    history.push(versionedBuild);

    // Sort by timestamp (newest first)
    history.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Keep only last 10 versions
    if (history.length > 10) {
      history = history.slice(0, 10);
    }

    await Bun.write(historyPath, JSON.stringify(history, null, 2));
  }

  private async extractDependencies(skillId: string): Promise<DependencyInfo[]> {
    const skillDir = `./skills/${skillId}`;
    const packageJson = `${skillDir}/package.json`;
    const file = Bun.file(packageJson);

    if (!(await file.exists())) {
      return [];
    }

    try {
      const pkg = JSON.parse(await file.text());
      const deps: DependencyInfo[] = [];

      // Check direct dependencies
      for (const [name, version] of Object.entries(pkg.dependencies || {})) {
        deps.push({
          name,
          version: version as string,
          type: "dependency",
          resolved: await this.resolveDependencyVersion(skillId, name),
        });
      }

      // Check dev dependencies
      for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
        deps.push({
          name,
          version: version as string,
          type: "devDependency",
          resolved: await this.resolveDependencyVersion(skillId, name),
        });
      }

      // Check peer dependencies
      for (const [name, version] of Object.entries(pkg.peerDependencies || {})) {
        deps.push({
          name,
          version: version as string,
          type: "peerDependency",
          resolved: await this.resolveDependencyVersion(skillId, name),
        });
      }

      return deps;
    } catch {
      return [];
    }
  }

  private async resolveDependencyVersion(
    skillId: string,
    depName: string
  ): Promise<string | null> {
    try {
      const nodeModulesPath = `./skills/${skillId}/node_modules/${depName}/package.json`;
      const file = Bun.file(nodeModulesPath);

      if (await file.exists()) {
        const depPkg = JSON.parse(await file.text());
        return depPkg.version;
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  private async switchVersion(
    skillId: string,
    versionedBuild: VersionedBuild
  ): Promise<void> {
    const distDir = "./dist";
    const currentLink = `${distDir}/${skillId}-current`;

    // Remove existing symlink
    try {
      const result = Bun.spawnSync(["rm", "-f", currentLink]);
    } catch {
      // Ignore errors
    }

    // Create new symlink
    Bun.spawnSync([
      "ln",
      "-sf",
      versionedBuild.buildResult.executablePath,
      currentLink,
    ]);

    // Update skill.json version
    const skillJson = `./skills/${skillId}/skill.json`;
    const skillFile = Bun.file(skillJson);

    if (await skillFile.exists()) {
      try {
        const skill = JSON.parse(await skillFile.text());
        skill.previousVersion = skill.version;
        skill.version = versionedBuild.version;
        skill.lastSwitched = new Date().toISOString();
        await Bun.write(skillJson, JSON.stringify(skill, null, 2));
      } catch {
        // Ignore errors
      }
    }

    console.log(`Switched ${skillId} to version ${versionedBuild.version}`);
  }
}

/**
 * Create R2ExecutableBuilder from environment variables
 */
export function createR2BuilderFromEnv(
  options: { cacheDir?: string } = {}
): R2ExecutableBuilder {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  let r2Config: R2Config | undefined;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    r2Config = {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
      publicUrl: process.env.R2_PUBLIC_URL,
      region: process.env.R2_REGION,
    };
  }

  return new R2ExecutableBuilder(r2Config, options);
}

export default R2ExecutableBuilder;
