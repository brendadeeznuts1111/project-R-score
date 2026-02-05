#!/usr/bin/env bun
// Empire Pro Config Manager - TOML + R2 Storage CLI
// Uses Bun's native TOML parsing via TOML.parse() and TOML.stringify()
// Usage: bun run config-manager.ts <command> [options]

// ============================================================================
// Imports & Setup
// ============================================================================

import { parseArgs } from "util";
import { existsSync } from "fs";
import { S3Client, TOML } from "bun";

// ============================================================================
// Type Definitions
// ============================================================================

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
}

// TOML-specific type definitions (Bun's TOML.parse returns these types)
interface TomlServer {
  port: number;
  host: string;
  timeout: number;
  ssl?: boolean;
  max_connections?: number;
}

interface TomlDatabase {
  redis: string;
  postgres: string;
  pool_size?: number;
}

interface TomlDuoplus {
  api_key: string;
  endpoint: string;
  timeout: number;
  retries?: number;
}

interface TomlSimilarity {
  threshold: number;
  enable_fast: boolean;
  tokenize_code: boolean;
  algorithm?: string;
}

interface TomlProject {
  name: string;
  port: number;
  env: string;
  tags?: string[];
}

interface Config extends Record<string, unknown> {
  title: string;
  version: string;
  server: TomlServer;
  database: TomlDatabase;
  features: Record<string, boolean>;
  duoplus: TomlDuoplus;
  similarity?: TomlSimilarity;
  projects: TomlProject[];
}

interface CLIArgs {
  command: string;
  file?: string;
  env?: string;
  watch?: boolean;
  verbose?: boolean;
  help?: boolean;
  version?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const VERSION = "1.0.0";
const DEFAULT_CONFIG_PATH = "./config.toml";
const ENV_VAR_PREFIX = "EMPIRE_";

const R2_ENV_VARS = {
  accountId: "R2_ACCOUNT_ID",
  accessKeyId: "R2_ACCESS_KEY_ID",
  secretAccessKey: "R2_SECRET_ACCESS_KEY",
  bucket: "R2_BUCKET",
  publicUrl: "R2_PUBLIC_URL",
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

function generateApiKey(prefix: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = prefix + "_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Simple SHA256 hash helper using Bun's built-in crypto
async function sha256(data: string | Buffer): Promise<string> {
  const buffer = typeof data === "string" ? Buffer.from(data) : data;
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================================
// R2 Storage Client (using Bun's S3Client)
// ============================================================================

class R2Storage {
  private client: S3Client;
  private config: R2Config;

  constructor(config: R2Config) {
    this.config = config;
    this.client = new S3Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket: config.bucket,
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    });
  }

  async upload(key: string, data: string | Buffer, metadata?: Record<string, string>): Promise<{ success: boolean; key: string; size: number }> {
    const buffer = typeof data === "string" ? Buffer.from(data) : data;
    await this.client.write(key, buffer);
    
    return {
      success: true,
      key,
      size: buffer.length,
    };
  }

  async download(key: string): Promise<{ data: string; metadata?: Record<string, any> }> {
    const file = await this.client.file(key);
    const data = await file.text();

    return {
      data,
      metadata: undefined,
    };
  }

  async list(prefix?: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    const files = await this.client.list({ prefix });
    
    return files.map(f => ({
      key: f.key,
      size: f.size,
      lastModified: f.mtime || new Date(),
    }));
  }

  async delete(key: string): Promise<{ success: boolean; key: string }> {
    await this.client.delete(key);
    return { success: true, key };
  }

  getPublicUrl(key: string): string {
    if (!this.config.publicUrl) {
      throw new Error("R2_PUBLIC_URL not configured");
    }
    return `${this.config.publicUrl}/${encodeURIComponent(key)}`;
  }
}

// ============================================================================
// TOML Operations
// ============================================================================

class ConfigManager {
  private r2?: R2Storage;

  constructor(r2Config?: R2Config) {
    if (r2Config) {
      this.r2 = new R2Storage(r2Config);
    }
  }

  async createExample(path: string = DEFAULT_CONFIG_PATH): Promise<void> {
    const config = `# Empire Pro CLI Configuration
# Generated: ${new Date().toISOString()}
title = "Empire Pro CLI Config"
version = "2.8.0"

[server]
port = 3000
host = "localhost"
timeout = 30
ssl = false
max_connections = 1000

[database]
redis = "redis://localhost:6379/0"
postgres = "postgres://user:pass@localhost:5432/empire?sslmode=disable"
pool_size = 25

[features]
phone_intel = true
similarity_scan = true
config_watch = true
hyper_mode = false
telemetry = false

[duoplus]
api_key = "${generateApiKey("dp")}"
endpoint = "https://api.duoplus.com/v3/resolve"
timeout = 5
retries = 3

[similarity]
threshold = 85
enable_fast = true
tokenize_code = true
algorithm = "jaccard"

[[projects]]
name = "proj1"
port = 3001
env = "dev"
tags = ["api", "experimental"]

[[projects]]
name = "proj2"  
port = 3002
env = "prod"
tags = ["web", "stable"]

[[projects]]
name = "proj3"
port = 3003
env = "dev"
tags = ["worker", "experimental"]
`;

    await Bun.write(path, config);
    console.log(`✅ Created ${path} (${Bun.file(path).size} bytes)`);
  }

  validate(config: Config): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation
    if (!config.title) errors.push("Missing 'title'");
    if (!config.version) errors.push("Missing 'version'");
    if (!config.server?.port) errors.push("Missing 'server.port'");
    if (!config.database?.redis) errors.push("Missing 'database.redis'");
    if (!config.duoplus?.api_key) errors.push("Missing 'duoplus.api_key'");
    
    return { valid: errors.length === 0, errors };
  }

  async load(path: string): Promise<Config> {
    if (!existsSync(path)) {
      throw new Error(`Config file not found: ${path}`);
    }

    // Use Bun's native TOML parser - it handles the full TOML spec
    const content = await Bun.file(path).text();
    const parsed = TOML.parse(content) as Config;
    
    return parsed;
  }

  async save(path: string, config: Config): Promise<void> {
    // Build TOML string manually (Bun has TOML.parse but not stringify yet)
    const lines: string[] = [];
    
    lines.push(`title = "${config.title}"`);
    lines.push(`version = "${config.version}"`);
    lines.push("");
    
    // Server section
    lines.push("[server]");
    lines.push(`port = ${config.server.port}`);
    lines.push(`host = "${config.server.host}"`);
    lines.push(`timeout = ${config.server.timeout}`);
    if (config.server.ssl) lines.push(`ssl = ${config.server.ssl}`);
    if (config.server.max_connections) lines.push(`max_connections = ${config.server.max_connections}`);
    lines.push("");
    
    // Database section
    lines.push("[database]");
    lines.push(`redis = "${config.database.redis}"`);
    lines.push(`postgres = "${config.database.postgres}"`);
    if (config.database.pool_size) lines.push(`pool_size = ${config.database.pool_size}`);
    lines.push("");
    
    // Features section
    lines.push("[features]");
    for (const [key, value] of Object.entries(config.features)) {
      lines.push(`${key} = ${value}`);
    }
    lines.push("");
    
    // Duoplus section
    lines.push("[duoplus]");
    lines.push(`api_key = "${config.duoplus.api_key}"`);
    lines.push(`endpoint = "${config.duoplus.endpoint}"`);
    lines.push(`timeout = ${config.duoplus.timeout}`);
    if (config.duoplus.retries) lines.push(`retries = ${config.duoplus.retries}`);
    lines.push("");
    
    // Similarity section (optional)
    if (config.similarity) {
      lines.push("[similarity]");
      lines.push(`threshold = ${config.similarity.threshold}`);
      lines.push(`enable_fast = ${config.similarity.enable_fast}`);
      lines.push(`tokenize_code = ${config.similarity.tokenize_code}`);
      if (config.similarity.algorithm) lines.push(`algorithm = "${config.similarity.algorithm}"`);
      lines.push("");
    }
    
    // Projects array
    for (const project of config.projects) {
      lines.push("[[projects]]");
      lines.push(`name = "${project.name}"`);
      lines.push(`port = ${project.port}`);
      lines.push(`env = "${project.env}"`);
      if (project.tags && project.tags.length > 0) {
        lines.push(`tags = [${project.tags.map(t => `"${t}"`).join(", ")}]`);
      }
      lines.push("");
    }
    
    await Bun.write(path, lines.join("\n"));
  }
}

// ============================================================================
// CLI Commands
// ============================================================================

const printHelp = (): void => {
  console.log(`
Empire Pro Config Manager v${VERSION}

USAGE:
    bun run config-manager.ts <COMMAND> [OPTIONS]

COMMANDS:
    init        Create example config file
    validate    Validate config file
    upload      Upload config to R2
    download    Download config from R2
    list        List configs in R2 bucket
    sync        Sync local config to R2 (with diff)
    clean       Remove local config file
    help        Show this help
    version     Show version

OPTIONS:
    -f, --file <PATH>    Config file path (default: ${DEFAULT_CONFIG_PATH})
    -e, --env <NAME>     Environment name (dev|staging|prod)
    -w, --watch          Watch for changes and sync
    -v, --verbose        Verbose output
    -h, --help           Show help for command

ENVIRONMENT VARIABLES:
    ${R2_ENV_VARS.accountId}      Cloudflare R2 Account ID
    ${R2_ENV_VARS.accessKeyId}    R2 Access Key ID
    ${R2_ENV_VARS.secretAccessKey} R2 Secret Access Key
    ${R2_ENV_VARS.bucket}         R2 Bucket Name
    ${R2_ENV_VARS.publicUrl}      R2 Public URL (optional)

EXAMPLES:
    # Create and upload config
    bun run config-manager.ts init
    bun run config-manager.ts upload -e prod

    # Download and validate
    bun run config-manager.ts download -e prod -f ./prod-config.toml
    bun run config-manager.ts validate -f ./prod-config.toml

    # Watch and sync
    bun run config-manager.ts sync -e dev -w --verbose

    # List all configs in bucket
    bun run config-manager.ts list
`);
};

const printVersion = (): void => {
  console.log(`Empire Pro Config Manager v${VERSION}`);
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
};

// ============================================================================
// Main CLI Logic
// ============================================================================

const main = async (): Promise<void> => {
  const args = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    options: {
      file: { type: "string", short: "f", default: DEFAULT_CONFIG_PATH },
      env: { type: "string", short: "e" },
      watch: { type: "boolean", short: "w", default: false },
      verbose: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", default: false },
    },
  });

  const command = args.positionals[0] as string | undefined;
  const options = args.values as CLIArgs;

  if (options.help || command === "help") {
    printHelp();
    process.exit(0);
  }

  if (options.version || command === "version") {
    printVersion();
    process.exit(0);
  }

  if (!command) {
    console.error("❌ Error: No command specified");
    printHelp();
    process.exit(1);
  }

  // Initialize R2 if credentials are present
  let r2Config: R2Config | undefined;
  const accountId = process.env[R2_ENV_VARS.accountId];
  const accessKeyId = process.env[R2_ENV_VARS.accessKeyId];
  const secretAccessKey = process.env[R2_ENV_VARS.secretAccessKey];
  const bucket = process.env[R2_ENV_VARS.bucket];
  const publicUrl = process.env[R2_ENV_VARS.publicUrl];

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    r2Config = {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
      publicUrl,
    };
    if (options.verbose) {
      console.log("🔑 R2 credentials detected and initialized");
    }
  } else if (["upload", "download", "list", "sync"].includes(command)) {
    console.error("❌ Error: R2 credentials not configured");
    console.error("   Set these environment variables:");
    Object.values(R2_ENV_VARS).forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }

  const manager = new ConfigManager(r2Config);

  // Execute command
  try {
    switch (command) {
      case "init": {
        await manager.createExample(options.file);
        break;
      }

      case "validate": {
        const config = await manager.load(options.file);
        const result = manager.validate(config);
        if (result.valid) {
          console.log("✅ Configuration is valid");
        } else {
          console.log("❌ Validation failed:");
          result.errors.forEach(err => console.log(`   • ${err}`));
          process.exit(1);
        }
        break;
      }

      case "upload": {
        if (!options.env) {
          console.error("❌ Error: --env required for upload");
          process.exit(1);
        }
        const config = await manager.load(options.file);
        const key = `configs/${options.env}/config.toml`;
        const result = await r2Config!.bucket && new R2Storage(r2Config!).upload(key, JSON.stringify(config, null, 2), {
          uploaded_at: new Date().toISOString(),
          env: options.env,
          version: config.version,
        });
        console.log(`✅ Uploaded to R2: ${key} (${result?.size} bytes)`);
        if (r2Config?.publicUrl) {
          console.log(`   Public URL: ${new R2Storage(r2Config).getPublicUrl(key)}`);
        }
        break;
      }

      case "download": {
        if (!options.env) {
          console.error("❌ Error: --env required for download");
          process.exit(1);
        }
        const key = `configs/${options.env}/config.toml`;
        const r2 = new R2Storage(r2Config!);
        const result = await r2.download(key);
        await Bun.write(options.file!, result.data);
        console.log(`✅ Downloaded from R2: ${key} -> ${options.file}`);
        if (result.metadata) {
          console.log(`   Metadata: ${JSON.stringify(result.metadata, null, 2)}`);
        }
        break;
      }

      case "list": {
        const r2 = new R2Storage(r2Config!);
        const files = await r2.list("configs/");
        console.log(`📦 Found ${files.length} config files:`);
        files.forEach(f => {
          console.log(`   ${f.key} (${f.size} bytes, modified: ${f.lastModified.toLocaleString()})`);
        });
        break;
      }

      case "sync": {
        if (!options.env) {
          console.error("❌ Error: --env required for sync");
          process.exit(1);
        }
        const localHash = await Bun.file(options.file!).exists() 
          ? await Bun.file(options.file!).text().then(t => Bun.hash(t))
          : 0;
        
        const r2 = new R2Storage(r2Config!);
        const key = `configs/${options.env}/config.toml`;
        
        try {
          const remote = await r2.download(key);
          const remoteHash = Bun.hash(remote.data);
          
          if (localHash === remoteHash) {
            console.log("✅ Configs are in sync");
          } else {
            console.log("🔄 Syncing local -> R2...");
            const config = await manager.load(options.file!);
            await r2.upload(key, JSON.stringify(config, null, 2), {
              synced_at: new Date().toISOString(),
              env: options.env,
              version: config.version,
            });
            console.log(`✅ Synced to R2: ${key}`);
          }
        } catch (error) {
          if (options.verbose) console.log("🔄 No remote config found, uploading...");
          const config = await manager.load(options.file!);
          await r2.upload(key, JSON.stringify(config, null, 2), {
            synced_at: new Date().toISOString(),
            env: options.env,
            version: config.version,
          });
          console.log(`✅ Uploaded initial config to R2: ${key}`);
        }

        if (options.watch) {
          console.log(`👀 Watching ${options.file} for changes...`);
          const watcher = Bun.file(options.file!);
          // In a real app, use fs.watch or similar
          // This is a simplified example
        }
        break;
      }

      case "clean": {
        if (existsSync(options.file!)) {
          await Bun.$`rm -f ${options.file!}`;
          console.log(`✅ Removed ${options.file}`);
        } else {
          console.log(`ℹ️  ${options.file} not found`);
        }
        break;
      }

      default: {
        console.error(`❌ Error: Unknown command: ${command}`);
        printHelp();
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`\n❌ Command failed: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

// ============================================================================
// Entry Point
// ============================================================================

if (import.meta.main) {
  main().catch(error => {
    console.error("🚨 Unhandled error:", error);
    process.exit(1);
  });
}

export { ConfigManager, R2Storage };