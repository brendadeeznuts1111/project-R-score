/**
 * Shared browser-security headers for Cloudflare Pages static assets and Functions.
 *
 * Keep this edge-safe: `functions/_middleware.ts` imports it at Workers runtime.
 * Static parity lives in `public/_headers` and is enforced by tests.
 *
 * @see https://developers.cloudflare.com/pages/configuration/headers/
 * @see https://developers.cloudflare.com/pages/functions/middleware/
 */

export const CLOUDFLARE_SECURITY_HEADERS = {
  'Content-Security-Policy':
    "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  // The Pages project also serves the apex. Do not assert includeSubDomains
  // until every factory-wager.com hostname has an HTTPS inventory and owner.
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'DENY',
  'X-Permitted-Cross-Domain-Policies': 'none',
} as const;

export type CloudflareSecurityHeaderIssue = {
  name: keyof typeof CLOUDFLARE_SECURITY_HEADERS;
  expected: string;
  actual: string | null;
};

/** Compare a live/static response with the shared Pages header contract. */
export function inspectCloudflareSecurityHeaders(headers: {
  get(name: string): string | null;
}): CloudflareSecurityHeaderIssue[] {
  const issues: CloudflareSecurityHeaderIssue[] = [];
  for (const [name, expected] of Object.entries(CLOUDFLARE_SECURITY_HEADERS)) {
    const actual = headers.get(name);
    if (actual !== expected) {
      issues.push({
        name: name as keyof typeof CLOUDFLARE_SECURITY_HEADERS,
        expected,
        actual,
      });
    }
  }
  return issues;
}

export function withCloudflareSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CLOUDFLARE_SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
