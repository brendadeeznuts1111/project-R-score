#!/usr/bin/env bun

/**
 * Enhanced CLI Entry Point with Inspect Depth Support
 * 
 * Complete CLI implementation with custom inspect depth flag,
 * user context support, and multiple output formats.
 */

import { parseInspectArgs, inspectScope, help } from "./enhanced-cli.js";
import { EnhancedDomainContext } from "./contexts/EnhancedDomainContext.js";

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const [, , cmd, ...args] = Bun.argv;
  
  if (!cmd) {
    console.log(help);
    process.exit(1);
  }
  
  if (cmd === "scope") {
    await handleScopeCommand(args);
    return;
  }
  
  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(help);
    return;
  }
  
  console.error(`Unknown command: ${cmd}`);
  console.log("Use 'factory-wager help' for available commands.");
  process.exit(1);
}

/**
 * Handle scope command with enhanced inspect support
 */
async function handleScopeCommand(args: string[]): Promise<void> {
  const { hasInspect, depth, format, includeUser, filter } = parseInspectArgs(args);
  
  if (hasInspect) {
    try {
      await inspectScope({ depth, format, includeUser, filter });
    } catch (error) {
      console.error("Error during inspection:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
    return;
  }
  
  // Handle other scope commands (status, info, etc.)
  await handleOtherScopeCommands(args);
}

/**
 * Handle other scope commands
 */
async function handleOtherScopeCommands(args: string[]): Promise<void> {
  const command = args[0];
  
  switch (command) {
    case "status":
      await showScopeStatus();
      break;
      
    case "info":
      await showScopeInfo();
      break;
      
    case "debug":
      await enableDebugMode();
      break;
      
    case "validate":
      await validateScope();
      break;
      
    default:
      console.log("Use --inspect to enable inspection mode");
      console.log("Available commands: status, info, debug, validate");
      process.exit(1);
  }
}

/**
 * Show current scope status
 */
async function showScopeStatus(): Promise<void> {
  const domainContext = new EnhancedDomainContext("localhost");
  const summary = domainContext.getInspectionSummary();
  
  console.log("🔍 FactoryWager Scope Status");
  console.log("======================");
  console.log(`Domain: ${summary.domain}`);
  console.log(`Scope: ${summary.scope}`);
  console.log(`Platform: ${summary.platform}`);
  console.log(`Debug Mode: ${summary.debugMode ? "enabled" : "disabled"}`);
  console.log(`User Context: ${summary.hasUserContext ? "present" : "none"}`);
  console.log(`Total Scopes: ${summary.totalScopes}`);
  console.log(`Timestamp: ${summary.timestamp}`);
}

/**
 * Show detailed scope information
 */
async function showScopeInfo(): Promise<void> {
  const domainContext = new EnhancedDomainContext("localhost");
  
  console.log("📋 FactoryWager Scope Information");
  console.log("============================");
  
  // Basic info
  console.log(`Domain: ${domainContext.domain}`);
  console.log(`Available Scopes: ${domainContext.getScopeNames().join(", ")}`);
  
  // Metadata
  const metadata = domainContext.metadata;
  console.log(`Platform: ${metadata.platform}`);
  console.log(`Secrets Backend: ${metadata.secretsBackend}`);
  console.log(`Inspectable: ${metadata.inspectable}`);
  console.log(`Debug Mode: ${metadata.debugMode}`);
  
  // User context
  const userContext = domainContext.getUserContext();
  if (userContext) {
    console.log("\n👤 User Context:");
    console.log(`  User ID: ${userContext.userId}`);
    console.log(`  Username: ${userContext.username}`);
    console.log(`  Email: ${userContext.email}`);
    console.log(`  Account Type: ${userContext.accountType}`);
    console.log(`  Family ID: ${userContext.familyId}`);
    console.log(`  Last Active: ${userContext.lastActive.toISOString()}`);
  } else {
    console.log("\n👤 User Context: None");
  }
}

/**
 * Enable debug mode
 */
async function enableDebugMode(): Promise<void> {
  const domainContext = new EnhancedDomainContext("localhost");
  
  console.log("🐛 Enabling debug mode...");
  
  domainContext.enableDebugMode();
  
  const userContext = domainContext.getUserContext();
  if (userContext) {
    console.log("✅ Debug mode enabled");
    console.log(`   User ID: ${userContext.userId}`);
    console.log(`   Session: ${userContext.metadata?.sessionId}`);
    console.log("\n🔍 Now run: factory-wager scope --inspect --include-user");
  } else {
    console.log("❌ Failed to enable debug mode");
    process.exit(1);
  }
}

/**
 * Validate current scope configuration
 */
async function validateScope(): Promise<void> {
  const domainContext = new EnhancedDomainContext("localhost");
  
  console.log("🔍 Validating scope configuration...");
  
  const validation = domainContext.validate();
  
  if (validation.valid) {
    console.log("✅ Scope configuration is valid");
  } else {
    console.log("❌ Scope configuration has errors:");
    validation.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
    
    if (validation.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      validation.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }
    
    process.exit(1);
  }
}

/**
 * Handle process termination gracefully
 */
process.on("SIGINT", () => {
  console.log("\n👋 FactoryWager CLI terminated");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 FactoryWager CLI terminated");
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled rejection:", reason);
  process.exit(1);
});

// Run main function
if (import.meta.main) {
  main().catch(error => {
    console.error("💥 CLI error:", error);
    process.exit(1);
  });
}

export default main;
