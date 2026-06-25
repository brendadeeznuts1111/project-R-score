/**
 * Security and Privacy Enhancements for Inspection System
 * 
 * Provides redaction patterns, audit logging, and security-focused utilities
 * for safe inspection and debugging workflows.
 */

import { writeFileSync, appendFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Sensitive data patterns for automatic redaction
 */
export const SENSITIVE_PATTERNS = [
  {
    name: "credit_card",
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: "[REDACTED_CREDIT_CARD]"
  },
  {
    name: "ssn",
    pattern: /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g,
    replacement: "[REDACTED_SSN]"
  },
  {
    name: "email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: "[REDACTED_EMAIL]"
  },
  {
    name: "phone",
    pattern: /\b\+?1?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{4}\b/g,
    replacement: "[REDACTED_PHONE]"
  },
  {
    name: "api_key",
    pattern: /\b[A-Za-z0-9]{32,}\b/g,
    replacement: "[REDACTED_API_KEY]"
  },
  {
    name: "bitcoin_address",
    pattern: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
    replacement: "[REDACTED_BITCOIN]"
  },
  {
    name: "ethereum_address",
    pattern: /\b0x[a-fA-F0-9]{40}\b/g,
    replacement: "[REDACTED_ETHEREUM]"
  },
  {
    name: "jwt_token",
    pattern: /\beyJ[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+\b/g,
    replacement: "[REDACTED_JWT]"
  },
  {
    name: "private_key",
    pattern: /\b-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----\b/g,
    replacement: "[REDACTED_PRIVATE_KEY]"
  },
  {
    name: "password",
    pattern: /"(?:password|pwd|pass|secret|token|key)"\s*:\s*"[^"]*"/gi,
    replacement: '"$1": "[REDACTED]"'
  }
];

/**
 * Redact sensitive information from text
 */
export function redactSensitive(text: string, patterns = SENSITIVE_PATTERNS): string {
  let redacted = text;
  
  for (const { pattern, replacement } of patterns) {
    redacted = redacted.replace(pattern, replacement);
  }
  
  return redacted;
}

/**
 * Redact sensitive information from objects recursively
 */
export function redactSensitiveObject(obj: any, seen = new WeakSet()): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== "object") {
    return redactSensitive(String(obj));
  }
  
  if (seen.has(obj)) return obj;
  seen.add(obj);
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveObject(item, seen));
  }
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = redactSensitive(value);
    } else if (typeof value === "object") {
      result[key] = redactSensitiveObject(value, seen);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Audit logging for inspection commands
 */
export interface AuditEvent {
  userId: string;
  command: string;
  flags: Record<string, any>;
  timestamp: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

export class AuditLogger {
  private logPath: string;
  private enabled: boolean;
  
  constructor(logPath?: string) {
    this.logPath = logPath || join(process.cwd(), ".factory-wager", "audit.log");
    this.enabled = !process.env.FACTORY_WAGER_NO_AUDIT;
    
    // Ensure log directory exists
    if (this.enabled && !existsSync(join(this.logPath, ".."))) {
      require("fs").mkdirSync(join(this.logPath, ".."), { recursive: true });
    }
  }
  
  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<void> {
    if (!this.enabled) return;
    
    try {
      const logEntry = {
        ...event,
        timestamp: new Date().toISOString(),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
      };
      
      const logLine = JSON.stringify(logEntry) + "\n";
      appendFileSync(this.logPath, logLine);
    } catch (error) {
      console.warn("Failed to write audit log:", error);
    }
  }
  
  /**
   * Get recent audit events
   */
  getRecentEvents(limit = 100): AuditEvent[] {
    if (!this.enabled || !existsSync(this.logPath)) return [];
    
    try {
      const content = require("fs").readFileSync(this.logPath, "utf-8");
      const lines = content.trim().split("\n").filter(line => line);
      const events = lines.slice(-limit).map(line => JSON.parse(line));
      return events;
    } catch (error) {
      console.warn("Failed to read audit log:", error);
      return [];
    }
  }
  
  /**
   * Clear audit log
   */
  clearLog(): void {
    if (!this.enabled) return;
    
    try {
      writeFileSync(this.logPath, "");
    } catch (error) {
      console.warn("Failed to clear audit log:", error);
    }
  }
}

/**
 * Security-focused inspection options
 */
export interface SecureInspectOptions {
  enableRedaction?: boolean;
  enableAuditLogging?: boolean;
  maxDepth?: number;
  allowedPatterns?: string[];
  blockedPatterns?: string[];
}

/**
 * Apply security measures to inspection output
 */
export function applySecurityMeasures(
  output: string,
  options: SecureInspectOptions = {}
): string {
  const {
    enableRedaction = true,
    allowedPatterns = [],
    blockedPatterns = ["password", "secret", "token", "key"]
  } = options;
  
  let secured = output;
  
  // Apply redaction if enabled
  if (enableRedaction) {
    secured = redactSensitive(secured);
  }
  
  // Filter out blocked patterns
  for (const blocked of blockedPatterns) {
    const regex = new RegExp(`"[^"]*${blocked}[^"]*":\s*"[^"]*"`, 'gi');
    secured = secured.replace(regex, `"${blocked}": "[REDACTED]"`);
  }
  
  return secured;
}

/**
 * Validate inspection security
 */
export function validateInspectSecurity(
  options: SecureInspectOptions,
  flags: Record<string, any>
): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check for potentially dangerous combinations
  if (flags.includeUser && !flags.enableRedaction) {
    warnings.push("User context included without redaction - PII may be exposed");
  }
  
  if (flags.format === "json" && flags.includeUser) {
    warnings.push("JSON format with user context - ensure proper handling of sensitive data");
  }
  
  if (flags.depth > 15) {
    warnings.push("Deep inspection depth may expose sensitive nested data");
  }
  
  // Check for blocked patterns
  if (flags.filter && options.blockedPatterns) {
    for (const blocked of options.blockedPatterns) {
      if (flags.filter.toLowerCase().includes(blocked.toLowerCase())) {
        errors.push(`Filter contains blocked pattern: ${blocked}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Generate security report
 */
export function generateSecurityReport(
  auditEvents: AuditEvent[],
  timeRange: { start: Date; end: Date }
): {
  totalInspections: number;
  uniqueUsers: number;
  suspiciousActivity: AuditEvent[];
  commonFlags: Record<string, number>;
  errors: string[];
} {
  const filtered = auditEvents.filter(event => {
    const eventTime = new Date(event.timestamp);
    return eventTime >= timeRange.start && eventTime <= timeRange.end;
  });
  
  const uniqueUsers = new Set(filtered.map(e => e.userId)).size;
  const suspiciousActivity = filtered.filter(event => 
    !event.success || 
    event.flags.includeUser || 
    event.flags.depth > 10
  );
  
  const commonFlags: Record<string, number> = {};
  filtered.forEach(event => {
    Object.keys(event.flags).forEach(flag => {
      commonFlags[flag] = (commonFlags[flag] || 0) + 1;
    });
  });
  
  const errors = filtered
    .filter(event => event.error)
    .map(event => event.error!);
  
  return {
    totalInspections: filtered.length,
    uniqueUsers,
    suspiciousActivity,
    commonFlags,
    errors
  };
}

/**
 * Security configuration
 */
export const SECURITY_CONFIG = {
  // Maximum inspection depth for security
  maxDepth: 20,
  
  // Patterns that always trigger redaction
  alwaysRedact: [
    "password", "secret", "token", "key", "credential", "auth"
  ],
  
  // Sensitive fields to always exclude
  sensitiveFields: [
    "apiKey", "privateKey", "accessToken", "refreshToken",
    "creditCard", "ssn", "socialSecurityNumber", "bankAccount"
  ],
  
  // Audit retention period (days)
  auditRetention: 30,
  
  // Rate limiting (requests per minute)
  rateLimit: 60
};

export default {
  SENSITIVE_PATTERNS,
  redactSensitive,
  redactSensitiveObject,
  AuditLogger,
  applySecurityMeasures,
  validateInspectSecurity,
  generateSecurityReport,
  SECURITY_CONFIG
};
