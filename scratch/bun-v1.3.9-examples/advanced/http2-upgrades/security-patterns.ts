#!/usr/bin/env bun
/**
 * Security Patterns for HTTP/2 Connection Upgrades
 * 
 * Demonstrates security considerations including:
 * - TLS configuration
 * - Certificate validation
 * - Rate limiting
 * - Request validation
 * - Security headers
 */

import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import { readFileSync } from "node:fs";

console.log("🔒 Security Patterns for HTTP/2 Upgrades\n");
console.log("=".repeat(70));

// ============================================================================
// Security Configuration
// ============================================================================

interface SecurityConfig {
  tls: {
    minVersion: string;
    maxVersion: string;
    cipherSuites: string[];
    rejectUnauthorized: boolean;
    ca?: string;
    cert: string;
    key: string;
  };
  rateLimiting: {
    enabled: boolean;
    maxRequestsPerMinute: number;
    maxConnectionsPerIP: number;
  };
  requestValidation: {
    maxHeadersSize: number;
    maxHeaderCount: number;
    allowedMethods: string[];
    blockedPaths: string[];
  };
  securityHeaders: Record<string, string>;
}

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
  private requests = new Map<string, number[]>();
  private connections = new Map<string, number>();
  private config: SecurityConfig["rateLimiting"];
  
  constructor(config: SecurityConfig["rateLimiting"]) {
    this.config = config;
    this.startCleanup();
  }
  
  checkRateLimit(ip: string): boolean {
    if (!this.config.enabled) return true;
    
    const now = Date.now();
    const requests = this.requests.get(ip) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = requests.filter(time => now - time < 60000);
    
    if (recentRequests.length >= this.config.maxRequestsPerMinute) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(ip, recentRequests);
    return true;
  }
  
  checkConnectionLimit(ip: string): boolean {
    if (!this.config.enabled) return true;
    
    const count = this.connections.get(ip) || 0;
    if (count >= this.config.maxConnectionsPerIP) {
      return false;
    }
    
    this.connections.set(ip, count + 1);
    return true;
  }
  
  releaseConnection(ip: string): void {
    const count = this.connections.get(ip) || 0;
    if (count > 0) {
      this.connections.set(ip, count - 1);
    }
  }
  
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [ip, requests] of this.requests.entries()) {
        const recent = requests.filter(time => now - time < 60000);
        if (recent.length === 0) {
          this.requests.delete(ip);
        } else {
          this.requests.set(ip, recent);
        }
      }
    }, 60000);
  }
}

// ============================================================================
// Request Validator
// ============================================================================

class RequestValidator {
  private config: SecurityConfig["requestValidation"];
  
  constructor(config: SecurityConfig["requestValidation"]) {
    this.config = config;
  }
  
  validate(headers: Record<string, string | string[]>): {
    valid: boolean;
    error?: string;
  } {
    // Check method
    const method = headers[":method"] as string;
    if (!this.config.allowedMethods.includes(method)) {
      return { valid: false, error: `Method ${method} not allowed` };
    }
    
    // Check path
    const path = headers[":path"] as string;
    for (const blocked of this.config.blockedPaths) {
      if (path.startsWith(blocked)) {
        return { valid: false, error: `Path ${path} is blocked` };
      }
    }
    
    // Check header count
    const headerCount = Object.keys(headers).length;
    if (headerCount > this.config.maxHeaderCount) {
      return { valid: false, error: `Too many headers: ${headerCount}` };
    }
    
    // Check header size
    const headerSize = JSON.stringify(headers).length;
    if (headerSize > this.config.maxHeadersSize) {
      return { valid: false, error: `Headers too large: ${headerSize} bytes` };
    }
    
    return { valid: true };
  }
}

// ============================================================================
// Secure HTTP/2 Proxy Server
// ============================================================================

class SecureHTTP2Proxy {
  private h2Server: ReturnType<typeof createSecureServer>;
  private netServer: ReturnType<typeof createServer>;
  private config: SecurityConfig;
  private rateLimiter: RateLimiter;
  private validator: RequestValidator;
  
  constructor(config: SecurityConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimiting);
    this.validator = new RequestValidator(config.requestValidation);
    
    const key = readFileSync(config.tls.key);
    const cert = readFileSync(config.tls.cert);
    
    const tlsOptions: any = {
      key,
      cert,
      minVersion: config.tls.minVersion,
      maxVersion: config.tls.maxVersion,
      rejectUnauthorized: config.tls.rejectUnauthorized,
    };
    
    if (config.tls.ca) {
      tlsOptions.ca = readFileSync(config.tls.ca);
    }
    
    if (config.tls.cipherSuites.length > 0) {
      tlsOptions.ciphers = config.tls.cipherSuites.join(":");
    }
    
    this.h2Server = createSecureServer(tlsOptions);
    this.setupH2Handlers();
    
    this.netServer = createServer((rawSocket) => {
      const clientIP = rawSocket.remoteAddress || "unknown";
      
      if (!this.rateLimiter.checkConnectionLimit(clientIP)) {
        rawSocket.destroy();
        return;
      }
      
      rawSocket.on("close", () => {
        this.rateLimiter.releaseConnection(clientIP);
      });
      
      this.h2Server.emit("connection", rawSocket);
    });
  }
  
  private setupH2Handlers(): void {
    this.h2Server.on("stream", async (stream, headers) => {
      const clientIP = stream.session?.socket?.remoteAddress || "unknown";
      
      // Rate limiting
      if (!this.rateLimiter.checkRateLimit(clientIP)) {
        stream.respond({
          ":status": 429,
          "retry-after": "60",
        });
        stream.end("Too Many Requests");
        return;
      }
      
      // Request validation
      const validation = this.validator.validate(headers);
      if (!validation.valid) {
        stream.respond({
          ":status": 400,
          "content-type": "text/plain",
        });
        stream.end(validation.error || "Bad Request");
        return;
      }
      
      // Add security headers
      const responseHeaders: Record<string, string> = {
        ":status": "200",
        ...this.config.securityHeaders,
      };
      
      stream.respond(responseHeaders);
      
      const response = JSON.stringify({
        message: "Secure HTTP/2 Proxy",
        timestamp: new Date().toISOString(),
        clientIP,
      });
      
      stream.end(response);
    });
    
    this.h2Server.on("error", (error) => {
      console.error("Security error:", error);
    });
  }
  
  start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.netServer.listen(port, () => {
        console.log(`✅ Secure HTTP/2 Proxy listening on port ${port}`);
        resolve();
      });
    });
  }
  
  stop(): void {
    this.netServer.close();
    this.h2Server.close();
  }
}

// ============================================================================
// Example Security Configuration
// ============================================================================

console.log("\n📝 Example: Secure HTTP/2 Proxy");
console.log("-".repeat(70));

const securityConfig: SecurityConfig = {
  tls: {
    minVersion: "TLSv1.2",
    maxVersion: "TLSv1.3",
    cipherSuites: [
      "TLS_AES_256_GCM_SHA384",
      "TLS_CHACHA20_POLY1305_SHA256",
      "TLS_AES_128_GCM_SHA256",
    ],
    rejectUnauthorized: true,
    cert: "cert.pem",
    key: "key.pem",
  },
  rateLimiting: {
    enabled: true,
    maxRequestsPerMinute: 100,
    maxConnectionsPerIP: 10,
  },
  requestValidation: {
    maxHeadersSize: 8192,
    maxHeaderCount: 50,
    allowedMethods: ["GET", "POST", "PUT", "DELETE"],
    blockedPaths: ["/admin", "/internal"],
  },
  securityHeaders: {
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-xss-protection": "1; mode=block",
    "content-security-policy": "default-src 'self'",
  },
};

console.log("\nSecurity Features:");
console.log("  • TLS 1.2+ only");
console.log("  • Strong cipher suites");
console.log("  • Rate limiting per IP");
console.log("  • Connection limiting");
console.log("  • Request validation");
console.log("  • Security headers");
console.log("  • Path blocking");

console.log("\n✅ Security Patterns Complete!");
console.log("\nBest Practices:");
console.log("  • Use TLS 1.2 or higher");
console.log("  • Enable certificate validation");
console.log("  • Implement rate limiting");
console.log("  • Validate all requests");
console.log("  • Add security headers");
console.log("  • Monitor for attacks");
console.log("  • Log security events");
