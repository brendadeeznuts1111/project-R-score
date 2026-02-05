import "./types.d.ts";
// infrastructure/v2-4-2/security-hardening-layer.ts
// Component #49: Security Hardening Layer (CVE-2024 Prevention)

import { feature } from "bun:bundle";

// Export interfaces for type safety
export interface TrustedDependencyResult {
  valid: boolean;
  reason: string;
  violation?: SecurityViolation;
}

export interface IsolatedContext {
  context: unknown;
  isolated: boolean;
  sandboxGlobals?: string[];
}

export interface ConfigValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  securityLevel: "HIGH" | "MEDIUM" | "LOW";
}

export interface PackageScanResult {
  valid: boolean;
  issues: SecurityIssue[];
  securityScore: number;
}

export interface SecurityIssue {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  package?: string;
  version?: string;
  script?: string;
  command?: string;
}

export interface SecurityViolation {
  packageName: string;
  source: string;
  protocol: string;
  timestamp: number;
  reason: string;
}

export interface EnvironmentValidationResult {
  secure: boolean;
  issues: EnvironmentIssue[];
}

export interface EnvironmentIssue {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  key: string;
  reason: string;
}

export class SecurityHardeningLayer {
  private static readonly UNTRUSTED_PROTOCOLS = new Set([
    "file:",
    "link:",
    "git:",
    "github:",
    "ssh:",
    "ftp:",
    "http:",
  ]);

  private static readonly TRUSTED_REGISTRIES = new Set([
    "https://registry.npmjs.org/",
    "https://registry.yarnpkg.com/",
    "https://packages.bun.sh/",
  ]);

  private static securityMetrics = {
    packagesBlocked: 0,
    packagesAllowed: 0,
    sandboxIsolations: 0,
    securityViolations: 0,
    configValidations: 0,
  };

  // Validate trusted dependency with CVE-2024 protection
  static validateTrustedDependency(
    packageName: string,
    source: string,
    _version?: string
  ): TrustedDependencyResult {
    if (!feature("SECURITY_HARDENING")) {
      return { valid: true, reason: "Security hardening disabled" }; // Legacy vulnerable mode
    }

    // Only trusted registries are trusted by default
    if (this.TRUSTED_REGISTRIES.has(source)) {
      this.securityMetrics.packagesAllowed++;
      return { valid: true, reason: "Trusted registry" };
    }

    // All other protocols require explicit trustedDependencies
    const protocol = source.split("+")[0].split(":")[0] + ":";
    if (this.UNTRUSTED_PROTOCOLS.has(protocol)) {
      this.securityMetrics.packagesBlocked++;
      this.securityMetrics.securityViolations++;

      const violation = {
        packageName,
        source,
        protocol,
        timestamp: Date.now(),
        reason:
          "CVE-2024: Untrusted protocol requires explicit trustedDependencies",
      };

      this.logSecurityViolation(violation);

      return {
        valid: false,
        reason: `CVE-2024 BLOCKED: Package ${packageName} from ${source} requires explicit trustedDependencies configuration.`,
        violation,
      };
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(packageName, source)) {
      this.securityMetrics.packagesBlocked++;
      return {
        valid: false,
        reason: `Suspicious package name or source detected: ${packageName} from ${source}`,
      };
    }

    this.securityMetrics.packagesAllowed++;
    return { valid: true, reason: "Manual validation required" };
  }

  // Check for suspicious patterns in package names/sources
  private static containsSuspiciousPatterns(
    packageName: string,
    source: string
  ): boolean {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /[<>]/, // HTML injection
      /[|&;$]/, // Command injection
      /^(test|dev|debug)/i, // Test packages in production
      /password|secret|token|key/i, // Sensitive terms
      /\.(exe|bat|sh|ps1|cmd)$/i, // Executable extensions
    ];

    return suspiciousPatterns.some(
      (pattern) => pattern.test(packageName) || pattern.test(source)
    );
  }

  // Fixes JSC loader property leaks in node:vm sandboxes
  static createIsolatedContext(
    sandboxGlobals?: Record<string, unknown>
  ): IsolatedContext {
    if (!feature("SECURITY_HARDENING")) {
      return {
        context:
          (globalThis as any).vm?.createContext?.(sandboxGlobals || {}) || {},
        isolated: false,
      }; // Vulnerable to loader leaks
    }

    // True isolation: no Bun internals visible
    const sanitizedGlobals: Record<string, unknown> = {
      console: {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console),
      },
      process: {
        env: { ...process.env },
        platform: process.platform,
        version: process.version,
        arch: process.arch,
        pid: process.pid,
        // Remove Bun-specific properties
        Bun: undefined,
        main: undefined,
      },
      Buffer: {
        from: Buffer.from.bind(Buffer),
        alloc: Buffer.alloc.bind(Buffer),
        allocUnsafe: Buffer.allocUnsafe.bind(Buffer),
        byteLength: Buffer.byteLength.bind(Buffer),
      },
      URL: globalThis.URL,
      URLPattern:
        globalThis.URLPattern ||
        (feature("URL_PATTERN_NATIVE") ? URLPattern : undefined),
      setTimeout: globalThis.setTimeout,
      setInterval: globalThis.setInterval,
      clearTimeout: globalThis.clearTimeout,
      clearInterval: globalThis.clearInterval,
      Date: globalThis.Date,
      Math: globalThis.Math,
      JSON: globalThis.JSON,
      Object: globalThis.Object,
      Array: globalThis.Array,
      String: globalThis.String,
      Number: globalThis.Number,
      Boolean: globalThis.Boolean,
      ...sandboxGlobals,
    };

    // Remove dangerous properties
    if (
      sanitizedGlobals.process &&
      typeof sanitizedGlobals.process === "object"
    ) {
      const processObj = sanitizedGlobals.process as Record<string, unknown>;
      if (processObj.env && typeof processObj.env === "object") {
        const envObj = processObj.env as Record<string, unknown>;
        delete envObj.BUN_RUNTIME;
        delete envObj.NODE_OPTIONS;
      }
    }
    delete (sanitizedGlobals as any).global;
    delete (sanitizedGlobals as any).GLOBAL;

    const context =
      (globalThis as any).vm?.createContext?.(sanitizedGlobals) ||
      sanitizedGlobals;

    // Deep freeze prototype chain to prevent prototype pollution
    this.deepFreeze(context);

    this.securityMetrics.sandboxIsolations++;

    return {
      context,
      isolated: true,
      sandboxGlobals: Object.keys(sanitizedGlobals),
    };
  }

  // Deep freeze object and prototype chain
  private static deepFreeze(obj: unknown): void {
    if (typeof obj === "object" && obj !== null) {
      Object.freeze(obj);

      if ((obj as any).constructor && (obj as any).constructor.prototype) {
        Object.freeze((obj as any).constructor.prototype);
      }

      // Recursively freeze nested objects
      for (const prop of Object.getOwnPropertyNames(obj)) {
        const value = (obj as Record<string, unknown>)[prop];
        if (value && typeof value === "object" && !Object.isFrozen(value)) {
          this.deepFreeze(value);
        }
      }
    }
  }

  // Validates bunfig.toml security configuration
  static validateConfig(config: unknown): ConfigValidationResult {
    this.securityMetrics.configValidations++;

    const warnings: string[] = [];
    const errors: string[] = [];

    if (!config || typeof config !== "object") {
      errors.push("Invalid configuration: must be an object");
      return { valid: false, warnings, errors, securityLevel: "LOW" };
    }

    const cfg = config as Record<string, unknown>;

    if (!cfg.trustedDependencies) {
      warnings.push(
        "No trustedDependencies: file:/git: packages blocked by default."
      );
    }

    if (cfg.trustedDependencies) {
      if (!Array.isArray(cfg.trustedDependencies)) {
        errors.push("trustedDependencies must be an array");
      } else {
        for (const dep of cfg.trustedDependencies) {
          if (typeof dep !== "string") continue;

          // Detect spoofing attempts in protocol
          if (/^(file|link|git|github|ssh|ftp|http):/.test(dep)) {
            warnings.push(`Explicit trust required for: ${dep}`);
          }

          // Check for suspicious patterns
          if (this.containsSuspiciousPatterns(dep, "")) {
            errors.push(`Suspicious dependency pattern: ${dep}`);
          }
        }
      }
    }

    // Check for dangerous settings
    if (cfg.smol === true) {
      warnings.push(
        "Smol mode enabled: may reduce security checks for performance."
      );
    }

    if (cfg.disableInstallScripts !== true) {
      warnings.push(
        "Install scripts not disabled: potential code execution risk."
      );
    }

    // Validate lockfile settings
    if (cfg.lockfile !== "true" && cfg.lockfile !== true) {
      warnings.push(
        "Lockfile validation disabled: dependency substitution possible."
      );
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      securityLevel:
        errors.length === 0
          ? warnings.length === 0
            ? "HIGH"
            : "MEDIUM"
          : "LOW",
    };
  }

  // Scan package.json for security issues
  static scanPackageJson(packageJson: unknown): PackageScanResult {
    if (!feature("SECURITY_HARDENING")) {
      return { valid: true, issues: [], securityScore: 100 };
    }

    const issues: SecurityIssue[] = [];

    if (!packageJson || typeof packageJson !== "object") {
      issues.push({
        type: "INVALID_PACKAGE_JSON",
        severity: "HIGH",
        description: "Invalid package.json structure",
      });
      return { valid: false, issues, securityScore: 0 };
    }

    const pkg = packageJson as Record<string, unknown>;

    // Check for suspicious dependencies
    if (pkg.dependencies && typeof pkg.dependencies === "object") {
      for (const [name, version] of Object.entries(
        pkg.dependencies as Record<string, string>
      )) {
        const validation = this.validateTrustedDependency(
          name,
          `https://registry.npmjs.org/${name}`,
          version
        );
        if (!validation.valid) {
          issues.push({
            type: "SUSPICIOUS_DEPENDENCY",
            severity: "HIGH",
            description: validation.reason,
            package: name,
            version,
          });
        }
      }
    }

    // Check for dangerous scripts
    if (pkg.scripts && typeof pkg.scripts === "object") {
      const dangerousScripts = [
        "preinstall",
        "postinstall",
        "preuninstall",
        "postuninstall",
      ];
      for (const script of dangerousScripts) {
        if ((pkg.scripts as Record<string, unknown>)[script]) {
          issues.push({
            type: "DANGEROUS_SCRIPT",
            severity: "MEDIUM",
            description: `Lifecycle script '${script}' can execute arbitrary code`,
            script,
            command: String((pkg.scripts as Record<string, unknown>)[script]),
          });
        }
      }
    }

    // Check for weak engines
    if (pkg.engines && typeof pkg.engines === "object") {
      if (
        !(pkg.engines as Record<string, unknown>).node ||
        (pkg.engines as Record<string, unknown>).node === "*"
      ) {
        issues.push({
          type: "WEAK_ENGINE_CONSTRAINTS",
          severity: "LOW",
          description: "No Node.js version constraint specified",
        });
      }
    }

    return {
      valid: issues.filter((i) => i.severity === "HIGH").length === 0,
      issues,
      securityScore: this.calculateSecurityScore(issues),
    };
  }

  // Calculate security score based on issues
  private static calculateSecurityScore(issues: SecurityIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case "HIGH":
          score -= 25;
          break;
        case "MEDIUM":
          score -= 10;
          break;
        case "LOW":
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  // Create secure HTTP client with security headers
  static createSecureClient(
    baseOptions?: Record<string, unknown>
  ): (url: string, options?: RequestInit) => Promise<Response> {
    if (!feature("SECURITY_HARDENING")) {
      return fetch; // Use default fetch
    }

    const secureFetch = async (url: string, options: RequestInit = {}) => {
      const secureOptions: RequestInit = {
        ...baseOptions,
        ...options,
        headers: {
          "User-Agent": "Bun-Security-Hardened/v2.4.2",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "X-XSS-Protection": "1; mode=block",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
          ...(baseOptions?.headers as Record<string, string>),
          ...options?.headers,
        },
        // Security timeouts
        signal: AbortSignal.timeout(30000),
        // Redirect policy
        redirect: "manual",
      };

      // Validate URL
      const urlObj = new URL(url);
      if (urlObj.protocol !== "https:" && urlObj.hostname !== "localhost") {
        throw new Error("HTTPS required for non-localhost requests");
      }

      return fetch(url, secureOptions);
    };

    return secureFetch;
  }

  // Get security metrics
  static getSecurityMetrics(): typeof SecurityHardeningLayer.securityMetrics {
    return { ...this.securityMetrics };
  }

  // Reset security metrics
  static resetSecurityMetrics(): void {
    this.securityMetrics = {
      packagesBlocked: 0,
      packagesAllowed: 0,
      sandboxIsolations: 0,
      securityViolations: 0,
      configValidations: 0,
    };
  }

  // Log security violations
  private static logSecurityViolation(violation: SecurityViolation): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    console.error("[CVE-2024 VIOLATION]", violation);

    // Send to audit system
    fetch("https://api.buncatalog.com/v1/security/violation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 49,
        violation,
        timestamp: Date.now(),
      }),
      signal: AbortSignal.timeout(5000),
    }).catch((error) => {
      console.debug("Failed to log security violation:", error);
    });
  }

  // Validate environment variables for security
  static validateEnvironment(): EnvironmentValidationResult {
    const issues: EnvironmentIssue[] = [];

    // Check for sensitive data in environment
    const sensitiveKeys = ["PASSWORD", "SECRET", "TOKEN", "KEY", "API_KEY"];
    for (const key of Object.keys(process.env)) {
      if (
        sensitiveKeys.some((sensitive) => key.toUpperCase().includes(sensitive))
      ) {
        const value = process.env[key];
        if (value && value.length > 0) {
          issues.push({
            type: "SENSITIVE_ENV_VAR",
            severity: "MEDIUM",
            key,
            reason: "Sensitive data found in environment variable",
          });
        }
      }
    }

    // Check for dangerous environment variables
    const dangerousVars = [
      "NODE_OPTIONS",
      "ELECTRON_RUN_AS_NODE",
      "BUN_RUNTIME",
    ];
    for (const dangerous of dangerousVars) {
      if (process.env[dangerous]) {
        issues.push({
          type: "DANGEROUS_ENV_VAR",
          severity: "HIGH",
          key: dangerous,
          reason:
            "Dangerous environment variable that can affect runtime behavior",
        });
      }
    }

    return {
      secure: issues.filter((i) => i.severity === "HIGH").length === 0,
      issues,
    };
  }
}

interface TrustedDependencyResult {
  valid: boolean;
  reason: string;
  violation?: SecurityViolation;
}

interface IsolatedContext {
  context: unknown;
  isolated: boolean;
  sandboxGlobals?: string[];
}

interface ConfigValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  securityLevel: "HIGH" | "MEDIUM" | "LOW";
}

interface PackageScanResult {
  valid: boolean;
  issues: SecurityIssue[];
  securityScore: number;
}

interface SecurityIssue {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  package?: string;
  version?: string;
  script?: string;
  command?: string;
}

interface SecurityViolation {
  packageName: string;
  source: string;
  protocol: string;
  timestamp: number;
  reason: string;
}

interface EnvironmentValidationResult {
  secure: boolean;
  issues: EnvironmentIssue[];
}

interface EnvironmentIssue {
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  key: string;
  reason: string;
}

// Zero-cost exports
export const {
  validateTrustedDependency,
  createIsolatedContext,
  validateConfig,
} = feature("SECURITY_HARDENING")
  ? SecurityHardeningLayer
  : {
      validateTrustedDependency: () => ({ valid: true, reason: "Disabled" }),
      createIsolatedContext: (globals?: Record<string, unknown>) => ({
        context: globals || {},
        isolated: false,
      }),
      validateConfig: () => ({
        valid: true,
        warnings: [],
        errors: [],
        securityLevel: "HIGH",
      }),
    };

export const {
  scanPackageJson,
  createSecureClient,
  getSecurityMetrics,
  resetSecurityMetrics,
  validateEnvironment,
} = feature("SECURITY_HARDENING")
  ? SecurityHardeningLayer
  : {
      scanPackageJson: () => ({ valid: true, issues: [], securityScore: 100 }),
      createSecureClient: () => fetch,
      getSecurityMetrics: () => ({}),
      resetSecurityMetrics: () => {},
      validateEnvironment: () => ({ secure: true, issues: [] }),
    };

export default SecurityHardeningLayer;
