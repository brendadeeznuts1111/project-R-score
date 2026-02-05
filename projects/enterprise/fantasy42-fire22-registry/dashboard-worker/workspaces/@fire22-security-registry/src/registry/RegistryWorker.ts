/**
 * Fire22 Registry Cloudflare Worker
 *
 * Cloudflare Workers implementation of the Fire22 registry
 */

import { Fire22RegistryServer } from './RegistryServer';
import type { RegistryConfig } from '../index';

export interface Env {
  // D1 Database binding
  REGISTRY_DB: D1Database;

  // R2 Storage binding for tarballs
  REGISTRY_STORAGE: R2Bucket;

  // KV for caching
  REGISTRY_CACHE: KVNamespace;

  // Environment variables
  REGISTRY_SECRET: string;
  SECURITY_SCANNING_ENABLED: string;
  ALLOWED_SCOPES: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      // Initialize registry server
      const config: RegistryConfig = {
        url: `${url.protocol}//${url.host}`,
        scopes: env.ALLOWED_SCOPES?.split(',') || ['@fire22'],
        security: {
          scanning: env.SECURITY_SCANNING_ENABLED === 'true',
          audit: true,
          strict: false,
        },
      };

      const registry = new CloudflareRegistry(config, env);
      await registry.initialize();

      // Route requests
      const response = await handleRequest(request, registry, path);

      // Add CORS headers to all responses
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Registry error:', error);

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  },
};

async function handleRequest(
  request: Request,
  registry: CloudflareRegistry,
  path: string
): Promise<Response> {
  const method = request.method;

  // Health check
  if (path === '/health' || path === '/') {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        service: 'Fire22 Registry',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Registry statistics
  if (path === '/-/stats' && method === 'GET') {
    const stats = await registry.getStats();
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Package search
  if (path === '/-/search' && method === 'GET') {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const results = await registry.searchPackages(query, { limit, offset });

    return new Response(
      JSON.stringify({
        objects: results.map(pkg => ({
          package: {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            keywords: pkg.keywords,
            date: pkg.publishedAt,
            security: pkg.security,
          },
          score: {
            final: pkg.security.score / 100,
            detail: {
              security: pkg.security.score / 100,
              popularity: Math.min(pkg.downloads / 1000, 1),
              maintenance: 1,
            },
          },
        })),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Package publishing
  if (method === 'PUT' && path.startsWith('/')) {
    return await handlePackagePublish(request, registry, path);
  }

  // Package metadata
  if (method === 'GET' && path.startsWith('/') && !path.includes('/-/')) {
    return await handlePackageGet(request, registry, path);
  }

  // Package download
  if (method === 'GET' && path.includes('/-/') && path.endsWith('.tgz')) {
    return await handlePackageDownload(request, registry, path);
  }

  return new Response('Not Found', { status: 404 });
}

async function handlePackagePublish(
  request: Request,
  registry: CloudflareRegistry,
  path: string
): Promise<Response> {
  try {
    // Verify authentication
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse package data from request body
    const body = await request.arrayBuffer();
    const packageData = JSON.parse(new TextDecoder().decode(body));

    // Create mock tarball (in production, this would be extracted from the request)
    const tarball = new ArrayBuffer(1024);

    const registryPackage = await registry.publishPackage(packageData, tarball);

    return new Response(
      JSON.stringify({
        ok: true,
        id: registryPackage.name,
        rev: registryPackage.version,
        message: `Package ${registryPackage.name}@${registryPackage.version} published successfully`,
        security: registryPackage.security,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Publish failed',
        message: error.message,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handlePackageGet(
  request: Request,
  registry: CloudflareRegistry,
  path: string
): Promise<Response> {
  const packageName = path.slice(1); // Remove leading slash

  try {
    const packageData = await registry.getPackage(packageName);

    if (!packageData) {
      return new Response('Package not found', { status: 404 });
    }

    return new Response(JSON.stringify(packageData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to get package',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handlePackageDownload(
  request: Request,
  registry: CloudflareRegistry,
  path: string
): Promise<Response> {
  try {
    // Parse package name and version from path
    // Format: /@scope/package/-/package-version.tgz
    const parts = path.split('/');
    const packageName = parts.slice(1, -2).join('/'); // Handle scoped packages
    const filename = parts[parts.length - 1];
    const version = filename.replace(/^.*-(.+)\.tgz$/, '$1');

    const tarball = await registry.downloadPackage(packageName, version);

    if (!tarball) {
      return new Response('Package not found', { status: 404 });
    }

    return new Response(tarball, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Download failed',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Cloudflare Workers-specific registry implementation
 */
class CloudflareRegistry extends Fire22RegistryServer {
  constructor(
    config: RegistryConfig,
    private env: Env
  ) {
    super(config);
  }

  /**
   * Load packages from D1 database
   */
  protected async loadPackages(): Promise<void> {
    try {
      const { results } = await this.env.REGISTRY_DB.prepare('SELECT * FROM packages').all();

      console.log(`📦 Loaded ${results?.length || 0} packages from D1`);

      // Reconstruct packages map from database results
      if (results) {
        for (const row of results as any[]) {
          const packageData = JSON.parse(row.data);

          if (!this.packages.has(packageData.name)) {
            this.packages.set(packageData.name, new Map());
          }

          this.packages.get(packageData.name)!.set(packageData.version, packageData);
        }
      }
    } catch (error) {
      console.warn('Could not load packages from D1:', error.message);
    }
  }

  /**
   * Save packages to D1 database
   */
  protected async savePackages(): Promise<void> {
    try {
      // This would implement incremental updates in production
      console.log('💾 Registry state would be saved to D1');
    } catch (error) {
      console.warn('Could not save packages to D1:', error.message);
    }
  }

  /**
   * Store tarball in R2
   */
  protected async storeTarball(name: string, version: string, tarball: ArrayBuffer): Promise<void> {
    try {
      const key = `packages/${name}/${version}.tgz`;

      await this.env.REGISTRY_STORAGE.put(key, tarball, {
        httpMetadata: {
          contentType: 'application/gzip',
          cacheControl: 'public, max-age=31536000', // 1 year
        },
      });

      console.log(`📦 Tarball stored in R2: ${key}`);
    } catch (error) {
      console.warn('Could not store tarball in R2:', error.message);
    }
  }

  /**
   * Load tarball from R2
   */
  protected async loadPackageTarball(name: string, version: string): Promise<ArrayBuffer> {
    try {
      const key = `packages/${name}/${version}.tgz`;

      const object = await this.env.REGISTRY_STORAGE.get(key);

      if (!object) {
        throw new Error('Tarball not found in storage');
      }

      return await object.arrayBuffer();
    } catch (error) {
      console.warn('Could not load tarball from R2:', error.message);
      throw error;
    }
  }
}
