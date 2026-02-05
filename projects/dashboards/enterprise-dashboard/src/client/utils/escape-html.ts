/**
 * HTML escaping for user content (XSS-safe).
 * Uses Bun.escapeHTML when available; fallback for browser or non-Bun.
 */

function fallbackEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape HTML special characters. Use when injecting user-provided
 * or untrusted data into HTML (e.g. matrix report rows, pattern strings).
 */
export function escapeHTML(value: string | number | boolean | object): string {
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (typeof Bun !== "undefined" && typeof (Bun as any).escapeHTML === "function") {
    return (Bun as any).escapeHTML(s);
  }
  return fallbackEscape(s);
}
