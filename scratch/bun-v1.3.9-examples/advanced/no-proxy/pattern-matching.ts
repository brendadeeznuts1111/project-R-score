#!/usr/bin/env bun
/**
 * NO_PROXY Pattern Matching Implementation
 * 
 * Demonstrates pattern parser, wildcard matching algorithm,
 * IP range matching, port-specific matching, and performance optimization.
 */

console.log("🔍 NO_PROXY Pattern Matching Implementation\n");
console.log("=".repeat(70));

// ============================================================================
// Pattern Parser
// ============================================================================

interface NO_PROXYPattern {
  hostname?: string;
  domain?: string;
  ip?: string;
  ipRange?: { start: string; end: string };
  port?: number;
  exact: boolean;
}

class NO_PROXYParser {
  /**
   * Parse NO_PROXY environment variable into patterns
   */
  static parse(noProxyValue: string): NO_PROXYPattern[] {
    if (!noProxyValue) return [];
    
    return noProxyValue
      .split(",")
      .map(pattern => pattern.trim())
      .filter(pattern => pattern.length > 0)
      .map(pattern => this.parsePattern(pattern));
  }
  
  private static parsePattern(pattern: string): NO_PROXYPattern {
    // Check for port
    const portMatch = pattern.match(/^(.+):(\d+)$/);
    const port = portMatch ? parseInt(portMatch[2], 10) : undefined;
    const basePattern = portMatch ? portMatch[1] : pattern;
    
    // Check for IP range (CIDR notation)
    if (basePattern.includes("/")) {
      const [ip, prefix] = basePattern.split("/");
      const range = this.cidrToRange(ip, parseInt(prefix, 10));
      return {
        ipRange: range,
        port,
        exact: false,
      };
    }
    
    // Check for IP address
    if (this.isIP(basePattern)) {
      return {
        ip: basePattern,
        port,
        exact: true,
      };
    }
    
    // Check for domain wildcard
    if (basePattern.startsWith(".")) {
      return {
        domain: basePattern.slice(1),
        port,
        exact: false,
      };
    }
    
    // Check for hostname wildcard
    if (basePattern.startsWith("*.")) {
      return {
        domain: basePattern.slice(2),
        port,
        exact: false,
      };
    }
    
    // Exact hostname
    return {
      hostname: basePattern,
      port,
      exact: true,
    };
  }
  
  private static isIP(str: string): boolean {
    // IPv4
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(str)) {
      return str.split(".").every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }
    
    // IPv6 (simplified check)
    if (str.includes(":")) {
      return true;
    }
    
    return false;
  }
  
  private static cidrToRange(ip: string, prefix: number): { start: string; end: string } {
    const parts = ip.split(".").map(p => parseInt(p, 10));
    const mask = 0xFFFFFFFF << (32 - prefix);
    
    const network = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    const networkAddr = network & mask;
    const broadcastAddr = networkAddr | (~mask);
    
    const startParts = [
      (networkAddr >>> 24) & 0xFF,
      (networkAddr >>> 16) & 0xFF,
      (networkAddr >>> 8) & 0xFF,
      networkAddr & 0xFF,
    ];
    
    const endParts = [
      (broadcastAddr >>> 24) & 0xFF,
      (broadcastAddr >>> 16) & 0xFF,
      (broadcastAddr >>> 8) & 0xFF,
      broadcastAddr & 0xFF,
    ];
    
    return {
      start: startParts.join("."),
      end: endParts.join("."),
    };
  }
}

// ============================================================================
// Pattern Matcher
// ============================================================================

export class NO_PROXYMatcher {
  private patterns: NO_PROXYPattern[];
  
  constructor(noProxyValue: string) {
    this.patterns = NO_PROXYParser.parse(noProxyValue);
  }
  
  /**
   * Check if URL should bypass proxy
   */
  shouldBypass(url: string | URL): boolean {
    const urlObj = typeof url === "string" ? new URL(url) : url;
    const hostname = urlObj.hostname;
    const port = urlObj.port ? parseInt(urlObj.port, 10) : undefined;
    
    return this.patterns.some(pattern => this.matches(pattern, hostname, port));
  }
  
  private matches(pattern: NO_PROXYPattern, hostname: string, port?: number): boolean {
    // Port check
    if (pattern.port !== undefined && port !== pattern.port) {
      return false;
    }
    
    // Exact IP match
    if (pattern.ip && pattern.exact) {
      return hostname === pattern.ip;
    }
    
    // IP range match
    if (pattern.ipRange) {
      return this.isIPInRange(hostname, pattern.ipRange.start, pattern.ipRange.end);
    }
    
    // Exact hostname match
    if (pattern.hostname && pattern.exact) {
      return hostname === pattern.hostname || hostname === `${pattern.hostname}.`;
    }
    
    // Domain match (wildcard)
    if (pattern.domain) {
      return hostname === pattern.domain ||
             hostname.endsWith(`.${pattern.domain}`) ||
             hostname.endsWith(`.${pattern.domain}.`);
    }
    
    return false;
  }
  
  private isIPInRange(ip: string, start: string, end: string): boolean {
    if (!NO_PROXYParser["isIP"](ip)) return false;
    
    const ipNum = this.ipToNumber(ip);
    const startNum = this.ipToNumber(start);
    const endNum = this.ipToNumber(end);
    
    return ipNum >= startNum && ipNum <= endNum;
  }
  
  private ipToNumber(ip: string): number {
    const parts = ip.split(".").map(p => parseInt(p, 10));
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  }
}

// ============================================================================
// Performance Optimized Matcher
// ============================================================================

class OptimizedNO_PROXYMatcher {
  private exactHostnames = new Set<string>();
  private exactIPs = new Set<string>();
  private domains = new Set<string>();
  private ipRanges: Array<{ start: number; end: number }> = [];
  private portPatterns = new Map<number, NO_PROXYPattern[]>();
  
  constructor(noProxyValue: string) {
    const patterns = NO_PROXYParser.parse(noProxyValue);
    
    for (const pattern of patterns) {
      if (pattern.port !== undefined) {
        if (!this.portPatterns.has(pattern.port)) {
          this.portPatterns.set(pattern.port, []);
        }
        this.portPatterns.get(pattern.port)!.push(pattern);
        continue;
      }
      
      if (pattern.hostname && pattern.exact) {
        this.exactHostnames.add(pattern.hostname);
      } else if (pattern.ip && pattern.exact) {
        this.exactIPs.add(pattern.ip);
      } else if (pattern.domain) {
        this.domains.add(pattern.domain);
      } else if (pattern.ipRange) {
        this.ipRanges.push({
          start: this.ipToNumber(pattern.ipRange.start),
          end: this.ipToNumber(pattern.ipRange.end),
        });
      }
    }
  }
  
  shouldBypass(url: string | URL): boolean {
    const urlObj = typeof url === "string" ? new URL(url) : url;
    const hostname = urlObj.hostname;
    const port = urlObj.port ? parseInt(urlObj.port, 10) : undefined;
    
    // Fast path: exact hostname match
    if (this.exactHostnames.has(hostname)) {
      return true;
    }
    
    // Fast path: exact IP match
    if (this.exactIPs.has(hostname)) {
      return true;
    }
    
    // Check port-specific patterns
    if (port !== undefined) {
      const portPatterns = this.portPatterns.get(port);
      if (portPatterns) {
        for (const pattern of portPatterns) {
          if (this.matchesPattern(pattern, hostname)) {
            return true;
          }
        }
      }
    }
    
    // Check domain patterns
    for (const domain of this.domains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return true;
      }
    }
    
    // Check IP ranges
    if (NO_PROXYParser["isIP"](hostname)) {
      const ipNum = this.ipToNumber(hostname);
      for (const range of this.ipRanges) {
        if (ipNum >= range.start && ipNum <= range.end) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  private matchesPattern(pattern: NO_PROXYPattern, hostname: string): boolean {
    if (pattern.hostname && pattern.exact) {
      return hostname === pattern.hostname;
    }
    if (pattern.ip && pattern.exact) {
      return hostname === pattern.ip;
    }
    if (pattern.domain) {
      return hostname === pattern.domain || hostname.endsWith(`.${pattern.domain}`);
    }
    return false;
  }
  
  private ipToNumber(ip: string): number {
    const parts = ip.split(".").map(p => parseInt(p, 10));
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  }
}

// ============================================================================
// Example Usage
// ============================================================================

console.log("\n📝 Example: Pattern Matching");
console.log("-".repeat(70));

const noProxyValue = "localhost,127.0.0.1,.local,*.internal,10.0.0.0/8,192.168.1.1:8080";

console.log(`\nNO_PROXY=${noProxyValue}`);
console.log("\nParsed patterns:");

const patterns = NO_PROXYParser.parse(noProxyValue);
patterns.forEach((pattern, i) => {
  console.log(`\n  Pattern ${i + 1}:`);
  if (pattern.hostname) console.log(`    Hostname: ${pattern.hostname}`);
  if (pattern.domain) console.log(`    Domain: ${pattern.domain}`);
  if (pattern.ip) console.log(`    IP: ${pattern.ip}`);
  if (pattern.ipRange) console.log(`    IP Range: ${pattern.ipRange.start} - ${pattern.ipRange.end}`);
  if (pattern.port) console.log(`    Port: ${pattern.port}`);
  console.log(`    Exact: ${pattern.exact}`);
});

console.log("\n\nTesting URLs:");
const matcher = new NO_PROXYMatcher(noProxyValue);

const testUrls = [
  "http://localhost:3000",
  "http://127.0.0.1:8080",
  "http://api.local:3000",
  "http://service.internal:443",
  "http://10.0.0.5:8080",
  "http://192.168.1.1:8080",
  "http://example.com:3000",
  "http://192.168.1.1:9090", // Different port
];

testUrls.forEach(url => {
  const shouldBypass = matcher.shouldBypass(url);
  console.log(`  ${shouldBypass ? "✅" : "❌"} ${url.padEnd(35)} → ${shouldBypass ? "BYPASS" : "PROXY"}`);
});

console.log("\n✅ Pattern Matching Implementation Complete!");
console.log("\nSupported Patterns:");
console.log("  • Exact hostname: localhost");
console.log("  • Exact IP: 127.0.0.1");
console.log("  • Domain wildcard: .local, *.internal");
console.log("  • IP range (CIDR): 10.0.0.0/8");
console.log("  • Port-specific: localhost:3000");
console.log("  • Combinations: 192.168.1.1:8080");
