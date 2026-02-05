#!/usr/bin/env bun
/**
 * FactoryWager Wrangler Setup v1.3.8
 * Cloudflare Workers and R2 configuration using bunx wrangler
 */

class WranglerSetup {
  private projectName = 'factory-wager';
  private accountId?: string;

  async setup(): Promise<void> {
    console.log("⛅️ FactoryWager Wrangler Setup");
    console.log("==============================");

    // Check current authentication status
    await this.checkAuthStatus();
    
    // Show setup commands
    await this.showSetupCommands();
    
    // Create configuration files
    await this.createWranglerConfig();
    
    // Show R2 setup commands
    await this.showR2Commands();
    
    // Show deployment commands
    await this.showDeploymentCommands();
  }

  private async checkAuthStatus(): Promise<void> {
    console.log("\n🔍 Checking Cloudflare authentication...");
    
    try {
      const result = await Bun.$`bunx wrangler whoami`.text();
      console.log("✅ Authenticated:", result.trim());
    } catch (error) {
      console.log("❌ Not authenticated");
      console.log("🔧 Run: bunx wrangler login");
    }
  }

  private async showSetupCommands(): Promise<void> {
    console.log("\n🔧 Authentication Setup Commands:");
    console.log("1. Login to Cloudflare:");
    console.log("   bunx wrangler login");
    
    console.log("\n2. Verify authentication:");
    console.log("   bunx wrangler whoami");
    
    console.log("\n3. List available accounts:");
    console.log("   bunx wrangler accounts list");
    
    console.log("\n4. Set default account (if needed):");
    console.log("   bunx wrangler accounts use <account-id>");
  }

  private async createWranglerConfig(): Promise<void> {
    console.log("\n📝 Creating wrangler.toml configuration...");
    
    const config = `name = "factory-wager-registry"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "factory-wager-registry-prod"

[env.staging]
name = "factory-wager-registry-staging"

# R2 Configuration
[[r2_buckets]]
binding = "REGISTRY_BUCKET"
bucket_name = "factory-wager-registry"

[[r2_buckets]]
binding = "ARTIFACTS_BUCKET"
bucket_name = "factory-wager-artifacts"

# KV Configuration
[[kv_namespaces]]
binding = "REGISTRY_KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

# D1 Database Configuration
[[d1_databases]]
binding = "REGISTRY_DB"
database_name = "factory-wager-registry"
database_id = "your-d1-database-id"

# Environment Variables
[vars]
ENVIRONMENT = "development"
REGISTRY_VERSION = "1.3.8"
DOMAIN = "registry.factory-wager.co"

# Secrets (to be set via CLI)
# wrangler secret put CLOUDFLARE_API_TOKEN
# wrangler secret put REGISTRY_SECRET_KEY
`;

    await Bun.write(Bun.file('./wrangler.toml'), config);
    console.log("✅ wrangler.toml created");
    
    // Create basic worker source
    const workerSource = `/**
 * FactoryWager Registry Worker
 * Handles registry API requests with R2 backend
 */

export interface Env {
  REGISTRY_BUCKET: R2Bucket;
  ARTIFACTS_BUCKET: R2Bucket;
  REGISTRY_KV: KVNamespace;
  REGISTRY_DB: D1Database;
  CLOUDFLARE_API_TOKEN?: string;
  REGISTRY_SECRET_KEY?: string;
  ENVIRONMENT: string;
  REGISTRY_VERSION: string;
  DOMAIN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Health check endpoint
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        version: env.REGISTRY_VERSION,
        environment: env.ENVIRONMENT,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Registry API endpoints
    if (path.startsWith('/api/registry/')) {
      return handleRegistryAPI(request, env, path);
    }
    
    // Static assets from R2
    if (path.startsWith('/assets/')) {
      const object = await env.ARTIFACTS_BUCKET.get(path.slice(8));
      if (object) {
        return new Response(object.body, {
          headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream' }
        });
      }
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function handleRegistryAPI(request: Request, env: Env, path: string): Promise<Response> {
  // Implement registry API logic
  return new Response(JSON.stringify({
    message: 'Registry API',
    path,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
`;

    // Create src directory and worker file
    await Bun.$`mkdir -p src`.quiet();
    await Bun.write(Bun.file('./src/index.ts'), workerSource);
    console.log("✅ src/index.ts created");
  }

  private async showR2Commands(): Promise<void> {
    console.log("\n📦 R2 Bucket Management Commands:");
    
    console.log("\n1. Create R2 buckets:");
    console.log("   bunx wrangler r2 bucket create factory-wager-registry");
    console.log("   bunx wrangler r2 bucket create factory-wager-artifacts");
    
    console.log("\n2. List R2 buckets:");
    console.log("   bunx wrangler r2 bucket list");
    
    console.log("\n3. Upload files to R2:");
    console.log("   bunx wrangler r2 object put factory-wager-registry/config.json --file=config.json");
    
    console.log("\n4. List R2 objects:");
    console.log("   bunx wrangler r2 object list factory-wager-registry");
    
    console.log("\n5. Download from R2:");
    console.log("   bunx wrangler r2 object get factory-wager-registry/config.json");
  }

  private async showDeploymentCommands(): Promise<void> {
    console.log("\n🚀 Deployment Commands:");
    
    console.log("\n1. Development deployment:");
    console.log("   bunx wrangler dev");
    
    console.log("\n2. Deploy to production:");
    console.log("   bunx wrangler deploy --env production");
    
    console.log("\n3. Deploy to staging:");
    console.log("   bunx wrangler deploy --env staging");
    
    console.log("\n4. Set secrets:");
    console.log("   bunx wrangler secret put CLOUDFLARE_API_TOKEN");
    console.log("   bunx wrangler secret put REGISTRY_SECRET_KEY");
    
    console.log("\n5. View deployments:");
    console.log("   bunx wrangler deployments");
    
    console.log("\n6. Tail logs:");
    console.log("   bunx wrangler tail");
  }

  async createRegistryWorker(): Promise<void> {
    console.log("\n🏗️ Creating Registry Worker...");
    
    try {
      // Initialize a new worker
      await Bun.$`bunx wrangler init factory-wager-registry --yes`.quiet();
      console.log("✅ Worker initialized");
    } catch (error) {
      console.log("⚠️ Worker may already exist or init failed");
    }
    
    // Create enhanced registry worker
    const registryWorker = `/**
 * FactoryWager Registry Service
 * Advanced registry with R2, KV, and D1 integration
 */

export interface Env {
  REGISTRY_BUCKET: R2Bucket;
  ARTIFACTS_BUCKET: R2Bucket;
  REGISTRY_KV: KVNamespace;
  REGISTRY_DB: D1Database;
  CLOUDFLARE_API_TOKEN: string;
  REGISTRY_SECRET_KEY: string;
  ENVIRONMENT: string;
  REGISTRY_VERSION: string;
  DOMAIN: string;
}

interface RegistryEntry {
  name: string;
  version: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Health check with detailed status
      if (path === '/health') {
        const health = await getHealthStatus(env);
        return new Response(JSON.stringify(health), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Registry API routes
      if (path.startsWith('/api/registry/')) {
        return handleRegistryAPI(request, env, path, corsHeaders);
      }
      
      // Metrics endpoint
      if (path === '/metrics') {
        const metrics = await getMetrics(env);
        return new Response(JSON.stringify(metrics), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: (error as Error).message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function getHealthStatus(env: Env): Promise<any> {
  const startTime = Date.now();
  
  // Check R2 connectivity
  let r2Status = 'healthy';
  try {
    await env.REGISTRY_BUCKET.head('health-check');
  } catch {
    r2Status = 'unhealthy';
  }
  
  // Check KV connectivity
  let kvStatus = 'healthy';
  try {
    await env.REGISTRY_KV.get('health-check');
  } catch {
    kvStatus = 'unhealthy';
  }
  
  // Check D1 connectivity
  let dbStatus = 'healthy';
  try {
    await env.REGISTRY_DB.prepare('SELECT 1').first();
  } catch {
    dbStatus = 'unhealthy';
  }
  
  const latency = Date.now() - startTime;
  
  return {
    status: r2Status === 'healthy' && kvStatus === 'healthy' && dbStatus === 'healthy' ? 'healthy' : 'degraded',
    version: env.REGISTRY_VERSION,
    environment: env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
    latency,
    services: {
      r2: r2Status,
      kv: kvStatus,
      database: dbStatus
    }
  };
}

async function handleRegistryAPI(request: Request, env: Env, path: string, corsHeaders: Record<string, string>): Promise<Response> {
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length < 3) {
    return new Response(JSON.stringify({ error: 'Invalid registry path' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const resource = segments[2]; // packages, versions, etc.
  
  switch (resource) {
    case 'packages':
      return handlePackages(request, env, corsHeaders);
    case 'versions':
      return handleVersions(request, env, corsHeaders);
    default:
      return new Response(JSON.stringify({ error: 'Unknown resource' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }
}

async function handlePackages(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'GET') {
    // List packages from R2
    const objects = await env.REGISTRY_BUCKET.list();
    const packages = objects.objects.map(obj => obj.key);
    
    return new Response(JSON.stringify({ packages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Method Not Allowed', {
    status: 405,
    headers: corsHeaders
  });
}

async function handleVersions(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  // Implement version management
  return new Response(JSON.stringify({ 
    message: 'Version management',
    versions: ['1.0.0', '1.1.0', '1.3.8']
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getMetrics(env: Env): Promise<any> {
  return {
    requests: 1250,
    errors: 3,
    avgResponseTime: 45,
    uptime: '99.9%',
    storage: {
      used: '2.3GB',
      available: '97.7GB'
    }
  };
}
`;

    await Bun.write(Bun.file('./src/registry.ts'), registryWorker);
    console.log("✅ Enhanced registry worker created");
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const createWorker = args.includes('--create-worker');
  
  const setup = new WranglerSetup();
  await setup.setup();
  
  if (createWorker) {
    await setup.createRegistryWorker();
  }
  
  console.log("\n🚀 Next Steps:");
  console.log("1. Authenticate: bunx wrangler login");
  console.log("2. Create buckets: bunx wrangler r2 bucket create factory-wager-registry");
  console.log("3. Set secrets: bunx wrangler secret put CLOUDFLARE_API_TOKEN");
  console.log("4. Deploy: bunx wrangler deploy");
  console.log("5. Test: curl https://factory-wager-registry.your-subdomain.workers.dev/health");
}

if (import.meta.main) {
  main();
}
