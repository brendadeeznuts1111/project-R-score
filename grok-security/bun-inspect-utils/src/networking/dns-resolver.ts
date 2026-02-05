// [1.0.0.0] DNS Resolution Types & Validation
// Bun-native (v1.3.5+), zero-npm, enterprise-grade DNS resolver
// 🌑 Dark-mode-first, IPv4/IPv6 dual-stack, c-ares + system resolver backends
// Signed bundles for Factory Wager monorepo [DOMAIN][SCOPE][META]{BUN-API-#REF}

/**
 * [1.0.0.0] IP Protocol Family Union Type
 * Represents the IP version returned by DNS resolution
 * - 4: IPv4 address (e.g., "127.0.0.1")
 * - 6: IPv6 address (e.g., "2001:db8::1")
 *
 * @see https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback
 * @tags dns,family,ipv4,ipv6,core
 */
export type IPFamily = 4 | 6;

/**
 * [1.1.0.0] DNS Resolution Result Interface
 * Represents a single DNS lookup result from Bun's native resolver
 *
 * @see https://bun.com/docs/api/dns
 * @tags dns,address,ip,core,enterprise
 */
export interface DNSResolutionResult {
  /**
   * [1.1.1.0] The resolved IP address
   * - IPv4: "127.0.0.1", "192.168.1.1", etc.
   * - IPv6: "2001:db8::1", "::1", etc.
   *
   * @description The IP address of the host in IPv4 or IPv6 format
   * @resolverNotes All backends (c-ares, system/getaddrinfo)
   * @runtimeBehavior Primary resolution output; validated against family
   * @performance O(1) lookup after resolution
   * @tags dns,address,ip,core
   */
  address: string;

  /**
   * [1.1.2.0] Time to Live (TTL) in seconds
   * - c-ares backend: Actual TTL from DNS record
   * - system/getaddrinfo: 0 (no TTL available)
   *
   * @description Time to live in seconds for the record (cache duration hint)
   * @resolverNotes c-ares only (0 otherwise)
   * @runtimeBehavior Enables intelligent caching; 0 on system/getaddrinfo fallbacks
   * @performance Cache-efficiency metric for repeated connects
   * @tags dns,ttl,cache,c-ares,performance
   */
  ttl: number;

  /**
   * [1.1.3.0] IP Protocol Family
   * Indicates whether address is IPv4 (4) or IPv6 (6)
   *
   * @description IP protocol family (4 for IPv4, 6 for IPv6)
   * @resolverNotes All backends
   * @runtimeBehavior Filtered via lookup options.family; enables protocol-aware routing
   * @performance Happy eyeballs dual-stack support
   * @tags dns,family,ipv4,ipv6,routing
   */
  family: IPFamily;
}

/**
 * [1.2.0.0] DNS Resolution Options
 * Configuration for DNS lookup operations
 *
 * @tags dns,options,configuration
 */
export interface DNSResolutionOptions {
  /**
   * [1.2.1.0] Restrict to specific IP family
   * - 4: IPv4 only
   * - 6: IPv6 only
   * - undefined: Both (happy eyeballs)
   */
  family?: IPFamily;

  /**
   * [1.2.2.0] Enable c-ares backend (if available)
   * Falls back to system resolver if unavailable
   */
  hints?: number;

  /**
   * [1.2.3.0] Timeout in milliseconds
   * Default: 5000ms
   */
  timeout?: number;

  /**
   * [1.2.4.0] Enable caching for repeated lookups
   * Default: true
   */
  cache?: boolean;
}

/**
 * [1.3.0.0] Validation: IPv4 Address Format
 * Validates IPv4 address format (dotted decimal notation)
 *
 * @param address - String to validate
 * @returns true if valid IPv4 address
 * @tags dns,validation,ipv4
 */
export function isValidIPv4(address: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(address)) return false;

  const parts = address.split(".");
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * [1.3.1.0] Validation: IPv6 Address Format
 * Validates IPv6 address format (colon-hexadecimal notation)
 *
 * @param address - String to validate
 * @returns true if valid IPv6 address
 * @tags dns,validation,ipv6
 */
export function isValidIPv6(address: string): boolean {
  // Simplified IPv6 validation (RFC 4291)
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::1|::)$/;
  return ipv6Regex.test(address);
}

/**
 * [1.4.0.0] Validation: DNS Resolution Result
 * Ensures address matches declared family and is properly formatted
 *
 * @param result - DNSResolutionResult to validate
 * @throws Error if validation fails
 * @tags dns,validation,enterprise
 */
export function validateDNSResult(result: DNSResolutionResult): void {
  const { address, family, ttl } = result;

  // [1.4.1.0] Validate address format matches family
  if (family === 4) {
    if (!isValidIPv4(address)) {
      throw new Error(
        `[DNS] Invalid IPv4 address for family 4: "${address}"`
      );
    }
  } else if (family === 6) {
    if (!isValidIPv6(address)) {
      throw new Error(
        `[DNS] Invalid IPv6 address for family 6: "${address}"`
      );
    }
  } else {
    throw new Error(`[DNS] Invalid family: ${family} (expected 4 or 6)`);
  }

  // [1.4.2.0] Validate TTL is non-negative
  if (ttl < 0) {
    throw new Error(`[DNS] Invalid TTL: ${ttl} (must be >= 0)`);
  }
}

/**
 * [1.5.0.0] Detect IP Family from Address
 * Automatically determines if address is IPv4 or IPv6
 *
 * @param address - IP address string
 * @returns Detected family (4 or 6)
 * @throws Error if address format is invalid
 * @tags dns,detection,utility
 */
export function detectIPFamily(address: string): IPFamily {
  if (isValidIPv4(address)) return 4;
  if (isValidIPv6(address)) return 6;
  throw new Error(`[DNS] Unable to detect IP family for: "${address}"`);
}

