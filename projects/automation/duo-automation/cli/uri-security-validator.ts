#!/usr/bin/env bun

/**
 * DuoPlus CLI v3.0+ - Advanced URI Security Validation System
 * Comprehensive security checks for URI encoding, decoding, and suspicious patterns
 */

import { Database } from "bun:sqlite";

interface URISecurityCheck {
  rawUri: string;
  decodedUri?: string;
  encodedUri?: string;
  securityLevel: "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "CRITICAL";
  threats: string[];
  recommendations: string[];
  metadata: {
    encodingType: string;
    hasPercentEncoding: boolean;
    hasSuspiciousPatterns: boolean;
    hasEmptyDecode: boolean;
    hasZeroWidthChars: boolean;
    hasDoubleEncoding: boolean;
    hasControlChars: boolean;
    hasScriptInjection: boolean;
    hasPathTraversal: boolean;
    hasSqlInjection: boolean;
  };
}

interface SecurityValidationRule {
  name: string;
  pattern: RegExp;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  recommendation: string;
}

export class URISecurityValidator {
  private validationRules: SecurityValidationRule[];
  private database: Database;
  
  constructor() {
    this.database = new Database(':memory:');
    this.initializeSecurityRules();
    this.setupDatabase();
  }
  
  /**
   * Initialize comprehensive security validation rules
   */
  private initializeSecurityRules(): void {
    this.validationRules = [
      {
        name: "Suspicious Empty Decode",
        pattern: /^%[0-9A-F]{2}$/,
        severity: "HIGH",
        description: "Percent-encoded URI that decodes to empty string",
        recommendation: "Reject requests with empty decoded URIs"
      },
      {
        name: "Double Encoding Attack",
        pattern: /%25[0-9A-F]{2}/i,
        severity: "CRITICAL",
        description: "Double percent encoding often used in evasion attacks",
        recommendation: "Normalize URI before validation"
      },
      {
        name: "Control Character Injection",
        pattern: /%0[0-8BCEF]|%1[0-9A-F]/i,
        severity: "HIGH",
        description: "Control characters in URI can cause injection attacks",
        recommendation: "Strip or reject control characters"
      },
      {
        name: "Script Injection Patterns",
        pattern: /%3Cscript|%3C%73%63%72%69%70%74|javascript:/i,
        severity: "CRITICAL",
        description: "JavaScript or script injection attempts",
        recommendation: "Block script injection attempts immediately"
      },
      {
        name: "Path Traversal Attack",
        pattern: /\.\.%2F|\.\.%5C|%2E%2E%2F|%2E%2E%5C/i,
        severity: "HIGH",
        description: "Directory traversal attempts via encoding",
        recommendation: "Normalize paths and validate against allowlist"
      },
      {
        name: "SQL Injection Patterns",
        pattern: /%27|%22|%3B|%2D%2D|UNION|SELECT|INSERT|UPDATE|DELETE/i,
        severity: "CRITICAL",
        description: "SQL injection attempts via URI encoding",
        recommendation: "Use parameterized queries and input validation"
      },
      {
        name: "Null Byte Injection",
        pattern: /%00/i,
        severity: "HIGH",
        description: "Null byte injection can bypass security checks",
        recommendation: "Strip null bytes from all input"
      },
      {
        name: "Zero-Width Character Injection",
        pattern: /[\u200B-\u200F\uFEFF]/,
        severity: "MEDIUM",
        description: "Zero-width characters used for evasion or data hiding",
        recommendation: "Strip or reject zero-width characters from URIs"
      },
      {
        name: "UTF-7/8 Overlong Encoding",
        pattern: /%C0%[8-9A-F]|%E0%[8-9A-F]%[8-9A-F]/i,
        severity: "MEDIUM",
        description: "Overlong UTF-8 encoding for bypass attempts",
        recommendation: "Normalize Unicode encoding"
      },
      {
        name: "Command Injection",
        pattern: /%7C|%26|%3B|%60|%24|%28|%29/i,
        severity: "CRITICAL",
        description: "Command injection via shell metacharacters",
        recommendation: "Never pass URI data to shell commands"
      },
      {
        name: "XSS Vector Patterns",
        pattern: /%3C%69%66%72%61%6D%65|%3C%69%6D%67|%3C%6F%62%6A%65%63%74/i,
        severity: "HIGH",
        description: "XSS attempts via HTML tag encoding",
        recommendation: "Sanitize HTML output and use CSP"
      }
    ];
  }
  
  /**
   * Setup security database for logging and analysis
   */
  private setupDatabase(): void {
    this.database.exec(`
      CREATE TABLE security_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        raw_uri TEXT NOT NULL,
        decoded_uri TEXT,
        security_level TEXT NOT NULL,
        threats TEXT,
        recommendations TEXT,
        metadata TEXT
      );
      
      CREATE TABLE threat_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        detection_count INTEGER DEFAULT 0,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_security_level ON security_checks(security_level);
      CREATE INDEX idx_timestamp ON security_checks(timestamp);
    `);
  }
  
  /**
   * Validate URI with comprehensive security checks
   */
  validateURI(rawUri: string): URISecurityCheck {
    const decodedUri = this.safeDecodeURI(rawUri);
    const encodedUri = this.safeEncodeURI(rawUri);
    
    const threats: string[] = [];
    const recommendations: string[] = [];
    
    // Initialize metadata
    const metadata = {
      encodingType: this.detectEncodingType(rawUri),
      hasPercentEncoding: /%[0-9A-F]{2}/i.test(rawUri),
      hasSuspiciousPatterns: false,
      hasEmptyDecode: false,
      hasZeroWidthChars: false,
      hasDoubleEncoding: false,
      hasControlChars: false,
      hasScriptInjection: false,
      hasPathTraversal: false,
      hasSqlInjection: false
    };
    
    // Check for suspicious empty decode (your specific pattern)
    if (/^%[0-9A-F]{2}/.test(rawUri) && !decodedUri?.trim()) {
      threats.push("Suspicious empty decode");
      recommendations.push("Reject requests with empty decoded URIs");
      metadata.hasEmptyDecode = true;
    }
    
    // Check for zero-width characters in decoded URI (your specific pattern)
    if (/[\u200B-\u200F\uFEFF]/.test(decodedUri || "")) {
      threats.push("Zero-width character injection");
      recommendations.push("Strip or reject zero-width characters from URIs");
      metadata.hasZeroWidthChars = true;
    }
    
    // Run all validation rules
    for (const rule of this.validationRules) {
      if (rule.pattern.test(rawUri) || rule.pattern.test(decodedUri || "")) {
        threats.push(rule.description);
        recommendations.push(rule.recommendation);
        metadata.hasSuspiciousPatterns = true;
        
        // Update specific threat flags
        if (rule.name.includes("Double Encoding")) metadata.hasDoubleEncoding = true;
        if (rule.name.includes("Control Character")) metadata.hasControlChars = true;
        if (rule.name.includes("Script")) metadata.hasScriptInjection = true;
        if (rule.name.includes("Traversal")) metadata.hasPathTraversal = true;
        if (rule.name.includes("SQL")) metadata.hasSqlInjection = true;
        
        // Log threat pattern
        this.logThreatPattern(rule.name);
      }
    }
    
    // Additional security checks
    this.performAdditionalSecurityChecks(rawUri, decodedUri, threats, recommendations, metadata);
    
    // Determine security level
    const securityLevel = this.calculateSecurityLevel(threats, metadata);
    
    const result: URISecurityCheck = {
      rawUri,
      decodedUri,
      encodedUri,
      securityLevel,
      threats,
      recommendations,
      metadata
    };
    
    // Log security check
    this.logSecurityCheck(result);
    
    return result;
  }
  
  /**
   * Safe URI decoding with error handling
   */
  private safeDecodeURI(uri: string): string | undefined {
    try {
      return decodeURIComponent(uri);
    } catch {
      try {
        return decodeURI(uri);
      } catch {
        return undefined;
      }
    }
  }
  
  /**
   * Safe URI encoding
   */
  private safeEncodeURI(uri: string): string | undefined {
    try {
      return encodeURIComponent(uri);
    } catch {
      try {
        return encodeURI(uri);
      } catch {
        return undefined;
      }
    }
  }
  
  /**
   * Detect URI encoding type
   */
  private detectEncodingType(uri: string): string {
    if (/%[0-9A-F]{2}/i.test(uri)) {
      return "percent-encoding";
    } else if (/^[\x00-\x7F]*$/.test(uri)) {
      return "ascii";
    } else {
      return "unicode";
    }
  }
  
  /**
   * Perform additional security checks
   */
  private performAdditionalSecurityChecks(
    rawUri: string,
    decodedUri: string | undefined,
    threats: string[],
    recommendations: string[],
    metadata: any
  ): void {
    // Check for excessive length
    if (rawUri.length > 2048) {
      threats.push("Excessively long URI");
      recommendations.push("Limit URI length to prevent DoS attacks");
    }
    
    // Check for unusual character distribution
    const percentRatio = (rawUri.match(/%/g) || []).length / rawUri.length;
    if (percentRatio > 0.3) {
      threats.push("High percent-encoding ratio");
      recommendations.push("Investigate potential encoding evasion");
    }
    
    // Check for suspicious domain patterns
    const suspiciousDomains = [
      /xn--/, // Punycode
      /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
      /[a-z0-9]{20,}/i // Long random strings
    ];
    
    for (const pattern of suspiciousDomains) {
      if (pattern.test(rawUri) || pattern.test(decodedUri || "")) {
        threats.push("Suspicious domain pattern");
        recommendations.push("Validate domain against allowlist");
        break;
      }
    }
    
    // Check for file extensions in query parameters
    const fileExtensions = /\.(php|asp|jsp|cgi|pl|py|sh|bat|cmd)$/i;
    if (fileExtensions.test(decodedUri || "")) {
      threats.push("Executable file extension in URI");
      recommendations.push("Block access to executable files");
    }
  }
  
  /**
   * Calculate overall security level
   */
  private calculateSecurityLevel(threats: string[], metadata: any): "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "CRITICAL" {
    if (threats.length === 0) {
      return "SAFE";
    }
    
    const criticalThreats = threats.filter(t => 
      t.includes("SQL") || t.includes("Script") || t.includes("Command") || t.includes("Double Encoding")
    );
    
    if (criticalThreats.length > 0) {
      return "CRITICAL";
    }
    
    if (threats.length > 3 || metadata.hasEmptyDecode || metadata.hasControlChars) {
      return "DANGEROUS";
    }
    
    if (threats.length > 0) {
      return "SUSPICIOUS";
    }
    
    return "SAFE";
  }
  
  /**
   * Log security check to database
   */
  private logSecurityCheck(check: URISecurityCheck): void {
    const stmt = this.database.prepare(`
      INSERT INTO security_checks (raw_uri, decoded_uri, security_level, threats, recommendations, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      check.rawUri,
      check.decodedUri,
      check.securityLevel,
      JSON.stringify(check.threats),
      JSON.stringify(check.recommendations),
      JSON.stringify(check.metadata)
    );
  }
  
  /**
   * Log threat pattern for analysis
   */
  private logThreatPattern(patternName: string): void {
    const rule = this.validationRules.find(r => r.name === patternName);
    const severity = rule?.severity || "MEDIUM";
    
    const stmt = this.database.prepare(`
      INSERT OR REPLACE INTO threat_patterns (pattern_name, severity, detection_count, last_seen)
      VALUES (?, ?, COALESCE((SELECT detection_count FROM threat_patterns WHERE pattern_name = ?), 0) + 1, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(patternName, severity, patternName);
  }
  
  /**
   * Get security statistics
   */
  getSecurityStatistics(): any {
    const totalChecks = this.database.prepare("SELECT COUNT(*) as count FROM security_checks").get() as { count: number };
    const byLevel = this.database.prepare("SELECT security_level, COUNT(*) as count FROM security_checks GROUP BY security_level").all();
    const topThreats = this.database.prepare(`
      SELECT tp.pattern_name, tp.detection_count, tp.last_seen 
      FROM threat_patterns tp 
      ORDER BY tp.detection_count DESC 
      LIMIT 10
    `).all();
    
    return {
      totalChecks: totalChecks.count,
      byLevel,
      topThreats
    };
  }
  
  /**
   * Demonstrate URI security validation
   */
  demonstrateSecurityValidation(): void {
    console.log("🔒 DuoPlus CLI v3.0+ - URI Security Validation Demo");
    console.log("=".repeat(70));
    
    const testURIs = [
      // Safe URIs
      "https://example.com/path/to/resource",
      "/api/users/123",
      "https://duoplus.family/dashboard",
      
      // Suspicious URIs
      "%41%42%43", // Empty decode pattern
      "https://example.com/%2E%2E%2Fetc%2Fpasswd", // Path traversal
      "https://example.com/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E", // XSS
      "https://example.com/api?id=1%27%20OR%20%271%27%3D%271", // SQL injection
      "https://example.com/test​hidden", // Zero-width character
      "https://example.com/admin​%20access", // Zero-width character in encoded form
      
      // Dangerous URIs
      "%252E%252E%252F", // Double encoding
      "https://example.com/%00admin", // Null byte
      "https://example.com/cmd=%7Ccat%20%2Fetc%2Fpasswd", // Command injection
      
      // Critical URIs
      "javascript:%3Cscript%3Ealert(1)%3C%2Fscript%3E",
      "https://example.com/%3Ciframe%20src%3Djavascript:alert(1)%3E%3C%2Fiframe%3E"
    ];
    
    console.log("\n🧪 Testing URI Security Validation:\n");
    
    for (const uri of testURIs) {
      const result = this.validateURI(uri);
      
      const levelIcon = result.securityLevel === "SAFE" ? "✅" :
                       result.securityLevel === "SUSPICIOUS" ? "⚠️" :
                       result.securityLevel === "DANGEROUS" ? "🚨" : "🔴";
      
      const levelColor = result.securityLevel === "SAFE" ? "\x1b[32m" :
                        result.securityLevel === "SUSPICIOUS" ? "\x1b[33m" :
                        result.securityLevel === "DANGEROUS" ? "\x1b[31m" : "\x1b[91m";
      
      console.log(`${levelIcon} ${levelColor}${result.securityLevel}\x1b[0m: ${uri}`);
      
      if (result.threats.length > 0) {
        result.threats.forEach(threat => {
          console.log(`   ⚠️  ${threat}`);
        });
      }
      
      if (result.decodedUri && result.decodedUri !== uri) {
        console.log(`   📝 Decoded: ${result.decodedUri}`);
      }
      
      console.log();
    }
    
    // Show statistics
    const stats = this.getSecurityStatistics();
    console.log("📊 Security Statistics:");
    console.log(`   Total Checks: ${stats.totalChecks}`);
    
    stats.byLevel.forEach((level: any) => {
      const icon = level.security_level === "SAFE" ? "✅" :
                   level.security_level === "SUSPICIOUS" ? "⚠️" :
                   level.security_level === "DANGEROUS" ? "🚨" : "🔴";
      console.log(`   ${icon} ${level.security_level}: ${level.count}`);
    });
    
    console.log("\n🎯 Top Threat Patterns:");
    stats.topThreats.forEach((threat: any) => {
      console.log(`   ${threat.pattern_name}: ${threat.detection_count} detections`);
    });
    
    console.log("\n💡 Security Recommendations:");
    console.log("   🔒 Always validate and sanitize user input");
    console.log("   🛡️ Use allowlists for file paths and domains");
    console.log("   🔍 Log and monitor suspicious URI patterns");
    console.log("   🚫 Reject URIs with empty decoded values");
    console.log("   🔄 Normalize encoding before validation");
    console.log("   📊 Implement rate limiting for suspicious patterns");
    
    console.log("\n🎉 URI Security Validation Demo Complete!");
  }
}

/**
 * Main execution function
 */
async function main() {
  const validator = new URISecurityValidator();
  validator.demonstrateSecurityValidation();
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}
