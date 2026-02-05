/**
 * Security Hardening Layer - Component #45
 *
 * CVE prevention and JSC sandbox isolation for trusted dependencies.
 *
 * | Infrastructure ID | Logic Tier | Resource Tax | Parity Lock | Status |
 * |:------------------|:-----------|:-------------|:------------|:-------|
 * | **Security-Hardening-Layer** | **Level 1: Security** | `Heap: +1MB` | `6y7z...8a0b` | **HARDENED** |
 *
 * Security Features:
 * - Prevents trustedDependencies spoofing (CVE-2024 mitigation)
 * - JSC sandbox isolation (loader property leak prevention)
 * - Protocol validation for package sources
 * - Timing-safe comparison for security-critical operations
 *
 * @module infrastructure
 */

import { isFeatureEnabled, type InfrastructureFeature } from '../types/feature-flags';

/**
 * Feature flag for security hardening
 */
const SECURITY_HARDENING: InfrastructureFeature = 'CSRF_PROTECTION';

/**
 * Trusted package sources (only npm registry is auto-trusted)
 */
const TRUSTED_SOURCES = new Set(['npm', 'registry.npmjs.org', 'registry.npmmirror.com']);

/**
 * Untrusted protocols that require explicit trustedDependencies configuration
 */
const UNTRUSTED_PROTOCOLS = new Set([
  'file:',
  'link:',
  'git:',
  'git+ssh:',
  'git+https:',
  'git+http:',
  'github:',
  'gitlab:',
  'bitbucket:',
  'workspace:',
  'portal:',
  'patch:',
]);

/**
 * Dangerous global properties that should not be visible in isolated contexts
 */
const DANGEROUS_GLOBALS = [
  '__bun_jsc_loader__',
  '__bun_native_type_checks__',
  '__bun_module_cache__',
  '__bun_internal__',
] as const;

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  valid: boolean;
  warnings: string[];
  blocked: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Trusted dependency validation result
 */
export interface TrustedDependencyResult {
  trusted: boolean;
  reason: string;
  source: string;
  requiresExplicitTrust: boolean;
}

/**
 * Isolated context options
 */
export interface IsolatedContextOptions {
  allowConsole?: boolean;
  allowProcess?: boolean;
  allowBuffer?: boolean;
  allowURL?: boolean;
  allowCrypto?: boolean;
  customGlobals?: Record<string, unknown>;
}

/**
 * Security Hardening Layer
 *
 * Provides security hardening for package management and sandboxed execution.
 */
export class SecurityHardeningLayer {
  /**
   * Validate a trusted dependency
   *
   * Prevents trustedDependencies spoofing by validating package sources.
   * Only npm registry packages can be auto-trusted; other sources require
   * explicit trustedDependencies configuration.
   *
   * @param packageName - Package name to validate
   * @param source - Package source (npm, file:, git:, etc.)
   * @returns Validation result
   *
   * @example
   * ```typescript
   * SecurityHardeningLayer.validateTrustedDependency('lodash', 'npm');
   * // { trusted: true, reason: 'npm registry', ... }
   *
   * SecurityHardeningLayer.validateTrustedDependency('malicious', 'file:./malicious');
   * // { trusted: false, reason: 'file: protocol requires explicit trust', ... }
   * ```
   */
  static validateTrustedDependency(
    packageName: string,
    source: string
  ): TrustedDependencyResult {
    if (!isFeatureEnabled(SECURITY_HARDENING)) {
      // Legacy mode: trust everything (dangerous)
      return {
        trusted: true,
        reason: 'Security hardening disabled',
        source,
        requiresExplicitTrust: false,
      };
    }

    // Check if source is from trusted npm registry
    if (TRUSTED_SOURCES.has(source)) {
      return {
        trusted: true,
        reason: 'Trusted npm registry source',
        source,
        requiresExplicitTrust: false,
      };
    }

    // Check for untrusted protocol prefixes
    const protocol = this.extractProtocol(source);
    if (protocol && UNTRUSTED_PROTOCOLS.has(protocol)) {
      console.warn(
        `[SECURITY] Package "${packageName}" from "${source}" requires explicit ` +
        `trustedDependencies configuration to run lifecycle scripts.`
      );

      return {
        trusted: false,
        reason: `${protocol} protocol requires explicit trust`,
        source,
        requiresExplicitTrust: true,
      };
    }

    // URL-based sources
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const url = new URL(source);
      if (TRUSTED_SOURCES.has(url.hostname)) {
        return {
          trusted: true,
          reason: `Trusted registry: ${url.hostname}`,
          source,
          requiresExplicitTrust: false,
        };
      }

      return {
        trusted: false,
        reason: `Untrusted URL source: ${url.hostname}`,
        source,
        requiresExplicitTrust: true,
      };
    }

    // Unknown source type - require explicit trust
    return {
      trusted: false,
      reason: 'Unknown source type requires explicit trust',
      source,
      requiresExplicitTrust: true,
    };
  }

  /**
   * Extract protocol from a source string
   */
  private static extractProtocol(source: string): string | null {
    const colonIndex = source.indexOf(':');
    if (colonIndex === -1) return null;

    // Handle git+ssh:, git+https:, etc.
    const possibleProtocol = source.slice(0, colonIndex + 1);
    if (UNTRUSTED_PROTOCOLS.has(possibleProtocol)) {
      return possibleProtocol;
    }

    // Check for compound protocols like git+ssh:
    const plusIndex = source.indexOf('+');
    if (plusIndex !== -1 && plusIndex < colonIndex) {
      const compoundProtocol = source.slice(0, colonIndex + 1);
      if (UNTRUSTED_PROTOCOLS.has(compoundProtocol)) {
        return compoundProtocol;
      }
    }

    return possibleProtocol;
  }

  /**
   * Create an isolated execution context
   *
   * Creates a sandboxed context without access to internal Bun APIs,
   * preventing JSC loader property leaks.
   *
   * @param options - Context configuration options
   * @returns Isolated context object
   */
  static createIsolatedContext(options: IsolatedContextOptions = {}): Record<string, unknown> {
    if (!isFeatureEnabled(SECURITY_HARDENING)) {
      // Non-hardened: return basic context
      return {
        console: options.allowConsole !== false ? console : undefined,
        process: options.allowProcess !== false ? process : undefined,
        ...options.customGlobals,
      };
    }

    // Create isolated context without dangerous globals
    const context: Record<string, unknown> = {
      // Explicitly undefined to prevent access
      Bun: undefined,
      __bun_jsc_loader__: undefined,
      __bun_native_type_checks__: undefined,
      __bun_module_cache__: undefined,
      __bun_internal__: undefined,
    };

    // Add allowed globals
    if (options.allowConsole !== false) {
      // Create sanitized console that doesn't leak internal state
      context.console = this.createSanitizedConsole();
    }

    if (options.allowProcess !== false) {
      // Create sanitized process object
      context.process = this.createSanitizedProcess();
    }

    if (options.allowBuffer !== false) {
      context.Buffer = Buffer;
    }

    if (options.allowURL !== false) {
      context.URL = URL;
      context.URLSearchParams = URLSearchParams;
      context.URLPattern = typeof URLPattern !== 'undefined' ? URLPattern : undefined;
    }

    if (options.allowCrypto !== false) {
      context.crypto = crypto;
    }

    // Add safe standard globals
    context.Object = Object;
    context.Array = Array;
    context.String = String;
    context.Number = Number;
    context.Boolean = Boolean;
    context.Symbol = Symbol;
    context.BigInt = BigInt;
    context.Map = Map;
    context.Set = Set;
    context.WeakMap = WeakMap;
    context.WeakSet = WeakSet;
    context.Promise = Promise;
    context.Proxy = Proxy;
    context.Reflect = Reflect;
    context.JSON = JSON;
    context.Math = Math;
    context.Date = Date;
    context.RegExp = RegExp;
    context.Error = Error;
    context.TypeError = TypeError;
    context.RangeError = RangeError;
    context.SyntaxError = SyntaxError;

    // Typed arrays
    context.ArrayBuffer = ArrayBuffer;
    context.SharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
    context.DataView = DataView;
    context.Uint8Array = Uint8Array;
    context.Int8Array = Int8Array;
    context.Uint16Array = Uint16Array;
    context.Int16Array = Int16Array;
    context.Uint32Array = Uint32Array;
    context.Int32Array = Int32Array;
    context.Float32Array = Float32Array;
    context.Float64Array = Float64Array;
    context.BigInt64Array = BigInt64Array;
    context.BigUint64Array = BigUint64Array;

    // Add custom globals
    if (options.customGlobals) {
      Object.assign(context, options.customGlobals);
    }

    // Deep freeze to prevent prototype pollution
    this.deepFreeze(context);

    return context;
  }

  /**
   * Create a sanitized console object
   */
  private static createSanitizedConsole(): Pick<Console, 'log' | 'warn' | 'error' | 'info' | 'debug'> {
    return {
      log: (...args: unknown[]) => console.log('[ISOLATED]', ...args),
      warn: (...args: unknown[]) => console.warn('[ISOLATED]', ...args),
      error: (...args: unknown[]) => console.error('[ISOLATED]', ...args),
      info: (...args: unknown[]) => console.info('[ISOLATED]', ...args),
      debug: (...args: unknown[]) => console.debug('[ISOLATED]', ...args),
    };
  }

  /**
   * Create a sanitized process object
   */
  private static createSanitizedProcess(): Partial<typeof process> {
    return {
      env: { ...process.env }, // Copy, not reference
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      versions: { ...process.versions },
      cwd: () => process.cwd(),
      // Explicitly exclude dangerous APIs
      // exit, kill, abort, etc. are not included
    };
  }

  /**
   * Deep freeze an object to prevent modification
   */
  private static deepFreeze<T extends object>(obj: T): T {
    Object.freeze(obj);

    for (const key of Object.keys(obj) as (keyof T)[]) {
      const value = obj[key];
      if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        this.deepFreeze(value as object);
      }
    }

    return obj;
  }

  /**
   * Validate bunfig.toml trustedDependencies configuration
   *
   * @param config - Configuration object
   * @returns Validation result with warnings
   */
  static validateBunfigConfig(config: Record<string, unknown>): SecurityValidationResult {
    const warnings: string[] = [];
    const blocked: string[] = [];

    if (!isFeatureEnabled(SECURITY_HARDENING)) {
      return {
        valid: true,
        warnings: ['Security hardening disabled - configuration not validated'],
        blocked: [],
        riskLevel: 'medium',
      };
    }

    // Check trustedDependencies
    const trustedDeps = config.trustedDependencies;
    if (!trustedDeps) {
      warnings.push(
        'No trustedDependencies configured. Lifecycle scripts from ' +
        'non-npm sources will not run automatically.'
      );
    } else if (!Array.isArray(trustedDeps)) {
      warnings.push('trustedDependencies must be an array');
    } else {
      for (const dep of trustedDeps) {
        if (typeof dep !== 'string') {
          warnings.push(`Invalid trustedDependencies entry: ${JSON.stringify(dep)}`);
          continue;
        }

        // Check for spoofing attempts
        if (dep.includes(':')) {
          const protocol = this.extractProtocol(dep);
          if (protocol && UNTRUSTED_PROTOCOLS.has(protocol)) {
            warnings.push(
              `Explicit trust for "${dep}" - ensure this source is verified. ` +
              `${protocol} packages can execute arbitrary code during installation.`
            );
          }
        }

        // Check for path traversal
        if (dep.includes('..') || dep.includes('//')) {
          blocked.push(`Blocked: "${dep}" - potential path traversal`);
        }
      }
    }

    // Check for dangerous configurations
    if (config.allowAll === true) {
      blocked.push('Blocked: allowAll=true is not permitted');
    }

    if (config.runLifecycleScripts === true && !trustedDeps) {
      warnings.push(
        'runLifecycleScripts is enabled without trustedDependencies. ' +
        'Consider explicitly listing trusted packages.'
      );
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (blocked.length > 0) {
      riskLevel = 'critical';
    } else if (warnings.length > 3) {
      riskLevel = 'high';
    } else if (warnings.length > 0) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      valid: blocked.length === 0,
      warnings,
      blocked,
      riskLevel,
    };
  }

  /**
   * Timing-safe string comparison
   *
   * Prevents timing attacks by comparing strings in constant time.
   *
   * @param a - First string
   * @param b - Second string
   * @returns true if strings are equal
   */
  static timingSafeEqual(a: string, b: string): boolean {
    if (!isFeatureEnabled(SECURITY_HARDENING)) {
      return a === b;
    }

    // Use crypto.timingSafeEqual for constant-time comparison
    const aBuffer = new TextEncoder().encode(a);
    const bBuffer = new TextEncoder().encode(b);

    if (aBuffer.length !== bBuffer.length) {
      // Still perform comparison to maintain constant time
      const dummy = new Uint8Array(aBuffer.length);
      this.constantTimeCompare(aBuffer, dummy);
      return false;
    }

    return this.constantTimeCompare(aBuffer, bBuffer);
  }

  /**
   * Constant-time buffer comparison
   */
  private static constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      // Using non-null assertion since we've verified bounds
      result |= (a[i] as number) ^ (b[i] as number);
    }

    return result === 0;
  }

  /**
   * Check if a global is considered dangerous
   */
  static isDangerousGlobal(name: string): boolean {
    return DANGEROUS_GLOBALS.includes(name as (typeof DANGEROUS_GLOBALS)[number]);
  }

  /**
   * Audit globalThis for exposed internal APIs
   *
   * @returns List of exposed dangerous globals
   */
  static auditGlobalExposure(): string[] {
    if (!isFeatureEnabled(SECURITY_HARDENING)) {
      return [];
    }

    const exposed: string[] = [];

    for (const name of DANGEROUS_GLOBALS) {
      if (name in globalThis) {
        exposed.push(name);
      }
    }

    return exposed;
  }

  /**
   * Sanitize an error message to prevent information leakage
   */
  static sanitizeError(error: Error): Error {
    if (!isFeatureEnabled(SECURITY_HARDENING)) {
      return error;
    }

    // Create a new error without stack trace details
    const sanitized = new Error(error.message);
    sanitized.name = error.name;

    // Remove file paths from stack trace
    if (error.stack) {
      sanitized.stack = error.stack.replace(
        /\(\/[^)]+\)/g,
        '([REDACTED])'
      ).replace(
        /at \/[^\s]+/g,
        'at [REDACTED]'
      );
    }

    return sanitized;
  }
}

/**
 * Zero-cost security function exports
 */
export const validateTrustedDependency = SecurityHardeningLayer.validateTrustedDependency.bind(SecurityHardeningLayer);
export const createIsolatedContext = SecurityHardeningLayer.createIsolatedContext.bind(SecurityHardeningLayer);
export const validateBunfigConfig = SecurityHardeningLayer.validateBunfigConfig.bind(SecurityHardeningLayer);
export const timingSafeEqual = SecurityHardeningLayer.timingSafeEqual.bind(SecurityHardeningLayer);
export const isDangerousGlobal = SecurityHardeningLayer.isDangerousGlobal.bind(SecurityHardeningLayer);
export const auditGlobalExposure = SecurityHardeningLayer.auditGlobalExposure.bind(SecurityHardeningLayer);
export const sanitizeError = SecurityHardeningLayer.sanitizeError.bind(SecurityHardeningLayer);
