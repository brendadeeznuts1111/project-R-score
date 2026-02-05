#!/usr/bin/env bun

/**
 * DuoPlus CLI v3.0+ - Advanced Bun Inspection System
 * Leveraging Bun.inspect.table() and Symbol.for("Bun.inspect.custom") for rich terminal output
 */

import { Database } from "bun:sqlite";

const inspectCustom = Symbol.for("Bun.inspect.custom");

interface EnhancedTableRow {
  name: string;
  status: "PASS" | "FAIL" | "WARN" | "INFO" | "SKIP";
  message: string;
  category: string;
  width: number;
  hasZW: boolean;
  [inspectCustom](): string;
}

interface SecurityCheck {
  id: string;
  name: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  result: "PASS" | "FAIL" | "WARN" | "SKIP";
  details: string;
  emoji: string;
  timestamp: Date;
  [inspectCustom](): string;
}

interface SystemMetric {
  component: string;
  metric: string;
  value: number;
  unit: string;
  status: "OPTIMAL" | "WARNING" | "CRITICAL";
  trend: "up" | "down" | "stable";
  [inspectCustom](): string;
}

export class BunInspectionCLI {
  
  /**
   * Create enhanced security checks with custom inspection
   */
  createSecurityChecks(): SecurityCheck[] {
    return [
      {
        id: "tls-001",
        name: "TLS Certificate Validation",
        severity: "CRITICAL",
        result: "PASS",
        details: "Valid certificate chain with proper expiration",
        emoji: "🔒",
        timestamp: new Date(),
        [inspectCustom]() {
          const color = this.result === "PASS" ? "\x1b[32m" : 
                        this.result === "FAIL" ? "\x1b[31m" : 
                        this.result === "WARN" ? "\x1b[33m" : "\x1b[36m";
          const severityColor = this.severity === "CRITICAL" ? "\x1b[91m" :
                               this.severity === "HIGH" ? "\x1b[31m" :
                               this.severity === "MEDIUM" ? "\x1b[33m" : "\x1b[36m";
          return `${this.emoji} ${color}${this.name}\x1b[0m │ ${severityColor}${this.severity}\x1b[0m │ ${this.details}`;
        }
      },
      {
        id: "cors-002",
        name: "CORS Policy Configuration",
        severity: "MEDIUM",
        result: "WARN",
        details: "Wildcard origin allowed in development mode",
        emoji: "🌐",
        timestamp: new Date(),
        [inspectCustom]() {
          const color = this.result === "PASS" ? "\x1b[32m" : 
                        this.result === "FAIL" ? "\x1b[31m" : 
                        this.result === "WARN" ? "\x1b[33m" : "\x1b[36m";
          const severityColor = this.severity === "CRITICAL" ? "\x1b[91m" :
                               this.severity === "HIGH" ? "\x1b[31m" :
                               this.severity === "MEDIUM" ? "\x1b[33m" : "\x1b[36m";
          return `${this.emoji} ${color}${this.name}\x1b[0m │ ${severityColor}${this.severity}\x1b[0m │ ${this.details}`;
        }
      },
      {
        id: "auth-003",
        name: "Authentication Rate Limiting",
        severity: "HIGH",
        result: "PASS",
        details: "Rate limiting active: 100 requests/minute per IP",
        emoji: "🛡️",
        timestamp: new Date(),
        [inspectCustom]() {
          const color = this.result === "PASS" ? "\x1b[32m" : 
                        this.result === "FAIL" ? "\x1b[31m" : 
                        this.result === "WARN" ? "\x1b[33m" : "\x1b[36m";
          const severityColor = this.severity === "CRITICAL" ? "\x1b[91m" :
                               this.severity === "HIGH" ? "\x1b[31m" :
                               this.severity === "MEDIUM" ? "\x1b[33m" : "\x1b[36m";
          return `${this.emoji} ${color}${this.name}\x1b[0m │ ${severityColor}${this.severity}\x1b[0m │ ${this.details}`;
        }
      },
      {
        id: "db-004",
        name: "Database Connection Security",
        severity: "HIGH",
        result: "PASS",
        details: "SSL enabled with certificate verification",
        emoji: "🗄️",
        timestamp: new Date(),
        [inspectCustom]() {
          const color = this.result === "PASS" ? "\x1b[32m" : 
                        this.result === "FAIL" ? "\x1b[31m" : 
                        this.result === "WARN" ? "\x1b[33m" : "\x1b[36m";
          const severityColor = this.severity === "CRITICAL" ? "\x1b[91m" :
                               this.severity === "HIGH" ? "\x1b[31m" :
                               this.severity === "MEDIUM" ? "\x1b[33m" : "\x1b[36m";
          return `${this.emoji} ${color}${this.name}\x1b[0m │ ${severityColor}${this.severity}\x1b[0m │ ${this.details}`;
        }
      },
      {
        id: "api-005",
        name: "API Key Rotation",
        severity: "MEDIUM",
        result: "INFO",
        details: "Keys rotated within last 30 days",
        emoji: "🔑",
        timestamp: new Date(),
        [inspectCustom]() {
          const color = this.result === "PASS" ? "\x1b[32m" : 
                        this.result === "FAIL" ? "\x1b[31m" : 
                        this.result === "WARN" ? "\x1b[33m" : "\x1b[36m";
          const severityColor = this.severity === "CRITICAL" ? "\x1b[91m" :
                               this.severity === "HIGH" ? "\x1b[31m" :
                               this.severity === "MEDIUM" ? "\x1b[33m" : "\x1b[36m";
          return `${this.emoji} ${color}${this.name}\x1b[0m │ ${severityColor}${this.severity}\x1b[0m │ ${this.details}`;
        }
      }
    ];
  }
  
  /**
   * Create system metrics with custom inspection
   */
  createSystemMetrics(): SystemMetric[] {
    return [
      {
        component: "Database",
        metric: "Connection Pool",
        value: 85,
        unit: "%",
        status: "OPTIMAL",
        trend: "stable",
        [inspectCustom]() {
          const color = this.status === "OPTIMAL" ? "\x1b[32m" : 
                        this.status === "WARNING" ? "\x1b[33m" : "\x1b[31m";
          const trendIcon = this.trend === "up" ? "📈" : 
                           this.trend === "down" ? "📉" : "➡️";
          return `${trendIcon} ${color}${this.component}\x1b[0m │ ${this.metric} │ ${this.value}${this.unit} │ ${this.status}`;
        }
      },
      {
        component: "API Server",
        metric: "Response Time",
        value: 120,
        unit: "ms",
        status: "OPTIMAL",
        trend: "down",
        [inspectCustom]() {
          const color = this.status === "OPTIMAL" ? "\x1b[32m" : 
                        this.status === "WARNING" ? "\x1b[33m" : "\x1b[31m";
          const trendIcon = this.trend === "up" ? "📈" : 
                           this.trend === "down" ? "📉" : "➡️";
          return `${trendIcon} ${color}${this.component}\x1b[0m │ ${this.metric} │ ${this.value}${this.unit} │ ${this.status}`;
        }
      },
      {
        component: "Memory",
        metric: "Usage",
        value: 67,
        unit: "%",
        status: "OPTIMAL",
        trend: "up",
        [inspectCustom]() {
          const color = this.status === "OPTIMAL" ? "\x1b[32m" : 
                        this.status === "WARNING" ? "\x1b[33m" : "\x1b[31m";
          const trendIcon = this.trend === "up" ? "📈" : 
                           this.trend === "down" ? "📉" : "➡️";
          return `${trendIcon} ${color}${this.component}\x1b[0m │ ${this.metric} │ ${this.value}${this.unit} │ ${this.status}`;
        }
      },
      {
        component: "Cache",
        metric: "Hit Rate",
        value: 94,
        unit: "%",
        status: "OPTIMAL",
        trend: "stable",
        [inspectCustom]() {
          const color = this.status === "OPTIMAL" ? "\x1b[32m" : 
                        this.status === "WARNING" ? "\x1b[33m" : "\x1b[31m";
          const trendIcon = this.trend === "up" ? "📈" : 
                           this.trend === "down" ? "📉" : "➡️";
          return `${trendIcon} ${color}${this.component}\x1b[0m │ ${this.metric} │ ${this.value}${this.unit} │ ${this.status}`;
        }
      }
    ];
  }
  
  /**
   * Create enhanced table rows with Unicode width awareness
   */
  createEnhancedRows(): EnhancedTableRow[] {
    const testStrings = [
      "👨‍👩‍👧‍👦", // Family ZWJ emoji (display width: 2, actual: 11)
      "🔒🔐🔑",   // Multiple emojis
      "Café",      // Accented characters
      "Test\u200B", // Zero-width space
      "🚀 Rocket", // Emoji + text
      "正常",       // Chinese characters
    ];
    
    return testStrings.map((text, index) => ({
      name: `Test Row ${index + 1}`,
      status: ["PASS", "FAIL", "WARN", "INFO"][index % 4] as any,
      message: `Testing: ${text}`,
      category: "Unicode",
      width: Bun.stringWidth(text),
      hasZW: this.hasZeroWidth(text),
      [inspectCustom]() {
        const color = this.status === "PASS" ? "\x1b[32m" : 
                      this.status === "FAIL" ? "\x1b[31m" : 
                      this.status === "WARN" ? "\x1b[33m" : "\x1b[36m";
        const zwIndicator = this.hasZW ? " Ⓩ" : "";
        return `${color}${this.name}\x1b[0m │ ${this.message} (w:${this.width})${zwIndicator}`;
      }
    }));
  }
  
  /**
   * Check for zero-width characters
   */
  private hasZeroWidth(text: string): boolean {
    return /[\u200B-\u200F\uFEFF]/.test(text);
  }
  
  /**
   * Generate visual progress bar
   */
  generateProgressBar(percentage: number, width: number = 40): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `${bar} ${percentage}%`;
  }
  
  /**
   * Generate category breakdown
   */
  generateCategoryBreakdown(checks: SecurityCheck[]): void {
    const categories = {
      "PASS": { count: 0, icon: "✅", color: "\x1b[32m" },
      "FAIL": { count: 0, icon: "❌", color: "\x1b[31m" },
      "WARN": { count: 0, icon: "⚠️", color: "\x1b[33m" },
      "INFO": { count: 0, icon: "ℹ️", color: "\x1b[36m" },
      "SKIP": { count: 0, icon: "⏭️", color: "\x1b[36m" }
    };
    
    checks.forEach(check => {
      if (categories[check.result]) {
        categories[check.result].count++;
      }
    });
    
    console.log("\n📊 Category Breakdown:");
    Object.entries(categories).forEach(([status, data]) => {
      if (data.count > 0) {
        const bar = "▪".repeat(data.count);
        console.log(`${data.icon} ${data.color}${status.padEnd(5)}\x1b[0m ${data.count} ${bar}`);
      }
    });
  }
  
  /**
   * Run comprehensive inspection demonstration
   */
  async runInspectionDemo(): Promise<void> {
    console.log("🔍 DuoPlus CLI v3.0+ - Advanced Bun Inspection Demo");
    console.log("=".repeat(70));
    
    // 1. Security Checks Table
    console.log("\n🛡️  Security Checks:");
    const securityChecks = this.createSecurityChecks();
    console.log(Bun.inspect.table(securityChecks, {
      colors: true,
      indent: 2
    }));
    
    // Generate security summary
    const passRate = (securityChecks.filter(c => c.result === "PASS").length / securityChecks.length) * 100;
    console.log(`\n📈 Security Pass Rate: ${passRate.toFixed(1)}%`);
    console.log(this.generateProgressBar(passRate));
    
    this.generateCategoryBreakdown(securityChecks);
    
    // 2. System Metrics Table
    console.log("\n⚡ System Metrics:");
    const systemMetrics = this.createSystemMetrics();
    console.log(Bun.inspect.table(systemMetrics, {
      colors: true,
      indent: 2
    }));
    
    // 3. Unicode Width-Aware Table
    console.log("\n🌐 Unicode Width Tests:");
    const enhancedRows = this.createEnhancedRows();
    console.log(Bun.inspect.table(enhancedRows, {
      columns: ["name", "status", "message", "width", "hasZW"],
      colors: true,
      indent: 2
    }));
    
    // 4. Custom inspection examples
    console.log("\n🎨 Custom Inspection Examples:");
    
    const customObjects = [
      {
        title: "Database Status",
        status: "CONNECTED",
        connections: 15,
        maxConnections: 100,
        [inspectCustom]() {
          const percentage = (this.connections / this.maxConnections) * 100;
          const color = percentage > 80 ? "\x1b[31m" : percentage > 60 ? "\x1b[33m" : "\x1b[32m";
          return `🗄️  ${this.title}: ${color}${this.status}\x1b[0m (${this.connections}/${this.maxConnections})`;
        }
      },
      {
        title: "API Health",
        status: "HEALTHY",
        uptime: "99.9%",
        responseTime: 120,
        [inspectCustom]() {
          const color = this.status === "HEALTHY" ? "\x1b[32m" : "\x1b[31m";
          return `🚀 ${this.title}: ${color}${this.status}\x1b[0m (${this.uptime}, ${this.responseTime}ms)`;
        }
      },
      {
        title: "Security Score",
        score: 87,
        grade: "A",
        [inspectCustom]() {
          const color = this.score >= 90 ? "\x1b[32m" : this.score >= 70 ? "\x1b[33m" : "\x1b[31m";
          return `🛡️  ${this.title}: ${color}${this.score}/100 (${this.grade})\x1b[0m`;
        }
      }
    ];
    
    customObjects.forEach(obj => {
      console.log(`  ${obj[inspectCustom]()}`);
    });
    
    // 5. Advanced table with nested objects
    console.log("\n📋 Advanced Nested Table:");
    const nestedData = [
      {
        service: "Authentication",
        endpoint: "/api/auth",
        methods: ["GET", "POST"],
        security: {
          enabled: true,
          level: "OAuth2",
          expires: "1h"
        },
        [inspectCustom]() {
          return `🔐 ${this.service} (${this.methods.join("/")})`;
        }
      },
      {
        service: "Payments",
        endpoint: "/api/payments",
        methods: ["GET", "POST", "PUT"],
        security: {
          enabled: true,
          level: "JWT+RSA",
          expires: "15m"
        },
        [inspectCustom]() {
          return `💳 ${this.service} (${this.methods.join("/")})`;
        }
      },
      {
        service: "Notifications",
        endpoint: "/api/notifications",
        methods: ["GET", "POST", "DELETE"],
        security: {
          enabled: false,
          level: "None",
          expires: "N/A"
        },
        [inspectCustom]() {
          return `📬 ${this.service} (${this.methods.join("/")})`;
        }
      }
    ];
    
    console.log(Bun.inspect.table(nestedData, {
      columns: ["service", "endpoint", "methods"],
      colors: true,
      indent: 2
    }));
    
    console.log("\n🎉 Advanced Bun Inspection Demo Complete!");
    console.log("\n💡 Key Features Demonstrated:");
    console.log("   🔧 Symbol.for(\"Bun.inspect.custom\") for per-object formatting");
    console.log("   📊 Bun.inspect.table() with structured tabular output");
    console.log("   🌐 Bun.stringWidth() for Unicode-safe layout");
    console.log("   🎨 ANSI color codes for visual enhancement");
    console.log("   📱 Emoji semantics and zero-width character detection");
    console.log("   📈 Progress bars and category breakdowns");
    console.log("   🗂️ Nested object inspection with custom formatting");
  }
}

/**
 * Main execution function
 */
async function main() {
  const cli = new BunInspectionCLI();
  await cli.runInspectionDemo();
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}
