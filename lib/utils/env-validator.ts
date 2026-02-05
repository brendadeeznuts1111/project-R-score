// lib/utils/env-validator.ts
// Environment variable validation and sanitization utilities

/**
 * Validates and sanitizes hostnames for use in URLs
 * Prevents SSRF attacks and injection vulnerabilities
 */
export const validateHost = (host: string | undefined, fallback: string = 'localhost'): string => {
  if (!host) return fallback;
  
  // Remove any URL scheme or path components
  const cleanHost = host.replace(/^https?:\/\//, '').split('/')[0];
  
  // Allow only safe hostname patterns
  const safePatterns = [
    /^localhost$/,           // localhost
    /^0\.0\.0\.0$/,          // all interfaces
    /^127\.0\.0\.1$/,        // loopback
    /^192\.168\.\d+\.\d+$/,  // private network 192.168.x.x
    /^10\.\d+\.\d+\.\d+$/,   // private network 10.x.x.x
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/, // private network 172.16-31.x.x
  ];
  
  // Additional validation for standard hostnames (must be simple alphanumeric)
  const simpleHostname = /^[a-zA-Z0-9.-]+$/.test(cleanHost) && 
    !cleanHost.includes('..') && 
    !cleanHost.includes('%') && 
    !cleanHost.includes(' ') &&
    !cleanHost.includes('\r') &&
    !cleanHost.includes('\n');
  
  const isValid = safePatterns.some(pattern => pattern.test(cleanHost)) || 
    (simpleHostname && cleanHost.split('.').length <= 3 && cleanHost.length <= 253);
  
  return isValid ? cleanHost : fallback;
};

/**
 * Validates and sanitizes port numbers
 */
export const validatePort = (port: string | undefined, fallback: number = 3000): number => {
  if (!port) return fallback;
  
  const parsed = parseInt(port, 10);
  
  // Valid port range: 1-65535, exclude privileged ports for security
  if (isNaN(parsed) || parsed < 1024 || parsed > 65535) {
    return fallback;
  }
  
  return parsed;
};

/**
 * Safely parses integers with validation
 */
export const safeParseInt = (value: string | undefined, fallback: number, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
  if (!value) return fallback;
  
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  
  return parsed;
};

/**
 * Sanitizes sensitive environment data for logging
 */
export const sanitizeEnvVar = (value: string | undefined, fallback: string, sensitive: boolean = false): string => {
  if (!value) return fallback;
  
  if (sensitive) {
    // Check for common sensitive patterns in fallback name
    const sensitivePatterns = [
      /key/i, /secret/i, /password/i, /token/i, /auth/i,
      /account/i, /id$/i, /bucket/i, /cdn/i
    ];
    
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(fallback));
    
    if (isSensitive) {
      // Show only first and last character, or mask completely
      if (value.length <= 8) {
        return '[REDACTED]';
      }
      return `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`;
    }
  }
  
  return value;
};

/**
 * Validates URLs for SSRF protection
 */
export const validateUrl = (url: string | undefined, allowedHosts: string[] = []): string | null => {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    
    // Allow only http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Check against allowed hosts
    if (allowedHosts.length > 0 && !allowedHosts.includes(parsed.hostname)) {
      return null;
    }
    
    // Prevent dangerous patterns in path
    if (parsed.pathname.includes('..') || 
        parsed.pathname.includes('%2e%2e') || 
        parsed.pathname.includes('%2E%2E') ||
        parsed.pathname.includes('\\')) {
      return null;
    }
    
    return url;
  } catch {
    return null;
  }
};

/**
 * Comprehensive environment variable validator
 */
export const validateEnvironment = {
  host: validateHost,
  port: validatePort,
  parseInt: safeParseInt,
  sanitize: sanitizeEnvVar,
  url: validateUrl,
};

/**
 * Predefined safe host lists for different environments
 */
export const SAFE_HOSTS = {
  development: ['localhost', '0.0.0.0', '127.0.0.1'],
  staging: ['localhost', '0.0.0.0', '127.0.0.1'],
  production: ['0.0.0.0'], // Only bind to all interfaces in production
} as const;

/**
 * Environment-specific validation
 */
export const validateForEnvironment = (env: string = process.env.NODE_ENV || 'development') => {
  const safeHosts = SAFE_HOSTS[env as keyof typeof SAFE_HOSTS] || SAFE_HOSTS.development;
  
  return {
    host: (host: string | undefined, fallback: string = 'localhost') => {
      const validated = validateHost(host, fallback);
      return safeHosts.includes(validated) ? validated : fallback;
    },
    port: validatePort,
    parseInt: safeParseInt,
    sanitize: sanitizeEnvVar,
    url: (url: string | undefined) => validateUrl(url, safeHosts),
  };
};
