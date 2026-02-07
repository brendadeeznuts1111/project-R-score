#!/usr/bin/env bun

/**
 * Cookie Property Validator v3.24 - RFC 6265 Compliance
 * 
 * Comprehensive validation system for cookie properties with detailed error reporting
 * Ensures security, compliance, and browser compatibility
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitized?: any;
}

export interface ValidationError {
  property: string;
  value: any;
  rule: string;
  message: string;
  severity: 'error' | 'critical';
  fix?: string;
}

export interface ValidationWarning {
  property: string;
  value: any;
  message: string;
  recommendation: string;
}

export interface SecureCookieOptions {
  name?: string;
  value?: string;
  domain?: string | null;
  path?: string;
  expires?: number | Date | undefined;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  partitioned?: boolean;
  maxAge?: number | undefined;
  httpOnly?: boolean;
}

export class CookieValidator {
  private static readonly RFC_6265_RESERVED_PREFIXES = [
    '__Secure-',
    '__Host-'
  ];

  private static readonly CONTROL_CHARS = [
    '\x00', '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07',
    '\x08', '\x09', '\x0A', '\x0B', '\x0C', '\x0D', '\x0E', '\x0F',
    '\x10', '\x11', '\x12', '\x13', '\x14', '\x15', '\x16', '\x17',
    '\x18', '\x19', '\x1A', '\x1B', '\x1C', '\x1D', '\x1E', '\x1F',
    '\x7F'
  ];

  private static readonly MAX_COOKIE_SIZE = 4096;
  private static readonly Y2038_LIMIT = 2147483647000; // January 19, 2038

  /**
   * 🔍 Validate all cookie properties with comprehensive rules
   */
  static validateCookie(options: SecureCookieOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitized: SecureCookieOptions = { ...options };

    // Validate name (required)
    const nameResult = this.validateName(options.name);
    errors.push(...nameResult.errors);
    warnings.push(...nameResult.warnings);
    if (nameResult.sanitized) {
      sanitized.name = nameResult.sanitized;
    }

    // Validate value (required)
    const valueResult = this.validateValue(options.value);
    errors.push(...valueResult.errors);
    warnings.push(...valueResult.warnings);
    if (valueResult.sanitized) {
      sanitized.value = valueResult.sanitized;
    }

    // Validate domain
    const domainResult = this.validateDomain(options.domain);
    errors.push(...domainResult.errors);
    warnings.push(...domainResult.warnings);
    if (domainResult.sanitized !== undefined) {
      sanitized.domain = domainResult.sanitized;
    }

    // Validate path
    const pathResult = this.validatePath(options.path);
    errors.push(...pathResult.errors);
    warnings.push(...pathResult.warnings);
    if (pathResult.sanitized) {
      sanitized.path = pathResult.sanitized;
    }

    // Validate expires
    const expiresResult = this.validateExpires(options.expires);
    errors.push(...expiresResult.errors);
    warnings.push(...expiresResult.warnings);
    if (expiresResult.sanitized !== undefined) {
      sanitized.expires = expiresResult.sanitized;
    }

    // Validate secure flag
    const secureResult = this.validateSecure(options.secure, options.name);
    errors.push(...secureResult.errors);
    warnings.push(...secureResult.warnings);

    // Validate sameSite
    const sameSiteResult = this.validateSameSite(options.sameSite, options.secure);
    errors.push(...sameSiteResult.errors);
    warnings.push(...sameSiteResult.warnings);

    // Validate partitioned
    const partitionedResult = this.validatePartitioned(options.partitioned, options.secure, options.sameSite);
    errors.push(...partitionedResult.errors);
    warnings.push(...partitionedResult.warnings);

    // Validate maxAge
    const maxAgeResult = this.validateMaxAge(options.maxAge);
    errors.push(...maxAgeResult.errors);
    warnings.push(...maxAgeResult.warnings);
    if (maxAgeResult.sanitized !== undefined) {
      sanitized.maxAge = maxAgeResult.sanitized;
    }

    // Cross-property validations
    this.validateCrossProperties(sanitized, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * 🏷️ Validate cookie name
   */
  private static validateName(name?: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    sanitized?: string;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = name;

    if (!name || name.trim().length === 0) {
      errors.push({
        property: 'name',
        value: name,
        rule: 'required',
        message: 'Cookie name is required',
        severity: 'critical',
        fix: 'Provide a valid cookie name'
      });
      return { errors, warnings };
    }

    // RFC 6265: Cookie name must not contain control characters
    const hasControlChars = this.CONTROL_CHARS.some(char => name.includes(char));
    if (hasControlChars) {
      errors.push({
        property: 'name',
        value: name,
        rule: 'rfc_6265_control_chars',
        message: 'Cookie name contains control characters',
        severity: 'error',
        fix: 'Remove control characters from cookie name'
      });
    }

    // Check length limit
    if (name.length > this.MAX_COOKIE_SIZE) {
      errors.push({
        property: 'name',
        value: name,
        rule: 'max_length',
        message: `Cookie name exceeds ${this.MAX_COOKIE_SIZE} characters`,
        severity: 'error',
        fix: `Truncate name to ${this.MAX_COOKIE_SIZE} characters`
      });
      sanitized = name.substring(0, this.MAX_COOKIE_SIZE);
    }

    // Check for reserved prefixes
    const hasReservedPrefix = this.RFC_6265_RESERVED_PREFIXES.some(prefix => 
      name.startsWith(prefix)
    );
    if (hasReservedPrefix) {
      const prefix = this.RFC_6265_RESERVED_PREFIXES.find(p => name.startsWith(p));
      errors.push({
        property: 'name',
        value: name,
        rule: 'rfc_6265_reserved_prefix',
        message: `Cookie name uses reserved prefix '${prefix}'`,
        severity: 'error',
        fix: `Remove '${prefix}' prefix or ensure secure flag is set`
      });
    }

    // Check for invalid characters (spaces, separators)
    const invalidChars = [' ', '\t', ';', ','];
    const hasInvalidChars = invalidChars.some(char => name.includes(char));
    if (hasInvalidChars) {
      errors.push({
        property: 'name',
        value: name,
        rule: 'invalid_characters',
        message: 'Cookie name contains invalid characters (spaces, semicolons, commas)',
        severity: 'error',
        fix: 'Remove invalid characters from cookie name'
      });
    }

    return { errors, warnings, sanitized };
  }

  /**
   * 📝 Validate cookie value
   */
  private static validateValue(value?: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    sanitized?: string;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = value;

    if (!value || value.trim().length === 0) {
      errors.push({
        property: 'value',
        value: value,
        rule: 'required',
        message: 'Cookie value is required',
        severity: 'critical',
        fix: 'Provide a valid cookie value'
      });
      return { errors, warnings };
    }

    // Check for control characters
    const hasControlChars = this.CONTROL_CHARS.some(char => value.includes(char));
    if (hasControlChars) {
      errors.push({
        property: 'value',
        value: value,
        rule: 'rfc_6265_control_chars',
        message: 'Cookie value contains control characters',
        severity: 'error',
        fix: 'Remove control characters from cookie value'
      });
    }

    // Check length limit
    if (value.length > this.MAX_COOKIE_SIZE) {
      errors.push({
        property: 'value',
        value: value,
        rule: 'max_length',
        message: `Cookie value exceeds ${this.MAX_COOKIE_SIZE} characters`,
        severity: 'error',
        fix: `Truncate value to ${this.MAX_COOKIE_SIZE} characters`
      });
      sanitized = value.substring(0, this.MAX_COOKIE_SIZE);
    }

    return { errors, warnings, sanitized };
  }

  /**
   * 🌐 Validate cookie domain
   */
  private static validateDomain(domain?: string | null): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    sanitized?: string | null;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = domain;

    if (domain === null || domain === undefined) {
      return { errors, warnings, sanitized: null };
    }

    // Check for valid domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      errors.push({
        property: 'domain',
        value: domain,
        rule: 'invalid_domain_format',
        message: 'Invalid domain format',
        severity: 'error',
        fix: 'Use valid domain format (e.g., example.com)'
      });
    }

    // Warning for leading dot
    if (domain.startsWith('.')) {
      warnings.push({
        property: 'domain',
        value: domain,
        message: 'Domain starts with leading dot',
        recommendation: 'Consider removing leading dot for better compatibility'
      });
    }

    // Check for IP address (warning)
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipRegex.test(domain)) {
      warnings.push({
        property: 'domain',
        value: domain,
        message: 'Using IP address as domain',
        recommendation: 'Use hostname instead of IP address for better security'
      });
    }

    return { errors, warnings, sanitized };
  }

  /**
   * 📁 Validate cookie path
   */
  private static validatePath(path?: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    sanitized?: string;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = path || '/';

    if (!path || path.trim().length === 0) {
      return { errors, warnings, sanitized: '/' };
    }

    // Must start with /
    if (!path.startsWith('/')) {
      errors.push({
        property: 'path',
        value: path,
        rule: 'must_start_with_slash',
        message: 'Path must start with /',
        severity: 'error',
        fix: 'Add leading slash to path'
      });
      sanitized = '/' + path;
    }

    // No double slashes
    if (path.includes('//')) {
      errors.push({
        property: 'path',
        value: path,
        rule: 'no_double_slashes',
        message: 'Path contains double slashes',
        severity: 'error',
        fix: 'Remove double slashes from path'
      });
      sanitized = sanitized.replace(/\/+/g, '/');
    }

    // Check for invalid characters
    const invalidChars = ['?', '#'];
    const hasInvalidChars = invalidChars.some(char => path.includes(char));
    if (hasInvalidChars) {
      warnings.push({
        property: 'path',
        value: path,
        message: 'Path contains potentially problematic characters',
        recommendation: 'Avoid ?, # in cookie paths'
      });
    }

    return { errors, warnings, sanitized };
  }

  /**
   * ⏰ Validate expires timestamp
   */
  private static validateExpires(expires?: number | Date | undefined): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    sanitized?: number | Date | undefined;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = expires;

    if (expires === undefined) {
      return { errors, warnings, sanitized: undefined };
    }

    let timestamp: number;
    if (expires instanceof Date) {
      timestamp = expires.getTime();
    } else if (typeof expires === 'number') {
      timestamp = expires;
    } else {
      errors.push({
        property: 'expires',
        value: expires,
        rule: 'invalid_type',
        message: 'Expires must be a Date object or timestamp number',
        severity: 'error',
        fix: 'Use Date object or Unix timestamp'
      });
      return { errors, warnings };
    }

    // Check if in the past
    const now = Date.now();
    if (timestamp < now) {
      errors.push({
        property: 'expires',
        value: expires,
        rule: 'not_in_past',
        message: 'Expires date is in the past',
        severity: 'error',
        fix: 'Set future expiration date'
      });
    }

    // Check Y2038 limit for 32-bit systems
    if (timestamp > this.Y2038_LIMIT) {
      warnings.push({
        property: 'expires',
        value: expires,
        message: 'Expires date exceeds Y2038 limit (32-bit systems)',
        recommendation: 'Consider earlier date for 32-bit compatibility'
      });
    }

    return { errors, warnings, sanitized };
  }

  /**
   * 🔒 Validate secure flag
   */
  private static validateSecure(secure?: boolean, name?: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const isProduction = process.env.NODE_ENV === 'production';
    const hasSecurePrefix = name && this.RFC_6265_RESERVED_PREFIXES.some(prefix => 
      name.startsWith(prefix)
    );

    // Required in production
    if (isProduction && !secure) {
      errors.push({
        property: 'secure',
        value: secure,
        rule: 'required_in_production',
        message: 'Secure flag is required in production',
        severity: 'critical',
        fix: 'Set secure=true in production'
      });
    }

    // Required for __Secure- prefix
    if (hasSecurePrefix && !secure) {
      errors.push({
        property: 'secure',
        value: secure,
        rule: 'required_for_secure_prefix',
        message: 'Secure flag required for __Secure- prefixed cookies',
        severity: 'critical',
        fix: 'Set secure=true for __Secure- prefixed cookies'
      });
    }

    return { errors, warnings };
  }

  /**
   * 🔗 Validate sameSite attribute
   */
  private static validateSameSite(sameSite?: "strict" | "lax" | "none", secure?: boolean): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const validValues = ["strict", "lax", "none"];
    if (sameSite && !validValues.includes(sameSite)) {
      errors.push({
        property: 'sameSite',
        value: sameSite,
        rule: 'invalid_value',
        message: `sameSite must be one of: ${validValues.join(', ')}`,
        severity: 'error',
        fix: 'Use valid sameSite value'
      });
    }

    // "none" requires secure=true
    if (sameSite === 'none' && !secure) {
      errors.push({
        property: 'sameSite',
        value: sameSite,
        rule: 'none_requires_secure',
        message: 'sameSite="none" requires secure=true',
        severity: 'error',
        fix: 'Set secure=true when using sameSite="none"'
      });
    }

    return { errors, warnings };
  }

  /**
   * 🧩 Validate partitioned attribute (CHIPS API)
   */
  private static validatePartitioned(partitioned?: boolean, secure?: boolean, sameSite?: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Requires secure=true
    if (partitioned && !secure) {
      errors.push({
        property: 'partitioned',
        value: partitioned,
        rule: 'requires_secure',
        message: 'Partitioned cookies require secure=true',
        severity: 'error',
        fix: 'Set secure=true for partitioned cookies'
      });
    }

    // Suggests sameSite="none"
    if (partitioned && sameSite !== 'none') {
      warnings.push({
        property: 'partitioned',
        value: partitioned,
        message: 'Partitioned cookies work best with sameSite="none"',
        recommendation: 'Consider setting sameSite="none" for partitioned cookies'
      });
    }

    // Browser compatibility warning
    if (partitioned) {
      warnings.push({
        property: 'partitioned',
        value: partitioned,
        message: 'Partitioned cookies (CHIPS API) have limited browser support',
        recommendation: 'Ensure target browsers support CHIPS API'
      });
    }

    return { errors, warnings };
  }

  /**
   * ⏱️ Validate maxAge attribute
   */
  private static validateMaxAge(maxAge?: number | undefined): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    sanitized?: number | undefined;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitized = maxAge;

    if (maxAge === undefined) {
      return { errors, warnings, sanitized: undefined };
    }

    if (typeof maxAge !== 'number') {
      errors.push({
        property: 'maxAge',
        value: maxAge,
        rule: 'invalid_type',
        message: 'maxAge must be a number',
        severity: 'error',
        fix: 'Use number for maxAge (seconds)'
      });
      return { errors, warnings };
    }

    // Must be positive
    if (maxAge <= 0) {
      errors.push({
        property: 'maxAge',
        value: maxAge,
        rule: 'positive_values',
        message: 'maxAge must be positive',
        severity: 'error',
        fix: 'Use positive number for maxAge'
      });
    }

    // Warning for very large values
    const oneYear = 365 * 24 * 60 * 60;
    if (maxAge > oneYear) {
      warnings.push({
        property: 'maxAge',
        value: maxAge,
        message: 'maxAge exceeds 1 year',
        recommendation: 'Consider using shorter duration for better security'
      });
    }

    return { errors, warnings, sanitized };
  }

  /**
   * 🔗 Cross-property validations
   */
  private static validateCrossProperties(
    options: SecureCookieOptions,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // expires vs maxAge conflict
    if (options.expires !== undefined && options.maxAge !== undefined) {
      warnings.push({
        property: 'cross_property',
        value: { expires: options.expires, maxAge: options.maxAge },
        message: 'Both expires and maxAge are set',
        recommendation: 'Use either expires or maxAge, not both (maxAge takes precedence)'
      });
    }

    // Total cookie size warning
    const totalSize = (options.name?.length || 0) + (options.value?.length || 0) + 100; // Rough estimate
    if (totalSize > this.MAX_COOKIE_SIZE) {
      errors.push({
        property: 'total_size',
        value: totalSize,
        rule: 'size_limit',
        message: `Total cookie size exceeds ${this.MAX_COOKIE_SIZE} bytes`,
        severity: 'error',
        fix: 'Reduce name or value length'
      });
    }
  }

  /**
   * 📊 Generate validation report
   */
  static generateReport(result: ValidationResult): string {
    let report = '# Cookie Validation Report\n\n';
    
    report += `## Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}\n\n`;
    
    if (result.errors.length > 0) {
      report += '## 🚨 Errors\n\n';
      result.errors.forEach((error, index) => {
        report += `### ${index + 1}. ${error.property}\n`;
        report += `- **Rule**: ${error.rule}\n`;
        report += `- **Message**: ${error.message}\n`;
        report += `- **Severity**: ${error.severity}\n`;
        if (error.fix) {
          report += `- **Fix**: ${error.fix}\n`;
        }
        report += `- **Value**: \`${JSON.stringify(error.value)}\`\n\n`;
      });
    }
    
    if (result.warnings.length > 0) {
      report += '## ⚠️ Warnings\n\n';
      result.warnings.forEach((warning, index) => {
        report += `### ${index + 1}. ${warning.property}\n`;
        report += `- **Message**: ${warning.message}\n`;
        report += `- **Recommendation**: ${warning.recommendation}\n`;
        report += `- **Value**: \`${JSON.stringify(warning.value)}\`\n\n`;
      });
    }
    
    if (result.sanitized) {
      report += '## 🧹 Sanitized Options\n\n';
      report += '```json\n';
      report += JSON.stringify(result.sanitized, null, 2);
      report += '\n```\n';
    }
    
    return report;
  }
}
