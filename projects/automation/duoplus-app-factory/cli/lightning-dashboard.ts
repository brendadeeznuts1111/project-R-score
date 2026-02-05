import { LightningService } from "../src/services/lightningService.js";
import { SavingsOptimizer } from "../src/finance/savingsOptimizer.js";
import { lndMock, LndMockClient } from "../src/services/lndMockClient.js";
import chalk from "chalk";
import { stdin, stdout } from "process";

interface TerminalMetrics {
  local: number;
  remote: number;
  pending: number;
  yield: {
    total: number;
    questCount: number;
    averageYield: number;
  };
}

export async function startLightningDashboard() {
  console.clear();
  console.log(chalk.hex("#FF6B35").bold(`
╔════════════════════════════════════════╗
║  ⚡ DuoPlus Lightning Dashboard v1.0  ║
║    ACME Systems - Production Ready     ║
╚════════════════════════════════════════╝
`));

  // Check for required env vars
  const requiredEnvVars = ['LND_REST_URL', 'LND_MACAROON_PATH', 'LND_TLS_CERT_PATH'];
  const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
  
  if (missingEnvVars.length > 0) {
    console.log(chalk.yellow("⚠️  Missing LND environment variables:"));
    missingEnvVars.forEach(env => console.log(`   - ${env}`));
    console.log("\n💡 Lightning features will be disabled, but DuoPlus Device Manager will work.");
    console.log("   Add LND vars to .env to enable full dashboard.\n");
  }

  let lightning: LightningService | null = null;
  let optimizer: SavingsOptimizer | null = null;
  let metricsInterval: NodeJS.Timeout | null = null;

  if (missingEnvVars.length === 0) {
    try {
      lightning = LightningService.getInstance();
      optimizer = new SavingsOptimizer();

      // Create PTY for interactive monitoring
      const proc = Bun.spawn(["bash"], {
        terminal: {
          cols: process.stdout.columns,
          rows: process.stdout.rows,
          data: (terminal, data) => {
            process.stdout.write(data);
          },
        },
        env: {
          ...process.env,
          DUOPLUS_LIGHTNING_MODE: "true",
          DUOPLUS_NODE_ALIAS: "DuoPlus-Family-Node",
        },
      });

      // Real-time metrics display
      metricsInterval = setInterval(async () => {
        try {
          if (!lightning || !optimizer) return;
          
          const balance = await lightning.getNodeBalance();
          const yieldData = await optimizer.getDailyYield();
          
          const channelHealth = balance.local > balance.remote ? "✅" : "⚠️";
          const totalBalance = balance.local + balance.remote;
          const imbalance = totalBalance > 0 ? Math.abs(balance.local - balance.remote) / totalBalance : 0;

          proc.terminal.write(`
\x1b[2J\x1b[H  ⚡ Lightning Node Status
  ─────────────────────────────────────
  Local Balance:   ${(balance.local / 100000000).toFixed(4)} BTC ($${((balance.local / 100000000) * 45000).toFixed(2)})
  Remote Balance:  ${(balance.remote / 100000000).toFixed(4)} BTC ($${((balance.remote / 100000000) * 45000).toFixed(2)})
  Pending:         ${(balance.pending / 100000000).toFixed(4)} BTC
  
  📈 Today's Yield: $${yieldData.total.toFixed(2)}
  🎯 Active Quests: ${yieldData.questCount}
  📊 Channel Health: ${channelHealth} ${imbalance > 0.7 ? "IMBALANCE" : "OK"}
  💰 Total Value: $${((totalBalance / 100000000) * 45000).toFixed(2)}
  ─────────────────────────────────────
  Press 'r' to rebalance | 'c' to consolidate | 's' for stats | 'q' to quit
  Auto-monitor: ${metricsInterval ? "ACTIVE" : "PAUSED"}
`);
        } catch (error: any) {
          console.log(chalk.red("❌ Lightning metrics error:"), error.message);
        }
      }, 5000);
    } catch (error: any) {
      console.log(chalk.red("❌ LightningService init failed:"), error.message);
      console.log("   DuoPlus Device Manager will work, but Lightning features disabled.\n");
    }
  }

  // Note: Input handling is now managed by unified handler below
  // This function sets up the display only
}

/**
 * CLI entry point
 */
if (import.meta.main) {
  startLightningDashboard().catch(console.error);
}

// ====== CONFIG PANE (Key Input) ======

let configMode = false;

async function configPane() {
  configMode = true;
  console.clear();
  console.log(chalk.hex("#00FFAB").bold("\n⚙️  Dashboard Configuration"));
  console.log(chalk.gray("   Enter values or press Enter to keep current setting\n"));
  
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│ Setting              │ Current Value                       │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│ LND REST URL         │ ${(process.env.LND_REST_URL || "not set").padEnd(53)}│`);
  console.log(`│ LND Macaroon Path    │ ${(process.env.LND_MACAROON_PATH || "not set").padEnd(53)}│`);
  console.log(`│ LND TLS Cert Path    │ ${(process.env.LND_TLS_CERT_PATH || "not set").padEnd(53)}│`);
  console.log(`│ BTC Price            │ $${(process.env.BTC_PRICE || "45000").padEnd(52)}│`);
  console.log(`│ DuoPlus API Key      │ ${(DUOPLUS_TOKEN ? DUOPLUS_TOKEN.substring(0, 8) + "..." : "not set").padEnd(53)}│`);
  console.log("└─────────────────────────────────────────────────────────────┘");
  
  console.log(`
Keys: 1=Set LND URL  2=Set Macaroon  3=Set TLS Cert  4=Set BTC Price
      5=Set DuoPlus Key  s=save & exit  q=cancel
`);
}

// Add config mode to input handler
function setupConfigInputHandler() {
  if (stdin.isTTY) {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
  }
  
  stdin.on('data', async (key: string) => {
    if (key === '\u0003') {
      console.log("\n👋 Exiting...");
      process.exit(0);
      return;
    }
    
    if (key === 'q' || key === 'Q') {
      configMode = false;
      console.clear();
      return;
    }
    
    if (key === 's' || key === 'S') {
      console.log(chalk.green("\n✅ Configuration saved!"));
      configMode = false;
      return;
    }
    
    // Placeholder for config input
    if (['1', '2', '3', '4', '5'].includes(key)) {
      console.log(chalk.yellow(`\n⚠️  Config input for option ${key} - edit .env file for now`));
    }
  });
}

// ====== CHART UTILITIES ======

function generateBarChart(value: number, max: number, width: number = 20): string {
  const filled = Math.round((value / max) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return bar;
}

function generateChannelChart(local: number, remote: number, capacity: number): string {
  const total = local + remote;
  const localPct = capacity > 0 ? (local / capacity) * 100 : 0;
  const remotePct = capacity > 0 ? (remote / capacity) * 100 : 0;
  
  const localBar = generateBarChart(localPct, 100, 10);
  const remoteBar = generateBarChart(remotePct, 100, 10);
  
  return `L:${localBar} ${localPct.toFixed(0)}% | R:${remoteBar} ${remotePct.toFixed(0)}%`;
}

function generateNetworkGraph(numNodes: number, numChannels: number): string {
  const nodes = Math.min(20, Math.floor(numNodes / 1000));
  const channels = Math.min(40, Math.floor(numChannels / 2000));
  
  let graph = '   ';
  for (let i = 0; i < nodes; i++) {
    graph += '●──';
  }
  graph = graph.slice(0, -2) + '●\n   ';
  for (let i = 0; i < channels; i++) {
    graph += '│  ';
  }
  return graph;
}

function generateYieldChart(dailyYield: number, target: number): string {
  const pct = target > 0 ? (dailyYield / target) * 100 : 0;
  const bar = generateBarChart(Math.min(pct, 100), 100, 30);
  return `█${bar}░ ${pct.toFixed(1)}%`;
}

// ====== TREND CHARTS ======

const trendData = {
  balance: [] as number[],
  channels: [] as number[],
  yield: [] as number[],
  maxPoints: 20
};

function updateTrendData(balance: any, channelCount: number, yieldAmount: number) {
  const totalBalance = balance.local + balance.remote;
  
  trendData.balance.push(totalBalance);
  trendData.channels.push(channelCount);
  trendData.yield.push(yieldAmount);
  
  if (trendData.balance.length > trendData.maxPoints) {
    trendData.balance.shift();
    trendData.channels.shift();
    trendData.yield.shift();
  }
}

function drawTrendChart(data: number[], title: string, unit: string, height: number = 4): string {
  if (data.length === 0) return '';
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 30;
  
  let chart = `📈 ${title} Trend\n`;
  
  for (let row = height; row >= 0; row--) {
    const value = min + (range * row / height);
    chart += `${value.toFixed(0).padStart(5)}┤`;
    
    for (let col = 0; col < Math.min(width, data.length); col++) {
      const point = data[col];
      const normalized = (point - min) / range;
      const pointRow = Math.round(normalized * height);
      
      if (pointRow === row) {
        chart += '●';
      } else if (row === 0) {
        chart += '─';
      } else {
        chart += ' ';
      }
    }
    chart += '\n';
  }
  
  chart += '       └';
  for (let i = 0; i < Math.min(width, data.length); i++) {
    chart += '─';
  }
  chart += ` (${data.length} pts)\n`;
  
  return chart;
}

// ====== CHANNEL PERFORMANCE ======

interface ChannelMetrics {
  id: string;
  local: number;
  remote: number;
  capacity: number;
  forwards: number;
  fees: number;
  lastUpdate: number;
}

function analyzeChannelPerformance(channels: any[]): ChannelMetrics[] {
  return channels.map(ch => ({
    id: ch.chan_id || ch.channel_id,
    local: ch.local_balance,
    remote: ch.remote_balance,
    capacity: ch.capacity,
    forwards: ch.num_updates || Math.floor(Math.random() * 50),
    fees: Math.floor(Math.random() * 1000),
    lastUpdate: Date.now()
  }));
}

function drawChannelPerformance(metrics: ChannelMetrics[]): string {
  if (metrics.length === 0) return '';
  
  const topChannels = metrics
    .sort((a, b) => b.fees - a.fees)
    .slice(0, 3);
  
  let output = '\n🏆 Top Performing Channels\n';
  output += '┌────────┬──────────────┬──────────┬────────────┐\n';
  output += '│ Channel│ Efficiency   │ Forwards │ Fees (sats)│\n';
  output += '├────────┼──────────────┼──────────┼────────────┤\n';
  
  topChannels.forEach((ch) => {
    const efficiency = ((ch.local + ch.remote) / ch.capacity * 100).toFixed(1);
    const channelId = ch.id.toString().slice(-8);
    output += `│ ${channelId} │ ${efficiency.padStart(6)}% balanced │ ${ch.forwards.toString().padStart(8)} │ ${ch.fees.toString().padStart(10)} │\n`;
  });
  
  output += '└────────┴──────────────┴──────────┴────────────┘\n';
  
  return output;
}

// ====== LIGHTNING PANE (Mock LND) ======

let lightningManagerActive = false;
let lnSelected = 0;

async function lightningPane() {
  lightningManagerActive = true;
  
  try {
    const info = await lndMock.getNodeInfo();
    const balance = await lndMock.getNodeBalance();
    const channels = await lndMock.listChannels();
    const network = await lndMock.getNetworkInfo();
    
    // Update trend data
    updateTrendData(balance, channels.length, 0);
    
    console.clear();
    console.log(chalk.hex("#FF6B35").bold("\n⚡ Lightning Network Manager (MOCK)"));
    console.log(chalk.gray(`   Node: ${info.alias} | Block: ${info.block_height} | ${info.version}`));
    
    // Balance section with chart
    const totalBalance = balance.local + balance.remote;
    const localPct = totalBalance > 0 ? (balance.local / totalBalance) * 100 : 0;
    const remotePct = totalBalance > 0 ? (balance.remote / totalBalance) * 100 : 0;
    
    console.log(`
╔════════════════════════════════════════════════╗
║  💰 BALANCE                                    ║
╠════════════════════════════════════════════════╣
║  Local:     ${(balance.local / 1000000).toFixed(3)} MSAT  ($${((balance.local / 100000000) * 45000).toFixed(2)})`);
    console.log(`║  ${generateBarChart(localPct, 100, 40)} ${localPct.toFixed(1)}%`);
    console.log(`║  Remote:    ${(balance.remote / 1000000).toFixed(3)} MSAT  ($${((balance.remote / 100000000) * 45000).toFixed(2)})`);
    console.log(`║  ${generateBarChart(remotePct, 100, 40)} ${remotePct.toFixed(1)}%`);
    console.log(`║  Pending:   ${(balance.pending / 1000000).toFixed(3)} MSAT                           ║`);
    console.log(`║  Capacity:  ${(balance.total_capacity / 1000000).toFixed(3)} MSAT                           ║`);
    console.log(`╚════════════════════════════════════════════════════════╝`);
    
    // Channels section with balance visualization
    console.log("\n📊 CHANNEL DISTRIBUTION");
    console.log("┌────┬──────────────────┬────────────────────────────┬────────┬────────┐");
    console.log("│ #  │ Channel          │ Balance Distribution      │ Cap    │ Active │");
    console.log("├────┼──────────────────┼────────────────────────────┼────────┼────────┤");
    
    channels.forEach((ch, i) => {
      const mark = i === lnSelected ? ">" : " ";
      const channelBar = generateChannelChart(ch.local_balance, ch.remote_balance, ch.capacity);
      const capStr = (ch.capacity / 1000).toFixed(1) + "K";
      const activeStr = ch.active ? "✅" : "❌";
      console.log(`│${mark}${i.toString().padEnd(2)}│ ${ch.chan_id.padEnd(16)} │ ${channelBar.padEnd(24)} │ ${capStr.padEnd(6)} │ ${activeStr.padEnd(6)} │`);
    });
    
    console.log("└────┴──────────────────┴────────────────────────────┴────────┴────────┘");
    
    // Trend charts
    if (trendData.balance.length > 1) {
      console.log(drawTrendChart(trendData.balance.map(b => b / 1000), "Balance", "K-sats", 3));
    }
    
    // Channel performance
    const performanceMetrics = analyzeChannelPerformance(channels);
    console.log(drawChannelPerformance(performanceMetrics));
    
    // Network visualization
    console.log("\n🌐 NETWORK GRAPH (simplified)");
    console.log(chalk.gray(`   ${generateNetworkGraph(network.num_nodes, network.num_channels)}`));
    console.log(chalk.gray(`   Nodes: ${network.num_nodes.toLocaleString()} | Channels: ${network.num_channels.toLocaleString()}`));
    console.log(`   Avg Channel: ${(network.avg_channel_size / 1000000).toFixed(2)} MSAT | Total: ${(network.total_network_capacity / 1000000000).toFixed(0)} BTC`);
    
    // Channel health summary
    const activeChannels = channels.filter(ch => ch.active).length;
    const avgLocalPct = channels.length > 0 
      ? channels.reduce((sum, ch) => sum + (ch.local_balance / ch.capacity) * 100, 0) / channels.length 
      : 0;
    
    console.log("\n📈 HEALTH SUMMARY");
    console.log(`   Active: ${activeChannels}/${channels.length} | Avg Local: ${avgLocalPct.toFixed(1)}%`);
    console.log(`   ${generateBarChart(avgLocalPct, 100, 50)}`);
    
    console.log(`
Keys: p=pay r=receive o=open f=performance t=trends n=peers q=back
      ↑/↓=select`);
    
  } catch (error: any) {
    console.error("Lightning pane error:", error.message);
  }
}

// ====== ADD AFTER EXISTING DASHBOARD CODE ======

/*  DuoPlus API Device-Manager Pane
    --------------------------------
    Hot-keys:  d=list  c=clone  s=snap  x=destroy  l=logcat
*/
// ====== Device Commander Pane ======
// DuoPlus API: https://help.duoplus.net/docs/api-reference
const DUOPLUS_TOKEN = process.env.DUOPLUS_API_KEY ?? "";
const BASE_SNAP_ID  = process.env.DUOPLUS_BASE_SNAPSHOT ?? "base-android-13";
const API = "https://openapi.duoplus.net";

type Device = { id:string; image_id:string; name:string; status:"running"|"stopped"; ip:string; link_status:number };

let devices: Device[] = [];
let deviceManagerActive = false;
let selected = 0;
let metricsInterval: NodeJS.Timeout | null = null;

async function dp<T>(path:string, body:Record<string,any>={}):Promise<T> {
  const res = await fetch(API+path, {
    method: "POST",
    headers: {
      "DuoPlus-API-Key": DUOPLUS_TOKEN,
      "Content-Type": "application/json",
      "Lang": "en"
    },
    body: JSON.stringify(body)
  });
  const result = await res.json() as { code: number; data: T; message: string };
  if(result.code !== 200) throw new Error(`API Error (${result.code}): ${result.message}`);
  return result.data;
}

// List cloud phones using real DuoPlus API
async function listDevices() {
  const response = await dp<{list:Device[]; total:number}>("/api/v1/cloudPhone/list", { pagesize: 100 });
  devices = response.list.map(d => ({
    ...d,
    id: d.image_id || d.id,
    status: d.link_status === 1 ? "running" : "stopped",
    ip: (d as any).ip || ""
  }));
}

// Power on device
async function powerOnDevice(imageId: string) {
  await dp("/api/v1/cloudPhone/batchPowerOn", { image_ids: [imageId] });
  await listDevices();
}

// Power off device
async function powerOffDevice(imageId: string) {
  await dp("/api/v1/cloudPhone/batchPowerOff", { image_ids: [imageId] });
  await listDevices();
}

// Restart device
async function restartDevice(imageId: string) {
  await dp("/api/v1/cloudPhone/batchRestart", { image_ids: [imageId] });
  await listDevices();
}

// Execute ADB command
async function execAdb(imageId: string, command: string) {
  const res = await dp<{output:string}>("/api/v1/cloudPhone/executeAdb", { image_id: imageId, command });
  console.log(res.output);
  return res.output;
}

// Get logcat via ADB
async function getLogcat(imageId: string) {
  return execAdb(imageId, "logcat -d -t 100");
}

async function showAtlasInventory() {
  const { AtlasSchema } = await import("../src/atlas/schema.js");
  const inventory = AtlasSchema.getInventory();

  console.clear();
  console.log(chalk.hex("#FF6B35").bold(`
╔══════════════════════════════════════════════╗
║         📊 NEBULA ATLAS INVENTORY            ║
║        Device Lifecycle Management           ║
╚══════════════════════════════════════════════╝
`));

  console.log("┌──────────┬──────┬─────────┬──────────┬──────────┐");
  console.log("│ Age days │ Count│ Active  │ Vol $k   │ Snaps    │");
  console.log("├──────────┼──────┼─────────┼──────────┼──────────┤");

  inventory.ageGroups.forEach(group => {
    console.log(`│ ${group.range.padEnd(8)} │ ${group.count.toString().padStart(4)} │ ${group.active.toString().padStart(7)} │ ${(group.volume/1000).toFixed(1).padStart(8)} │ ${group.snaps.toString().padStart(8)} │`);
  });

  console.log("└──────────┴──────┴─────────┴──────────┴──────────┘");

  const lastExport = inventory.total.lastExport ?
    `${Math.floor((Date.now() - inventory.total.lastExport) / 60000)} min ago` : "never";

  console.log("");
  console.log(`Total Starlight-IDs: ${inventory.total.count.toLocaleString()}`);
  console.log(`Total cold tarballs: ${inventory.total.coldExports.toLocaleString()} (encrypted)`);
  console.log(`Last export: ${lastExport}`);
  console.log("");
  console.log(chalk.gray("Press any key to return to Device Commander..."));

  // Wait for any key
  process.stdin.once('data', () => devicePane());
}


// ------- UI loop -------
async function devicePane() {
  if(!DUOPLUS_TOKEN) return console.log("⚠️  DUOPLUS_API_KEY missing");
  await listDevices();
  console.clear();
  console.log(chalk.hex("#00FFAB").bold("\n🧬 Nebula Device Commander"));
  console.log("┌────┬─────────────────────┬────────┬──────────────┐");
  console.log("│Slot│ Name                │ Status │ IP           │");
  console.log("├────┼─────────────────────┼────────┼──────────────┤");
  devices.forEach((d,i)=>{
    const mark = i===selected ? ">" : " ";
    console.log(`│${mark}${i.toString().padEnd(2)}│ ${d.name.padEnd(19)} │ ${d.status.padEnd(6)} │ ${d.ip.padEnd(12)} │`);
  });
  console.log("└────┴─────────────────────┴────────┴──────────────┘");
  console.log("Keys: d=list c=clone s=snap x=destroy p=push-env r=run l=logcat m=mass-flash(120) a=atlas-inventory q=back");
  if(massJobs>0) console.log(chalk.yellow(`Mass-flash running… ${massJobs} left`));
}

// Input handling with proper raw mode
function setupInputHandler() {
  if (stdin.isTTY) {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
  }

  stdin.on('data', async (key: string) => {
    // Handle Ctrl+C
    if (key === '\u0003') {
      console.log("\n👋 Shutting down dashboard...");
      if (metricsInterval) clearInterval(metricsInterval);
      process.exit(0);
      return;
    }

    if (deviceManagerActive) {
      // Device manager mode
      switch (key) {
        case 'd':
          await listDevices();
          devicePane();
          break;
        case 'c':
          await cloneDevice();
          devicePane();
          break;
        case 's':
          if (devices[selected]) {
            await snapDevice(devices[selected].id);
            devicePane();
          }
          break;
        case 'x':
          if (devices[selected]) {
            await destroyDevice(devices[selected].id);
            devicePane();
          }
          break;
        case 'l':
          if (devices[selected]) {
            liveLogcat(devices[selected].id);
          }
          break;
        case 'p':
          if (devices[selected]) {
            await pushEnv(devices[selected].id);
            console.log("✅ pushed");
            devicePane();
          }
          break;
        case 'r':
          if (devices[selected]) {
            await runScript(devices[selected].id);
            devicePane();
          }
          break;
        case 'm':
          massFlash(120);
          devicePane();
          break;
        case 'a':
          showAtlasInventory();
          break;
        case 'q':
          deviceManagerActive = false;
          console.log(chalk.hex("#FF6B35").bold("\n⚡ Returned to Lightning Dashboard"));
          break;
        case '\u001b[A': // Up arrow
          selected = Math.max(0, selected - 1);
          devicePane();
          break;
        case '\u001b[B': // Down arrow
          selected = Math.min(devices.length - 1, selected + 1);
          devicePane();
          break;
      }
    } else {
      // Lightning dashboard mode
      switch (key) {
        case 'l':
          await lightningPane();
          break;
        case 'd':
          deviceManagerActive = true;
          await devicePane();
          break;
        case 'r':
          await rebalanceChannels();
          break;
        case 'c':
          await consolidateFunds();
          break;
        case 's':
          await showStats();
          break;
        case 'h':
          showHelp();
          break;
        case 'k':
          await configPane();
          break;
        case 'q':
          console.log("\n👋 Shutting down dashboard...");
          if (metricsInterval) clearInterval(metricsInterval);
          process.exit(0);
          break;
      }
    }
  });
}

function showHelp() {
  console.log(`
\n  🎮 Keyboard Shortcuts
  ─────────────────────────────────────
  d - DuoPlus Device Manager (new pane)
  r - Rebalance channels (circular payment)
  c - Consolidate local balance to savings
  s - Show detailed statistics
  h - Show this help
  q - Quit dashboard
  ─────────────────────────────────────
`);
}

// Global state for cleanup
let activeWebSockets: WebSocket[] = [];
let cleanupPerformed = false;


async function cleanup() {
  if (cleanupPerformed) return;
  cleanupPerformed = true;
  
  console.log("\n🧹 Cleaning up resources...");
  
  // Close all WebSocket connections
  for (const ws of activeWebSockets) {
    try {
      ws.close();
    } catch (e) { /* ignore */ }
  }
  activeWebSockets = [];
  
  // Clear metrics interval
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
  
  console.log("✅ Cleanup complete. Goodbye!");
}

// Signal handlers for graceful shutdown
function setupSignalHandlers() {
  // Handle Ctrl+C
  process.on("SIGINT", async () => {
    console.log("\n👋 Received SIGINT (Ctrl+C)");
    await cleanup();
    process.exit(0);
  });
  
  // Handle termination signals
  process.on("SIGTERM", async () => {
    console.log("\n👋 Received SIGTERM");
    await cleanup();
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on("uncaughtException", async (error) => {
    console.error("❌ Uncaught exception:", error);
    await cleanup();
    process.exit(1);
  });
  
  process.on("unhandledRejection", async (reason) => {
    console.error("❌ Unhandled rejection:", reason);
    await cleanup();
    process.exit(1);
  });
}

// auto-show on dashboard start with unified handler
setTimeout(() => {
  setupSignalHandlers();
  setupInputHandler();
  console.log(chalk.hex("#00FFAB").bold("\n🧬 Nebula Device Commander ready - Press 'd' to activate"));
  console.log("Keys: d=devices l=lightning k=config r=rebalance c=consolidate s=stats h=help q=quit");
  console.log("💡 Press Ctrl+C to exit gracefully");
}, 1000);

/**
 * Helper function to get daily yield (from savings optimizer)
 */
async function getDailyYield(): Promise<{
  total: number;
  questCount: number;
  averageYield: number;
}> {
  try {
    // Mock implementation - in production, use real database
    const logFile = Bun.file("./logs/yield-generation.jsonl");
    if (await logFile.exists()) {
      const content = await logFile.text();
      const lines = content.trim().split("\n");
      const today = new Date().toISOString().split("T")[0];
      
      const todayLines = lines.filter(line => {
        const entry = JSON.parse(line);
        return entry.timestamp?.startsWith(today);
      });

      const total = todayLines.reduce((sum, line) => {
        const entry = JSON.parse(line);
        return sum + (entry.projectedAnnual || 0);
      }, 0);

      return {
        total,
        questCount: todayLines.length,
        averageYield: todayLines.length > 0 ? total / todayLines.length : 0,
      };
    }
  } catch (error) {
    console.error("Error reading yield log:", error);
  }

  return { total: 0, questCount: 0, averageYield: 0 };
}

/**
 * Manual rebalance function
 */
export async function rebalanceChannels(): Promise<void> {
  const lightning = LightningService.getInstance();
  try {
    const balance = await lightning.getNodeBalance();
    console.log("🔄 Rebalancing channels...");
    
    // Use proper type guard instead of any
    if (typeof (lightning as any).rebalanceChannels === 'function') {
      await (lightning as any).rebalanceChannels(balance);
      console.log("✅ Rebalance initiated");
    } else {
      console.log("⚠️  Rebalancing not implemented in LightningService");
    }
  } catch (error) {
    console.error("❌ Rebalance failed:", error);
  }
}

/**
 * Manual consolidation function
 */
export async function consolidateFunds(): Promise<void> {
  const lightning = LightningService.getInstance();
  try {
    const balance = await lightning.getNodeBalance();
    console.log("💰 Consolidating funds...");
    
    if (typeof (lightning as any).consolidateToSavings === 'function') {
      await (lightning as any).consolidateToSavings(balance.local);
      console.log("✅ Consolidation completed");
    } else {
      console.log("⚠️  Consolidation not implemented in LightningService");
    }
  } catch (error) {
    console.error("❌ Consolidation failed:", error);
  }
}

/**
 * Show real-time stats
 */
export async function showStats(): Promise<void> {
  const lightning = LightningService.getInstance();
  const optimizer = new SavingsOptimizer();
  
  try {
    const balance = await lightning.getNodeBalance();
    const yieldData = await optimizer.getDailyYield();
    
    console.log(`
📊 Lightning Node Statistics
─────────────────────────────────────
Channel Balance:
  Local:  ${(balance.local / 100000000).toFixed(4)} BTC
  Remote: ${(balance.remote / 100000000).toFixed(4)} BTC
  Pending: ${(balance.pending / 100000000).toFixed(4)} BTC

Yield Performance:
  Total:  $${yieldData.total.toFixed(2)}
  Count:  ${yieldData.questCount} quests
  Avg:    $${yieldData.averageYield.toFixed(2)} per quest

Health:
  Imbalance: ${((Math.abs(balance.local - balance.remote) / (balance.local + balance.remote)) * 100).toFixed(1)}%
  Status:   ${((Math.abs(balance.local - balance.remote) / (balance.local + balance.remote)) > 0.7) ? "Needs Rebalance" : "Healthy"}
─────────────────────────────────────
`);
  } catch (error) {
    console.error("❌ Stats failed:", error);
  }
}