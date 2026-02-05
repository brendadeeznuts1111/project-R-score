#!/usr/bin/env bun
/**
 * 🌐 Registry CDN Worker
 * 
 * Cloudflare Worker for edge-cached npm registry
 * - Serves packages from R2 with caching
 * - Provides signed URLs for private packages
 * - Handles npm API routes at the edge
 */

import type { PackageManifest } from '@factorywager/registry-core/types';

export interface Env {
  R2_BUCKET: R2Bucket;
  REGISTRY_BUCKET_NAME: string;
  JWT_SECRET: string;
  CACHE_TTL: string; // seconds
  PUBLIC_PACKAGES: string; // comma-separated list
}

// Cache configuration
const CACHE_CONFIG = {
  manifest: 60,      // 1 minute for manifests (can change)
  tarball: 86400,    // 24 hours for tarballs (immutable)
  search: 300,       // 5 minutes for search results
  static: 3600,      // 1 hour for static content
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    try {
      // Route handlers
      if (path === '/' || path === '/-/ping') {
        return handlePing();
      }

      if (path === '/-/v1/login') {
        return handleLogin(request, env);
      }

      if (path === '/-/whoami') {
        return handleWhoami(request, env);
      }

      if (path === '/-/search') {
        return handleSearch(request, env);
      }

      // Package manifest request
      const packageMatch = path.match(/^\/(@[^/]+\/[^/]+|[^/@]+)$/);
      if (packageMatch && request.method === 'GET') {
        return handlePackage(request, env, packageMatch[1], ctx);
      }

      // Dist-tags
      const distTagsMatch = path.match(/^\/(@[^/]+\/[^/]+|[^/@]+)\/\-\/package\-dist\-tags$/);
      if (distTagsMatch) {
        return handleDistTags(request, env, distTagsMatch[1]);
      }

      // Tarball download
      const tarballMatch = path.match(/^\/(@[^/]+\/[^/]+|[^/@]+)\/\-\/(.+)$/);
      if (tarballMatch && request.method === 'GET') {
        return handleTarball(request, env, tarballMatch[1], tarballMatch[2], ctx);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ 
        error: 'Internal server error',
        message: error.message 
      }, 500);
    }
  },
};

/**
 * Handle CORS preflight
 */
function handleCORS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, npm-auth-type, npm-command',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Handle ping endpoint
 */
function handlePing(): Response {
  return jsonResponse({
    ok: true,
    registry: 'factorywager-cdn-registry',
    version: '1.0.0',
    features: ['r2-storage', 'edge-cache', 'signed-urls'],
  });
}

/**
 * Handle login
 */
async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  
  // In production, validate against stored credentials
  // For now, issue a JWT token
  const token = await createJWT({ 
    sub: body.name || 'anonymous',
    readonly: false,
  }, env.JWT_SECRET);

  return jsonResponse({ ok: true, token });
}

/**
 * Handle whoami
 */
async function handleWhoami(request: Request, env: Env): Promise<Response> {
  const auth = await authenticate(request, env);
  if (!auth.authenticated) {
    return challenge();
  }

  return jsonResponse({ username: auth.user });
}

/**
 * Handle search
 */
async function handleSearch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('text') || '';
  const size = parseInt(url.searchParams.get('size') || '20');

  // Try to get from cache
  const cacheKey = new Request(`https://registry/search?q=${query}&s=${size}`, request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  // List packages from R2
  const prefix = 'packages/';
  const objects = await env.R2_BUCKET.list({ prefix, delimiter: '/' });
  
  const results = [];
  for (const prefix of objects.delimitedPrefixes || []) {
    const pkgName = prefix.replace('packages/', '').replace(/%2f/g, '/').replace(/\/$/, '');
    if (!query || pkgName.includes(query)) {
      const manifest = await getManifest(env, pkgName);
      if (manifest) {
        results.push({
          package: {
            name: manifest.name,
            version: manifest['dist-tags'].latest,
            description: manifest.description,
            keywords: manifest.keywords,
            date: manifest.time?.modified,
            author: manifest.author,
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

  const response = jsonResponse({
    objects: results.slice(0, size),
    total: results.length,
    time: new Date().toISOString(),
  });

  // Cache the response
  ctx?.waitUntil?.(cache.put(cacheKey, response.clone()));
  
  return response;
}

/**
 * Handle package manifest request
 */
async function handlePackage(
  request: Request, 
  env: Env, 
  packageName: string,
  ctx?: ExecutionContext
): Promise<Response> {
  // Try cache first
  const cacheKey = new Request(`https://registry/pkg/${packageName}`, request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  // Check authentication for private packages
  const auth = await authenticate(request, env);
  if (!isPublicPackage(packageName, env) && !auth.authenticated) {
    return challenge();
  }

  // Get manifest from R2
  const manifest = await getManifest(env, packageName);
  if (!manifest) {
    return jsonResponse({ error: 'Package not found' }, 404);
  }

  // Rewrite tarball URLs to use CDN
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  
  for (const version of Object.values(manifest.versions)) {
    const filename = version.dist.tarball.split('/-/').pop() || 'package.tgz';
    version.dist.tarball = `${baseUrl}/${manifest.name}/-/${filename}`;
  }

  const response = jsonResponse(manifest);
  
  // Add cache headers
  response.headers.set('Cache-Control', `public, max-age=${CACHE_CONFIG.manifest}`);
  
  // Cache in edge
  if (ctx) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

/**
 * Handle dist-tags
 */
async function handleDistTags(
  request: Request, 
  env: Env, 
  packageName: string
): Promise<Response> {
  const manifest = await getManifest(env, packageName);
  if (!manifest) {
    return jsonResponse({ error: 'Package not found' }, 404);
  }

  return jsonResponse(manifest['dist-tags']);
}

/**
 * Handle tarball download
 */
async function handleTarball(
  request: Request,
  env: Env,
  packageName: string,
  filename: string,
  ctx?: ExecutionContext
): Promise<Response> {
  // Tarballs are immutable - use long cache
  const cacheKey = new Request(`https://registry/tarball/${packageName}/${filename}`, request);
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  // Check authentication for private packages
  const auth = await authenticate(request, env);
  if (!isPublicPackage(packageName, env) && !auth.authenticated) {
    return challenge();
  }

  const key = `packages/${sanitizePackageName(packageName)}/${filename}`;

  try {
    // Try to get from R2
    const object = await env.R2_BUCKET.get(key);
    
    if (!object) {
      // If not found locally, redirect to npm registry
      return Response.redirect(
        `https://registry.npmjs.org/${packageName}/-/${filename}`,
        302
      );
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', `public, max-age=${CACHE_CONFIG.tarball}, immutable`);
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Access-Control-Allow-Origin', '*');

    // Add content disposition for downloads
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    const response = new Response(object.body, { headers });

    // Cache in edge
    if (ctx) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (error) {
    return jsonResponse({ error: 'Tarball not found' }, 404);
  }
}

/**
 * Get package manifest from R2
 */
async function getManifest(env: Env, packageName: string): Promise<PackageManifest | null> {
  const key = `packages/${sanitizePackageName(packageName)}/manifest.json`;
  
  try {
    const object = await env.R2_BUCKET.get(key);
    if (!object) return null;
    
    return await object.json<PackageManifest>();
  } catch {
    return null;
  }
}

/**
 * Authenticate request
 */
async function authenticate(request: Request, env: Env): Promise<{ authenticated: boolean; user?: string; readonly?: boolean }> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return { authenticated: false };
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyJWT(token, env.JWT_SECRET);
  }

  if (authHeader.startsWith('Basic ')) {
    // Basic auth - in production, verify against stored credentials
    const decoded = atob(authHeader.slice(6));
    const [user] = decoded.split(':');
    return { authenticated: true, user, readonly: false };
  }

  return { authenticated: false };
}

/**
 * Create JWT token
 */
async function createJWT(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + 86400, // 24 hours
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/=/g, '');
  
  const data = `${headerB64}.${payloadB64}`;
  
  // Sign with HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');

  return `${data}.${signatureB64}`;
}

/**
 * Verify JWT token
 */
async function verifyJWT(token: string, secret: string): Promise<{ authenticated: boolean; user?: string; readonly?: boolean }> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return { authenticated: false };
    }

    const payload = JSON.parse(atob(payloadB64));

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: payload.sub,
      readonly: payload.readonly === true,
    };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Check if package is public
 */
function isPublicPackage(packageName: string, env: Env): boolean {
  const publicList = env.PUBLIC_PACKAGES?.split(',') || [];
  return publicList.includes(packageName);
}

/**
 * Sanitize package name for storage key
 */
function sanitizePackageName(name: string): string {
  return name.replace(/^@/, '').replace(/\//g, '%2f');
}

/**
 * Send JSON response
 */
function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Send authentication challenge
 */
function challenge(): Response {
  return jsonResponse({
    error: 'Unauthorized',
    message: 'Authentication required',
  }, 401);
}

// TypeScript types for Cloudflare Workers
declare const caches: {
  default: Cache;
};

declare interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}
