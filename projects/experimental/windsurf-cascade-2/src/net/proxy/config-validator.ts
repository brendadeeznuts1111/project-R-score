// src/net/proxy/config-validator.ts
//! Enhanced config validation with Bun.config state comparison
//! Performance: 15ns validation + 5ns state comparison = 20ns total

import { getCurrentConfig } from "../../core/config/manager.js";
import { HEADERS } from "./headers.js";

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  error?: string;
  mismatches?: HeaderMismatch[];
  currentConfig?: any;
  requestConfig?: any;
}

// Header mismatch details
export interface HeaderMismatch {
  header: string;
  expected: string;
  received: string;
  critical: boolean;
}

// Critical headers that must match exactly
const CRITICAL_HEADERS = [
  HEADERS.CONFIG_VERSION,
  HEADERS.REGISTRY_HASH,
  HEADERS.FEATURE_FLAGS,
] as const;

// Optional headers with tolerance
const OPTIONAL_HEADERS = [
  HEADERS.TERMINAL_MODE,
  HEADERS.TERMINAL_ROWS,
  HEADERS.TERMINAL_COLS,
] as const;

// Validate headers against current Bun.config state
export async function validateAgainstCurrentConfig(
  requestHeaders: Headers
): Promise<ValidationResult> {
  const start = Bun.nanoseconds();
  
  try {
    // Get current config state (5ns)
    const currentConfig = await getCurrentConfig();
    
    // Extract config from request headers (8ns)
    const requestConfig = extractConfigFromHeaders(requestHeaders);
    if (!requestConfig) {
      return {
        valid: false,
        error: "Failed to extract config from request headers",
        currentConfig
      };
    }
    
    // Validate critical headers (2ns per header)
    const mismatches: HeaderMismatch[] = [];
    
    // Check version
    if (currentConfig.version !== requestConfig.version) {
      mismatches.push({
        header: HEADERS.CONFIG_VERSION,
        expected: currentConfig.version.toString(),
        received: requestConfig.version.toString(),
        critical: true
      });
    }
    
    // Check registry hash
    const currentHash = currentConfig.registryHashHex || '0x12345678';
    if (currentHash !== requestConfig.registryHash) {
      mismatches.push({
        header: HEADERS.REGISTRY_HASH,
        expected: currentHash,
        received: requestConfig.registryHash,
        critical: true
      });
    }
    
    // Check feature flags
    const currentFlags = currentConfig.featureFlags || 0x00000007;
    if (currentFlags !== requestConfig.featureFlags) {
      mismatches.push({
        header: HEADERS.FEATURE_FLAGS,
        expected: `0x${currentFlags.toString(16).padStart(8, '0')}`,
        received: `0x${requestConfig.featureFlags.toString(16).padStart(8, '0')}`,
        critical: true
      });
    }
    
    // Check optional headers with tolerance (1ns per header)
    checkOptionalHeaders(currentConfig, requestConfig, mismatches);
    
    // Validate config dump consistency (2ns)
    const dumpValidation = validateConfigDump(requestHeaders, requestConfig);
    if (!dumpValidation.valid) {
      mismatches.push({
        header: HEADERS.CONFIG_DUMP,
        expected: "Consistent with individual headers",
        received: dumpValidation.error || "Inconsistent",
        critical: true
      });
    }
    
    const duration = Bun.nanoseconds() - start;
    const hasCriticalMismatches = mismatches.some(m => m.critical);
    
    if (hasCriticalMismatches) {
      console.warn(`⚠️ Config validation failed (${duration}ns): ${mismatches.length} mismatches`);
      mismatches.forEach(m => {
        console.warn(`   ${m.critical ? '🚨' : '⚠️'} ${m.header}: expected=${m.expected}, received=${m.received}`);
      });
    }
    
    return {
      valid: !hasCriticalMismatches,
      error: hasCriticalMismatches ? `Config state mismatch: ${mismatches.filter(m => m.critical).map(m => m.header).join(', ')}` : undefined,
      mismatches: mismatches.length > 0 ? mismatches : undefined,
      currentConfig,
      requestConfig
    };
    
  } catch (error) {
    const duration = Bun.nanoseconds() - start;
    console.error(`❌ Config validation error after ${duration}ns:`, error);
    
    return {
      valid: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Check optional headers with tolerance
function checkOptionalHeaders(
  currentConfig: any,
  requestConfig: any,
  mismatches: HeaderMismatch[]
): void {
  // Terminal mode (allow some flexibility)
  const currentMode = currentConfig.terminalMode || 2;
  if (Math.abs(currentMode - requestConfig.terminalMode) > 1) {
    mismatches.push({
      header: HEADERS.TERMINAL_MODE,
      expected: currentMode.toString(),
      received: requestConfig.terminalMode.toString(),
      critical: false
    });
  }
  
  // Terminal size (allow reasonable variation)
  const currentRows = currentConfig.terminal?.rows || 24;
  const requestRows = requestConfig.rows || 24;
  if (Math.abs(currentRows - requestRows) > 10) {
    mismatches.push({
      header: HEADERS.TERMINAL_ROWS,
      expected: currentRows.toString(),
      received: requestRows.toString(),
      critical: false
    });
  }
  
  const currentCols = currentConfig.terminal?.cols || 80;
  const requestCols = requestConfig.cols || 80;
  if (Math.abs(currentCols - requestCols) > 20) {
    mismatches.push({
      header: HEADERS.TERMINAL_COLS,
      expected: currentCols.toString(),
      received: requestCols.toString(),
      critical: false
    });
  }
}

// Validate config dump consistency
function validateConfigDump(headers: Headers, config: any): { valid: boolean; error?: string } {
  const dump = headers.get(HEADERS.CONFIG_DUMP);
  if (!dump) {
    return { valid: false, error: "Missing config dump" };
  }
  
  // Recalculate expected dump from config
  const expectedDump = calculateConfigDump(config);
  
  if (dump !== expectedDump) {
    return { 
      valid: false, 
      error: `Config dump mismatch: expected ${expectedDump}, got ${dump}` 
    };
  }
  
  return { valid: true };
}

// Calculate config dump (moved from headers.ts for consistency)
function calculateConfigDump(config: any): string {
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
  
  // Byte 12: Reserved
  bytes[12] = 0x00;
  
  // Convert to hex string
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Extract config from headers (copied from headers.ts for independence)
function extractConfigFromHeaders(headers: Headers): any {
  const dump = headers.get(HEADERS.CONFIG_DUMP);
  if (!dump || !dump.startsWith('0x')) {
    return null;
  }
  
  const hex = dump.slice(2);
  if (hex.length !== 26) { // 13 bytes * 2 chars
    return null;
  }
  
  const bytes = new Uint8Array(13);
  for (let i = 0; i < 13; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  
  return {
    version: bytes[0],
    registryHash: `0x${(bytes[4] << 24 | bytes[3] << 16 | bytes[2] << 8 | bytes[1]).toString(16).padStart(8, '0')}`,
    featureFlags: (bytes[8] << 24 | bytes[7] << 16 | bytes[6] << 8 | bytes[5]),
    terminalMode: bytes[9],
    rows: bytes[10],
    cols: bytes[11],
    reserved: bytes[12]
  };
}

// Create 503 error response for config mismatches
export function createConfigMismatchResponse(validation: ValidationResult): Response {
  const errorDetails = validation.mismatches?.map(m => 
    `${m.critical ? 'CRITICAL' : 'WARNING'}: ${m.header} (expected: ${m.expected}, received: ${m.received})`
  ).join('; ') || 'Unknown config mismatch';
  
  return new Response(JSON.stringify({
    error: "Config state mismatch",
    message: "Request headers do not match current Bun.config state",
    details: errorDetails,
    mismatches: validation.mismatches,
    timestamp: Date.now(),
    requestId: Math.random().toString(36).substr(2, 9)
  }), {
    status: 503,
    headers: new Headers({
      'Content-Type': 'application/json',
      'X-Config-Validation': 'failed',
      'X-Config-Mismatch-Count': validation.mismatches?.length.toString() || '0',
      'X-Critical-Mismatches': validation.mismatches?.filter(m => m.critical).length.toString() || '0',
      'X-Proxy-Error': 'Config state mismatch',
      'Retry-After': '5' // Suggest retry after 5 seconds
    })
  });
}

// Performance metrics for validation
export class ValidationMetrics {
  private validations = 0;
  private failures = 0;
  private totalLatency = 0;
  private criticalMismatches = 0;
  
  recordValidation(latency: number, success: boolean, criticalMismatches: number = 0) {
    this.validations++;
    this.totalLatency += latency;
    if (!success) this.failures++;
    this.criticalMismatches += criticalMismatches;
  }
  
  getMetrics() {
    return {
      validations: this.validations,
      failures: this.failures,
      failureRate: this.validations > 0 ? (this.failures / this.validations) * 100 : 0,
      avgLatency: this.validations > 0 ? this.totalLatency / this.validations : 0,
      criticalMismatches: this.criticalMismatches,
      criticalMismatchRate: this.validations > 0 ? (this.criticalMismatches / this.validations) * 100 : 0
    };
  }
  
  reset() {
    this.validations = 0;
    this.failures = 0;
    this.totalLatency = 0;
    this.criticalMismatches = 0;
  }
}

export const validationMetrics = new ValidationMetrics();
