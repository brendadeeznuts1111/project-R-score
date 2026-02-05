#!/usr/bin/env bun
/**
 * @fileoverview MCP Configuration Setup
 * @description Setup script for MCP server configuration in Cursor IDE
 * @module scripts/setup-mcp.ts
 */

import { $ } from "bun";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CURSOR_CONFIG_DIR = ".cursor";
const MCP_CONFIG_FILE = "mcp.json";
const MCP_TEMPLATE_FILE = "mcp.json.template";

/**
 * Setup MCP configuration for Cursor IDE
 */
async function setupMCPConfig() {
  console.log("🔧 Setting up MCP configuration for Cursor IDE...");

  // Ensure .cursor directory exists
  if (!existsSync(CURSOR_CONFIG_DIR)) {
    mkdirSync(CURSOR_CONFIG_DIR, { recursive: true });
    console.log("📁 Created .cursor directory");
  }

  // Check if mcp.json already exists
  const mcpConfigPath = join(CURSOR_CONFIG_DIR, MCP_CONFIG_FILE);
  if (existsSync(mcpConfigPath)) {
    console.log("⚠️  MCP config already exists at .cursor/mcp.json");
    console.log("   To regenerate, delete the file and run this script again");
    return;
  }

  // Create MCP configuration
  const mcpConfig = {
    mcpServers: {
      bun: {
        url: "https://mcp.bun.sh",
        transport: "http",
        apiKey: ""
      },
      nexus: {
        command: "bun",
        args: ["run", "scripts/mcp-server.ts"],
        env: {
          NODE_ENV: "development",
          MCP_USER_ID: "cursor-client",
          BUN_SQLITE_LOCATION: "./data",
          LOG_LEVEL: "info"
        },
        cwd: process.cwd()
      }
    }
  };

  // Write configuration
  writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
  console.log("✅ Created .cursor/mcp.json");

  // Test MCP server
  console.log("🧪 Testing MCP server...");
  try {
    const testResult = await $`bun run scripts/mcp-server.ts --help`.nothrow().quiet();
    if (testResult.exitCode === 0) {
      console.log("✅ MCP server script is executable");
    } else {
      console.log("⚠️  MCP server script may need additional setup");
    }
  } catch (error) {
    console.log("⚠️  Could not test MCP server script");
  }

  console.log("\n🎉 MCP setup complete!");
  console.log("\nNext steps:");
  console.log("1. Restart Cursor IDE");
  console.log("2. Check Cursor settings for MCP server status");
  console.log("3. The 'nexus' MCP server should now be available with 35+ tools");
  console.log("\nAvailable MCP tools include:");
  console.log("• Research & anomaly detection tools");
  console.log("• Bun shell and tooling utilities");
  console.log("• Documentation integration");
  console.log("• Security monitoring");
  console.log("• UI policy management");
}

// Run setup if called directly
if (import.meta.main) {
  setupMCPConfig().catch(console.error);
}