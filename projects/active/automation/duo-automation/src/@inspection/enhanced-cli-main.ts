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
    console.info(help);
    process.exit(1);
  }
  
  if (cmd === "scope") {
    await handleScopeCommand(args);
    return;
  }
  
  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.info(help);
    return;
  }
  
  console.error(`Unknown command: ${cmd}`);
  console.info("Use 'factory-wager help' for available commands.");
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
      console.info("Use --inspect to enable inspection mode");
      console.info("Available commands: status, info, debug, validate");
      process.exit(1);
  }
}

/**
 * Show current scope status
 */
async function showScopeStatus(): Promise<void> {
  const domainContext = new EnhancedDomainContext("localhost");
  const summary = domainContext.getInspectionSummary();
  
  console.info("🔍 FactoryWager Scope Status");
  console.info("======================");
  console.info(`Domain: ${summary.domain}`);
  console.info(`Scope: ${summary.scope}`);
  console.info(`Platform: ${summary.platform}`);
  console.info(`Debug Mode: ${summary.debugMode ? "enabled" : "disabled"}`);
  console.info(`User Context: ${summary.hasUserContext ? "present" : "none"}`);
  console.info(`Total Scopes: ${summary.totalScopes}`);
  console.info(`Timestamp: ${summary.timestamp}`);
}

/**
 * Show detailed scope information
 */
async function showScopeInfo(): Promise<void> {
  const domainContext = new EnhancedDomainContext("localhost");
  
  console.info("📋 FactoryWager Scope Information");
  console.info("============================");
  
  // Basic info
  console.info(`Domain: ${domainContext.domain}`);
  console.info(`Available Scopes: ${domainContext.getScopeNames().join(", ")}`);
  
  // Metadata
  const metadata = domainContext.metadata;
  console.info(`Platform: ${metadata.platform}`);
  console.info(`Secrets Backend: ${metadata.secretsBackend}`);
  console.info(`Inspectable: ${metadata.inspectable}`);
  console.info(`Debug Mode: ${metadata.debugMode}`);
  
  // User context
  const userContext = domainContext.getUserContext();
  if (userContext) {
    console.info("\n👤 User Context:");
    console.info(`  User ID: ${userContext.userId}`);
    console.info(`  Username: ${userContext.username}`);
    console.info(`  Email: ${userContext.email}`);
    console.info(`  Account Type: ${userContext.accountType}`);
    console.info(`  Family ID: ${userContext.familyId}`);
    console.info(`  Last Active: ${userContext.lastActive.toISOString()}`);
  } else {
    console.info("\n👤 User Context: None");
  }
}

/**
 * Enable debug mode
 */
async function enableDebugMode(): Promise<void> {
  const domainContext = new EnhancedDomainContext("localhost");
  
  console.info("🐛 Enabling debug mode...");
  
  domainContext.enableDebugMode();
  
  const userContext = domainContext.getUserContext();
  if (userContext) {
    console.info("✅ Debug mode enabled");
    console.info(`   User ID: ${userContext.userId}`);
    console.info(`   Session: ${userContext.metadata?.sessionId}`);
    console.info("\n🔍 Now run: factory-wager scope --inspect --include-user");
  } else {
    console.info("❌ Failed to enable debug mode");
    process.exit(1);
  }
}

/**
 * Validate current scope configuration
 */
async function validateScope(): Promise<void> {
  const domainContext = new EnhancedDomainContext("localhost");
  
  console.info("🔍 Validating scope configuration...");
  
  const validation = domainContext.validate();
  
  if (validation.valid) {
    console.info("✅ Scope configuration is valid");
  } else {
    console.info("❌ Scope configuration has errors:");
    validation.errors.forEach(error => {
      console.info(`   - ${error}`);
    });
    
    if (validation.warnings.length > 0) {
      console.info("\n⚠️  Warnings:");
      validation.warnings.forEach(warning => {
        console.info(`   - ${warning}`);
      });
    }
    
    process.exit(1);
  }
}

/**
 * Handle process termination gracefully
 */
process.on("SIGINT", () => {
  console.info("\n👋 FactoryWager CLI terminated");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.info("\n👋 FactoryWager CLI terminated");
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
