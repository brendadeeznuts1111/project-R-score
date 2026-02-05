#!/usr/bin/env bun

/**
 * DuoPlus CLI v3.0+ - Enhanced Custom Inspection Demo
 * Advanced implementation with Bun's stringWidth and comprehensive zero-width detection
 */

const inspectCustom = Symbol.for("Bun.inspect.custom");

// Enhanced zero-width character detection
const ZERO_WIDTH_CHARS = /[\u00AD\u200B-\u200F\u2028\u2029\u2060-\u206F\uFEFF\uFFF0-\uFFFF]|\p{Cf}/gu;

function hasZeroWidthChars(str: string): { has: boolean; count: number; positions: number[] } {
  const matches = [...str.matchAll(ZERO_WIDTH_CHARS)];
  return {
    has: matches.length > 0,
    count: matches.length,
    positions: matches.map(m => m.index || 0)
  };
}

function safeDecode(uri: string): string | undefined {
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

function truncateByWidth(str: string, max: number): string {
  let acc = "";
  for (const char of str) {
    if (Bun.stringWidth(acc + char) > max) break;
    acc += char;
  }
  return acc;
}

const enhancedCheck = {
  longName: "CORS Policy Validation with Advanced Zero-Width Detection",
  rawUri: "https%3A%2F%2Fex%E2%80%8Bample.com",
  status: "FAIL" as const,
  message: "Zero-width character in origin",
  category: "SECURITY" as const,
  
  get decodedUri() {
    return safeDecode(this.rawUri);
  },
  
  get zeroWidthInfo() {
    const decoded = this.decodedUri || "";
    return hasZeroWidthChars(decoded);
  },
  
  get displayWidth() {
    return Bun.stringWidth(this.decodedUri || "");
  },
  
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
    
    // Enhanced zero-width detection
    const zwInfo = this.zeroWidthInfo;
    const zwMarker = zwInfo.has ? ` Ⓩ×${zwInfo.count}` : "";
    
    // Truncate name for display
    const nameDisplay = Bun.stringWidth(this.longName) > 50
      ? truncateByWidth(this.longName, 47) + "…"
      : this.longName;
    
    // Truncate decoded URI for display
    const decodedDisplay = this.decodedUri 
      ? truncateByWidth(this.decodedUri, 40)
      : "N/A";
    
    // Build enhanced message
    let enhancedMessage = this.message;
    if (zwInfo.has) {
      enhancedMessage += ` (positions: ${zwInfo.positions.join(", ")})`;
    }
    
    return `${emoji} ${color}${nameDisplay}${reset} │ ${decodedDisplay} │ ${enhancedMessage}${zwMarker}`;
  }
};

// Additional test cases with various zero-width scenarios
const testCases = [
  {
    longName: "Standard CORS Check",
    rawUri: "https://example.com",
    status: "PASS" as const,
    message: "Valid origin",
    category: "SECURITY" as const,
  },
  {
    longName: "Zero-Width in Domain",
    rawUri: "https%3A%2F%2Fex%E2%80%8Bample.com",
    status: "FAIL" as const,
    message: "Zero-width character in origin",
    category: "SECURITY" as const,
  },
  {
    longName: "Multiple Zero-Width Characters",
    rawUri: "https://test\u200B\u200C\u200Dexample.com",
    status: "WARN" as const,
    message: "Multiple zero-width characters detected",
    category: "SECURITY" as const,
  },
  {
    longName: "Zero-Width in Query Parameter",
    rawUri: "https://example.com/api?param=test%E2%80%8Bhidden",
    status: "FAIL" as const,
    message: "Zero-width character in query parameter",
    category: "SECURITY" as const,
  },
  {
    longName: "Emoji with Zero-Width Joiners",
    rawUri: "https://example.com/👨‍👩‍👧‍👦",
    status: "PASS" as const,
    message: "Valid emoji sequence",
    category: "FUNCTIONALITY" as const,
  }
];

// Create enhanced inspection objects
const enhancedChecks = testCases.map(testCase => ({
  ...testCase,
  get decodedUri() {
    return safeDecode(this.rawUri);
  },
  
  get zeroWidthInfo() {
    const decoded = this.decodedUri || "";
    return hasZeroWidthChars(decoded);
  },
  
  get displayWidth() {
    return Bun.stringWidth(this.decodedUri || "");
  },
  
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
    
    // Enhanced zero-width detection
    const zwInfo = this.zeroWidthInfo;
    const zwMarker = zwInfo.has ? ` Ⓩ×${zwInfo.count}` : "";
    
    // Truncate name for display
    const nameDisplay = Bun.stringWidth(this.longName) > 45
      ? truncateByWidth(this.longName, 42) + "…"
      : this.longName;
    
    // Truncate decoded URI for display
    const decodedDisplay = this.decodedUri 
      ? truncateByWidth(this.decodedUri, 30)
      : "N/A";
    
    return `${emoji} ${color}${nameDisplay}${reset} │ ${decodedDisplay} │ ${this.message}${zwMarker}`;
  }
}));

console.log("🔍 DuoPlus CLI v3.0+ - Enhanced Custom Inspection Demo");
console.log("=".repeat(80));
console.log("Advanced zero-width detection with Bun's stringWidth support");
console.log("");

console.log("🎯 Enhanced Single Check:");
console.log("");
console.log(enhancedCheck);
console.log("");

console.log("📊 Comprehensive Test Suite:");
console.log("");

// Display using Bun's inspect table
console.log(Bun.inspect.table(enhancedChecks, {
  colors: true,
  indent: 2
}));

console.log("");
console.log("📏 Detailed Width Analysis:");
console.log("");

enhancedChecks.forEach((check, index) => {
  console.log(`${index + 1}. ${check.longName}`);
  console.log(`   Raw URI: ${check.rawUri}`);
  console.log(`   Decoded URI: ${check.decodedUri || "N/A"}`);
  console.log(`   Display Width: ${check.displayWidth} characters`);
  console.log(`   Raw Length: ${(check.decodedUri || "").length} characters`);
  
  if (check.zeroWidthInfo.has) {
    console.log(`   Zero-Width Characters: ${check.zeroWidthInfo.count} at positions ${check.zeroWidthInfo.positions.join(", ")}`);
  }
  
  console.log("");
});

console.log("🎉 Enhanced Custom Inspection Demo Complete!");
