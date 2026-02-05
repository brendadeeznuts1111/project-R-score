#!/usr/bin/env bun
/**
 * Network-Aware CLI Tool
 *
 * Bun CLI commands that propagate 13-byte config via HTTP headers
 *
 * Usage:
 *   bun run tools/network-cli.ts install <package>
 *   bun run tools/network-cli.ts publish
 *   bun run tools/network-cli.ts config
 *   bun run tools/network-cli.ts proxy start
 */

import { spawn } from "bun";
import { Terminal } from "bun";
import {
  HEADERS,
  getConfigState,
  updateConfigState,
  serializeConfig,
  configToHex,
  injectConfigHeaders,
  type ConfigState,
} from "../src/proxy/headers.js";

/**
 * Display current config state
 */
function showConfig(): void {
  const config = getConfigState();

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      13-Byte Configuration State                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Byte 0:   Config Version    │ ${config.version.toString().padEnd(50)} ║
║  Bytes 1-4:  Registry Hash    │ 0x${config.registryHash.toString(16).padStart(8, "0").padEnd(44)} ║
║  Bytes 5-8:  Feature Flags    │ 0x${config.featureFlags.toString(16).padStart(8, "0").padEnd(44)} ║
║  Byte 9:    Terminal Mode     │ ${config.terminalMode.toString().padEnd(50)} ║
║  Byte 10:   Terminal Rows     │ ${config.rows.toString().padEnd(50)} ║
║  Byte 11:   Terminal Cols     │ ${config.cols.toString().padEnd(50)} ║
║  Byte 12:   Reserved          │ ${config.reserved.toString().padEnd(50)} ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Full Hex Dump (13 bytes):                                                    ║
║  ${configToHex(config).padEnd(65)} ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);
}

/**
 * Install package with config headers
 */
async function installPackage(packageName: string): Promise<void> {
  console.log(`📦 Installing ${packageName} with config headers...\n`);

  const config = getConfigState();
  const headers = injectConfigHeaders({ method: "GET" });

  console.log("Headers being sent:");
  const headersObj = new Headers(headers.headers);
  for (const [key, value] of Object.entries(HEADERS)) {
    const val = headersObj.get(key);
    if (val) {
      console.log(`  ${key}: ${val}`);
    }
  }

  console.log(`\nFetching from registry (hash: 0x${config.registryHash.toString(16)})...\n`);

  // Simulate install with config-aware fetch
  try {
    const response = await fetch(`https://registry.example.com/${packageName}`, headers);

    if (!response.ok) {
      console.error(`❌ Failed to install: ${response.statusText}`);
      process.exit(1);
    }

    console.log(`✅ Successfully installed ${packageName}`);
    console.log(`   Config version: ${config.version}`);
    console.log(`   Registry hash: 0x${config.registryHash.toString(16)}`);

  } catch (error) {
    console.error(`❌ Installation failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Publish package with config headers
 */
async function publishPackage(): Promise<void> {
  console.log("📤 Publishing package with config headers...\n");

  const config = getConfigState();
  const headers = injectConfigHeaders({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  console.log("Headers being sent:");
  const headersObj = new Headers(headers.headers);
  for (const [key, value] of Object.entries(HEADERS)) {
    const val = headersObj.get(key);
    if (val) {
      console.log(`  ${key}: ${val}`);
    }
  }

  console.log(`\nPublishing to registry (hash: 0x${config.registryHash.toString(16)})...\n`);

  try {
    const response = await fetch("https://registry.example.com/publish", {
      ...headers,
      body: JSON.stringify({
        name: "my-package",
        version: "1.0.0",
      }),
    });

    if (!response.ok) {
      console.error(`❌ Failed to publish: ${response.statusText}`);
      process.exit(1);
    }

    console.log("✅ Successfully published package");
    console.log(`   Config version: ${config.version}`);
    console.log(`   Registry hash: 0x${config.registryHash.toString(16)}`);

  } catch (error) {
    console.error(`❌ Publish failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Start proxy server
 */
async function startProxy(): Promise<void> {
  console.log("🔒 Starting config-aware proxy...\n");

  const config = getConfigState();

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    Config-Aware Proxy Server                               ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Listening on: 0.0.0.0:4873                                                  ║
║  Registry Hash: 0x${config.registryHash.toString(16).padStart(8, "0").padEnd(41)} ║
║  Terminal Mode: ${config.terminalMode} (native)                                          ║
║  Terminal Size: ${config.cols}x${config.rows}                                                    ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Upstreams:                                                                 ║
║    • 0xa1b2c3d4 → registry.mycompany.com:443                              ║
║    • 0x00000000 → registry.npmjs.org:443                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Routing Logic:                                                            ║
║    1. Extract config from X-Bun-* headers                                 ║
║    2. Validate config version (must be 1)                                ║
║    3. Verify proxy token signature                                       ║
║    4. Route to upstream based on registry hash                            ║
║    5. Establish TLS tunnel to upstream                                    ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  // Import proxy module
  const { createConfigAwareProxy } = await import("../src/proxy/http-connect.js");

  try {
    await createConfigAwareProxy({
      listenPort: 4873,
      upstreams: [
        {
          host: "registry.mycompany.com",
          port: 443,
          hash: 0xa1b2c3d4,
          tls: true,
        },
        {
          host: "registry.npmjs.org",
          port: 443,
          hash: 0x00000000,
          tls: true,
        },
      ],
    });
  } catch (error) {
    console.error(`❌ Failed to start proxy: ${error}`);
    process.exit(1);
  }
}

/**
 * Update config field
 */
function updateConfigField(field: string, value: string): void {
  const numValue = parseInt(value);

  if (isNaN(numValue)) {
    console.error(`❌ Invalid value: ${value}`);
    process.exit(1);
  }

  updateConfigState({ [field]: numValue });

  console.log(`✅ Updated ${field} to ${numValue}`);
  console.log(`   New config dump: ${configToHex(getConfigState())}`);
}

/**
 * Main CLI
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    Network-Aware CLI Tool                                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Usage:                                                                   ║
║    bun run tools/network-cli.ts <command> [options]                        ║
║                                                                            ║
║  Commands:                                                                 ║
║    config                           Show current config state               ║
║    config <field> <value>            Update config field                    ║
║    install <package>                 Install package with config headers    ║
║    publish                          Publish package with config headers    ║
║    proxy start                      Start config-aware proxy               ║
║                                                                            ║
║  Examples:                                                                 ║
║    bun run tools/network-cli.ts config                                    ║
║    bun run tools/network-cli.ts config terminalMode 2                      ║
║    bun run tools/network-cli.ts install lodash                            ║
║    bun run tools/network-cli.ts publish                                     ║
║    bun run tools/network-cli.ts proxy start                                 ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  switch (command) {
    case "config":
      if (commandArgs.length === 0) {
        showConfig();
      } else if (commandArgs.length === 2) {
        updateConfigField(commandArgs[0], commandArgs[1]);
      } else {
        console.error("❌ Invalid arguments for 'config' command");
        process.exit(1);
      }
      break;

    case "install":
      if (commandArgs.length === 0) {
        console.error("❌ Missing package name");
        process.exit(1);
      }
      await installPackage(commandArgs[0]);
      break;

    case "publish":
      await publishPackage();
      break;

    case "proxy":
      if (commandArgs[0] === "start") {
        await startProxy();
      } else {
        console.error("❌ Invalid proxy command");
        process.exit(1);
      }
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
  }
}

main();
