// src/net/proxy/header-validation-engine.ts
//! Strict validation engine for X-Bun-* headers (400 Bad Request on failure)
//! Validates header formats, ranges, and checksums with nanosecond performance

import { PROXY_HEADERS } from "./proxy-header-constants.js";

/**
 * Error thrown when proxy header validation fails
 * Provides detailed error information for debugging and client responses
 */
export class InvalidProxyHeaderError extends Error {
  readonly errorCode: "INVALID_FORMAT" | "OUT_OF_RANGE" | "CHECKSUM_MISMATCH" | "UNKNOWN_DOMAIN" | "UNKNOWN_HEADER" | "INVALID_TOKEN" | "INVALID_FLAGS";
  readonly headerName: string;
  readonly headerValue: string;
  
  constructor(errorCode: string, headerName: string, headerValue: string, errorMessage: string) {
    super(`[${errorCode}] ${headerName}: ${headerValue} - ${errorMessage}`);
    this.errorCode = errorCode as any;
    this.headerName = headerName;
    this.headerValue = headerValue;
  }
}

/**
 * Result of header validation operation
 * Union type representing either successful validation with parsed value or failure with error details
 */
export type HeaderValidationResult = 
  | { readonly isValid: true; readonly parsedValue: any } 
  | { readonly isValid: false; readonly error: InvalidProxyHeaderError };

/**
 * Performance timing utility for nanosecond precision measurements
 */
const measureNanoseconds = () => performance.now() * 1000000;

/**
 * Structured logging utilities for validation operations
 */
const ValidationLogger = {
  logWarning(domain: string, message: string, data?: any): void {
    console.warn(`⚠️ [${domain}] ${message}`, data || '');
  },
  
  logError(domain: string, message: string, data?: any): void {
    console.error(`❌ [${domain}] ${message}`, data || '');
  },
  
  logInfo(domain: string, message: string, data?: any): void {
    console.log(`ℹ️ [${domain}] ${message}`, data || '');
  },
  
  logDebug(domain: string, message: string, data?: any): void {
    if (process.env.DEBUG) {
      console.debug(`🐛 [${domain}] ${message}`, data || '');
    }
  }
};

/**
 * Main header validation engine
 * Validates individual proxy headers with O(1) complexity per header
 * 
 * @param headerName - The name of the header to validate
 * @param headerValue - The value of the header to validate
 * @returns HeaderValidationResult with validation outcome and parsed data
 */
export function validateProxyHeaderValue(headerName: string, headerValue: string): HeaderValidationResult {
  const validationStartTime = measureNanoseconds();
  
  let validationResult: HeaderValidationResult;
  
  switch (headerName) {
    case PROXY_HEADERS.CONFIG_VERSION:
      validationResult = validateConfigVersionHeaderValue(headerValue);
      break;
      
    case PROXY_HEADERS.REGISTRY_HASH:
      validationResult = validateRegistryHashHeaderValue(headerValue);
      break;
      
    case PROXY_HEADERS.FEATURE_FLAGS:
      validationResult = validateFeatureFlagsHeaderValue(headerValue);
      break;
      
    case PROXY_HEADERS.TERMINAL_MODE:
      validationResult = validateTerminalModeHeaderValue(headerValue);
      break;
      
    case PROXY_HEADERS.TERMINAL_ROWS:
      validationResult = validateTerminalRowsHeaderValue(headerValue);
      break;
      
    case PROXY_HEADERS.TERMINAL_COLS:
      validationResult = validateTerminalColsHeaderValue(headerValue);
      break;
      
    case PROXY_HEADERS.CONFIG_DUMP:
      validationResult = validateConfigDumpHeaderValue(headerValue);
      break;
      
    case PROXY_HEADERS.PROXY_TOKEN:
      // Note: Token validation is async, handled separately
      validationResult = { isValid: true, parsedValue: headerValue };
      break;
      
    case "X-Bun-Domain":
      validationResult = validateDomainHeaderValue(headerValue);
      break;
      
    case "X-Bun-Domain-Hash":
      validationResult = validateDomainHashHeaderValue(headerValue);
      break;
      
    default:
      validationResult = { 
        isValid: false, 
        error: new InvalidProxyHeaderError("UNKNOWN_HEADER", headerName, headerValue, "Unknown header") 
      };
  }
  
  const validationDuration = measureNanoseconds() - validationStartTime;
  if (validationDuration > 100) { // Log if validation takes >100ns
    ValidationLogger.logDebug("@domain1", "Slow header validation detected", { 
      headerName, 
      durationNanoseconds: validationDuration 
    });
  }
  
  return validationResult;
}

/**
 * Validates configuration version header (Byte 0, must be 0-255)
 * 
 * @param headerValue - The version value to validate
 * @returns HeaderValidationResult with parsed integer or error
 */
function validateConfigVersionHeaderValue(headerValue: string): HeaderValidationResult {
  // Format: must be decimal integer (no hex, no octal)
  if (!/^\d+$/.test(headerValue)) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_FORMAT",
        PROXY_HEADERS.CONFIG_VERSION,
        headerValue,
        "Must be decimal integer (0-255)"
      )
    };
  }
  
  const parsedVersion = parseInt(headerValue, 10);
  
  // Range: 0 to 255 (u8)
  if (parsedVersion < 0 || parsedVersion > 255) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "OUT_OF_RANGE",
        PROXY_HEADERS.CONFIG_VERSION,
        headerValue,
        "Must be between 0 and 255"
      )
    };
  }
  
  // If configVersion is 0, disable modern features (legacy mode)
  if (parsedVersion === 0) {
    ValidationLogger.logWarning("@domain1", "Legacy config version detected", { version: headerValue });
  }
  
  return { isValid: true, parsedValue: parsedVersion };
}

/**
 * Validates registry hash header (Bytes 1-4, must be hex u32)
 * 
 * @param headerValue - The hash value to validate
 * @returns HeaderValidationResult with parsed integer or error
 */
function validateRegistryHashHeaderValue(headerValue: string): HeaderValidationResult {
  // Format: must be 0x + 8 hex chars
  if (!/^0x[a-fA-F0-9]{8}$/.test(headerValue)) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_FORMAT",
        PROXY_HEADERS.REGISTRY_HASH,
        headerValue,
        "Must be 0x + 8 hexadecimal characters"
      )
    };
  }
  
  const parsedHash = parseInt(headerValue, 16);
  
  // Known values (optional validation)
  const KNOWN_REGISTRY_HASHES = [0x12345678, 0xa1b2c3d4, 0xdeadbeef]; // npm, mycompany, fallback
  if (!KNOWN_REGISTRY_HASHES.includes(parsedHash)) {
    ValidationLogger.logWarning("@domain1", "Unknown registry hash detected", { hash: headerValue });
  }
  
  return { isValid: true, parsedValue: parsedHash };
}

/**
 * Validates feature flags header (Bytes 5-8, must be hex u32)
 * 
 * @param headerValue - The feature flags value to validate
 * @returns HeaderValidationResult with parsed integer or error
 */
function validateFeatureFlagsHeaderValue(headerValue: string): HeaderValidationResult {
  // Format: must be 0x + 8 hex chars
  if (!/^0x[a-fA-F0-9]{8}$/.test(headerValue)) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_FORMAT",
        PROXY_HEADERS.FEATURE_FLAGS,
        headerValue,
        "Must be 0x + 8 hexadecimal characters"
      )
    };
  }
  
  const parsedFlags = parseInt(headerValue, 16);
  
  // Range: 0 to 0xFFFFFFFF
  if (parsedFlags < 0 || parsedFlags > 0xFFFFFFFF) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "OUT_OF_RANGE",
        PROXY_HEADERS.FEATURE_FLAGS,
        headerValue,
        "Must be 32-bit unsigned integer"
      )
    };
  }
  
  // Validate no reserved bits are set (bits 11-31 must be 0 in v1.3.5)
  const RESERVED_BIT_MASK = 0xFFFFF800; // Bits 11-31
  if (parsedFlags & RESERVED_BIT_MASK) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_FLAGS",
        PROXY_HEADERS.FEATURE_FLAGS,
        headerValue,
        "Reserved bits 11-31 must be 0"
      )
    };
  }
  
  return { isValid: true, parsedValue: parsedFlags };
}

/**
 * Validates terminal mode header (Byte 9, must be 0-3)
 * 
 * @param headerValue - The terminal mode value to validate
 * @returns HeaderValidationResult with parsed integer or error
 */
function validateTerminalModeHeaderValue(headerValue: string): HeaderValidationResult {
  // Format: must be decimal 0, 1, 2, or 3
  if (!/^[0-3]$/.test(headerValue)) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_FORMAT",
        PROXY_HEADERS.TERMINAL_MODE,
        headerValue,
        "Must be 0 (disabled), 1 (cooked), 2 (raw), or 3 (pipe)"
      )
    };
  }
  
  const parsedMode = parseInt(headerValue, 10);
  return { isValid: true, parsedValue: parsedMode };
}

/**
 * Validates terminal rows header (Byte 10, must be 1-255)
 * 
 * @param headerValue - The rows value to validate
 * @returns HeaderValidationResult with parsed integer or error
 */
function validateTerminalRowsHeaderValue(headerValue: string): HeaderValidationResult {
  if (!/^\d+$/.test(headerValue)) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_FORMAT",
        PROXY_HEADERS.TERMINAL_ROWS,
        headerValue,
        "Must be decimal integer"
      )
    };
  }
  
  const parsedRows = parseInt(headerValue, 10);
  
  // Range: minimum 1 row, maximum 255 (VT100 limit)
  if (parsedRows < 1 || parsedRows > 255) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "OUT_OF_RANGE",
        PROXY_HEADERS.TERMINAL_ROWS,
        headerValue,
        "Must be between 1 and 255 rows"
      )
    };
  }
  
  return { isValid: true, parsedValue: parsedRows };
}

/**
 * Validates terminal columns header (Byte 11, must be 1-255)
 * 
 * @param headerValue - The columns value to validate
 * @returns HeaderValidationResult with parsed integer or error
 */
function validateTerminalColsHeaderValue(headerValue: string): HeaderValidationResult {
  if (!/^\d+$/.test(headerValue)) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_FORMAT",
        PROXY_HEADERS.TERMINAL_COLS,
        headerValue,
        "Must be decimal integer"
      )
    };
  }
  
  const parsedCols = parseInt(headerValue, 10);
  
  // Range: minimum 1 column, maximum 255 (VT100 limit)
  // Note: Real terminals can be wider, but we enforce 255 for config compactness
  if (parsedCols < 1 || parsedCols > 255) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "OUT_OF_RANGE",
        PROXY_HEADERS.TERMINAL_COLS,
        headerValue,
        "Must be between 1 and 255 columns"
      )
    };
  }
  
  return { isValid: true, parsedValue: parsedCols };
}

/**
 * Validates config dump header (full 13-byte hex string with checksum)
 * 
 * @param headerValue - The config dump value to validate
 * @returns HeaderValidationResult with parsed bytes or error
 */
function validateConfigDumpHeaderValue(headerValue: string): HeaderValidationResult {
  // Format: must be 0x + 26 hex chars (13 bytes * 2)
  if (!/^0x[a-fA-F0-9]{26}$/.test(headerValue)) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_FORMAT",
        PROXY_HEADERS.CONFIG_DUMP,
        headerValue,
        "Must be 0x + 26 hexadecimal characters (13 bytes)"
      )
    };
  }
  
  // Convert to bytes
  const hexString = headerValue.slice(2);
  const configBytes = new Uint8Array(13);
  for (let i = 0; i < 13; i++) {
    configBytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  
  // Verify checksum (last 2 chars = XOR of first 24)
  const receivedChecksum = configBytes[12]; // Byte 12 is XOR of bytes 0-11
  const calculatedChecksum = calculateConfigChecksum(configBytes);
  
  if (receivedChecksum !== calculatedChecksum) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "CHECKSUM_MISMATCH",
        PROXY_HEADERS.CONFIG_DUMP,
        headerValue,
        `Checksum mismatch: expected 0x${calculatedChecksum.toString(16)}, got 0x${receivedChecksum.toString(16)}` 
      )
    };
  }
  
  return { isValid: true, parsedValue: configBytes };
}

/**
 * Validates domain header (must be @domain1 or @domain2)
 * 
 * @param headerValue - The domain value to validate
 * @returns HeaderValidationResult with parsed domain or error
 */
function validateDomainHeaderValue(headerValue: string): HeaderValidationResult {
  if (headerValue !== "@domain1" && headerValue !== "@domain2") {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "UNKNOWN_DOMAIN",
        "X-Bun-Domain",
        headerValue,
        "Must be @domain1 or @domain2"
      )
    };
  }
  return { isValid: true, parsedValue: headerValue };
}

/**
 * Validates domain hash header (must be hex u32)
 * 
 * @param headerValue - The domain hash value to validate
 * @returns HeaderValidationResult with parsed integer or error
 */
function validateDomainHashHeaderValue(headerValue: string): HeaderValidationResult {
  if (!/^0x[a-fA-F0-9]{8}$/.test(headerValue)) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_FORMAT",
        "X-Bun-Domain-Hash",
        headerValue,
        "Must be 0x + 8 hex chars"
      )
    };
  }
  return { isValid: true, parsedValue: parseInt(headerValue, 16) };
}

/**
 * Validates proxy token signature (domain-scoped JWT)
 * Simplified version for demonstration - in production use proper JWT library
 * 
 * @param tokenValue - The JWT token to validate
 * @returns Promise<HeaderValidationResult> with parsed payload or error
 */
export async function validateProxyTokenSignature(tokenValue: string): Promise<HeaderValidationResult> {
  try {
    // Simple JWT-like validation (in production, use proper JWT library)
    const tokenParts = tokenValue.split('.');
    if (tokenParts.length !== 3) {
      throw new Error("Invalid token format");
    }
    
    const [headerB64, payloadB64, signature] = tokenParts;
    
    // Decode payload
    const decodedPayload = JSON.parse(atob(payloadB64));
    
    // Verify token hasn't expired
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired");
    }
    
    // Verify domain
    if (decodedPayload.domain !== "@domain1" && decodedPayload.domain !== "@domain2") {
      throw new Error("Invalid domain");
    }
    
    // Simple signature verification (in production, use proper crypto)
    const expectedSignature = btoa(Bun.hash(decodedPayload.domain + payloadB64).toString(16));
    if (signature !== expectedSignature) {
      throw new Error("Invalid signature");
    }
    
    return { isValid: true, parsedValue: decodedPayload };
  } catch (validationError: any) {
    return {
      isValid: false,
      error: new InvalidProxyHeaderError(
        "INVALID_TOKEN",
        PROXY_HEADERS.PROXY_TOKEN,
        tokenValue.slice(0, 10) + "...",
        validationError.message
      )
    };
  }
}

/**
 * Calculates checksum for config dump (XOR of bytes 0-11)
 * 
 * @param configBytes - The config bytes to calculate checksum for
 * @returns The calculated checksum value
 */
export function calculateConfigChecksum(configBytes: Uint8Array): number {
  return configBytes.slice(0, 12).reduce((accumulator, byte) => accumulator ^ byte, 0);
}

/**
 * Creates config dump with proper checksum from configuration object
 * 
 * @param configObject - The configuration object to serialize
 * @returns Hex string representation of config dump with checksum
 */
export function createConfigDumpWithChecksum(configObject: any): string {
  const configBytes = new Uint8Array(13);
  
  // Byte 0: Version
  configBytes[0] = configObject.version || 1;
  
  // Bytes 1-4: Registry hash (little-endian)
  const hashHexString = configObject.registryHashHex?.replace('0x', '') || '12345678';
  const hashValue = parseInt(hashHexString, 16);
  configBytes[1] = (hashValue >> 0) & 0xFF;
  configBytes[2] = (hashValue >> 8) & 0xFF;
  configBytes[3] = (hashValue >> 16) & 0xFF;
  configBytes[4] = (hashValue >> 24) & 0xFF;
  
  // Bytes 5-8: Feature flags (little-endian)
  const flagsValue = configObject.featureFlags || 0x00000007;
  configBytes[5] = (flagsValue >> 0) & 0xFF;
  configBytes[6] = (flagsValue >> 8) & 0xFF;
  configBytes[7] = (flagsValue >> 16) & 0xFF;
  configBytes[8] = (flagsValue >> 24) & 0xFF;
  
  // Byte 9: Terminal mode
  configBytes[9] = configObject.terminalMode || 2;
  
  // Byte 10: Rows
  configBytes[10] = configObject.terminal?.rows || 24;
  
  // Byte 11: Cols
  configBytes[11] = configObject.terminal?.cols || 80;
  
  // Byte 12: Checksum (XOR of bytes 0-11)
  configBytes[12] = calculateConfigChecksum(configBytes);
  
  // Convert to hex string
  return '0x' + Array.from(configBytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Performance metrics collector for header validation operations
 */
export class HeaderValidationMetrics {
  private totalValidations = 0;
  private totalFailures = 0;
  private totalLatencyNanoseconds = 0;
  private errorsByErrorCode: Record<string, number> = {};
  
  /**
   * Records a validation operation with its result and timing
   * 
   * @param latencyNanoseconds - Time taken for validation
   * @param wasSuccessful - Whether validation passed
   * @param errorCode - Error code if validation failed
   */
  recordValidationOperation(latencyNanoseconds: number, wasSuccessful: boolean, errorCode?: string): void {
    this.totalValidations++;
    this.totalLatencyNanoseconds += latencyNanoseconds;
    if (!wasSuccessful) {
      this.totalFailures++;
      if (errorCode) {
        this.errorsByErrorCode[errorCode] = (this.errorsByErrorCode[errorCode] || 0) + 1;
      }
    }
  }
  
  /**
   * Gets current validation metrics
   * 
   * @returns Object containing all performance and error metrics
   */
  getValidationMetrics(): {
    totalValidations: number;
    totalFailures: number;
    failureRatePercentage: number;
    averageLatencyNanoseconds: number;
    errorsByErrorCode: Record<string, number>;
  } {
    return {
      totalValidations: this.totalValidations,
      totalFailures: this.totalFailures,
      failureRatePercentage: this.totalValidations > 0 ? (this.totalFailures / this.totalValidations) * 100 : 0,
      averageLatencyNanoseconds: this.totalValidations > 0 ? this.totalLatencyNanoseconds / this.totalValidations : 0,
      errorsByErrorCode: this.errorsByErrorCode
    };
  }
  
  /**
   * Resets all metrics to zero
   */
  resetValidationMetrics(): void {
    this.totalValidations = 0;
    this.totalFailures = 0;
    this.totalLatencyNanoseconds = 0;
    this.errorsByErrorCode = {};
  }
}

/**
 * Global metrics instance for tracking validation performance
 */
export const headerValidationMetrics = new HeaderValidationMetrics();
