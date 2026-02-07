#!/usr/bin/env bun
/**
 * OpenClaw CLI - Bun-native Matrix profile operations (v3.16)
 * 
 * Integrates with lib/bun-context.ts for context resolution
 */

import gateway from "./gateway.ts";
import { loadGlobalConfig, loadBunfigToml, c } from "../lib/bun-context.ts";
import { renderContextDashboard, renderContextCompact } from "./context-table-v3.28.ts";
import { FusionContextResolver } from "../src/core/barber-fusion-runtime.ts";

// Local color helpers
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

// Local HSL color helper
const hsl = (h: number, s: number, l: number, text: string): string => {
  try {
    const color = Bun.color(`hsl(${h}, ${s}%, ${l}%)`, "ansi");
    return color ? `${color}${text}\x1b[0m` : text;
  } catch {
    // Fallback to RGB
    const sNorm = s / 100;
    const lNorm = l / 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = sNorm * Math.min(lNorm, 1 - lNorm);
    const f = (n: number) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
  }
};

const [cmd, ...args] = process.argv.slice(2);

// Map command aliases to gateway functions
const commands: Record<string, () => Promise<void>> = {
  // OpenClaw gateway
  openclaw_status: async () => {
    const status = await gateway.getOpenClawStatus();
    console.log(JSON.stringify(status, null, 2));
  },
  
  // Matrix Bridge status
  matrix_bridge_status: async () => {
    const status = await gateway.getMatrixBridgeStatus();
    
    // Use table engine for pretty output
    const { createTier1380Table, formatters } = await import("../lib/table-engine-v3.28.ts");
    
    console.log(c.bold(hsl(200, 90, 70, "═══════════════════════════════════════════════")));
    console.log(c.bold(hsl(200, 90, 70, "       MATRIX BRIDGE STATUS v3.28")));
    console.log(c.bold(hsl(200, 90, 70, "═══════════════════════════════════════════════")));
    console.log();
    
    // Bridge Overview Table
    const overviewTable = createTier1380Table({
      columns: [
        { key: 'property', header: 'Property', width: 20 },
        { key: 'value', header: 'Value', width: 30, formatter: (v) => String(v) },
      ],
      headerColor: [200, 80, 60],
      borderColor: [220, 80, 60],
    });
    
    console.log(hsl(180, 80, 60, '── Bridge Overview ──'));
    console.log(overviewTable.render([
      { property: 'Bridge Status', value: status.bridgeOnline ? formatters.status(true) : formatters.status(false) },
      { property: 'Matrix Protocol', value: status.matrixProtocol },
      { property: 'Gateway Connected', value: status.gatewayConnected ? formatters.status(true) : formatters.status(false) },
      { property: 'Profiles Synced', value: `${status.profilesSynced}/${status.profilesTotal}` },
      { property: 'Last Sync', value: formatters.timeAgo(new Date(status.lastSync).getTime()) },
      { property: 'Latency', value: formatters.latency(status.latencyMs) },
      { property: 'Context Hash', value: status.contextSync.hash.slice(0, 16) + '...' },
      { property: 'Context Synced', value: status.contextSync.synced ? formatters.status(true) : formatters.status(false) },
    ]));
    console.log();
    
    // Show errors if any
    if (status.errors.length > 0) {
      console.log(hsl(0, 80, 60, '── Errors ──'));
      status.errors.forEach(err => console.log(`  ${hsl(0, 80, 60, '✗')} ${err}`));
      console.log();
    }
    
    // Show warnings if any
    if (status.warnings.length > 0) {
      console.log(hsl(45, 90, 60, '── Warnings ──'));
      status.warnings.forEach(warn => console.log(`  ${hsl(45, 90, 60, '!')} ${warn}`));
      console.log();
    }
    
    // Raw JSON option
    if (args.includes('--json')) {
      console.log(dim('── Raw JSON ──'));
      console.log(JSON.stringify(status, null, 2));
    }
  },
  
  // Profile operations
  profile_list: async () => {
    const profiles = await gateway.listProfiles();
    console.table(profiles.map(p => ({
      ID: p.id,
      Name: p.name,
      Bound: p.bound ? "✓" : "",
      Path: p.path,
    })));
  },
  
  profile_bind: async () => {
    const [profileId] = args;
    if (!profileId) {
      console.error("Usage: profile_bind <profile-id>");
      process.exit(1);
    }
    await gateway.bindProfile(profileId);
  },
  
  profile_switch: async () => {
    const [profileId] = args;
    if (!profileId) {
      console.error("Usage: profile_switch <profile-id>");
      process.exit(1);
    }
    await gateway.switchProfile(profileId);
  },
  
  profile_status: async () => {
    const status = await gateway.getProfileStatus();
    
    console.log(`${c.cyan("╔════════════════════════════════════════╗")}`);
    console.log(`${c.cyan("║")}     ${c.bold("OpenClaw Profile Status")}            ${c.cyan("║")}`);
    console.log(`${c.cyan("╠════════════════════════════════════════╣")}`);
    
    const dirStr = status.currentDirectory.slice(0, 30);
    const profileStr = (status.profile?.name || "None").slice(0, 30);
    const bindingStr = status.binding ? "✓ Bound" : "✗ None";
    const bunfigStr = status.globalConfig.configPath.slice(0, 30);
    
    console.log(`${c.cyan("║")} Directory: ${dirStr.padEnd(30)} ${c.cyan("║")}`);
    console.log(`${c.cyan("║")} Profile:   ${profileStr.padEnd(30)} ${c.cyan("║")}`);
    console.log(`${c.cyan("║")} Binding:   ${bindingStr.padEnd(30)} ${c.cyan("║")}`);
    console.log(`${c.cyan("║")} Context:   ${status.contextHash.padEnd(30)} ${c.cyan("║")}`);
    console.log(`${c.cyan("║")} Bunfig:    ${bunfigStr.padEnd(30)} ${c.cyan("║")}`);
    console.log(`${c.cyan("╚════════════════════════════════════════╝")}`);
    
    console.log("\nAvailable Profiles:");
    status.allProfiles.forEach(p => {
      const marker = p.id === status.profile?.id ? c.green("→ ") : "  ";
      const bound = p.bound ? c.gray("[bound]") : "";
      console.log(`${marker}${c.cyan(p.id)}: ${p.name} ${bound}`);
    });
  },
  
  // Shell execution
  shell_execute: async () => {
    const command = args.join(" ");
    if (!command) {
      console.error("Usage: shell_execute <command>");
      process.exit(1);
    }
    
    console.log(c.gray(`$ ${command}`));
    
    const parts = command.split(" ");
    const cmd = parts[0];
    const cmdArgs = parts.slice(1);
    
    const result = await gateway.shellExecute(cmd, cmdArgs);
    
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(c.red(result.stderr));
    
    const status = result.exitCode === 0 ? c.green("✓") : c.red("✗");
    console.log(c.gray(`${status} Exit: ${result.exitCode} | ${result.durationMs}ms`));
    
    process.exit(result.exitCode);
  },
  
  // Context-aware execution using bun-context
  context_exec: async () => {
    if (args.length === 0) {
      console.error("Usage: context_exec <command> [args...]");
      process.exit(1);
    }
    
    console.log(c.gray(`[context] $ ${args.join(" ")}`));
    
    const result = await gateway.shellExecuteWithContext(args, { useCache: true });
    console.log(c.gray(`[context] Duration: ${result.durationMs}ms`));
    process.exit(result.exitCode);
  },
  
  // Bun-context integration
  bun_config: async () => {
    const config = await loadGlobalConfig();
    const bunfig = await loadBunfigToml(config.configPath);
    
    console.log(c.cyan("Global Config:"));
    console.log(JSON.stringify({
      cwd: config.cwd,
      envFile: config.envFile,
      configPath: config.configPath,
      version: config.version,
    }, null, 2));
    
    console.log(c.cyan("\nBunfig Config:"));
    console.log(JSON.stringify(bunfig, null, 2));
  },
  
  // Version info
  version: async () => {
    console.log(`OpenClaw Gateway v3.28.0 (Bun Context + Table Engine)`);
    console.log(`Bun version: ${Bun.version}`);
    console.log(`Exec path: ${process.execPath}`);
    
    const config = await loadGlobalConfig();
    console.log(`Config: ${config.configPath}`);
  },
  
  // v3.28 Dashboard with enhanced table engine
  dashboard: async () => {
    const fusionContext = await FusionContextResolver.resolveContext();
    const profileStatus = await gateway.getProfileStatus();
    
    // Build dashboard context
    const dashboardContext = {
      session: {
        id: crypto.randomUUID(),
        contextHash: fusionContext.contextHash,
        status: 'running',
        startTime: Date.now(),
      },
      security: {
        variant: (fusionContext.globalConfig?.env?.FUSION_VARIANT as string) || 'A',
        csrfToken: crypto.randomUUID(),
      },
      gateway: {
        version: '3.28.0-table-engine',
      },
      config: {
        env: fusionContext.globalConfig?.env || {},
      },
      rendering: {
        poolMetrics: {
          renders: 1,
        },
      },
    };
    
    console.log(renderContextDashboard(dashboardContext));
  },
  
  // v3.28 Compact dashboard
  dashboard_compact: async () => {
    const fusionContext = await FusionContextResolver.resolveContext();
    
    const dashboardContext = {
      session: {
        id: crypto.randomUUID(),
        contextHash: fusionContext.contextHash,
        status: 'running',
        startTime: Date.now(),
      },
      security: {
        variant: 'A',
        csrfToken: crypto.randomUUID(),
      },
      gateway: {
        version: '3.28.0',
      },
      config: {
        env: {},
      },
      rendering: {
        poolMetrics: {
          renders: 1,
        },
      },
    };
    
    console.log(renderContextCompact(dashboardContext));
  },
};

// Execute command or show help
async function main() {
  if (cmd && commands[cmd]) {
    try {
      await commands[cmd]();
    } catch (err) {
      console.error(c.red("Error:"), err);
      process.exit(1);
    }
  } else {
    console.log(`
${c.cyan("╔════════════════════════════════════════════════════════╗")}
${c.cyan("║")}  OpenClaw CLI - Matrix Profile Gateway v3.28         ${c.cyan("║")}
${c.cyan("╠════════════════════════════════════════════════════════╣")}
${c.cyan("║")}  Commands:                                             ${c.cyan("║")}
${c.cyan("║")}                                                        ${c.cyan("║")}
${c.cyan("║")}  ${c.green("openclaw_status")}     Check gateway status             ${c.cyan("║")}
${c.cyan("║")}  ${c.green("matrix_bridge_status")} Check Matrix bridge status       ${c.cyan("║")}
${c.cyan("║")}  ${c.green("profile_list")}        List available profiles          ${c.cyan("║")}
${c.cyan("║")}  ${c.green("profile_bind")}        Bind directory to profile        ${c.cyan("║")}
${c.cyan("║")}  ${c.green("profile_switch")}      Switch active profile            ${c.cyan("║")}
${c.cyan("║")}  ${c.green("profile_status")}      Show binding status              ${c.cyan("║")}
${c.cyan("║")}  ${c.green("shell_execute")}       Execute command with context     ${c.cyan("║")}
${c.cyan("║")}  ${c.yellow("context_exec")}        Execute with bun-context         ${c.cyan("║")}
${c.cyan("║")}  ${c.yellow("bun_config")}          Show bun-context config          ${c.cyan("║")}
${c.cyan("║")}  ${c.magenta("dashboard")}           Show v3.28 table dashboard       ${c.cyan("║")}
${c.cyan("║")}  ${c.magenta("dashboard_compact")}   Show compact dashboard           ${c.cyan("║")}
${c.cyan("║")}  ${c.yellow("version")}             Show version info                ${c.cyan("║")}
${c.cyan("╚════════════════════════════════════════════════════════╝")}
`);
    
    if (cmd) {
      console.error(c.red(`Unknown command: ${cmd}`));
      process.exit(1);
    }
  }
}

main();
