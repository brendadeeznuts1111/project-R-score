/**
 * src/lib/executable-builder-s3.ts
 * Executable Builder with Direct S3/R2 Integration
 * - Build and upload in one step
 * - Multi-platform distribution
 * - CDN deployment with Workers
 * - Remote installation support
 */

import * as path from "path";
import {
  ExecutableBuilder,
  type BuildOptions,
  type BuildResult,
  type BuildTarget,
} from "./executable-builder";
import {
  BunR2Storage,
  type R2StorageConfig,
  type UploadResult,
} from "../storage/bun-r2-storage";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface S3BuilderConfig {
  bucket: string;
  endpoint?: string;
  accountId?: string;
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  publicUrl?: string;
}

export interface BuildAndUploadResult {
  skillId: string;
  builds: Array<{
    platform: string;
    success: boolean;
    size: number;
    executablePath: string;
    error?: string;
  }>;
  uploads: Array<{
    platform: string;
    success: boolean;
    url: string;
    downloadUrl: string;
    size: number;
    checksum: string;
    error?: string;
  }>;
  errors: string[];
  totalSize: number;
  totalTime: number;
}

export interface DistributionManifest {
  skillId: string;
  createdAt: string;
  versions: Record<
    string,
    {
      version: string;
      platforms: Array<{
        platform: string;
        arch: string;
        size: number;
        checksum: string;
        downloadUrl: string;
        uploaded: string;
      }>;
      metadata?: Record<string, any>;
    }
  >;
  manifestUrl?: string;
  latestUrl?: string;
}

export interface CDNDeployment {
  skillId: string;
  manifestUrl: string;
  latestUrl: string;
  workerUrl: string;
  customDomain?: string;
  deployedAt: string;
  stats: {
    versions: number;
    totalPlatforms: number;
  };
}

export interface InstallResult {
  success: boolean;
  skillId: string;
  version: string;
  platform: string;
  installedPath: string;
  checksum: string;
  size: number;
  manifest?: Record<string, any>;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// S3ExecutableBuilder Class
// ═══════════════════════════════════════════════════════════════════════════

export class S3ExecutableBuilder extends ExecutableBuilder {
  private storage: BunR2Storage;
  private s3Config: S3BuilderConfig;

  constructor(
    s3Config: S3BuilderConfig,
    options: { cacheDir?: string } = {}
  ) {
    super(options);

    this.s3Config = s3Config;
    this.storage = new BunR2Storage({
      bucket: s3Config.bucket,
      endpoint: s3Config.endpoint,
      accountId: s3Config.accountId,
      region: s3Config.region,
      credentials: s3Config.credentials,
      publicUrl: s3Config.publicUrl,
    });
  }

  /**
   * Build and directly upload to S3/R2
   */
  async buildAndUpload(
    skillId: string,
    buildOptions: BuildOptions = {},
    uploadOptions: {
      platforms?: string[];
      compress?: boolean;
      downloadName?: string;
      public?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<BuildAndUploadResult> {
    const startTime = performance.now();
    const results: BuildAndUploadResult = {
      skillId,
      builds: [],
      uploads: [],
      errors: [],
      totalSize: 0,
      totalTime: 0,
    };

    // Determine platforms to build for
    const platforms = uploadOptions.platforms || [
      "linux-x64",
      "linux-arm64",
      "macos-x64",
      "macos-arm64",
      "windows-x64",
    ];

    console.log(
      `Building and uploading ${skillId} for ${platforms.length} platforms`
    );

    // Build for each platform
    for (const platform of platforms) {
      const target = this.platformToTarget(platform);

      try {
        // 1. Build executable
        console.log(`  Building for ${platform}...`);

        const buildResult = await this.buildSkillExecutable(skillId, {
          ...buildOptions,
          target,
        });

        if (!buildResult.success) {
          const errorMsg = `Build failed for ${platform}: ${buildResult.logs.join(", ")}`;
          results.errors.push(errorMsg);
          results.builds.push({
            platform,
            success: false,
            size: 0,
            executablePath: "",
            error: errorMsg,
          });
          continue;
        }

        results.builds.push({
          platform,
          success: true,
          size: buildResult.size,
          executablePath: buildResult.executablePath,
        });

        // 2. Upload to S3/R2
        console.log(`  Uploading ${platform} executable...`);

        const [platformOs, platformArch] = platform.split("-");

        const uploadResult = await this.storage.uploadExecutable(
          skillId,
          buildResult.executablePath,
          {
            version: buildOptions.metadata?.version || "1.0.0",
            platform: platformOs,
            arch: platformArch,
            compress: uploadOptions.compress,
            downloadName:
              uploadOptions.downloadName || `${skillId}-${platform}`,
            metadata: {
              ...uploadOptions.metadata,
              buildTime: buildResult.stats?.buildTime,
              buildChecksum: buildResult.metadata.checksum,
              target: buildResult.metadata.target,
            },
          }
        );

        if (!uploadResult.success) {
          const errorMsg = `Upload failed for ${platform}: ${uploadResult.error}`;
          results.errors.push(errorMsg);
          results.uploads.push({
            platform,
            success: false,
            url: "",
            downloadUrl: "",
            size: 0,
            checksum: "",
            error: errorMsg,
          });
          continue;
        }

        results.uploads.push({
          platform,
          success: true,
          url: uploadResult.url,
          downloadUrl: uploadResult.downloadUrl,
          size: uploadResult.size,
          checksum: uploadResult.checksum,
        });

        results.totalSize += uploadResult.size;

        console.log(
          `  ${platform}: ${(uploadResult.size / 1024 / 1024).toFixed(2)} MB`
        );
      } catch (error: any) {
        const errorMsg = `${platform}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`  ${platform} failed:`, error.message);
      }
    }

    results.totalTime = performance.now() - startTime;

    return results;
  }

  /**
   * Create a distribution manifest for all uploaded versions
   */
  async createDistributionManifest(
    skillId: string
  ): Promise<DistributionManifest> {
    const versions = await this.storage.listSkillVersions(skillId);

    const manifest: DistributionManifest = {
      skillId,
      createdAt: new Date().toISOString(),
      versions: {},
    };

    // Group by version
    for (const version of versions) {
      const ver = version.version;
      if (!manifest.versions[ver]) {
        manifest.versions[ver] = {
          version: ver,
          platforms: [],
          metadata: version.metadata,
        };
      }

      manifest.versions[ver].platforms.push({
        platform: version.platform,
        arch: version.arch,
        size: version.size,
        checksum: version.checksum,
        downloadUrl: version.downloadUrl,
        uploaded: version.uploaded,
      });
    }

    // Upload the manifest itself
    const manifestData = JSON.stringify(manifest, null, 2);
    const manifestKey = `skills/${skillId}/manifest.json`;

    await this.uploadManifest(manifestKey, manifestData);

    // Also upload as latest
    const latestKey = `skills/${skillId}/latest.json`;
    await this.uploadManifest(latestKey, manifestData);

    manifest.manifestUrl = this.storage.getPublicUrl(manifestKey);
    manifest.latestUrl = this.storage.getPublicUrl(latestKey);

    return manifest;
  }

  /**
   * Deploy skill to CDN with Cloudflare Workers integration
   */
  async deployToCDN(
    skillId: string,
    options: {
      workerScript?: string;
      routes?: string[];
      cacheTtl?: number;
      cors?: boolean;
    } = {}
  ): Promise<CDNDeployment> {
    // 1. Create distribution manifest
    const manifest = await this.createDistributionManifest(skillId);

    // 2. Generate worker script if not provided
    const workerScript =
      options.workerScript || this.generateWorkerScript(skillId, manifest);

    // 3. Deploy Cloudflare Worker (placeholder - would use Cloudflare API)
    const workerUrl = await this.deployWorker(skillId, workerScript);

    // 4. Set up custom domain (optional)
    let customDomain: string | undefined;
    if (options.routes && options.routes.length > 0) {
      customDomain = options.routes[0];
    }

    return {
      skillId,
      manifestUrl: manifest.manifestUrl || "",
      latestUrl: manifest.latestUrl || "",
      workerUrl,
      customDomain,
      deployedAt: new Date().toISOString(),
      stats: {
        versions: Object.keys(manifest.versions).length,
        totalPlatforms: Object.values(manifest.versions).reduce(
          (sum, v) => sum + v.platforms.length,
          0
        ),
      },
    };
  }

  /**
   * Download and install skill from S3/R2
   */
  async installFromRemote(
    skillId: string,
    version: string = "latest",
    platform: string = this.detectPlatform()
  ): Promise<InstallResult> {
    console.log(`Installing ${skillId} v${version} for ${platform}...`);

    try {
      // 1. Fetch manifest to find the right file
      const manifestKey = `skills/${skillId}/manifest.json`;
      const manifestInfo = await this.storage.getObjectInfo(manifestKey);

      if (!manifestInfo) {
        throw new Error(`Manifest not found for skill: ${skillId}`);
      }

      // Download manifest
      const manifestPath = `/tmp/${skillId}-manifest.json`;
      const downloadResult = await this.storage.downloadExecutable(
        manifestKey,
        manifestPath
      );

      if (!downloadResult.success) {
        throw new Error(`Failed to download manifest: ${downloadResult.error}`);
      }

      const manifestText = await Bun.file(manifestPath).text();
      const manifest = JSON.parse(manifestText) as DistributionManifest;

      // 2. Find the specific version and platform
      const targetVersion =
        version === "latest"
          ? Object.keys(manifest.versions).sort().pop()!
          : version;

      const versionInfo = manifest.versions[targetVersion];
      if (!versionInfo) {
        throw new Error(`Version ${targetVersion} not found`);
      }

      const [platformOs, platformArch] = platform.split("-");
      const platformInfo = versionInfo.platforms.find(
        (p) => p.platform === platformOs && p.arch === platformArch
      );

      if (!platformInfo) {
        throw new Error(
          `Platform ${platform} not found for version ${targetVersion}`
        );
      }

      // 3. Download the executable
      const installDir = `./skills/${skillId}/bin/${targetVersion}`;
      Bun.spawnSync(["mkdir", "-p", installDir]);

      let targetFile = `${installDir}/${skillId}`;
      if (platform.includes("windows")) {
        targetFile += ".exe";
      }

      // Extract key from download URL
      const downloadKey = this.extractKeyFromUrl(platformInfo.downloadUrl);

      let progress = 0;
      const execDownloadResult = await this.storage.downloadExecutable(
        downloadKey,
        targetFile,
        {
          progress: (percentage) => {
            if (percentage > progress + 10) {
              progress = percentage;
              process.stdout.write(`\rDownloading: ${percentage}%`);
            }
          },
          verifyChecksum: true,
        }
      );

      console.log(""); // New line after progress

      if (!execDownloadResult.success) {
        throw new Error(
          `Download failed: ${execDownloadResult.error}`
        );
      }

      if (!execDownloadResult.checksumValid) {
        console.warn("Warning: Checksum verification failed");
      }

      // 4. Decompress if gzipped
      const fileData = await Bun.file(targetFile).bytes();
      const isGzip = fileData[0] === 0x1f && fileData[1] === 0x8b;
      if (isGzip) {
        console.log("Decompressing...");
        const decompressed = Bun.gunzipSync(fileData);
        await Bun.write(targetFile, decompressed);
      }

      // 5. Make executable (Unix-like systems)
      if (!platform.includes("windows")) {
        Bun.spawnSync(["chmod", "+x", targetFile]);
      }

      // 5. Create symlink to latest
      const latestLink = `./skills/${skillId}/bin/latest`;
      Bun.spawnSync(["rm", "-f", latestLink]);
      Bun.spawnSync(["ln", "-sf", path.resolve(targetFile), latestLink]);

      // 6. Update skill.json
      await this.updateSkillJson(skillId, targetVersion, platformInfo, targetFile);

      console.log(`Installed ${skillId} v${targetVersion} to ${targetFile}`);

      return {
        success: true,
        skillId,
        version: targetVersion,
        platform,
        installedPath: targetFile,
        checksum: platformInfo.checksum,
        size: execDownloadResult.size || 0,
        manifest: versionInfo.metadata,
      };
    } catch (error: any) {
      return {
        success: false,
        skillId,
        version,
        platform,
        installedPath: "",
        checksum: "",
        size: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get storage instance for direct access
   */
  getStorage(): BunR2Storage {
    return this.storage;
  }

  /**
   * Detect current platform
   */
  detectPlatform(): string {
    const platform = process.platform;
    const arch = process.arch;

    if (platform === "darwin") {
      return `macos-${arch === "arm64" ? "arm64" : "x64"}`;
    } else if (platform === "linux") {
      return `linux-${arch === "arm64" ? "arm64" : "x64"}`;
    } else if (platform === "win32") {
      return "windows-x64";
    }

    return "linux-x64";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private platformToTarget(platform: string): BuildTarget {
    const [os, arch] = platform.split("-");

    switch (os) {
      case "linux":
        return arch === "arm64" ? "bun-linux-arm64" : "bun-linux-x64";
      case "macos":
        return arch === "arm64" ? "bun-macos-arm64" : "bun-macos-x64";
      case "windows":
        return "bun-windows-x64";
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async uploadManifest(key: string, data: string): Promise<void> {
    // Upload manifest directly using putObject
    const dataBytes = new TextEncoder().encode(data);
    await this.storage.putObject(key, dataBytes, {
      contentType: "application/json",
    });
  }

  private generateWorkerScript(
    skillId: string,
    manifest: DistributionManifest
  ): string {
    const manifestJson = JSON.stringify(manifest, null, 2);

    return `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const manifest = ${manifestJson};

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Serve manifest
  if (path === '/manifest.json' || path === '/latest.json') {
    return new Response(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders,
      }
    })
  }

  // Redirect to download
  if (path.startsWith('/download/')) {
    const parts = path.split('/')
    const version = parts[2] || 'latest'
    const platform = parts[3]

    const targetVersion = version === 'latest'
      ? Object.keys(manifest.versions).sort().pop()
      : version

    const versionInfo = manifest.versions[targetVersion]
    if (!versionInfo) {
      return new Response('Version not found', { status: 404, headers: corsHeaders })
    }

    const [platformOs, platformArch] = (platform || '').split('-')
    const platformInfo = versionInfo.platforms.find(p =>
      p.platform === platformOs && p.arch === platformArch
    )

    if (!platformInfo) {
      return new Response('Platform not found', { status: 404, headers: corsHeaders })
    }

    return Response.redirect(platformInfo.downloadUrl, 302)
  }

  // Serve landing page
  return new Response(generateHTML(), {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600',
      ...corsHeaders,
    }
  })
}

function generateHTML() {
  const versions = Object.entries(manifest.versions)
    .map(([v, info]) => {
      const platforms = info.platforms
        .map(p => \`<li><a href="/download/\${v}/\${p.platform}-\${p.arch}">\${p.platform}-\${p.arch}</a> (\${(p.size / 1024 / 1024).toFixed(2)} MB)</li>\`)
        .join('')
      return \`<li><strong>\${v}</strong><ul>\${platforms}</ul></li>\`
    })
    .join('')

  return \`<!DOCTYPE html>
<html>
<head>
  <title>${skillId} - Skill Distribution</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 1rem; }
    h1 { color: #333; }
    ul { line-height: 1.8; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>${skillId}</h1>
  <p>Available versions:</p>
  <ul>\${versions}</ul>
  <hr>
  <p><a href="/manifest.json">View manifest</a></p>
</body>
</html>\`
}
`;
  }

  private async deployWorker(
    skillId: string,
    script: string
  ): Promise<string> {
    // Placeholder for Cloudflare Workers API deployment
    // In production, use the Cloudflare API to deploy
    console.log(`Worker script generated for ${skillId} (${script.length} bytes)`);
    return `https://${skillId}.skills.workers.dev`;
  }

  private extractKeyFromUrl(url: string): string {
    // Extract the S3 key from a full URL
    // URL format: https://endpoint/bucket/key - need to skip the bucket name
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.slice(1).split("/"); // Remove leading slash and split

    // First part is bucket name, rest is the key
    if (pathParts.length > 1) {
      return pathParts.slice(1).join("/");
    }
    return urlObj.pathname.slice(1);
  }

  private async updateSkillJson(
    skillId: string,
    version: string,
    platformInfo: any,
    executablePath: string
  ): Promise<void> {
    const skillJsonPath = `./skills/${skillId}/skill.json`;
    const file = Bun.file(skillJsonPath);

    let skillJson: any = {};
    if (await file.exists()) {
      try {
        skillJson = JSON.parse(await file.text());
      } catch {
        // Start fresh if parse fails
      }
    }

    skillJson = {
      ...skillJson,
      id: skillId,
      name: skillJson.name || skillId,
      version,
      installedFrom: platformInfo.downloadUrl,
      installedAt: new Date().toISOString(),
      executable: executablePath,
      checksum: platformInfo.checksum,
    };

    await Bun.write(skillJsonPath, JSON.stringify(skillJson, null, 2));
  }
}

/**
 * Create S3ExecutableBuilder from environment variables
 */
export function createS3BuilderFromEnv(
  options: { cacheDir?: string } = {}
): S3ExecutableBuilder | null {
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3ExecutableBuilder(
    {
      bucket,
      accountId: process.env.R2_ACCOUNT_ID,
      endpoint: process.env.R2_ENDPOINT,
      region: process.env.R2_REGION,
      publicUrl: process.env.R2_PUBLIC_URL,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    },
    options
  );
}

export default S3ExecutableBuilder;
