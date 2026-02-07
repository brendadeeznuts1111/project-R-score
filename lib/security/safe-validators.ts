// lib/security/safe-validators.ts — Composable input validation guards

export interface SafeResult<T> {
  ok: boolean;
  value: T;
  error?: string;
}

const HEX_COLOR_RE = /^#([A-Fa-f0-9]{3,8})$/;
const SERVICE_NAME_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){1,5}$/;

// Injection detection patterns (inlined from input-validation-lib SecurityPatterns)
const MALICIOUS_PATTERNS: RegExp[] = [
  // XSS
  /<script\b/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  // Path traversal
  /\.\./,
  // Command injection
  /[;&|`]/,
  /\$\(/,
];

function containsMaliciousPatterns(input: string): boolean {
  return MALICIOUS_PATTERNS.some(p => p.test(input));
}

/**
 * Validate and sanitize a plain string.
 * Type-checks, trims, scans for injection patterns, and enforces a length cap.
 */
export function safeString(input: unknown, maxLength = 256): SafeResult<string> {
  if (typeof input !== 'string') {
    return { ok: false, value: '', error: 'Expected a string' };
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, value: '', error: 'String is empty' };
  }

  if (trimmed.length > maxLength) {
    return { ok: false, value: '', error: `String exceeds max length of ${maxLength}` };
  }

  if (containsMaliciousPatterns(trimmed)) {
    return { ok: false, value: '', error: 'String contains potentially malicious content' };
  }

  return { ok: true, value: trimmed };
}

/**
 * Validate a hex color string (#RGB, #RGBA, #RRGGBB, #RRGGBBAA).
 */
export function safeHexColor(input: unknown): SafeResult<string> {
  if (typeof input !== 'string') {
    return { ok: false, value: '', error: 'Expected a string' };
  }

  const trimmed = input.trim();
  if (!HEX_COLOR_RE.test(trimmed)) {
    return { ok: false, value: '', error: 'Invalid hex color format (expected #RGB, #RGBA, #RRGGBB, or #RRGGBBAA)' };
  }

  // Validate digit count: 3, 4, 6, or 8 hex digits after #
  const digits = trimmed.length - 1;
  if (![3, 4, 6, 8].includes(digits)) {
    return { ok: false, value: '', error: 'Invalid hex color length (expected 3, 4, 6, or 8 hex digits)' };
  }

  return { ok: true, value: trimmed };
}

/**
 * Validate a reverse-DNS service name (e.g. `com.factorywager.wiki`).
 * Lowercase alphanumeric segments separated by dots, 2–6 segments, max 128 chars.
 */
export function safeServiceName(input: unknown): SafeResult<string> {
  if (typeof input !== 'string') {
    return { ok: false, value: '', error: 'Expected a string' };
  }

  const trimmed = input.trim();
  if (trimmed.length > 128) {
    return { ok: false, value: '', error: 'Service name exceeds max length of 128' };
  }

  if (!SERVICE_NAME_RE.test(trimmed)) {
    return { ok: false, value: '', error: 'Invalid service name format (expected reverse-DNS like com.example.service)' };
  }

  return { ok: true, value: trimmed };
}
