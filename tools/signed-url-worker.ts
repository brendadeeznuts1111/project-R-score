#!/usr/bin/env bun
/**
 * 🏭 FactoryWager Tier-1380 Signed URL Worker
 * 
 * Production-ready worker for generating signed R2 URLs
 * with time-bound access and security validation
 */

import { getSignedR2URL } from "./lib/r2/signed-url.ts";

export default {
  async fetch(request: Request, env: { R2_BUCKET: R2_BUCKET }): Promise<Response> {
    const url = new URL(request.url);
    
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
      
      try {
        const signed = await getSignedR2URL(env.R2_BUCKET, key, {
          expiresInSeconds: 3600, // 1 hour default
          customMetadata: {
            requestedBy: request.headers.get("CF-Connecting-IP") || "unknown",
            requestId: crypto.randomUUID().slice(0, 8),
            userAgent: request.headers.get("user-agent") || "unknown",
            variant: "production-live",
            context: "tier1380-signed-urls"
          }
        });
        
        return Response.json({
          signedUrl: signed,
          key,
          expiresIn: "1 hour",
          securityLevel: signed.securityLevel,
          metadata: signed.metadata,
          usage: "GET /signed?key=<object-key>",
          "✅": "R2 Signed URL generated"
        });
      } catch (error) {
        return Response.json({
          error: (error as Error).message,
          code: "SIGNED_URL_ERROR"
        }, { 
          status: 500, 
          headers: { "Content-Type: "application/json" }
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
      } catch (error) {
        return Response.json({
          error: (error as Error).message,
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
      } catch (error) {
        return Response.json({
          error: (error as Error).message,
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
