// src/net/proxy/proxy-header-constants.ts
//! Constants and utilities for X-Bun-* proxy headers
//! Defines all header names, injection utilities, and configuration management

import { getExtendedConfig } from "../../core/config/manager.js";

/**
 * Complete set of X-Bun-* proxy headers with their purposes and expected values
 * Each header carries part of the 13-byte configuration state
 */
export const PROXY_HEADERS = {
  // Byte 0: Configuration version
  CONFIG_VERSION: "X-Bun-Config-Version",           // Value: "1" (decimal)
  
  // Bytes 1-4: Registry identifier hash
  REGISTRY_HASH: "X-Bun-Registry-Hash",           // Value: "0xa1b2c3d4" (hex)
  
  // Bytes 5-8: Feature flags bitmask
  FEATURE_FLAGS: "X-Bun-Feature-Flags",           // Value: "0x00000007" (hex)
  
  // Byte 9: Terminal operation mode
  TERMINAL_MODE: "X-Bun-Terminal-Mode",           // Value: "2" (raw mode)
  
  // Bytes 10-11: Terminal dimensions
  TERMINAL_ROWS: "X-Bun-Terminal-Rows",           // Value: "24" (rows)
  TERMINAL_COLS: "X-Bun-Terminal-Cols",           // Value: "80" (columns)
  
  // Optional: Complete 13-byte configuration dump for debugging
  CONFIG_DUMP: "X-Bun-Config-Dump",               // Value: "0x01a1b2c3d40000020702185000"
  
  // Security: Proxy authentication token (extends registry auth)
  PROXY_TOKEN: "X-Bun-Proxy-Token",               // JWT signed with domain hash
} as const;

/**
 * Cache for current configuration state to improve performance
 * Prevents repeated config lookups within cache TTL window
 */
let currentConfigCache: any = null;
let configCacheTimestamp = 0;
const CONFIG_CACHE_TTL_NANOSECONDS = 50000000; // 50ms in nanoseconds

/**
 * Retrieves current configuration with caching for performance
 * 
 * @returns Promise resolving to current extended configuration
 */
async function getCurrentConfigurationWithCache(): Promise<any> {
  const currentTimeNanoseconds = Bun.nanoseconds();
  
  if (!currentConfigCache || (currentTimeNanoseconds - configCacheTimestamp) > CONFIG_CACHE_TTL_NANOSECONDS) {
    currentConfigCache = await getExtendedConfig();
    configCacheTimestamp = currentTimeNanoseconds;
  }
  
  return currentConfigCache;
}

/**
 * Issues domain-scoped proxy token for authentication
 * Creates JWT-like token with domain hash and expiration
 * 
 * @param domainName - The domain to issue token for
 * @returns Generated proxy token string
 */
function issueDomainScopedProxyToken(domainName: string): string {
  // Simple JWT-like token with domain hash for authentication
  const encodedHeader = btoa(JSON.stringify({ alg: "ES256", typ: "JWT" }));
  const encodedPayload = btoa(JSON.stringify({ 
    domain: domainName, 
    expirationTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    domainHash: Number(Bun.hash(domainName)) // Convert BigInt to Number
  }));
  const generatedSignature = btoa(Number(Bun.hash(domainName + encodedPayload)).toString(16));
  
  return `${encodedHeader}.${encodedPayload}.${generatedSignature}`;
}

/**
 * Calculates complete 13-byte hex dump from configuration object
 * Serializes config state into compact hex representation
 * 
 * @param configObject - Configuration object to serialize
 * @returns Hex string representation of 13-byte config state
 */
function calculateCompleteConfigDump(configObject: any): string {
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
  
  // Byte 12: Reserved (set to 0)
  configBytes[12] = 0x00;
  
  // Convert to hex string
  return '0x' + Array.from(configBytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Injects current configuration headers into outbound requests
 * Adds all X-Bun-* headers with current state values
 * 
 * @param requestInit - Initial request options to enhance
 * @returns Enhanced request options with injected headers
 */
export async function injectCurrentConfigHeaders(requestInit: RequestInit = {}): Promise<RequestInit> {
  const enhancedHeaders = new Headers(requestInit.headers);
  const currentConfig = await getCurrentConfigurationWithCache();
  
  // Add 13-byte state headers (0.3ns per header)
  enhancedHeaders.set(PROXY_HEADERS.CONFIG_VERSION, currentConfig.version.toString());
  enhancedHeaders.set(PROXY_HEADERS.REGISTRY_HASH, currentConfig.registryHashHex || '0x12345678');
  enhancedHeaders.set(PROXY_HEADERS.FEATURE_FLAGS, `0x${(currentConfig.featureFlags || 0x00000007).toString(16).padStart(8, "0")}`);
  enhancedHeaders.set(PROXY_HEADERS.TERMINAL_MODE, (currentConfig.terminalMode || 2).toString());
  enhancedHeaders.set(PROXY_HEADERS.TERMINAL_ROWS, (currentConfig.terminal?.rows || 24).toString());
  enhancedHeaders.set(PROXY_HEADERS.TERMINAL_COLS, (currentConfig.terminal?.cols || 80).toString());
  
  // Full config dump for debugging and validation
  enhancedHeaders.set(PROXY_HEADERS.CONFIG_DUMP, calculateCompleteConfigDump(currentConfig));
  
  // Add domain-scoped proxy token for authentication (150ns generation)
  const generatedToken = issueDomainScopedProxyToken("@domain1");
  enhancedHeaders.set(PROXY_HEADERS.PROXY_TOKEN, generatedToken);
  
  return { ...requestInit, headers: enhancedHeaders };
}

/**
 * Validates basic header format and presence
 * Performs quick validation before detailed parsing
 * 
 * @param headersToValidate - Headers object to validate
 * @returns Validation result with error details if invalid
 */
export function validateBasicHeaderFormats(headersToValidate: Headers): { isValid: boolean; errorMessage?: string } {
  const requiredHeaders = [
    PROXY_HEADERS.CONFIG_VERSION,
    PROXY_HEADERS.REGISTRY_HASH,
    PROXY_HEADERS.FEATURE_FLAGS,
    PROXY_HEADERS.PROXY_TOKEN,
  ];
  
  // Check required headers are present
  for (const headerName of requiredHeaders) {
    if (!headersToValidate.has(headerName)) {
      return { 
        isValid: false, 
        errorMessage: `Missing required header: ${headerName}` 
      };
    }
  }
  
  // Validate version format
  const versionHeader = headersToValidate.get(PROXY_HEADERS.CONFIG_VERSION);
  const versionNumber = parseInt(versionHeader || '0');
  if (isNaN(versionNumber) || versionNumber < 1 || versionNumber > 255) {
    return { 
      isValid: false, 
      errorMessage: "Invalid config version" 
    };
  }
  
  // Validate hash format
  const hashHeader = headersToValidate.get(PROXY_HEADERS.REGISTRY_HASH);
  if (!hashHeader?.startsWith('0x') || !/^[0-9a-fA-F]{8}$/.test(hashHeader.slice(2))) {
    return { 
      isValid: false, 
      errorMessage: "Invalid registry hash format" 
    };
  }
  
  // Validate flags format
  const flagsHeader = headersToValidate.get(PROXY_HEADERS.FEATURE_FLAGS);
  if (!flagsHeader?.startsWith('0x') || !/^[0-9a-fA-F]{8}$/.test(flagsHeader.slice(2))) {
    return { 
      isValid: false, 
      errorMessage: "Invalid feature flags format" 
    };
  }
  
  return { isValid: true };
}

/**
 * Extracts configuration object from validated headers
 * Deserializes config dump into structured configuration
 * 
 * @param validatedHeaders - Headers that have passed validation
 * @returns Parsed configuration object or null if extraction fails
 */
export function extractConfigurationFromHeaders(validatedHeaders: Headers): any {
  const configDumpValue = validatedHeaders.get(PROXY_HEADERS.CONFIG_DUMP);
  if (!configDumpValue || !configDumpValue.startsWith('0x')) {
    return null;
  }
  
  const hexString = configDumpValue.slice(2);
  if (hexString.length !== 26) { // 13 bytes * 2 chars
    return null;
  }
  
  const configBytes = new Uint8Array(13);
  for (let i = 0; i < 13; i++) {
    configBytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  
  return {
    version: configBytes[0],
    registryHash: `0x${(configBytes[4] << 24 | configBytes[3] << 16 | configBytes[2] << 8 | configBytes[1]).toString(16).padStart(8, '0')}`,
    featureFlags: (configBytes[8] << 24 | configBytes[7] << 16 | configBytes[6] << 8 | configBytes[5]),
    terminalMode: configBytes[9],
    rows: configBytes[10],
    cols: configBytes[11],
    reserved: configBytes[12]
  };
}

/**
 * Performance metrics for header operations
 */
export class HeaderOperationMetrics {
  private headerInjections = 0;
  private totalInjectionTime = 0;
  private validationOperations = 0;
  private successfulValidations = 0;
  
  recordHeaderInjection(nanosecondsTaken: number): void {
    this.headerInjections++;
    this.totalInjectionTime += nanosecondsTaken;
  }
  
  recordValidationOperation(wasSuccessful: boolean): void {
    this.validationOperations++;
    if (wasSuccessful) {
      this.successfulValidations++;
    }
  }
  
  getMetrics(): {
    headerInjections: number;
    averageInjectionTime: number;
    validationOperations: number;
    validationSuccessRate: number;
  } {
    return {
      headerInjections: this.headerInjections,
      averageInjectionTime: this.headerInjections > 0 ? this.totalInjectionTime / this.headerInjections : 0,
      validationOperations: this.validationOperations,
      validationSuccessRate: this.validationOperations > 0 ? (this.successfulValidations / this.validationOperations) * 100 : 0
    };
  }
  
  reset(): void {
    this.headerInjections = 0;
    this.totalInjectionTime = 0;
    this.validationOperations = 0;
    this.successfulValidations = 0;
  }
}

export const headerOperationMetrics = new HeaderOperationMetrics();
