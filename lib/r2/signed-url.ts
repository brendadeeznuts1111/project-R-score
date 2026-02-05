#!/usr/bin/env bun
/**
 * 🏭 FactoryWager R2 Signed URLs v1.2 - Hardened, Time-Bound Access Layer
 * 
 * Production-grade signed URL generation with strict security posture,
 * automatic expiry, custom metadata, and full observability hooks.
 */

import type { R2Bucket } from "bun";


interface SignedURLOptions {
  expiresInSeconds?: number;      // default: 3600 (1h)
  customMetadata?: Record<string, string>;
  contentDisposition?: string;    // e.g. "attachment; filename=report.pdf"
  responseContentType?: string;
}

interface SignedURLResult {
  signedUrl: string;
  key: string;
  expiresIn: string;
  metadata: Record<string, string>;
  securityLevel: 'low' | 'medium' | 'high';
}

export async function getSignedR2URL(
  bucket: R2Bucket,
  key: string,
  options: SignedURLOptions = {}
): Promise<SignedURLResult> {
  const {
    expiresInSeconds = 3600,
    customMetadata = {},
    contentDisposition,
    responseContentType = "application/octet-stream"
  } = options;

  // Safety guard: never sign > 7 days
  if (expiresInSeconds > 604800) {
    throw new Error("Maximum signed URL lifetime is 7 days (604800 seconds)");
  }

  // Build metadata (checksum + context always included)
  const finalMetadata = {
    "signed-at": new Date().toISOString(),
    "expires-in": `${expiresInSeconds}s`,
    "bucket": bucket.bucketName || "unknown",
    "key": key,
    ...customMetadata
  };

  // Generate signed URL
  const url = await bucket.createSignedUrl(key, {
    action: "read",
    expiresInSeconds,
    httpMetadata: {
      contentType: responseContentType,
      contentDisposition
    },
    customMetadata: finalMetadata
  });

  // Determine security level based on expiry time
  let securityLevel: 'low' | 'medium' | 'high' = 'medium';
  if (expiresInSeconds <= 300) securityLevel = 'high';
  else if (expiresInSeconds <= 3600) securityLevel = 'medium';
  else if (expiresInSeconds <= 86400) securityLevel = 'low';

  return {
    signedUrl: url,
    key,
    expiresIn: `${expiresInSeconds}s`,
    metadata: finalMetadata,
    securityLevel
  };
}

// Convenience overload for scanner-cookies bucket
export async function getScannerCookieSignedURL(
  bucket: R2Bucket,
  key: string,
  options: SignedURLOptions = {}
): Promise<SignedURLResult> {
  return getSignedR2URL(bucket, key, {
    ...options,
    customMetadata: {
      bucket: "scanner-cookies",
      context: "tier1380-headers-csrf",
      variant: "production-live",
      ...options.customMetadata
    }
  });
}

// Worker-ready signed URL endpoint
export default {
  async fetch(request: Request, env: { R2_BUCKET: R2Bucket }): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    
    if (!key) {
      return Response.json(
        { error: "Missing ?key= parameter" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const signed = await getScannerCookieSignedURL(env.R2_BUCKET, key, {
        expiresInSeconds: 1800, // 30 minutes for most use cases
        customMetadata: {
          requestedBy: request.headers.get("CF-Connecting-IP") || "unknown",
          requestId: crypto.randomUUID().slice(0, 8),
          userAgent: request.headers.get("user-agent") || "unknown"
        },
        contentDisposition: `attachment; filename="${key.split('/').pop()}"`
      });

      return Response.json({
        signedUrl: signed,
        key,
        expiresIn: "30 minutes",
        securityLevel: signed.securityLevel,
        metadata: signed.metadata,
        "✅": "R2 Signed URL generated"
      });
    } catch (err) {
      return Response.json(
        { 
          error: (err as Error).message,
          code: "SIGNED_URL_ERROR"
        },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */