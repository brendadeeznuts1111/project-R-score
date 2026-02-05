#!/usr/bin/env bun

/**
 * Direct Custom Inspection Demo
 * Shows the exact output with zero-width character detection
 */

const inspectCustom = Symbol.for("Bun.inspect.custom");

const check = {
  longName: "CORS Policy Validation",
  rawUri: "https%3A%2F%2Fex%E2%80%8Bample.com",
  status: "FAIL",
  message: "Zero-width character in origin",

  [inspectCustom]() {
    const emoji = "🔒";
    const color = this.status === "PASS" ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    
    // Enhanced zero-width detection
    const decoded = decodeURIComponent(this.rawUri);
    const zwMarker = decoded.includes('\u200B') ? " Ⓩ" : "";
    
    return `${emoji} ${color}${this.longName}${reset} │ ${this.message}${zwMarker}`;
  }
};

// This will trigger the custom inspection
console.log(check);

// Also show the raw decoded URI for verification
console.log("\n📋 Verification:");
console.log(`Raw URI: ${check.rawUri}`);
console.log(`Decoded URI: ${decodeURIComponent(check.rawUri)}`);
console.log(`Contains zero-width: ${decodeURIComponent(check.rawUri).includes('\u200B') ? 'Yes Ⓩ' : 'No'}`);

// Enhanced version with position detection
const enhancedCheck = {
  longName: "Enhanced CORS Policy Validation",
  rawUri: "https%3A%2F%2Fex%E2%80%8Bample.com",
  status: "FAIL",
  message: "Zero-width character in origin",

  [inspectCustom]() {
    const emoji = "🔒";
    const color = this.status === "PASS" ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    
    // Enhanced zero-width detection with position
    const decoded = decodeURIComponent(this.rawUri);
    const zwPosition = decoded.indexOf('\u200B');
    const zwMarker = zwPosition !== -1 ? ` Ⓩ@${zwPosition}` : "";
    
    return `${emoji} ${color}${this.longName}${reset} │ ${decoded} │ ${this.message}${zwMarker}`;
  }
};

console.log("\n🎯 Enhanced Version:");
console.log(enhancedCheck);
