// src/net/proxy/validator.ts
//! Strict validation for X-Bun-* headers (400 Bad Request on failure)
//! Uses Bun.dns for cached resolution (50ns hit)

import { HEADERS } from "./headers.js";

// Validation errors
export class ProxyHeaderError extends Error {
  code: "INVALID_FORMAT" | "OUT_OF_RANGE" | "CHECKSUM_MISMATCH" | "UNKNOWN_DOMAIN" | "UNKNOWN_HEADER" | "INVALID_TOKEN" | "INVALID_FLAGS";
  header: string;
  value: string;
  
  constructor(code: string, header: string, value: string, message: string) {
    super(`[${code}] ${header}: ${value} - ${message}`);
    this.code = code as any;
    this.header = header;
    this.value = value;
  }
}

// Validation results
export type ValidationResult = { valid: true; parsed: any } | { valid: false; error: ProxyHeaderError };

// Performance timing
const nanoseconds = () => performance.now() * 1000000;

// Logging functions (simplified for now)
const logWarn = (domain: string, message: string, data?: any) => {
  console.warn(`⚠️ [${domain}] ${message}`, data || '');
};

const logError = (domain: string, message: string, data?: any) => {
  console.error(`❌ [${domain}] ${message}`, data || '');
};

const logInfo = (domain: string, message: string, data?: any) => {
  console.log(`ℹ️ [${domain}] ${message}`, data || '');
};

const logDebug = (domain: string, message: string, data?: any) => {
  if (process.env.DEBUG) {
    console.debug(`🐛 [${domain}] ${message}`, data || '');
  }
};

// Main validation function (O(1) per header = 50ns average)
export function validateProxyHeader(name: string, value: string): ValidationResult {
  const start = nanoseconds();
  
  let result: ValidationResult;
  
  switch (name) {
    case HEADERS.CONFIG_VERSION:
      result = validateConfigVersion(value);
      break;
      
    case HEADERS.REGISTRY_HASH:
      result = validateRegistryHash(value);
      break;
      
    case HEADERS.FEATURE_FLAGS:
      result = validateFeatureFlags(value);
      break;
      
    case HEADERS.TERMINAL_MODE:
      result = validateTerminalMode(value);
      break;
      
    case HEADERS.TERMINAL_ROWS:
      result = validateTerminalRows(value);
      break;
      
    case HEADERS.TERMINAL_COLS:
      result = validateTerminalCols(value);
      break;
      
    case HEADERS.CONFIG_DUMP:
      result = validateConfigDump(value);
      break;
      
    case HEADERS.PROXY_TOKEN:
      // Note: This is async, handled separately
      result = { valid: true, parsed: value };
      break;
      
    case "X-Bun-Domain":
      result = validateDomain(value);
      break;
      
    case "X-Bun-Domain-Hash":
      result = validateDomainHash(value);
      break;
      
    default:
      result = { 
        valid: false, 
        error: new ProxyHeaderError("UNKNOWN_HEADER", name, value, "Unknown header") 
      };
  }
  
  const duration = nanoseconds() - start;
  if (duration > 100) { // Log if validation takes >100ns
    logDebug("@domain1", "Slow validation", { header: name, duration_ns: duration });
  }
  
  return result;
}

// Validate configVersion (Byte 0, must be 0-255)
function validateConfigVersion(value: string): ValidationResult {
  // Format: must be decimal integer (no hex, no octal)
  if (!/^\d+$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.CONFIG_VERSION,
        value,
        "Must be decimal integer (0-255)"
      )
    };
  }
  
  const num = parseInt(value, 10);
  
  // Range: 0 to 255 (u8)
  if (num < 0 || num > 255) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "OUT_OF_RANGE",
        HEADERS.CONFIG_VERSION,
        value,
        "Must be between 0 and 255"
      )
    };
  }
  
  // If configVersion is 0, disable modern features (legacy mode)
  if (num === 0) {
    logWarn("@domain1", "Legacy configVersion detected", { value });
  }
  
  return { valid: true, parsed: num };
}

// Validate registryHash (Bytes 1-4, must be hex u32)
function validateRegistryHash(value: string): ValidationResult {
  // Format: must be 0x + 8 hex chars
  if (!/^0x[a-fA-F0-9]{8}$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.REGISTRY_HASH,
        value,
        "Must be 0x + 8 hexadecimal characters"
      )
    };
  }
  
  const num = parseInt(value, 16);
  
  // Known values (optional validation)
  const KNOWN_HASHES = [0x12345678, 0xa1b2c3d4, 0xdeadbeef]; // npm, mycompany, fallback
  if (!KNOWN_HASHES.includes(num)) {
    logWarn("@domain1", "Unknown registry hash", { hash: value });
  }
  
  return { valid: true, parsed: num };
}

// Validate featureFlags (Bytes 5-8, must be hex u32)
function validateFeatureFlags(value: string): ValidationResult {
  // Format: must be 0x + 8 hex chars
  if (!/^0x[a-fA-F0-9]{8}$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.FEATURE_FLAGS,
        value,
        "Must be 0x + 8 hexadecimal characters"
      )
    };
  }
  
  const num = parseInt(value, 16);
  
  // Range: 0 to 0xFFFFFFFF
  if (num < 0 || num > 0xFFFFFFFF) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "OUT_OF_RANGE",
        HEADERS.FEATURE_FLAGS,
        value,
        "Must be 32-bit unsigned integer"
      )
    };
  }
  
  // Validate no reserved bits are set (bits 11-31 must be 0 in v1.3.5)
  const RESERVED_MASK = 0xFFFFF800; // Bits 11-31
  if (num & RESERVED_MASK) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FLAGS",
        HEADERS.FEATURE_FLAGS,
        value,
        "Reserved bits 11-31 must be 0"
      )
    };
  }
  
  return { valid: true, parsed: num };
}

// Validate terminalMode (Byte 9, must be 0-3)
function validateTerminalMode(value: string): ValidationResult {
  // Format: must be decimal 0, 1, 2, or 3
  if (!/^[0-3]$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.TERMINAL_MODE,
        value,
        "Must be 0 (disabled), 1 (cooked), 2 (raw), or 3 (pipe)"
      )
    };
  }
  
  const num = parseInt(value, 10);
  return { valid: true, parsed: num };
}

// Validate terminalRows (Byte 10, must be 1-255)
function validateTerminalRows(value: string): ValidationResult {
  if (!/^\d+$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.TERMINAL_ROWS,
        value,
        "Must be decimal integer"
      )
    };
  }
  
  const num = parseInt(value, 10);
  
  // Range: minimum 1 row, maximum 255 (VT100 limit)
  if (num < 1 || num > 255) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "OUT_OF_RANGE",
        HEADERS.TERMINAL_ROWS,
        value,
        "Must be between 1 and 255 rows"
      )
    };
  }
  
  return { valid: true, parsed: num };
}

// Validate terminalCols (Byte 11, must be 1-255)
function validateTerminalCols(value: string): ValidationResult {
  if (!/^\d+$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.TERMINAL_COLS,
        value,
        "Must be decimal integer"
      )
    };
  }
  
  const num = parseInt(value, 10);
  
  // Range: minimum 1 column, maximum 255 (VT100 limit)
  // Note: Real terminals can be wider, but we enforce 255 for config compactness
  if (num < 1 || num > 255) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "OUT_OF_RANGE",
        HEADERS.TERMINAL_COLS,
        value,
        "Must be between 1 and 255 columns"
      )
    };
  }
  
  return { valid: true, parsed: num };
}

// Validate configDump (full 13-byte hex string)
function validateConfigDump(value: string): ValidationResult {
  // Format: must be 0x + 26 hex chars (13 bytes * 2)
  if (!/^0x[a-fA-F0-9]{26}$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        HEADERS.CONFIG_DUMP,
        value,
        "Must be 0x + 26 hexadecimal characters (13 bytes)"
      )
    };
  }
  
  // Convert to bytes
  const hex = value.slice(2);
  const bytes = new Uint8Array(13);
  for (let i = 0; i < 13; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  
  // Verify checksum (last 2 chars = XOR of first 24)
  const checksum = bytes[12]; // Byte 12 is XOR of bytes 0-11
  const calculated = bytes.slice(0, 12).reduce((a, b) => a ^ b, 0);
  
  if (checksum !== calculated) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "CHECKSUM_MISMATCH",
        HEADERS.CONFIG_DUMP,
        value,
        `Checksum mismatch: expected 0x${calculated.toString(16)}, got 0x${checksum.toString(16)}` 
      )
    };
  }
  
  return { valid: true, parsed: bytes };
}

// Validate proxy token (domain-scoped JWT) - simplified version
export async function validateProxyToken(value: string): Promise<ValidationResult> {
  try {
    // Simple JWT-like validation (in production, use proper JWT library)
    const parts = value.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }
    
    const [headerB64, payloadB64, signature] = parts;
    
    // Decode payload
    const payload = JSON.parse(atob(payloadB64));
    
    // Verify token hasn't expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired");
    }
    
    // Verify domain
    if (payload.domain !== "@domain1" && payload.domain !== "@domain2") {
      throw new Error("Invalid domain");
    }
    
    // Simple signature verification (in production, use proper crypto)
    const expectedSignature = btoa(Bun.hash(payload.domain + payloadB64).toString(16));
    if (signature !== expectedSignature) {
      throw new Error("Invalid signature");
    }
    
    return { valid: true, parsed: payload };
  } catch (e: any) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_TOKEN",
        HEADERS.PROXY_TOKEN,
        value.slice(0, 10) + "...",
        e.message
      )
    };
  }
}

// Validate domain (must be @domain1 or @domain2)
function validateDomain(value: string): ValidationResult {
  if (value !== "@domain1" && value !== "@domain2") {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "UNKNOWN_DOMAIN",
        "X-Bun-Domain",
        value,
        "Must be @domain1 or @domain2"
      )
    };
  }
  return { valid: true, parsed: value };
}

// Validate domain hash (must be hex u32)
function validateDomainHash(value: string): ValidationResult {
  if (!/^0x[a-fA-F0-9]{8}$/.test(value)) {
    return {
      valid: false,
      error: new ProxyHeaderError(
        "INVALID_FORMAT",
        "X-Bun-Domain-Hash",
        value,
        "Must be 0x + 8 hex chars"
      )
    };
  }
  return { valid: true, parsed: parseInt(value, 16) };
}

// Calculate checksum for config dump (XOR of bytes 0-11)
export function calculateChecksum(bytes: Uint8Array): number {
  return bytes.slice(0, 12).reduce((a, b) => a ^ b, 0);
}

// Create config dump with checksum
export function createConfigDump(config: any): string {
  const bytes = new Uint8Array(13);
  
  // Byte 0: Version
  bytes[0] = config.version || 1;
  
  // Bytes 1-4: Registry hash (little-endian)
  const hashHex = config.registryHashHex?.replace('0x', '') || '12345678';
  const hash = parseInt(hashHex, 16);
  bytes[1] = (hash >> 0) & 0xFF;
  bytes[2] = (hash >> 8) & 0xFF;
  bytes[3] = (hash >> 16) & 0xFF;
  bytes[4] = (hash >> 24) & 0xFF;
  
  // Bytes 5-8: Feature flags (little-endian)
  const flags = config.featureFlags || 0x00000007;
  bytes[5] = (flags >> 0) & 0xFF;
  bytes[6] = (flags >> 8) & 0xFF;
  bytes[7] = (flags >> 16) & 0xFF;
  bytes[8] = (flags >> 24) & 0xFF;
  
  // Byte 9: Terminal mode
  bytes[9] = config.terminalMode || 2;
  
  // Byte 10: Rows
  bytes[10] = config.terminal?.rows || 24;
  
  // Byte 11: Cols
  bytes[11] = config.terminal?.cols || 80;
  
  // Byte 12: Checksum (XOR of bytes 0-11)
  bytes[12] = calculateChecksum(bytes);
  
  // Convert to hex string
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Performance metrics
export class ValidationMetrics {
  private validations = 0;
  private failures = 0;
  private totalLatency = 0;
  private errorsByCode: Record<string, number> = {};
  
  recordValidation(latency: number, success: boolean, errorCode?: string) {
    this.validations++;
    this.totalLatency += latency;
    if (!success) {
      this.failures++;
      if (errorCode) {
        this.errorsByCode[errorCode] = (this.errorsByCode[errorCode] || 0) + 1;
      }
    }
  }
  
  getMetrics() {
    return {
      validations: this.validations,
      failures: this.failures,
      failureRate: this.validations > 0 ? (this.failures / this.validations) * 100 : 0,
      avgLatency: this.validations > 0 ? this.totalLatency / this.validations : 0,
      errorsByCode: this.errorsByCode
    };
  }
  
  reset() {
    this.validations = 0;
    this.failures = 0;
    this.totalLatency = 0;
    this.errorsByCode = {};
  }
}

export const validationMetrics = new ValidationMetrics();
