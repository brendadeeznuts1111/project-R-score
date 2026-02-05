#!/usr/bin/env bun

/**
 * DuoPlus CLI v3.0+ - Advanced URI Inspection System
 * Refactored with Bun's improved stringWidth and Unicode awareness
 * Enhanced zero-width detection and encoding anomaly detection
 */

import { Database } from "bun:sqlite";

const inspectCustom = Symbol.for("Bun.inspect.custom");

// Enhanced zero-width character detection with comprehensive Unicode support
const ZERO_WIDTH_CHARS = /[\u00AD\u200B-\u200F\u2028\u2029\u2060-\u206F\uFEFF\uFFF0-\uFFFF]|\p{Cf}/gu;

interface UriInspectionRow {
  longName: string;
  rawUriEncoded: string;
  status: "PASS" | "FAIL" | "WARN" | "INFO" | "SKIP";
  message: string;
  category: "SECURITY" | "PERFORMANCE" | "COMPLIANCE" | "FUNCTIONALITY";
  decodedUri?: string;
  encodingAnomalies: string[];
  zeroWidthCount: number;
  displayWidth: number;
  [inspectCustom](): string;
}

interface InspectionMetrics {
  totalInspections: number;
  securityIssues: number;
  encodingAnomalies: number;
  zeroWidthDetections: number;
  averageProcessingTime: number;
}

export class AdvancedUriInspector {
  private database: Database;
  private metrics: InspectionMetrics;
  
  constructor() {
    this.database = new Database(':memory:');
    this.metrics = {
      totalInspections: 0,
      securityIssues: 0,
      encodingAnomalies: 0,
      zeroWidthDetections: 0,
      averageProcessingTime: 0
    };
    
    this.setupDatabase();
  }
  
  /**
   * Setup database for inspection tracking
   */
  private setupDatabase(): void {
    this.database.exec(`
      CREATE TABLE uri_inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        raw_uri TEXT NOT NULL,
        decoded_uri TEXT,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        security_issues TEXT,
        encoding_anomalies TEXT,
        zero_width_count INTEGER DEFAULT 0,
        display_width INTEGER DEFAULT 0,
        processing_time REAL
      );
      
      CREATE TABLE security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspection_id INTEGER,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inspection_id) REFERENCES uri_inspections(id)
      );
      
      CREATE INDEX idx_inspection_status ON uri_inspections(status);
      CREATE INDEX idx_inspection_category ON uri_inspections(category);
      CREATE INDEX idx_security_severity ON security_events(severity);
    `);
  }
  
  /**
   * Enhanced zero-width character detection with Unicode awareness
   */
  hasZeroWidthChars(str: string): { has: boolean; count: number; positions: number[] } {
    const matches = [...str.matchAll(ZERO_WIDTH_CHARS)];
    return {
      has: matches.length > 0,
      count: matches.length,
      positions: matches.map(m => m.index || 0)
    };
  }
  
  /**
   * Suspicious URI encoding heuristics (improved)
   */
  isSuspiciousEncoding(raw: string, decoded: string): { suspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // Case 1: Fully encoded but decodes to empty/whitespace
    if (/^%[0-9A-F]{2}/i.test(raw) && !decoded.trim()) {
      reasons.push("Empty decode from encoded input");
    }
    
    // Case 2: Over-encoded (e.g., %2520 = double-encoded space)
    if (raw.includes('%25')) {
      try {
        const doubleDecoded = decodeURIComponent(raw.replace(/%25/g, '%'));
        if (doubleDecoded !== decoded) {
          reasons.push("Double encoding detected");
        }
      } catch {
        reasons.push("Malformed double encoding");
      }
    }
    
    // Case 3: Encoded control chars (e.g., %00, %0A, %0D)
    if (/%[0-7][0-9A-F]/i.test(raw)) {
      try {
        const charCodes = [...decoded].map(c => c.charCodeAt(0));
        if (charCodes.some(c => c < 32)) {
          reasons.push("Control characters in decoded URI");
        }
      } catch {
        reasons.push("Invalid control character encoding");
      }
    }
    
    // Case 4: Excessive percent encoding ratio
    const percentRatio = (raw.match(/%/g) || []).length / raw.length;
    if (percentRatio > 0.3) {
      reasons.push("High percent-encoding ratio");
    }
    
    // Case 5: Mixed encoding patterns
    if (/%[0-9A-F]{2}/i.test(raw) && /[A-Za-z0-9\-._~!$&'()*+,;=:@]/.test(raw)) {
      reasons.push("Mixed encoding pattern");
    }
    
    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }
  
  /**
   * Safe URI decoding with comprehensive error handling
   */
  safeDecode(uri: string): string | undefined {
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
   * Accurate display width calculation using Bun's stringWidth
   */
  calculateDisplayWidth(str: string): number {
    return Bun.stringWidth(str);
  }
  
  /**
   * Unicode-safe truncation by display width
   */
  truncateByWidth(str: string, max: number): string {
    let acc = "";
    for (const char of str) {
      if (Bun.stringWidth(acc + char) > max) break;
      acc += char;
    }
    return acc;
  }
  
  /**
   * Render aligned row with accurate width calculation
   */
  renderAlignedRow(label: string, value: string, maxWidth: number = 50): string {
    const labelW = Bun.stringWidth(label);
    const padding = Math.max(0, 20 - labelW);
    const truncated = Bun.stringWidth(value) > maxWidth
      ? this.truncateByWidth(value, maxWidth - 3) + "…"
      : value;
    return `${label}${" ".repeat(padding)}: ${truncated}`;
  }
  
  /**
   * Create enhanced URI inspection row
   */
  createInspectionRow(
    name: string,
    rawUri: string,
    status: UriInspectionRow["status"],
    message: string,
    category: UriInspectionRow["category"]
  ): UriInspectionRow {
    const decoded = this.safeDecode(rawUri);
    const zeroWidthInfo = this.hasZeroWidthChars(decoded || "");
    const encodingCheck = this.isSuspiciousEncoding(rawUri, decoded || "");
    
    return {
      longName: name,
      rawUriEncoded: rawUri,
      status,
      message,
      category,
      decodedUri: decoded,
      encodingAnomalies: encodingCheck.reasons,
      zeroWidthCount: zeroWidthInfo.count,
      displayWidth: this.calculateDisplayWidth(decoded || ""),
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
        
        const reset = "\x1b[0m";
        
        let msg = this.message;
        
        // Add zero-width marker
        if (zeroWidthInfo.has) {
          msg += ` Ⓩ×${zeroWidthInfo.count}`;
        }
        
        // Add suspicious encoding marker
        if (encodingCheck.suspicious) {
          msg += " ⚠️";
        }
        
        // Truncate name for display
        const nameDisplay = Bun.stringWidth(this.longName) > 45
          ? this.truncateByWidth(this.longName, 42) + "…"
          : this.longName;
        
        // Truncate decoded URI for display
        const decodedDisplay = this.decodedUri 
          ? this.truncateByWidth(this.decodedUri, 30)
          : "N/A";
        
        return `${emoji} ${color}${nameDisplay}${reset} │ ${decodedDisplay} │ ${msg}`;
      }
    };
  }
  
  /**
   * Run comprehensive URI inspection demonstration
   */
  async runInspectionDemo(): Promise<void> {
    console.log("🔍 DuoPlus CLI v3.0+ - Advanced URI Inspection System");
    console.log("=".repeat(80));
    console.log("Enhanced with Bun's improved stringWidth and Unicode awareness");
    console.log("");
    
    // Create test cases with various Unicode and encoding scenarios
    const testCases: UriInspectionRow[] = [
      // Standard cases
      this.createInspectionRow(
        "Standard HTTPS URL",
        "https://duoplus.family/api/users",
        "PASS",
        "Valid HTTPS URL",
        "FUNCTIONALITY"
      ),
      
      // Zero-width character cases
      this.createInspectionRow(
        "Zero-width in domain",
        "https%3A%2F%2Fex%E2%80%8Bample.com%2Fcallback",
        "FAIL",
        "Zero-width character detected in domain",
        "SECURITY"
      ),
      
      this.createInspectionRow(
        "Multiple zero-width characters",
        "https://test\u200B\u200C\u200Dexample.com/path",
        "WARN",
        "Multiple zero-width characters detected",
        "SECURITY"
      ),
      
      // Encoding anomaly cases
      this.createInspectionRow(
        "Double-encoded space",
        "https://example.com/path%2520to%2520file",
        "FAIL",
        "Double encoding detected",
        "SECURITY"
      ),
      
      this.createInspectionRow(
        "Control character encoding",
        "https://example.com/path%00%0A%0D",
        "FAIL",
        "Control characters in decoded URI",
        "SECURITY"
      ),
      
      this.createInspectionRow(
        "High percent-encoding ratio",
        "%41%42%43%44%45%46%47%48%49%4A%4B%4C%4D%4E%4F%50%51%52%53%54%55%56%57%58%59%5A",
        "WARN",
        "High percent-encoding ratio",
        "SECURITY"
      ),
      
      // Complex Unicode cases
      this.createInspectionRow(
        "Emoji sequence test",
        "https://example.com/👨‍👩‍👧‍👦/family",
        "PASS",
        "Complex emoji sequence",
        "FUNCTIONALITY"
      ),
      
      this.createInspectionRow(
        "Regional indicator flags",
        "https://example.com/🇺🇸/🇨🇦/🇲🇽",
        "PASS",
        "Regional indicator flags",
        "FUNCTIONALITY"
      ),
      
      this.createInspectionRow(
        "Mixed script content",
        "https://example.com/测试/العربية/עברית",
        "PASS",
        "Multi-script URL",
        "FUNCTIONALITY"
      ),
      
      // Security edge cases
      this.createInspectionRow(
        "Mixed encoding pattern",
        "https://example.com/path%20to/file%2Fresource",
        "WARN",
        "Mixed encoding pattern",
        "SECURITY"
      ),
      
      this.createInspectionRow(
        "Overlong UTF-8 encoding",
        "https://example.com/%C0%AFpath",
        "FAIL",
        "Overlong UTF-8 encoding",
        "SECURITY"
      ),
      
      this.createInspectionRow(
        "Script injection attempt",
        "https://example.com/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
        "FAIL",
        "Script injection detected",
        "SECURITY"
      )
    ];
    
    // Display inspection results
    console.log("🧪 URI Inspection Results:");
    console.log("");
    
    console.log(Bun.inspect.table(testCases, {
      colors: true,
      indent: 2
    }));
    
    // Display detailed analysis
    console.log("");
    console.log("📊 Detailed Analysis:");
    console.log("");
    
    testCases.forEach((row, index) => {
      const startTime = performance.now();
      
      console.log(`${index + 1}. ${row.longName}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Category: ${row.category}`);
      console.log(`   Raw URI: ${row.rawUriEncoded}`);
      console.log(`   Decoded URI: ${row.decodedUri || "N/A"}`);
      console.log(`   Display Width: ${row.displayWidth} characters`);
      
      if (row.zeroWidthCount > 0) {
        console.log(`   Zero-Width Characters: ${row.zeroWidthCount} detected Ⓩ`);
      }
      
      if (row.encodingAnomalies.length > 0) {
        console.log(`   Encoding Anomalies: ${row.encodingAnomalies.join(", ")} ⚠️`);
      }
      
      const processingTime = performance.now() - startTime;
      console.log(`   Processing Time: ${processingTime.toFixed(2)}ms`);
      console.log("");
      
      // Update metrics
      this.updateMetrics(row, processingTime);
      
      // Log to database
      this.logInspection(row, processingTime);
    });
    
    // Display metrics
    this.displayMetrics();
    
    // Display width demonstration
    this.demonstrateWidthCapabilities();
    
    console.log("🎉 Advanced URI Inspection Demo Complete!");
  }
  
  /**
   * Update inspection metrics
   */
  private updateMetrics(row: UriInspectionRow, processingTime: number): void {
    this.metrics.totalInspections++;
    
    if (row.category === "SECURITY" && row.status !== "PASS") {
      this.metrics.securityIssues++;
    }
    
    if (row.encodingAnomalies.length > 0) {
      this.metrics.encodingAnomalies++;
    }
    
    if (row.zeroWidthCount > 0) {
      this.metrics.zeroWidthDetections++;
    }
    
    // Update average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalInspections - 1) + processingTime) 
      / this.metrics.totalInspections;
  }
  
  /**
   * Log inspection to database
   */
  private logInspection(row: UriInspectionRow, processingTime: number): void {
    const stmt = this.database.prepare(`
      INSERT INTO uri_inspections (
        raw_uri, decoded_uri, status, category, security_issues,
        encoding_anomalies, zero_width_count, display_width, processing_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      row.rawUriEncoded,
      row.decodedUri,
      row.status,
      row.category,
      JSON.stringify(row.encodingAnomalies),
      JSON.stringify(row.encodingAnomalies),
      row.zeroWidthCount,
      row.displayWidth,
      processingTime
    );
    
    // Log security events
    if (row.category === "SECURITY" && row.status !== "PASS") {
      const eventStmt = this.database.prepare(`
        INSERT INTO security_events (inspection_id, event_type, severity, description)
        VALUES (?, ?, ?, ?)
      `);
      
      eventStmt.run(
        result.lastInsertRowid,
        "security_issue",
        row.status === "FAIL" ? "HIGH" : "MEDIUM",
        row.message
      );
    }
  }
  
  /**
   * Display inspection metrics
   */
  private displayMetrics(): void {
    console.log("📈 Inspection Metrics:");
    console.log("");
    console.log(`   Total Inspections: ${this.metrics.totalInspections}`);
    console.log(`   Security Issues: ${this.metrics.securityIssues}`);
    console.log(`   Encoding Anomalies: ${this.metrics.encodingAnomalies}`);
    console.log(`   Zero-Width Detections: ${this.metrics.zeroWidthDetections}`);
    console.log(`   Average Processing Time: ${this.metrics.averageProcessingTime.toFixed(2)}ms`);
    console.log("");
  }
  
  /**
   * Demonstrate width capabilities
   */
  private demonstrateWidthCapabilities(): void {
    console.log("📏 Unicode Width Demonstration:");
    console.log("");
    
    const testStrings = [
      "👨‍👩‍👧‍👦", // Family emoji (width: 2)
      "🇺🇸🇨🇦🇲🇽", // Flag sequence (width: 6)
      "测试", // Chinese characters (width: 4)
      "العربية", // Arabic text (width: 6)
      "\u200B\u200C\u200D", // Zero-width chars (width: 0)
      "Café naïve résumé", // Accented characters
      "🚀 Rocket Launch", // Emoji + text
    ];
    
    testStrings.forEach((str, index) => {
      const width = Bun.stringWidth(str);
      const hasZW = this.hasZeroWidthChars(str);
      const display = hasZW.has ? `${str}Ⓩ` : str;
      
      console.log(`${index + 1}. "${display}"`);
      console.log(`   Display Width: ${width} characters`);
      console.log(`   Raw Length: ${str.length} characters`);
      if (hasZW.has) {
        console.log(`   Zero-Width: ${hasZW.count} characters at positions ${hasZW.positions.join(", ")}`);
      }
      console.log("");
    });
  }
  
  /**
   * Get inspection statistics
   */
  getInspectionStatistics(): any {
    const totalInspections = this.database.prepare("SELECT COUNT(*) as count FROM uri_inspections").get() as { count: number };
    const byStatus = this.database.prepare("SELECT status, COUNT(*) as count FROM uri_inspections GROUP BY status").all();
    const byCategory = this.database.prepare("SELECT category, COUNT(*) as count FROM uri_inspections GROUP BY category").all();
    const securityEvents = this.database.prepare("SELECT COUNT(*) as count FROM security_events").get() as { count: number };
    
    return {
      totalInspections: totalInspections.count,
      byStatus,
      byCategory,
      securityEvents: securityEvents.count,
      metrics: this.metrics
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  const inspector = new AdvancedUriInspector();
  await inspector.runInspectionDemo();
  
  // Display final statistics
  const stats = inspector.getInspectionStatistics();
  console.log("📊 Final Statistics:");
  console.log(`   Total Inspections: ${stats.totalInspections}`);
  console.log(`   Security Events: ${stats.securityEvents}`);
  console.log(`   Average Processing Time: ${stats.metrics.averageProcessingTime.toFixed(2)}ms`);
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}
