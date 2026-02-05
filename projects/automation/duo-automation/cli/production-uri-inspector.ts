#!/usr/bin/env bun

/**
 * DuoPlus CLI v3.0+ - Production URI Inspector
 * Complete CLI tool for advanced URI security inspection
 */

import { Database } from "bun:sqlite";
import { writeFile, readFile } from "fs/promises";

const inspectCustom = Symbol.for("Bun.inspect.custom");

// Enhanced zero-width character detection
const ZERO_WIDTH_CHARS = /[\u00AD\u200B-\u200F\u2028\u2029\u2060-\u206F\uFEFF\uFFF0-\uFFFF]|\p{Cf}/gu;

interface UriInspectionResult {
  uri: string;
  status: "PASS" | "FAIL" | "WARN" | "INFO" | "SKIP";
  category: "SECURITY" | "PERFORMANCE" | "COMPLIANCE" | "FUNCTIONALITY";
  message: string;
  decodedUri?: string;
  zeroWidthAnalysis: {
    has: boolean;
    count: number;
    positions: number[];
    types: string[];
  };
  encodingAnomalies: string[];
  securityRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  displayWidth: number;
  processingTime: number;
  [inspectCustom](): string;
}

interface InspectionConfig {
  verbose: boolean;
  outputFormat: "table" | "json" | "csv";
  outputFile?: string;
  maxResults: number;
  includeDetails: boolean;
}

export class ProductionUriInspector {
  private database: Database;
  private config: InspectionConfig;
  
  constructor(config: Partial<InspectionConfig> = {}) {
    this.database = new Database(':memory:');
    this.config = {
      verbose: false,
      outputFormat: "table",
      maxResults: 1000,
      includeDetails: true,
      ...config
    };
    
    this.setupDatabase();
  }
  
  /**
   * Setup database for inspection tracking
   */
  private setupDatabase(): void {
    this.database.exec(`
      CREATE TABLE inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        uri TEXT NOT NULL,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT,
        decoded_uri TEXT,
        zero_width_count INTEGER DEFAULT 0,
        encoding_anomalies TEXT,
        security_risk TEXT,
        display_width INTEGER,
        processing_time REAL
      );
      
      CREATE TABLE security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspection_id INTEGER,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inspection_id) REFERENCES inspections(id)
      );
      
      CREATE INDEX idx_inspection_status ON inspections(status);
      CREATE INDEX idx_inspection_risk ON inspections(security_risk);
      CREATE INDEX idx_security_severity ON security_events(severity);
    `);
  }
  
  /**
   * Analyze zero-width characters in URI
   */
  private analyzeZeroWidth(str: string) {
    const matches = [...str.matchAll(ZERO_WIDTH_CHARS)];
    return {
      has: matches.length > 0,
      count: matches.length,
      positions: matches.map(m => m.index || 0),
      types: matches.map(m => {
        const char = m[0];
        if (char === '\u200B') return 'Zero-Width Space (U+200B)';
        if (char === '\u200C') return 'Zero-Width Non-Joiner (U+200C)';
        if (char === '\u200D') return 'Zero-Width Joiner (U+200D)';
        if (char === '\uFEFF') return 'Zero-Width No-Break Space (U+FEFF)';
        if (char === '\u00AD') return 'Soft Hyphen (U+00AD)';
        return `Unknown Zero-Width (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`;
      })
    };
  }
  
  /**
   * Detect encoding anomalies
   */
  private detectEncodingAnomalies(raw: string, decoded: string): string[] {
    const anomalies: string[] = [];
    
    // Case 1: Fully encoded but decodes to empty/whitespace
    if (/^%[0-9A-F]{2}/i.test(raw) && !decoded.trim()) {
      anomalies.push("Empty decode from encoded input");
    }
    
    // Case 2: Over-encoded (e.g., %2520 = double-encoded space)
    if (raw.includes('%25')) {
      try {
        const doubleDecoded = decodeURIComponent(raw.replace(/%25/g, '%'));
        if (doubleDecoded !== decoded) {
          anomalies.push("Double encoding detected");
        }
      } catch {
        anomalies.push("Malformed double encoding");
      }
    }
    
    // Case 3: Encoded control chars (e.g., %00, %0A, %0D)
    if (/%[0-7][0-9A-F]/i.test(raw)) {
      try {
        const charCodes = [...decoded].map(c => c.charCodeAt(0));
        if (charCodes.some(c => c < 32)) {
          anomalies.push("Control characters in decoded URI");
        }
      } catch {
        anomalies.push("Invalid control character encoding");
      }
    }
    
    // Case 4: Excessive percent encoding ratio
    const percentRatio = (raw.match(/%/g) || []).length / raw.length;
    if (percentRatio > 0.3) {
      anomalies.push("High percent-encoding ratio");
    }
    
    // Case 5: Mixed encoding patterns
    if (/%[0-9A-F]{2}/i.test(raw) && /[A-Za-z0-9\-._~!$&'()*+,;=:@]/.test(raw)) {
      anomalies.push("Mixed encoding pattern");
    }
    
    // Case 6: Overlong UTF-8 encoding
    if (/%C0%[8-9A-F]|%E0%[8-9A-F]%[8-9A-F]/i.test(raw)) {
      anomalies.push("Overlong UTF-8 encoding");
    }
    
    return anomalies;
  }
  
  /**
   * Calculate security risk level
   */
  private calculateSecurityRisk(
    zeroWidthCount: number,
    anomalies: string[],
    category: string
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (category === "SECURITY") {
      if (anomalies.some(a => a.includes("Double encoding") || a.includes("Control characters"))) {
        return "CRITICAL";
      }
      if (zeroWidthCount > 2 || anomalies.length > 3) {
        return "HIGH";
      }
      if (zeroWidthCount > 0 || anomalies.length > 0) {
        return "MEDIUM";
      }
    }
    
    if (zeroWidthCount > 5) return "HIGH";
    if (zeroWidthCount > 0) return "MEDIUM";
    
    return "LOW";
  }
  
  /**
   * Safe URI decoding
   */
  private safeDecode(uri: string): string | undefined {
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
   * Inspect a single URI
   */
  inspectUri(uri: string): UriInspectionResult {
    const startTime = performance.now();
    
    const decoded = this.safeDecode(uri);
    const zeroWidthAnalysis = this.analyzeZeroWidth(decoded || "");
    const encodingAnomalies = this.detectEncodingAnomalies(uri, decoded || "");
    const displayWidth = Bun.stringWidth(decoded || "");
    const securityRisk = this.calculateSecurityRisk(
      zeroWidthAnalysis.count,
      encodingAnomalies,
      "SECURITY"
    );
    
    const processingTime = performance.now() - startTime;
    
    // Determine status and message
    let status: UriInspectionResult["status"] = "PASS";
    let message = "Valid URI";
    let category: UriInspectionResult["category"] = "FUNCTIONALITY";
    
    if (encodingAnomalies.length > 0 || zeroWidthAnalysis.count > 0) {
      category = "SECURITY";
      if (securityRisk === "CRITICAL" || securityRisk === "HIGH") {
        status = "FAIL";
      } else {
        status = "WARN";
      }
      
      const issues = [];
      if (zeroWidthAnalysis.count > 0) {
        issues.push(`${zeroWidthAnalysis.count} zero-width character(s)`);
      }
      if (encodingAnomalies.length > 0) {
        issues.push(`${encodingAnomalies.length} encoding anomaly(ies)`);
      }
      
      message = `Security issues detected: ${issues.join(", ")}`;
    }
    
    const result: UriInspectionResult = {
      uri,
      status,
      category,
      message,
      decodedUri: decoded,
      zeroWidthAnalysis,
      encodingAnomalies,
      securityRisk,
      displayWidth,
      processingTime,
      [inspectCustom]() {
        const emoji = {
          PASS: "✅",
          FAIL: "❌", 
          WARN: "⚠️",
          INFO: "ℹ️",
          SKIP: "⏭️"
        }[this.status];
        
        const color = {
          PASS: "\x1b[32m",
          FAIL: "\x1b[31m",
          WARN: "\x1b[33m", 
          INFO: "\x1b[36m",
          SKIP: "\x1b[37m"
        }[this.status];
        
        const riskColor = {
          LOW: "\x1b[32m",
          MEDIUM: "\x1b[33m",
          HIGH: "\x1b[31m",
          CRITICAL: "\x1b[91m"
        }[this.securityRisk];
        
        const reset = "\x1b[0m";
        
        const zwMarker = this.zeroWidthAnalysis.has ? ` Ⓩ×${this.zeroWidthAnalysis.count}` : "";
        const anomalyMarker = this.encodingAnomalies.length > 0 ? ` ⚠️×${this.encodingAnomalies.length}` : "";
        const riskMarker = `${riskColor}[${this.securityRisk}]${reset}`;
        
        // Truncate URI for display
        const uriDisplay = Bun.stringWidth(this.uri) > 50 
          ? this.uri.slice(0, 47) + "…" 
          : this.uri;
        
        return `${emoji} ${color}${uriDisplay}${reset} │ ${this.message} ${riskMarker}${zwMarker}${anomalyMarker}`;
      }
    };
    
    // Log to database
    this.logInspection(result);
    
    return result;
  }
  
  /**
   * Log inspection to database
   */
  private logInspection(result: UriInspectionResult): void {
    const stmt = this.database.prepare(`
      INSERT INTO inspections (
        uri, status, category, message, decoded_uri, zero_width_count,
        encoding_anomalies, security_risk, display_width, processing_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const dbResult = stmt.run(
      result.uri,
      result.status,
      result.category,
      result.message,
      result.decodedUri,
      result.zeroWidthAnalysis.count,
      JSON.stringify(result.encodingAnomalies),
      result.securityRisk,
      result.displayWidth,
      result.processingTime
    );
    
    // Log security events
    if (result.category === "SECURITY" && result.status !== "PASS") {
      const eventStmt = this.database.prepare(`
        INSERT INTO security_events (inspection_id, event_type, severity, details)
        VALUES (?, ?, ?, ?)
      `);
      
      eventStmt.run(
        dbResult.lastInsertRowid,
        "security_issue",
        result.securityRisk,
        result.message
      );
    }
  }
  
  /**
   * Inspect multiple URIs
   */
  async inspectUris(uris: string[]): Promise<UriInspectionResult[]> {
    const results: UriInspectionResult[] = [];
    
    for (const uri of uris.slice(0, this.config.maxResults)) {
      const result = this.inspectUri(uri);
      results.push(result);
      
      if (this.config.verbose) {
        console.log(`Inspected: ${uri} -> ${result.status}`);
      }
    }
    
    return results;
  }
  
  /**
   * Export results to file
   */
  async exportResults(results: UriInspectionResult[]): Promise<void> {
    if (!this.config.outputFile) return;
    
    let content: string;
    
    switch (this.config.outputFormat) {
      case "json":
        content = JSON.stringify(results.map(r => ({
          uri: r.uri,
          status: r.status,
          category: r.category,
          message: r.message,
          decodedUri: r.decodedUri,
          zeroWidthAnalysis: r.zeroWidthAnalysis,
          encodingAnomalies: r.encodingAnomalies,
          securityRisk: r.securityRisk,
          displayWidth: r.displayWidth,
          processingTime: r.processingTime
        })), null, 2);
        break;
        
      case "csv":
        const headers = "URI,Status,Category,Message,Decoded URI,Zero-Width Count,Encoding Anomalies,Security Risk,Display Width,Processing Time\n";
        const rows = results.map(r => 
          `"${r.uri}","${r.status}","${r.category}","${r.message}","${r.decodedUri || ""}","${r.zeroWidthAnalysis.count}","${r.encodingAnomalies.join(";")}","${r.securityRisk}","${r.displayWidth}","${r.processingTime}"`
        ).join("\n");
        content = headers + rows;
        break;
        
      default:
        content = results.map(r => r[inspectCustom]()).join("\n");
    }
    
    await writeFile(this.config.outputFile, content);
    console.log(`Results exported to: ${this.config.outputFile}`);
  }
  
  /**
   * Get inspection statistics
   */
  getStatistics(): any {
    const total = this.database.prepare("SELECT COUNT(*) as count FROM inspections").get() as { count: number };
    const byStatus = this.database.prepare("SELECT status, COUNT(*) as count FROM inspections GROUP BY status").all();
    const byRisk = this.database.prepare("SELECT security_risk, COUNT(*) as count FROM inspections GROUP BY security_risk").all();
    const securityEvents = this.database.prepare("SELECT COUNT(*) as count FROM security_events").get() as { count: number };
    
    return {
      totalInspections: total.count,
      byStatus,
      byRisk,
      securityEvents: securityEvents.count
    };
  }
  
  /**
   * Generate comprehensive report
   */
  generateReport(results: UriInspectionResult[]): void {
    console.log("\n📊 Inspection Report Summary");
    console.log("=".repeat(50));
    
    const stats = this.getStatistics();
    console.log(`Total Inspections: ${stats.totalInspections}`);
    console.log(`Security Events: ${stats.securityEvents}`);
    
    console.log("\n📈 Status Distribution:");
    stats.byStatus.forEach((item: any) => {
      const icon = item.status === "PASS" ? "✅" : 
                   item.status === "FAIL" ? "❌" : 
                   item.status === "WARN" ? "⚠️" : "ℹ️";
      console.log(`   ${icon} ${item.status}: ${item.count}`);
    });
    
    console.log("\n🛡️ Risk Distribution:");
    stats.byRisk.forEach((item: any) => {
      const color = item.security_risk === "CRITICAL" ? "\x1b[91m" :
                   item.security_risk === "HIGH" ? "\x1b[31m" :
                   item.security_risk === "MEDIUM" ? "\x1b[33m" : "\x1b[32m";
      console.log(`   ${color}${item.security_risk}\x1b[0m: ${item.count}`);
    });
    
    const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    console.log(`\n⚡ Average Processing Time: ${avgTime.toFixed(2)}ms`);
    
    const criticalIssues = results.filter(r => r.securityRisk === "CRITICAL");
    if (criticalIssues.length > 0) {
      console.log("\n🚨 Critical Issues:");
      criticalIssues.forEach(r => {
        console.log(`   ❌ ${r.uri}`);
        console.log(`      ${r.message}`);
      });
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
🔍 DuoPlus CLI v3.0+ - Production URI Inspector

Usage:
  bun run cli/production-uri-inspector.ts <command> [options]

Commands:
  inspect <uri>              Inspect a single URI
  batch <file>               Inspect URIs from file (one per line)
  demo                       Run demonstration with test cases

Options:
  --verbose                  Enable verbose output
  --output <file>            Export results to file
  --format <json|csv|table>  Output format (default: table)
  --max-results <number>     Maximum results to process (default: 1000)
  --no-details               Hide detailed analysis

Examples:
  bun run cli/production-uri-inspector.ts inspect "https%3A%2F%2Fexample.com"
  bun run cli/production-uri-inspector.ts batch uris.txt --format json --output results.json
  bun run cli/production-uri-inspector.ts demo --verbose
    `);
    return;
  }
  
  const config: Partial<InspectionConfig> = {
    verbose: args.includes("--verbose"),
    includeDetails: !args.includes("--no-details")
  };
  
  // Parse output format
  const formatIndex = args.indexOf("--format");
  if (formatIndex !== -1 && args[formatIndex + 1]) {
    config.outputFormat = args[formatIndex + 1] as any;
  }
  
  // Parse output file
  const outputIndex = args.indexOf("--output");
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    config.outputFile = args[outputIndex + 1];
  }
  
  // Parse max results
  const maxIndex = args.indexOf("--max-results");
  if (maxIndex !== -1 && args[maxIndex + 1]) {
    config.maxResults = parseInt(args[maxIndex + 1]);
  }
  
  const inspector = new ProductionUriInspector(config);
  
  const command = args[0];
  
  try {
    switch (command) {
      case "inspect": {
        const uri = args[1];
        if (!uri) {
          console.error("Error: URI required for inspect command");
          return;
        }
        
        const result = inspector.inspectUri(uri);
        console.log("🔍 URI Inspection Result:");
        console.log(result[inspectCustom]());
        
        if (config.includeDetails) {
          console.log("\n📊 Detailed Analysis:");
          console.log(`   Raw URI: ${result.uri}`);
          console.log(`   Decoded URI: ${result.decodedUri || "N/A"}`);
          console.log(`   Display Width: ${result.displayWidth} characters`);
          console.log(`   Security Risk: ${result.securityRisk}`);
          
          if (result.zeroWidthAnalysis.has) {
            console.log(`   Zero-Width Characters: ${result.zeroWidthAnalysis.count}`);
            result.zeroWidthAnalysis.positions.forEach((pos, i) => {
              console.log(`     ${i + 1}. Position ${pos}: ${result.zeroWidthAnalysis.types[i]}`);
            });
          }
          
          if (result.encodingAnomalies.length > 0) {
            console.log(`   Encoding Anomalies: ${result.encodingAnomalies.join(", ")}`);
          }
        }
        
        break;
      }
      
      case "batch": {
        const file = args[1];
        if (!file) {
          console.error("Error: File required for batch command");
          return;
        }
        
        const content = await readFile(file, "utf-8");
        const uris = content.split("\n").filter(line => line.trim());
        
        console.log(`🔍 Processing ${uris.length} URIs...`);
        const results = await inspector.inspectUris(uris);
        
        console.log("\n📊 Inspection Results:");
        console.log(Bun.inspect.table(results, { colors: true, indent: 2 }));
        
        inspector.generateReport(results);
        await inspector.exportResults(results);
        
        break;
      }
      
      case "demo": {
        const testUris = [
          "https://example.com/api/users",
          "https%3A%2F%2Fex%E2%80%8Bample.com",
          "https://test\u200B\u200C\u200Dexample.com",
          "https://example.com/path%2520to%2520file",
          "https://example.com/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
          "https://example.com/👨‍👩‍👧‍👦/family",
          "https://example.com/%C0%AFpath",
          "https://example.com/path%00%0A%0D"
        ];
        
        console.log("🔍 Running demonstration with test cases...");
        const results = await inspector.inspectUris(testUris);
        
        console.log("\n📊 Demo Results:");
        console.log(Bun.inspect.table(results, { colors: true, indent: 2 }));
        
        inspector.generateReport(results);
        await inspector.exportResults(results);
        
        break;
      }
      
      default:
        console.error(`Error: Unknown command '${command}'`);
        console.log("Use --help for usage information");
    }
  } catch (error) {
    console.error(`Error: ${error}`);
  }
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}
