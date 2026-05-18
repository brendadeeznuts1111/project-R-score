#!/usr/bin/env bun
/**
 * Kimi Shell CLI
 * 
 * Management tool for the unified shell bridge
 * Commands: start, stop, status, logs, config
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  bridgePidFile: join(homedir(), ".kimi", "bridge.pid"),
  dashboardPidFile: join(homedir(), ".kimi", "dashboard.pid"),
  connectorPidFile: join(homedir(), ".kimi", "connector.pid"),
  logDir: join(homedir(), ".kimi", "logs"),
  configFile: join(homedir(), ".kimi", "config.json"),
  bridgeScript: join(homedir(), ".kimi", "tools", "unified-shell-bridge.ts"),
  dashboardScript: join(import.meta.dir, "..", "dashboard", "health-dashboard.ts"),
  connectorScript: join(import.meta.dir, "..", "zsh-bridge-connector.ts"),
};

// ============================================================================
// PID Management
// ============================================================================

async function readPid(file: string): Promise<number | undefined> {
  try {
    if (existsSync(file)) {
      const content = await Bun.file(file).text();
      return parseInt(content.trim(), 10);
    }
  } catch {
    // Ignore
  }
  return undefined;
}

async function writePid(file: string, pid: number): Promise<void> {
  await Bun.write(file, pid.toString());
}

async function removePid(file: string): Promise<void> {
  try {
    await Bun.file(file).delete();
  } catch {
    // Ignore
  }
}

async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Commands
// ============================================================================

async function cmdStart(args: string[]): Promise<void> {
  const options = parseOptions(args, {
    dashboard: false,
    connector: false,
    all: false,
  });

  console.info("🚀 Starting Kimi Shell Bridge...\n");

  // Start bridge
  const bridgePid = await readPid(CONFIG.bridgePidFile);
  if (bridgePid && await isProcessRunning(bridgePid)) {
    console.info("⚠️  Bridge already running (PID: " + bridgePid + ")");
  } else {
    const proc = Bun.spawn(["bun", "run", CONFIG.bridgeScript], {
      detached: true,
      stdout: Bun.file(join(CONFIG.logDir, "bridge.log")),
      stderr: Bun.file(join(CONFIG.logDir, "bridge.error.log")),
    });
    await writePid(CONFIG.bridgePidFile, proc.pid);
    console.info(`✅ Bridge started (PID: ${proc.pid})`);
  }

  // Start dashboard if requested
  if (options.dashboard || options.all) {
    await Bun.sleep(500);
    const dashboardPid = await readPid(CONFIG.dashboardPidFile);
    if (dashboardPid && await isProcessRunning(dashboardPid)) {
      console.info("⚠️  Dashboard already running (PID: " + dashboardPid + ")");
    } else {
      const proc = Bun.spawn(["bun", "run", CONFIG.dashboardScript], {
        detached: true,
        stdout: Bun.file(join(CONFIG.logDir, "dashboard.log")),
        stderr: Bun.file(join(CONFIG.logDir, "dashboard.error.log")),
      });
      await writePid(CONFIG.dashboardPidFile, proc.pid);
      console.info(`✅ Dashboard started (PID: ${proc.pid})`);
      console.info(`📊 http://localhost:18790/dashboard`);
    }
  }

  // Start connector if requested
  if (options.connector || options.all) {
    await Bun.sleep(500);
    const connectorPid = await readPid(CONFIG.connectorPidFile);
    if (connectorPid && await isProcessRunning(connectorPid)) {
      console.info("⚠️  Connector already running (PID: " + connectorPid + ")");
    } else {
      const proc = Bun.spawn(["bun", "run", CONFIG.connectorScript], {
        detached: true,
        stdout: Bun.file(join(CONFIG.logDir, "connector.log")),
        stderr: Bun.file(join(CONFIG.logDir, "connector.error.log")),
      });
      await writePid(CONFIG.connectorPidFile, proc.pid);
      console.info(`✅ Connector started (PID: ${proc.pid})`);
    }
  }

  console.info("\n💡 Use 'kimi-shell status' to check status");
}

async function cmdStop(args: string[]): Promise<void> {
  const options = parseOptions(args, { all: false });

  console.info("🛑 Stopping Kimi Shell Bridge...\n");

  const services = options.all
    ? ["bridge", "dashboard", "connector"]
    : ["bridge"];

  for (const service of services) {
    const pidFile = service === "bridge" ? CONFIG.bridgePidFile
      : service === "dashboard" ? CONFIG.dashboardPidFile
      : CONFIG.connectorPidFile;

    const pid = await readPid(pidFile);
    if (pid) {
      if (await isProcessRunning(pid)) {
        try {
          process.kill(pid, "SIGTERM");
          await Bun.sleep(500);
          if (await isProcessRunning(pid)) {
            process.kill(pid, "SIGKILL");
          }
          console.info(`✅ ${service} stopped (PID: ${pid})`);
        } catch (e) {
          console.info(`❌ Failed to stop ${service}: ${e}`);
        }
      } else {
        console.info(`⚠️  ${service} not running (stale PID: ${pid})`);
      }
      await removePid(pidFile);
    } else {
      console.info(`⚠️  ${service} not running`);
    }
  }
}

async function cmdStatus(): Promise<void> {
  console.info("📊 Kimi Shell Status\n");
  console.info("====================\n");

  const services = [
    { name: "Bridge (MCP Server)", file: CONFIG.bridgePidFile, port: undefined },
    { name: "Dashboard", file: CONFIG.dashboardPidFile, port: 18790 },
    { name: "Zsh Connector", file: CONFIG.connectorPidFile, port: undefined },
  ];

  console.info("Service              Status     PID        Port");
  console.info("─".repeat(55));

  for (const svc of services) {
    const pid = await readPid(svc.file);
    const running = pid ? await isProcessRunning(pid) : false;
    const status = running ? "🟢 running" : "🔴 stopped";
    const pidStr = running ? pid?.toString() : "-";
    const portStr = svc.port?.toString() || "-";
    console.info(`${svc.name.padEnd(20)} ${status.padEnd(10)} ${(pidStr || "-").padEnd(10)} ${portStr}`);
  }

  // Try to get health from dashboard
  try {
    const response = await fetch("http://127.0.0.1:18790/api/health");
    if (response.ok) {
      const health = await response.json();
      console.info("\n📈 Bridge Health:");
      console.info(`   Status: ${health.status}`);
      console.info(`   Commands: ${health.telemetry?.commandsExecuted || 0}`);
      console.info(`   Errors: ${health.telemetry?.errors || 0}`);
    }
  } catch {
    // Ignore
  }
}

async function cmdLogs(args: string[]): Promise<void> {
  const options = parseOptions(args, { follow: false, service: "bridge" });

  const logFile = `${options.service}.log`;
  const logPath = join(CONFIG.logDir, logFile);

  if (!existsSync(logPath)) {
    console.info(`❌ No logs found for ${options.service}`);
    return;
  }

  if (options.follow) {
    console.info(`📋 Following ${options.service} logs (Ctrl+C to exit)...\n`);
    const proc = Bun.spawn(["tail", "-f", logPath]);
    await proc.exited;
  } else {
    console.info(`📋 ${options.service} logs:\n`);
    const content = await Bun.file(logPath).text();
    const lines = content.split("\n").slice(-50);
    console.info(lines.join("\n"));
  }
}

async function cmdInstall(): Promise<void> {
  console.info("📦 Installing Kimi Shell Bridge...\n");

  try {
    const version = await $`bun --version`.text();
    console.info(`✅ Bun ${version.trim()} detected`);
  } catch {
    console.info("❌ Bun not found. Install from https://bun.sh");
    return;
  }

  const dirs = [
    join(homedir(), ".kimi"),
    join(homedir(), ".kimi", "tools"),
    join(homedir(), ".kimi", "logs"),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await $`mkdir -p ${dir}`;
      console.info(`✅ Created ${dir}`);
    }
  }

  console.info("\n✅ Installation complete!");
}

function parseOptions(args: string[], defaults: Record<string, any>): Record<string, any> {
  const options = { ...defaults };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).split("=")[0];
      const value = arg.includes("=") ? arg.split("=")[1] : "true";
      options[key] = value === "true" ? true : value === "false" ? false : value;
    }
  }
  return options;
}

function showHelp(): void {
  console.info(`
🚀 Kimi Shell CLI

Usage: kimi-shell <command> [options]

Commands:
  start [--dashboard] [--connector] [--all]  Start services
  stop [--all]                                Stop services
  status                                      Show service status
  logs [--follow] [--service=<name>]          View logs
  install                                     Install to ~/.kimi
  help                                        Show this help

Examples:
  kimi-shell start --all           Start all services
  kimi-shell status                Check status
  kimi-shell logs --follow         Follow logs
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  switch (command) {
    case "start": await cmdStart(args.slice(1)); break;
    case "stop": await cmdStop(args.slice(1)); break;
    case "status": await cmdStatus(); break;
    case "logs": await cmdLogs(args.slice(1)); break;
    case "install": await cmdInstall(); break;
    case "help":
    default: showHelp(); break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
