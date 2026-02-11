#!/usr/bin/env bun
/**
 * 📦 NPM Registry Server (Bun v1.3.7+ Optimized)
 * 
 * Private npm registry implementation with R2 storage backend
 * Supports: package publishing, downloading, search, dist-tags
 * 
 * Bun v1.3.7 Features Used:
 * - Header casing preservation in fetch()
 * - Increased HTTP header limit (200 headers)
 * - Better async/await performance (35% faster)
 */

import { styled } from '@factorywager/theme';
import { R2StorageAdapter } from '@factorywager/r2-storage';
import { RegistryAuth, AuthConfigs } from '@factorywager/registry-core/auth';
import type { PackageManifest, PackageVersion, PublishRequest } from '@factorywager/registry-core/types';
import { resolveR2InfraConfig } from '../../../../../lib/security/infra-secrets';

export interface ServerOptions {
  port?: number;
  hostname?: string;
  storage?: {
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucketName?: string;
  };
  auth?: 'none' | 'basic' | 'token' | 'jwt';
  authSecret?: string;
  allowProxy?: boolean;
  upstreamRegistry?: string;
  cdnUrl?: string;
}

export class NPMRegistryServer {
  private storage: R2StorageAdapter;
  private auth: RegistryAuth;
  private options: ServerOptions;
  private server?: ReturnType<typeof Bun.serve>;

  constructor(options: ServerOptions = {}) {
    const REGISTRY_PORT = parseInt(process.env.REGISTRY_PORT || '4873', 10);
    const REGISTRY_HOST = process.env.REGISTRY_HOST || process.env.SERVER_HOST || 'localhost';
    this.options = {
      port: REGISTRY_PORT, // Default npm registry port
      hostname: '0.0.0.0',
      auth: 'none',
      allowProxy: true,
      upstreamRegistry: 'https://registry.npmjs.org',
      ...options,
    };

    this.storage = new R2StorageAdapter({
      accountId: options.storage?.accountId,
      accessKeyId: options.storage?.accessKeyId,
      secretAccessKey: options.storage?.secretAccessKey,
      bucketName: options.storage?.bucketName || 'npm-registry',
    });

    // Initialize auth
    switch (this.options.auth) {
      case 'basic':
        this.auth = new RegistryAuth(AuthConfigs.basic(this.options.authSecret || 'admin'));
        break;
      case 'jwt':
        this.auth = new RegistryAuth(AuthConfigs.jwt(this.options.authSecret || crypto.randomUUID()));
        break;
      case 'token':
        this.auth = new RegistryAuth(AuthConfigs.token());
        break;
      default:
        this.auth = new RegistryAuth(AuthConfigs.none());
    }
  }

  /**
   * Start the registry server
   */
  async start(): Promise<void> {
    const port = this.options.port!;

    this.server = Bun.serve({
      port,
      hostname: this.options.hostname,
      fetch: (request) => this.handleRequest(request),
    });

    console.log(styled(`\n📦 NPM Registry Server`, 'accent'));
    console.log(styled(`=====================`, 'accent'));
    const REGISTRY_HOST = process.env.REGISTRY_HOST || process.env.SERVER_HOST || 'localhost';
    console.log(styled(`🌐 URL: http://${REGISTRY_HOST}:${port}`, 'info'));
    console.log(styled(`🪣 Storage: ${this.options.storage?.bucketName || 'npm-registry'}`, 'info'));
    console.log(styled(`🔐 Auth: ${this.options.auth}`, 'info'));
    console.log(styled(`📡 Proxy: ${this.options.allowProxy ? 'Enabled' : 'Disabled'}`, 'info'));
    console.log(styled(`\n✅ Registry ready!\n`, 'success'));
  }

  /**
   * Stop the registry server
   */
  async stop(): Promise<void> {
    this.server?.stop();
    console.log(styled('📦 Registry stopped', 'info'));
  }

  /**
   * Handle incoming requests
   */
  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Add CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, npm-auth-type, npm-command',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Authenticate request
      const authContext = await this.auth.authenticate(request);

      // Route handlers
      if (path === '/' || path === '/-/ping') {
        return this.handlePing(request, corsHeaders);
      }

      if (path === '/-/v1/login') {
        return this.handleLogin(request, corsHeaders);
      }

      if (path === '/-/whoami') {
        return this.handleWhoami(request, authContext, corsHeaders);
      }

      if (path === '/-/search') {
        return this.handleSearch(request, corsHeaders);
      }

      if (path === '/-/all') {
        return this.handleAllPackages(request, corsHeaders);
      }

      // Package-specific routes
      const packageMatch = path.match(/^\/(@[^/]+\/[^/]+|[^/@]+)$/);
      if (packageMatch && request.method === 'GET') {
        return this.handleGetPackage(request, packageMatch[1], authContext, corsHeaders);
      }

      if (packageMatch && request.method === 'PUT') {
        return this.handlePublish(request, packageMatch[1], authContext, corsHeaders);
      }

      // Dist-tags routes
      const distTagsMatch = path.match(/^\/(@[^/]+\/[^/]+|[^/@]+)\/\-\/package\-dist\-tags$/);
      if (distTagsMatch) {
        return this.handleDistTags(request, distTagsMatch[1], authContext, corsHeaders);
      }

      // Tarball download
      const tarballMatch = path.match(/^\/(@[^/]+\/[^/]+|[^/@]+)\/\-\/([^/]+\.(tgz|tar\.gz))$/);
      if (tarballMatch) {
        return this.handleDownload(request, tarballMatch[1], tarballMatch[2], corsHeaders);
      }

      // Scoped tarball
      const scopedTarballMatch = path.match(/^\/(@[^/]+)\/([^/]+)\/\-\/([^/]+\.(tgz|tar\.gz))$/);
      if (scopedTarballMatch) {
        return this.handleDownload(
          request, 
          `${scopedTarballMatch[1]}/${scopedTarballMatch[2]}`, 
          scopedTarballMatch[3], 
          corsHeaders
        );
      }

      // Not found
      return this.jsonResponse({ error: 'Not found' }, 404, corsHeaders);
    } catch (error) {
      console.error(styled(`❌ Error: ${error.message}`, 'error'));
      return this.jsonResponse({ 
        error: 'Internal server error',
        message: error.message 
      }, 500, corsHeaders);
    }
  }

  /**
   * Handle ping endpoint
   */
  private handlePing(request: Request, corsHeaders: Record<string, string>): Response {
    return this.jsonResponse({ 
      ok: true,
      registry: 'factorywager-private-registry',
      version: '1.0.0',
    }, 200, corsHeaders);
  }

  /**
   * Handle login
   */
  private async handleLogin(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const body = await request.json().catch(() => ({}));
    
    // In production, validate credentials
    return this.jsonResponse({
      ok: true,
      token: this.auth.createJwt(body.name || 'anonymous', false),
    }, 200, corsHeaders);
  }

  /**
   * Handle whoami
   */
  private handleWhoami(
    request: Request, 
    authContext: Awaited<ReturnType<typeof this.auth.authenticate>>,
    corsHeaders: Record<string, string>
  ): Response {
    if (!authContext.authenticated) {
      return this.auth.challenge();
    }

    return this.jsonResponse({
      username: authContext.user?.name || 'anonymous',
    }, 200, corsHeaders);
  }

  /**
   * Handle package search
   */
  private async handleSearch(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const url = new URL(request.url);
    const query = url.searchParams.get('text') || '';
    const size = parseInt(url.searchParams.get('size') || '20');

    const packages = await this.storage.listPackages();
    const results = [];

    for (const pkg of packages) {
      if (!query || pkg.includes(query)) {
        const manifest = await this.storage.getManifest(pkg);
        if (manifest) {
          results.push({
            package: {
              name: manifest.name,
              version: manifest['dist-tags'].latest,
              description: manifest.description,
              keywords: manifest.keywords,
              date: manifest.time?.modified,
              author: manifest.author,
              publisher: manifest.maintainers?.[0],
              maintainers: manifest.maintainers,
            },
            score: {
              final: 1.0,
              detail: { quality: 1, popularity: 1, maintenance: 1 },
            },
            searchScore: 1.0,
          });
        }
      }
    }

    return this.jsonResponse({
      objects: results.slice(0, size),
      total: results.length,
      time: new Date().toISOString(),
    }, 200, corsHeaders);
  }

  /**
   * Handle list all packages
   */
  private async handleAllPackages(request: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const packages = await this.storage.listPackages();
    return this.jsonResponse({ packages }, 200, corsHeaders);
  }

  /**
   * Handle get package manifest
   */
  private async handleGetPackage(
    request: Request,
    packageName: string,
    authContext: Awaited<ReturnType<typeof this.auth.authenticate>>,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    // Try to get from local registry
    let manifest = await this.storage.getManifest(packageName);

    // If not found and proxy enabled, fetch from upstream
    if (!manifest && this.options.allowProxy) {
      try {
        const upstreamResponse = await fetch(`${this.options.upstreamRegistry}/${packageName}`);
        if (upstreamResponse.ok) {
          manifest = await upstreamResponse.json();
        }
      } catch (error) {
        console.warn(styled(`⚠️ Proxy fetch failed: ${error.message}`, 'warning'));
      }
    }

    if (!manifest) {
      return this.jsonResponse({ error: 'Package not found' }, 404, corsHeaders);
    }

    // Update tarball URLs to point to this registry
    manifest = this.rewriteTarballUrls(manifest, request);

    return this.jsonResponse(manifest, 200, corsHeaders);
  }

  /**
   * Handle package publish
   */
  private async handlePublish(
    request: Request,
    packageName: string,
    authContext: Awaited<ReturnType<typeof this.auth.authenticate>>,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    // Check authentication
    if (!authContext.authenticated || authContext.readonly) {
      return this.auth.challenge();
    }

    try {
      const publishData: PublishRequest = await request.json();
      const version = publishData.version;

      // Validate package name matches URL
      if (publishData.name !== packageName) {
        return this.jsonResponse({ 
          error: 'Package name mismatch' 
        }, 400, corsHeaders);
      }

      // Check if version already exists
      const exists = await this.storage.exists(packageName, version);
      if (exists) {
        return this.jsonResponse({
          error: 'Conflict',
          reason: `${packageName}@${version} already exists`,
        }, 409, corsHeaders);
      }

      // Handle tarball attachment
      let tarballUrl = '';
      const attachmentKey = Object.keys(publishData.attachments || {})[0];
      if (attachmentKey && publishData.attachments?.[attachmentKey]) {
        const attachment = publishData.attachments[attachmentKey];
        const tarballData = Buffer.from(attachment.data, 'base64');
        
        const result = await this.storage.storeTarball(packageName, version, tarballData);
        tarballUrl = result.url;
      }

      // Get or create manifest
      let manifest = await this.storage.getManifest(packageName);
      if (!manifest) {
        manifest = {
          name: packageName,
          'dist-tags': {},
          versions: {},
          time: {
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          },
          _id: packageName,
        };
      }

      // Create version entry
      const versionData: PackageVersion = {
        name: packageName,
        version: version,
        description: publishData.description,
        main: publishData.main,
        dist: {
          tarball: tarballUrl,
          shasum: publishData.dist.shasum,
          integrity: publishData.dist.integrity,
        },
        _id: `${packageName}@${version}`,
        _npmUser: authContext.user 
          ? { name: authContext.user.name, email: authContext.user.email || '' }
          : undefined,
        maintainers: publishData.maintainers,
        readme: publishData.readme,
        readmeFilename: publishData.readmeFilename,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      };

      // Update manifest
      manifest.versions[version] = versionData;
      manifest.time![version] = new Date().toISOString();
      manifest.time!.modified = new Date().toISOString();

      // Update dist-tags
      if (publishData['dist-tags']) {
        Object.assign(manifest['dist-tags'], publishData['dist-tags']);
      } else if (!manifest['dist-tags'].latest) {
        manifest['dist-tags'].latest = version;
      }

      // Store manifest
      await this.storage.storeManifest(manifest);

      console.log(styled(`📦 Published: ${packageName}@${version}`, 'success'));

      return this.jsonResponse({
        ok: true,
        id: packageName,
        version,
      }, 201, corsHeaders);

    } catch (error) {
      console.error(styled(`❌ Publish failed: ${error.message}`, 'error'));
      return this.jsonResponse({
        error: 'Publish failed',
        reason: error.message,
      }, 500, corsHeaders);
    }
  }

  /**
   * Handle dist-tags operations
   */
  private async handleDistTags(
    request: Request,
    packageName: string,
    authContext: Awaited<ReturnType<typeof this.auth.authenticate>>,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const manifest = await this.storage.getManifest(packageName);
    if (!manifest) {
      return this.jsonResponse({ error: 'Package not found' }, 404, corsHeaders);
    }

    if (request.method === 'GET') {
      return this.jsonResponse(manifest['dist-tags'], 200, corsHeaders);
    }

    if (request.method === 'PUT' || request.method === 'POST') {
      if (!authContext.authenticated || authContext.readonly) {
        return this.auth.challenge();
      }

      const body = await request.json();
      Object.assign(manifest['dist-tags'], body);
      await this.storage.storeManifest(manifest);

      return this.jsonResponse(manifest['dist-tags'], 200, corsHeaders);
    }

    if (request.method === 'DELETE') {
      if (!authContext.authenticated || authContext.readonly) {
        return this.auth.challenge();
      }

      const tag = new URL(request.url).searchParams.get('tag');
      if (tag && manifest['dist-tags'][tag]) {
        delete manifest['dist-tags'][tag];
        await this.storage.storeManifest(manifest);
      }

      return this.jsonResponse(manifest['dist-tags'], 200, corsHeaders);
    }

    return this.jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  /**
   * Handle tarball download
   */
  private async handleDownload(
    request: Request,
    packageName: string,
    filename: string,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    try {
      // Try to get from local storage
      const manifest = await this.storage.getManifest(packageName);
      
      if (manifest) {
        // Find the version that matches this tarball
        for (const version of Object.values(manifest.versions)) {
          if (version.dist.tarball.includes(filename)) {
            // Redirect to tarball URL
            return Response.redirect(version.dist.tarball, 302);
          }
        }
      }

      // If not found locally and proxy enabled, try upstream
      if (this.options.allowProxy) {
        const upstreamUrl = `${this.options.upstreamRegistry}/${packageName}/-/${filename}`;
        return Response.redirect(upstreamUrl, 302);
      }

      return this.jsonResponse({ error: 'Tarball not found' }, 404, corsHeaders);
    } catch (error) {
      return this.jsonResponse({ error: 'Download failed' }, 500, corsHeaders);
    }
  }

  /**
   * Rewrite tarball URLs to point to this registry
   */
  private rewriteTarballUrls(manifest: PackageManifest, request: Request): PackageManifest {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    for (const version of Object.values(manifest.versions)) {
      // Extract filename from tarball URL
      const filename = version.dist.tarball.split('/-/').pop() || 'package.tgz';
      version.dist.tarball = `${baseUrl}/${manifest.name}/-/${filename}`;
    }

    return manifest;
  }

  /**
   * Helper: Send JSON response
   */
  private jsonResponse(data: any, status: number = 200, extraHeaders: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    });
  }
}

// CLI interface
if (import.meta.main) {
  const infraR2 = await resolveR2InfraConfig({
    services: [
      Bun.env.REGISTRY_SECRETS_SERVICE || 'com.factorywager.registry',
      Bun.env.FW_R2_SECRETS_SERVICE || 'com.factorywager.r2',
      Bun.env.FW_INFRA_SECRETS_SERVICE || 'com.factorywager.infra',
      'default',
    ],
    bucketFallback: process.env.R2_REGISTRY_BUCKET || 'npm-registry',
  });

  const server = new NPMRegistryServer({
    port: parseInt(process.env.REGISTRY_PORT || '4873'),
    auth: (process.env.REGISTRY_AUTH as any) || 'none',
    authSecret: process.env.REGISTRY_SECRET,
    storage: {
      accountId: infraR2.accountId,
      accessKeyId: infraR2.accessKeyId,
      secretAccessKey: infraR2.secretAccessKey,
      bucketName: infraR2.bucketName,
    },
    cdnUrl: process.env.REGISTRY_CDN_URL,
  });

  await server.start();

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log(styled('\n\n🛑 Shutting down...', 'warning'));
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}
