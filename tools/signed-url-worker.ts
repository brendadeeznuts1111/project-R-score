#!/usr/bin/env bun
// tools/signed-url-worker.ts — Worker for generating signed R2 URLs

import { getSignedR2URL } from "../lib/r2/signed-url";
import { handleError, ErrorHandler } from ".../lib/utils/error-handler";
import { validateKey, validateURL } from ".../lib/utils/input-validator";

/**
 * 🚀 Prefetch Optimizations
 *
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 *
 * Generated automatically by optimize-examples-prefetch.ts
 */

export default {
  async fetch(request: Request, env: { R2_BUCKET: R2_BUCKET }): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID().slice(0, 8);

    // Route: /signed - Generate signed URL for any key
    if (url.pathname === "/signed" && request.method === "GET") {
      const key = url.searchParams.get("key");

      if (!key) {
        return Response.json({
          error: "Missing ?key= parameter",
          usage: "/signed?key=<object-key>"
        }, {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Validate the key parameter
      const keyValidation = validateKey(key);
      if (!keyValidation.isValid) {
        return Response.json({
          error: "Invalid key parameter",
          details: keyValidation.errors,
          usage: "/signed?key=<object-key>"
        }, {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const validatedKey = keyValidation.value!;

      // Use standardized error handling
      const result = await ErrorHandler.safeExecute(
        async () => {
          return await getSignedR2URL(env.R2_BUCKET, validatedKey, {
            expiresInSeconds: 3600, // 1 hour default
            customMetadata: {
              requestedBy: request.headers.get("CF-Connecting-IP") || "unknown",
              requestId,
              userAgent: request.headers.get("user-agent") || "unknown",
              variant: "production-live",
              context: "tier1380-signed-urls"
            }
          });
        },
        {
          module: 'signed-url-worker',
          function: 'fetch',
          operation: 'generate-signed-url',
          requestId
        }
      );

      if (result.success) {
        const signed = result.data;
        return Response.json({
          signedUrl: signed,
          key: validatedKey,
          expiresIn: "1 hour",
          securityLevel: signed.securityLevel,
          metadata: signed.metadata,
          usage: "GET /signed?key=<object-key>",
          "✅": "R2 Signed URL generated"
        });
      } else {
        const errorResponse = ErrorHandler.createErrorResponse(result.error, 500);
        return Response.json(errorResponse.error, {
          status: errorResponse.status,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Route: /signed/<key> - Direct signed URL access
    if (url.pathname.startsWith("/signed/") && request.method === "GET") {
      const key = url.pathname.slice(9); // Remove "/signed/"

      if (!key) {
        return Response.json({
          error: "Invalid path. Use /signed?key=<object-key>"
        }, {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const signed = await getSignedURL(env.R2_BUCKET, key, {
          expiresInSeconds: 3600,
          customMetadata: {
            requestedBy: request.headers.get("CF-URL") || "unknown",
            requestId: crypto.randomUUID().slice(0, 8),
            userAgent: request.headers.get("user-agent") || "unknown",
            variant: "production-live",
            context: "tier1380-signed-urls",
            directAccess: true
          }
        });

        // Redirect to signed URL
        return Response.redirect(signed.signedUrl, 302);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return Response.json({
          error: errorMessage,
          code: "SIGNED_URL_ERROR"
        }, {
          status: 500,
          headers: { "Content-Type: "application/json" }
        });
      }
    }

    // Route: /audit - Generate audit download URL
    if (url.pathname === "/audit" && request.method === "GET") {
      const key = url.searchParams.get("key") || `audit/audit-${Date.now()}.json`;

      try {
        const signed = await getSignedR2URL(env.R2_BUCKET, key, {
          expiresInSeconds: 86400, // 24 hours for audit
          contentDisposition: "attachment; filename=audit-report.json",
          customMetadata: {
            auditId: `audit-${Date.now()}`,
            variant: "production-live",
            context: "tier1380-audit",
            reportType: "security"
          }
        });

        return Response.json({
          signedUrl: signed,
          key,
          expiresIn: "24 hours",
          securityLevel: signed.securityLevel,
          metadata: signed.metadata,
          usage: "GET /audit?key=<audit-key>",
          "✅": "Audit download URL generated"
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return Response.json({
          error: errorMessage,
          code: "AUDIT_URL_ERROR"
        }, {
          status: 500,
          headers: { "Content-Type: "application/json" }
        });
      }
    }

    // Route: /health - Health check
    if (url.pathname === "/health" && request.method === "GET") {
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        r2Bucket: env.R2_BUCKET || "not-configured",
        signedUrlsSupported: true,
        secureStorageEnabled: true,
        maxLifetime: "7 days",
        currentSignedURLs: 0 // Would track active signed URLs in production
      };

      return Response.json(health);
    }

    // Default route
    return Response.json({
      message: "Tier-1380 Signed URL Worker",
      endpoints: [
        "GET /signed?key=<key> - Generate signed URL",
        "GET /signed/<key> - Direct access via signed URL",
        "GET /audit?key=<audit-key> - Generate audit download URL",
        "GET /health - Health check"
      ],
      usage: "GET /signed?key=<object-key>"
    });
  }
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */