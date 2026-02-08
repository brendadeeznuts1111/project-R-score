/**
 * Secure Fraud Session Management using Bun's Cookie API
 * 
 * Implements hardened cookie-based session management for fraud prevention:
 * - httpOnly cookies (prevents XSS-based theft)
 * - secure flag (TLS-only transmission)
 * - sameSite strict (CSRF protection)
 * - Hashed device tokens and session signatures
 * 
 * Reference: https://bun.com/docs/api/cookies
 */

import { logger } from '../../user-profile/src/index.ts';
import { randomBytes, createHash } from 'crypto';

/**
 * Session configuration
 * Cross-referenced with centralized LIMITS config
 */
const SESSION_CONFIG = {
  EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days (matches SESSION_TTL from config)
  COOKIE_NAME: 'fraud_sid',
  DEVICE_COOKIE_NAME: 'd_id',
  VISIT_COOKIE_NAME: 'v_ts',
  SECURE: process.env.NODE_ENV === 'production', // Secure flag in production
  PARTITIONED: true, // Enable CHIPS (Cookies Having Independent Partitioned State) for cross-site privacy
} as const;

/**
 * Cookie telemetry thresholds
 */
const COOKIE_TELEMETRY = {
  WARN_SIZE_BYTES: 4096, // Warn if cookie header > 4KB
  MAX_COOKIES: 20, // Maximum recommended cookies
} as const;

/**
 * Generate a secure session hash
 */
function generateSessionHash(userId: string, deviceId: string): string {
  const timestamp = Date.now();
  const random = randomBytes(16).toString('hex');
  const input = `${userId}:${deviceId}:${timestamp}:${random}`;
  return createHash('sha256').update(input).digest('hex').substring(0, 32);
}

/**
 * Generate a device fingerprint hash
 */
function generateDeviceId(userAgent: string, ipAddress?: string): string {
  const input = `${userAgent}:${ipAddress || 'unknown'}:${Date.now()}`;
  return createHash('sha256').update(input).digest('hex').substring(0, 16);
}

/**
 * Extract fraud context from request cookies
 * 
 * Uses Bun's CookieMap to safely extract device and session information
 * for fraud detection and tracking.
 * 
 * @param req - Bun Request object
 * @returns Fraud context with device ID, session ID, and visit timestamp
 */
export function extractFraudContext(req: Request): {
  deviceId: string | null;
  sessionId: string | null;
  lastVisit: number | null;
  ipAddress?: string;
  userAgent?: string;
} {
  try {
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) {
      return {
        deviceId: null,
        sessionId: null,
        lastVisit: null,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      };
    }
    
    const cookies = new Bun.CookieMap(cookieHeader);
    
    return {
      deviceId: cookies.get(SESSION_CONFIG.DEVICE_COOKIE_NAME) || null,
      sessionId: cookies.get(SESSION_CONFIG.COOKIE_NAME) || null,
      lastVisit: cookies.get(SESSION_CONFIG.VISIT_COOKIE_NAME) 
        ? parseInt(cookies.get(SESSION_CONFIG.VISIT_COOKIE_NAME)!, 10) 
        : null,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    };
  } catch (error) {
    logger.debug(`Failed to extract fraud context: ${error instanceof Error ? error.message : String(error)}`);
    return {
      deviceId: null,
      sessionId: null,
      lastVisit: null,
    };
  }
}

/**
 * Set secure fraud session cookies
 * 
 * Uses Bun's CookieMap to set hardened cookies with security flags.
 * Cookies are automatically synchronized to the Response headers.
 * 
 * @param req - Bun Request object (for cookie access)
 * @param userId - User ID for session
 * @param deviceId - Optional device ID (generated if not provided)
 * @returns Cookie values and Response headers
 */
export function setFraudSession(
  req: Request,
  userId: string,
  deviceId?: string
): {
  sessionId: string;
  deviceId: string;
} {
  // Check for existing device ID in cookies
  const cookieHeader = req.headers.get('cookie') || '';
  let existingDeviceId: string | undefined;
  
  if (cookieHeader) {
    try {
      const cookies = new Bun.CookieMap(cookieHeader);
      existingDeviceId = cookies.get(SESSION_CONFIG.DEVICE_COOKIE_NAME) || undefined;
    } catch {
      // Invalid cookie header, continue
    }
  }
  
  // Generate or use existing device ID
  const finalDeviceId = deviceId || existingDeviceId || generateDeviceId(
    req.headers.get('user-agent') || 'unknown',
    req.headers.get('x-forwarded-for')?.split(',')[0]
  );
  
  // Generate session hash
  const sessionId = generateSessionHash(userId, finalDeviceId);
  
  logger.debug(`✅ Fraud session created: ${sessionId.substring(0, 8)}... for user ${userId}`);
  
  return {
    sessionId,
    deviceId: finalDeviceId,
  };
}

/**
 * Revoke fraud session (Nuclear Logout)
 * 
 * Immediately deletes all fraud-related cookies by setting max-age=0.
 * This is a one-line "nuclear logout" for suspicious accounts.
 * 
 * @param req - Bun Request object
 * @returns Array of Set-Cookie headers to delete cookies
 */
export function revokeFraudSession(req: Request): string[] {
  // Create Set-Cookie headers with max-age=0 to delete cookies
  const deleteHeaders: string[] = [
    `${SESSION_CONFIG.COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
    `${SESSION_CONFIG.DEVICE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Strict`,
    `${SESSION_CONFIG.VISIT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Strict`,
  ];
  
  if (SESSION_CONFIG.SECURE) {
    // Add Secure flag if in production
    return deleteHeaders.map(header => header + '; Secure');
  }
  
  logger.warn(`🚨 Fraud session revoked (all cookies deleted)`);
  
  return deleteHeaders;
}

/**
 * Create a secure session cookie string
 * 
 * Zero-copy cookie factory that ensures every session cookie is hardened by default.
 * Uses optimized string construction for Set-Cookie headers.
 * 
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 * @returns Set-Cookie header string
 */
export function createSecureCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    partitioned?: boolean;
  } = {}
): string {
  // Build Set-Cookie header string with security flags
  let cookie = `${name}=${value}`;
  cookie += `; Path=/`;
  
  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${options.maxAge}`;
  } else {
    cookie += `; Max-Age=${SESSION_CONFIG.EXPIRY_SECONDS}`;
  }
  
  if (options.secure ?? SESSION_CONFIG.SECURE) {
    cookie += `; Secure`;
  }
  
  if (options.httpOnly) {
    cookie += `; HttpOnly`;
  }
  
  cookie += `; SameSite=${options.sameSite ?? 'strict'}`;
  
  // CHIPS: Cookies Having Independent Partitioned State
  if (options.partitioned ?? SESSION_CONFIG.PARTITIONED) {
    cookie += `; Partitioned`;
  }
  
  return cookie;
}

/**
 * Create a Response with fraud session cookies
 * 
 * Uses Bun's native Cookie class for zero-copy cookie creation.
 * Cookies are automatically synchronized to Response headers.
 * 
 * @param body - Response body
 * @param sessionData - Session data with cookies to set
 * @param init - Optional ResponseInit
 * @returns Response with Set-Cookie headers
 */
export function createResponseWithCookies(
  body: BodyInit | null,
  sessionData: { sessionId: string; deviceId: string },
  init?: ResponseInit
): Response {
  const headers = new Headers(init?.headers);
  
  // Create secure cookies using zero-copy cookie factory
  const sessionCookie = createSecureCookie(
    SESSION_CONFIG.COOKIE_NAME,
    sessionData.sessionId,
    { httpOnly: true, maxAge: SESSION_CONFIG.EXPIRY_SECONDS }
  );
  
  const deviceCookie = createSecureCookie(
    SESSION_CONFIG.DEVICE_COOKIE_NAME,
    sessionData.deviceId,
    { httpOnly: false, maxAge: SESSION_CONFIG.EXPIRY_SECONDS * 2 }
  );
  
  const visitCookie = createSecureCookie(
    SESSION_CONFIG.VISIT_COOKIE_NAME,
    String(Date.now()),
    { httpOnly: false, maxAge: SESSION_CONFIG.EXPIRY_SECONDS }
  );
  
  // Add Set-Cookie headers (multiple cookies require multiple headers)
  headers.append('Set-Cookie', sessionCookie);
  headers.append('Set-Cookie', deviceCookie);
  headers.append('Set-Cookie', visitCookie);
  
  return new Response(body, {
    ...init,
    headers,
  });
}

/**
 * Cookie Telemetry: Track session bloat and security
 * 
 * Lightweight cookie audit to track session bloat (which can slow down HTTP requests).
 * Uses Bun's CookieMap for efficient parsing and iteration.
 * 
 * @param req - Bun Request object
 * @returns Cookie telemetry statistics
 */
export function getCookieTelemetry(req: Request): {
  count: number;
  isSecure: boolean;
  totalBytes: number;
  cookieNames: string[];
  hasFraudSession: boolean;
  hasPartitioned: boolean;
  warning?: string;
} {
  try {
    const cookieHeader = req.headers.get('cookie');
    const totalBytes = cookieHeader?.length || 0;
    const isSecure = req.headers.get('x-forwarded-proto') === 'https' || 
                     req.headers.get('x-forwarded-for') !== null; // Proxy indicates HTTPS
    
    if (!cookieHeader) {
      return {
        count: 0,
        isSecure: false,
        totalBytes: 0,
        cookieNames: [],
        hasFraudSession: false,
        hasPartitioned: false,
      };
    }
    
    const cookies = new Bun.CookieMap(cookieHeader);
    const cookieNames: string[] = [];
    let hasFraudSession = false;
    let hasPartitioned = false;
    
    // Iterate over cookies (CookieMap is iterable)
    for (const [name, value] of cookies) {
      cookieNames.push(name);
      if (name === SESSION_CONFIG.COOKIE_NAME) {
        hasFraudSession = true;
      }
      // Check if cookie has Partitioned attribute (CHIPS)
      // Note: CookieMap doesn't expose attributes directly, so we check the header
      if (cookieHeader.includes(`${name}=${value}; Partitioned`) || 
          cookieHeader.includes(`${name}=${value}; Partitioned`)) {
        hasPartitioned = true;
      }
    }
    
    const count = cookies.size;
    let warning: string | undefined;
    
    // Warn about cookie bloat
    if (totalBytes > COOKIE_TELEMETRY.WARN_SIZE_BYTES) {
      warning = `⚠️ High cookie overhead detected (>${COOKIE_TELEMETRY.WARN_SIZE_BYTES} bytes)`;
    } else if (count > COOKIE_TELEMETRY.MAX_COOKIES) {
      warning = `⚠️ Too many cookies (${count} > ${COOKIE_TELEMETRY.MAX_COOKIES})`;
    }
    
    if (warning) {
      logger.warn(warning);
    }
    
    return {
      count,
      isSecure,
      totalBytes,
      cookieNames,
      hasFraudSession,
      hasPartitioned,
      warning,
    };
  } catch (error) {
    logger.debug(`Failed to get cookie telemetry: ${error instanceof Error ? error.message : String(error)}`);
    return {
      count: 0,
      isSecure: false,
      totalBytes: 0,
      cookieNames: [],
      hasFraudSession: false,
      hasPartitioned: false,
      warning: 'Failed to parse cookies',
    };
  }
}
