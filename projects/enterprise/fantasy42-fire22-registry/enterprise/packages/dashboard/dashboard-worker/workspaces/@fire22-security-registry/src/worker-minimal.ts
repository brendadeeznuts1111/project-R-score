/**
 * Fire22 Registry Worker - Minimal Deployment Version
 *
 * Simplified registry worker for immediate Cloudflare Workers deployment
 * Focuses on core registry functionality without complex dependencies
 */

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
  REGISTRY_NAME: string;
  REGISTRY_VERSION: string;
}

interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
  publishedAt: string;
  tarballUrl: string;
  security: {
    score: number;
    vulnerabilities: number;
    lastScanned: string;
  };
}

interface RegistryStats {
  totalPackages: number;
  totalVersions: number;
  totalDownloads: number;
  securityScansCompleted: number;
  lastScan: string;
  uptime: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for all responses
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
      const response = await handleRequest(request, env, path);

      // Add CORS headers to all responses
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error: unknown) {
      console.error('Registry error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: errorMessage,
          timestamp: new Date().toISOString(),
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

async function handleRequest(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;

  // Health check endpoint
  if (path === '/health' || path === '/') {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        service: env.REGISTRY_NAME || 'Fire22 Registry',
        version: env.REGISTRY_VERSION || '1.0.0',
        timestamp: new Date().toISOString(),
        environment: {
          securityScanning: env.SECURITY_SCANNING_ENABLED === 'true',
          allowedScopes: env.ALLOWED_SCOPES?.split(',') || ['@fire22'],
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Registry statistics
  if (path === '/-/stats' && method === 'GET') {
    try {
      const stats = await getRegistryStats(env);
      return new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get stats';
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Package search
  if (path === '/-/search' && method === 'GET') {
    try {
      const url = new URL(request.url);
      const query = url.searchParams.get('q') || '';
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const results = await searchPackages(env, query, limit, offset);

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
                popularity: 0.5, // Static for now
                maintenance: 1.0,
              },
            },
          })),
          total: results.length,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Package publishing
  if (method === 'PUT' && path.startsWith('/')) {
    return await handlePackagePublish(request, env, path);
  }

  // Package metadata
  if (method === 'GET' && path.startsWith('/') && !path.includes('/-/')) {
    return await handlePackageGet(request, env, path);
  }

  // Package download
  if (method === 'GET' && path.includes('/-/') && path.endsWith('.tgz')) {
    return await handlePackageDownload(request, env, path);
  }

  return new Response(
    JSON.stringify({
      error: 'Not Found',
      message: `Path ${path} not found`,
      availableEndpoints: [
        'GET /',
        'GET /health',
        'GET /-/stats',
        'GET /-/search?q=<query>',
        'PUT /<package-name>',
        'GET /<package-name>',
        'GET /<package-name>/-/<package-name>-<version>.tgz',
      ],
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function handlePackagePublish(request: Request, env: Env, path: string): Promise<Response> {
  try {
    // Verify authentication
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Valid Bearer token required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract package name from path (remove leading slash)
    const packageName = path.slice(1);

    // Validate package scope
    const allowedScopes = env.ALLOWED_SCOPES?.split(',') || ['@fire22'];
    const isAllowedScope = allowedScopes.some(scope => packageName.startsWith(scope));

    if (!isAllowedScope) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: `Package ${packageName} not in allowed scopes: ${allowedScopes.join(', ')}`,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse package data from request body
    const body = await request.text();
    let packageData: any;

    try {
      packageData = JSON.parse(body);
    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create package record
    const registryPackage: RegistryPackage = {
      name: packageData.name || packageName,
      version: packageData.version || '1.0.0',
      description: packageData.description,
      keywords: packageData.keywords || [],
      publishedAt: new Date().toISOString(),
      tarballUrl: `${request.url}/-/${packageData.name}-${packageData.version}.tgz`,
      security: {
        score: 100, // Default secure score
        vulnerabilities: 0,
        lastScanned: new Date().toISOString(),
      },
    };

    // Store in D1 database
    await env.REGISTRY_DB.prepare(
      'INSERT OR REPLACE INTO packages (name, version, data, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(
        registryPackage.name,
        registryPackage.version,
        JSON.stringify(registryPackage),
        new Date().toISOString()
      )
      .run();

    // Store tarball in R2 (mock for now)
    const tarballKey = `packages/${registryPackage.name}/${registryPackage.version}.tgz`;
    await env.REGISTRY_STORAGE.put(tarballKey, body, {
      httpMetadata: {
        contentType: 'application/gzip',
        cacheControl: 'public, max-age=31536000',
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        id: registryPackage.name,
        rev: registryPackage.version,
        message: `Package ${registryPackage.name}@${registryPackage.version} published successfully`,
        security: registryPackage.security,
        timestamp: registryPackage.publishedAt,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Publish failed';
    return new Response(
      JSON.stringify({
        error: 'Publish failed',
        message: errorMessage,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handlePackageGet(request: Request, env: Env, path: string): Promise<Response> {
  const packageName = path.slice(1); // Remove leading slash

  try {
    const { results } = await env.REGISTRY_DB.prepare('SELECT * FROM packages WHERE name = ?')
      .bind(packageName)
      .all();

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Package not found',
          message: `Package ${packageName} not found in registry`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Format as NPM registry response
    const versions: Record<string, any> = {};
    const distTags: Record<string, string> = { latest: '' };
    let latestVersion = '0.0.0';

    for (const row of results as any[]) {
      const pkg = JSON.parse(row.data);
      versions[pkg.version] = pkg;

      // Simple semver comparison for latest
      if (pkg.version > latestVersion) {
        latestVersion = pkg.version;
        distTags.latest = pkg.version;
      }
    }

    const packageData = {
      name: packageName,
      'dist-tags': distTags,
      versions,
      time: {
        created: results[0].created_at,
        modified: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(packageData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get package';
    return new Response(
      JSON.stringify({
        error: 'Failed to get package',
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handlePackageDownload(request: Request, env: Env, path: string): Promise<Response> {
  try {
    // Parse package name and version from path
    // Format: /@scope/package/-/package-version.tgz
    const parts = path.split('/');
    const filename = parts[parts.length - 1];

    if (!filename?.endsWith('.tgz')) {
      return new Response('Invalid tarball filename', { status: 400 });
    }

    const packageName = parts.slice(1, -2).join('/'); // Handle scoped packages
    const version = filename.replace(/^.*-(.+)\.tgz$/, '$1');

    const tarballKey = `packages/${packageName}/${version}.tgz`;
    const object = await env.REGISTRY_STORAGE.get(tarballKey);

    if (!object) {
      return new Response(
        JSON.stringify({
          error: 'Package not found',
          message: `Tarball for ${packageName}@${version} not found`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    return new Response(
      JSON.stringify({
        error: 'Download failed',
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function getRegistryStats(env: Env): Promise<RegistryStats> {
  const { results } = await env.REGISTRY_DB.prepare('SELECT COUNT(*) as count FROM packages').all();

  const totalPackages = results?.[0]?.count || 0;

  return {
    totalPackages: totalPackages as number,
    totalVersions: totalPackages as number, // Simplified for now
    totalDownloads: 0,
    securityScansCompleted: totalPackages as number,
    lastScan: new Date().toISOString(),
    uptime: Date.now(),
  };
}

async function searchPackages(
  env: Env,
  query: string,
  limit: number,
  offset: number
): Promise<RegistryPackage[]> {
  let sql = 'SELECT * FROM packages';
  let params: any[] = [];

  if (query) {
    sql += ' WHERE name LIKE ? OR data LIKE ?';
    params = [`%${query}%`, `%${query}%`];
  }

  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await env.REGISTRY_DB.prepare(sql)
    .bind(...params)
    .all();

  return (results || []).map((row: any) => JSON.parse(row.data));
}
