#!/usr/bin/env bun
/**
 * 🌤️ Cloudflare R2 Bucket Setup Script
 * Use bunx wrangler to create and configure R2 buckets
 */

import { $, write } from "bun";

/**
 * Setup R2 bucket for Dev HQ
 */
async function setupR2Bucket() {
  const bucketName = "dev-hq-assets";
  
  console.info("🌐 Setting up Cloudflare R2 Bucket...");
  console.info("═".repeat(50));
  
  // Check if wrangler is installed
  console.info("\n📦 Checking for wrangler...");
  try {
    await $`bunx wrangler --version`.quiet();
    console.info("✅ Wrangler is installed");
  } catch {
    console.info("📥 Installing wrangler...");
    await $`npm install -g wrangler`.quiet();
  }
  
  // Create R2 bucket (requires C2 or WAF paid plan)
  console.info("\n🪣 Creating R2 bucket...");
  console.info(`   Bucket name: ${bucketName}`);
  
  // Note: R2 bucket creation is done through the Cloudflare dashboard
  // or via API. Wrangler doesn't support bucket creation directly.
  // This script generates the configuration and commands.
  
  console.info("\n📝 To create the bucket:");
  console.info("   1. Go to Cloudflare Dashboard > R2");
  console.info("   2. Click 'Create bucket'");
  console.info("   3. Enter bucket name: " + bucketName);
  console.info("   4. Click 'Create bucket'");
  
  // Generate wrangler commands
  const commands = `
# Login to Cloudflare
bunx wrangler login

# Create R2 bucket via API (requires token with R2 write permissions)
curl -X POST "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/r2/buckets" \\
  -H "Authorization: Bearer <API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"${bucketName}"}'

# Or use the dashboard:
# https://dash.cloudflare.com/?to=/:account/r2/default
`;
  
  console.info("\n🔧 Commands for manual setup:");
  console.info(commands);
  
  // Update wrangler.toml with R2 configuration
  console.info("\n📄 Updating wrangler.toml...");
  const wranglerConfig = `# 🌤️ Cloudflare Workers + R2 Configuration for Dev HQ
# Generated for deployment with: bunx wrangler

name = "dev-hq"
main = "api/server.ts"
compatibility_date = "2024-01-01"

# Vars that will be available in your Worker
[vars]
ENVIRONMENT = "production"
VERSION = "1.0.0"
R2_BUCKET_NAME = "${bucketName}"

# Enable Bun runtime
renderer = "bun"

# R2 Bucket configuration
# Get your R2 credentials from the Cloudflare Dashboard
# or use API tokens with R2 permissions
[env_vars]
# R2_ACCESS_KEY_ID = { type = "secret_text", name = "R2_ACCESS_KEY_ID" }
# R2_SECRET_ACCESS_KEY = { type = "secret_text", name = "R2_SECRET_ACCESS_KEY" }
# R2_ACCOUNT_ID = { type = "text", name = "R2_ACCOUNT_ID" }

# Routes - uncomment and modify as needed
# [[routes]]
# pattern = "api.devhq.com/*"
# zone_name = "devhq.com"

# KV Namespaces - for caching and storage
# [[kv_namespaces]]
# binding = "CACHE"
# id = "your-kv-namespace-id"

# R2 Buckets - for large file storage
# After creating bucket in dashboard, add binding here:
# [[r2_buckets]]
# binding = "ASSETS"
# bucket_name = "${bucketName}"

# Durable Objects - for stateful workloads
# [[durable_objects.bindings]]
# name = "SESSION_MANAGER"
# class_name = "SessionManager"

# Deploy with: bunx wrangler deploy
# Dev deployment: bunx wrangler deploy --env development
`;
  
  await write("wrangler.toml", wranglerConfig);
  console.info("✅ wrangler.toml updated with R2 configuration");
  
  // Generate TypeScript R2 client utility
  console.info("\n📝 Generating R2 client utility...");
  const r2Client = `/**
 * ☁️ R2 Storage Client for Dev HQ
 * Uses Cloudflare R2 for object storage
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface R2UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export class R2Client {
  private config: R2Config;
  
  constructor(config: R2Config) {
    this.config = config;
  }
  
  /**
   * Upload a file to R2
   */
  async upload(
    key: string,
    data: Uint8Array | string,
    options: R2UploadOptions = {}
  ): Promise<{ success: boolean; key: string; etag?: string }> {
    const body = typeof data === "string" ? new TextEncoder().encode(data) : data;
    
    const url = \`https://\${this.config.accountId}.r2.cloudflarestorage.com/\${this.config.bucketName}/\${key}\`;
    
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": options.contentType || "application/octet-stream",
        "Cache-Control": options.cacheControl || "max-age=86400",
        ...Object.fromEntries(
          Object.entries(options.metadata || {}).map(([k, v]) => [\`x-amz-meta-\${k}\`, v])
        ),
      },
      body,
    });
    
    if (!response.ok) {
      throw new Error(\`R2 upload failed: \${response.status} \${response.statusText}\`);
    }
    
    return {
      success: true,
      key,
      etag: response.headers.get("etag") || undefined,
    };
  }
  
  /**
   * Download a file from R2
   */
  async download(key: string): Promise<{ data: Uint8Array; contentType: string; etag?: string }> {
    const url = \`https://\${this.config.accountId}.r2.cloudflarestorage.com/\${this.config.bucketName}/\${key}\`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(\`R2 download failed: \${response.status}\`);
    }
    
    const data = new Uint8Array(await response.arrayBuffer());
    
    return {
      data,
      contentType: response.headers.get("content-type") || "application/octet-stream",
      etag: response.headers.get("etag") || undefined,
    };
  }
  
  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<boolean> {
    const url = \`https://\${this.config.accountId}.r2.cloudflarestorage.com/\${this.config.bucketName}/\${key}\`;
    
    const response = await fetch(url, { method: "DELETE" });
    return response.ok;
  }
  
  /**
   * List files in R2
   */
  async list(prefix?: string): Promise<{ keys: { key: string; size: number; etag: string }[] }> {
    const url = new URL(\`https://api.cloudflare.com/client/v4/accounts/\${this.config.accountId}/r2/buckets/\${this.config.bucketName}/objects\`);
    url.searchParams.set("prefix", prefix || "");
    
    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": \`Bearer \${this.config.secretAccessKey}\`,
      },
    });
    
    if (!response.ok) {
      throw new Error(\`R2 list failed: \${response.status}\`);
    }
    
    const result = await response.json();
    
    return {
      keys: result.objects.map((obj: any) => ({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
      })),
    };
  }
}

/**
 * Create R2 client from environment variables
 */
export function createR2Client(): R2Client {
  const config: R2Config = {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: process.env.R2_BUCKET_NAME || "dev-hq-assets",
  };
  
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error("Missing R2 configuration. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY environment variables.");
  }
  
  return new R2Client(config);
}

// Example usage:
// const r2 = createR2Client();
// await r2.upload("test.txt", "Hello World");
// const { data } = await r2.download("test.txt");
`;
  
  await write("utils/r2-client.ts", r2Client);
  console.info("✅ Created utils/r2-client.ts");
  
  console.info("\n═".repeat(50));
  console.info("✅ R2 bucket setup guide complete!");
  console.info("\n📋 Next steps:");
  console.info("   1. Create bucket in Cloudflare Dashboard");
  console.info("   2. Set R2_* environment variables");
  console.info("   3. Deploy: bunx wrangler deploy");
}

setupR2Bucket().catch(console.error);
