#!/usr/bin/env bun

/**
 * DuoPlus CLI v3.0+ - Ultimate Custom Inspection Showcase
 * Demonstrating the full power of Bun's custom inspection with zero-width detection
 */

const inspectCustom = Symbol.for("Bun.inspect.custom");

// Comprehensive zero-width detection
const ZERO_WIDTH_CHARS = /[\u00AD\u200B-\u200F\u2028\u2029\u2060-\u206F\uFEFF\uFFF0-\uFFFF]|\p{Cf}/gu;

function analyzeZeroWidth(str: string) {
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
      return `Unknown Zero-Width (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`;
    })
  };
}

// Ultimate inspection object with all enhancements
const ultimateCheck = {
  longName: "Ultimate CORS Policy Validation with Advanced Zero-Width Analysis",
  rawUri: "https%3A%2F%2Fex%E2%80%8Bample.com%2Fapi%2Fcallback%E2%80%8C%E2%80%8D",
  status: "FAIL",
  message: "Multiple zero-width characters detected",
  category: "SECURITY",
  severity: "HIGH",
  
  get decodedUri() {
    try {
      return decodeURIComponent(this.rawUri);
    } catch {
      return "DECODE_ERROR";
    }
  },
  
  get zeroWidthAnalysis() {
    return analyzeZeroWidth(this.decodedUri);
  },
  
  get displayWidth() {
    return Bun.stringWidth(this.decodedUri);
  },
  
  get securityRisk() {
    const zw = this.zeroWidthAnalysis;
    if (zw.count === 0) return "LOW";
    if (zw.count <= 2) return "MEDIUM";
    if (zw.count <= 5) return "HIGH";
    return "CRITICAL";
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
    
    const severityColor = {
      LOW: "\x1b[32m",
      MEDIUM: "\x1b[33m",
      HIGH: "\x1b[31m",
      CRITICAL: "\x1b[91m"
    }[this.securityRisk];
    
    const reset = "\x1b[0m";
    
    const zw = this.zeroWidthAnalysis;
    const zwMarker = zw.has ? ` Ⓩ×${zw.count}` : "";
    const riskMarker = `${severityColor}[${this.securityRisk}]${reset}`;
    
    // Truncate for display
    const nameDisplay = Bun.stringWidth(this.longName) > 60 
      ? this.longName.slice(0, 57) + "…" 
      : this.longName;
    
    const decodedDisplay = Bun.stringWidth(this.decodedUri) > 40
      ? this.decodedUri.slice(0, 37) + "…"
      : this.decodedUri;
    
    return `${emoji} ${color}${nameDisplay}${reset} │ ${decodedDisplay} │ ${this.message} ${riskMarker}${zwMarker}`;
  }
};

console.info("🔍 DuoPlus CLI v3.0+ - Ultimate Custom Inspection Showcase");
console.info("=".repeat(90));
console.info("Advanced zero-width analysis with Bun's stringWidth and Unicode support");
console.info("");

// Display the ultimate check
console.info("🎯 Ultimate Inspection Result:");
console.info("");
console.info(ultimateCheck[inspectCustom]());
console.info("");

// Detailed analysis
console.info("📊 Detailed Zero-Width Analysis:");
console.info("");
const analysis = ultimateCheck.zeroWidthAnalysis;
console.info(`Raw URI: ${ultimateCheck.rawUri}`);
console.info(`Decoded URI: ${ultimateCheck.decodedUri}`);
console.info(`Display Width: ${ultimateCheck.displayWidth} characters`);
console.info(`Raw Length: ${ultimateCheck.decodedUri.length} characters`);
console.info(`Zero-Width Characters: ${analysis.count}`);
console.info(`Security Risk: ${ultimateCheck.securityRisk}`);

if (analysis.has) {
  console.info("");
  console.info("🔍 Zero-Width Character Details:");
  analysis.positions.forEach((pos, index) => {
    console.info(`   ${index + 1}. Position ${pos}: ${analysis.types[index]}`);
  });
}

console.info("");
console.info("🛡️ Security Implications:");
console.info("");
console.info("⚠️  Zero-width characters can be used for:");
console.info("   • Data hiding and steganography");
console.info("   • Bypassing security filters");
console.info("   • Phishing and domain spoofing");
console.info("   • Log injection and obfuscation");
console.info("");
console.info("✅ Detection Methods:");
console.info("   • Unicode pattern matching with \\p{Cf}");
console.info("   • Position analysis and counting");
console.info("   • Display width vs raw length comparison");
console.info("   • Character type identification");

// Comparison with simpler checks
console.info("");
console.info("📋 Comparison with Basic Detection:");
console.info("");

const basicCheck = {
  longName: "Basic CORS Check",
  rawUri: "https%3A%2F%2Fex%E2%80%8Bample.com",
  status: "FAIL",
  message: "Zero-width character in origin",
  
  [inspectCustom]() {
    const emoji = "🔒";
    const color = this.status === "PASS" ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    const zwMarker = decodeURIComponent(this.rawUri).includes('\u200B') ? " Ⓩ" : "";
    return `${emoji} ${color}${this.longName}${reset} │ ${this.message}${zwMarker}`;
  }
};

console.info("Basic Detection:");
console.info(`   ${basicCheck[inspectCustom]()}`);

console.info("");
console.info("Advanced Detection:");
console.info(`   ${ultimateCheck[inspectCustom]()}`);

console.info("");
console.info("🎉 Ultimate Custom Inspection Showcase Complete!");
