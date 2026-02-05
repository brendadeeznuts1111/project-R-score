// apps/dashboard/security.ts
// Tier-1380 Hardened CSP for Omega Phase 3.25

const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-eval'", // unsafe-eval needed for Bun.Transpiler/replMode
  "connect-src 'self' https://profiles.factory-wager.com wss://* ws://*",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
  "form-action 'self'",
  "base-uri 'self'",
  "manifest-src 'self'"
].join("; ");

export const securityHeaders = {
  "Content-Security-Policy": CSP,
  "X-Tier1380-Protocol": "v3.25",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin"
};
