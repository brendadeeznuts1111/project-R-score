// src/cli/live.ts - Real-time config monitoring
import { file, nanoseconds } from "bun";

const lockfile = "bun.lockb";
const POLL_INTERVAL_MS = 100; // Poll every 100ms

console.log("🔍 Monitoring bun.lockb for changes... (Ctrl+C to exit)\n");

// Track last state for diff
let lastState: {
  version: number;
  registryHash: number;
  featureFlags: number;
  terminalMode: number;
  rows: number;
  cols: number;
} | null = null;

async function readConfig() {
  try {
    const lockfileFile = file(lockfile);
    if (!(await lockfileFile.exists())) {
      console.log(`⚠️  ${lockfile} does not exist yet`);
      return null;
    }

    const start = nanoseconds();
    const header = await lockfileFile.arrayBuffer();
    const view = new DataView(header.slice(0, 104));

    // Read 13-byte config starting at offset 4
    const version = view.getUint8(4);
    const registryHash = view.getUint32(5, true);
    const featureFlags = view.getUint32(9, true);
    const terminalMode = view.getUint8(13);
    const rows = view.getUint8(14);
    const cols = view.getUint8(15);

    const duration = nanoseconds() - start;

    return {
      version,
      registryHash,
      featureFlags,
      terminalMode,
      rows,
      cols,
      readCost: duration,
    };
  } catch (error) {
    console.error(`❌ Error reading config: ${error}`);
    return null;
  }
}

function formatFeatureFlags(flags: number): string {
  const enabled: string[] = [];
  if (flags & 0x00000001) enabled.push("PREMIUM_TYPES");
  if (flags & 0x00000002) enabled.push("PRIVATE_REGISTRY");
  if (flags & 0x00000004) enabled.push("DEBUG");
  if (flags & 0x00000008) enabled.push("BETA_API");
  if (flags & 0x00000010) enabled.push("DISABLE_BINLINKING");
  if (flags & 0x00000020) enabled.push("DISABLE_IGNORE_SCRIPTS");
  if (flags & 0x00000040) enabled.push("TERMINAL_RAW");
  if (flags & 0x00000080) enabled.push("DISABLE_ISOLATED_LINKER");
  if (flags & 0x00000100) enabled.push("TYPES_MYCOMPANY");
  if (flags & 0x00000200) enabled.push("MOCK_S3");
  if (flags & 0x00000400) enabled.push("FAST_CACHE");

  return enabled.length > 0 ? enabled.join(", ") : "none";
}

function formatTerminalMode(mode: number): string {
  switch (mode) {
    case 0b00000000:
      return "disabled";
    case 0b00000001:
      return "cooked";
    case 0b00000010:
      return "raw";
    case 0b00000011:
      return "pipe";
    default:
      return `unknown (0x${mode.toString(16)})`;
  }
}

async function displayConfig(state: NonNullable<Awaited<ReturnType<typeof readConfig>>>) {
  const timestamp = new Date().toISOString();

  console.log(`\n[${timestamp}] Lockfile changed:`);
  console.log(`  Version: ${state.version} (0x${state.version.toString(16)})`);
  console.log(`  Registry: 0x${state.registryHash.toString(16).padStart(8, "0")}`);
  console.log(
    `  Features: 0x${state.featureFlags.toString(16).padStart(8, "0")} (${formatFeatureFlags(state.featureFlags)})`
  );
  console.log(
    `  Terminal: ${formatTerminalMode(state.terminalMode)} (mode=0x${state.terminalMode.toString(2).padStart(8, "0")})`
  );
  console.log(`  Dimensions: ${state.rows} rows × ${state.cols} cols`);
  console.log(`  Lockfile: ${lockfile}`);
  console.log(`  Read cost: ${state.readCost}ns`);

  // Show diff if we have previous state
  if (lastState) {
    const changes: string[] = [];
    if (state.version !== lastState.version)
      changes.push(`version: ${lastState.version} → ${state.version}`);
    if (state.registryHash !== lastState.registryHash)
      changes.push(
        `registry: 0x${lastState.registryHash.toString(16)} → 0x${state.registryHash.toString(16)}`
      );
    if (state.featureFlags !== lastState.featureFlags)
      changes.push(
        `features: 0x${lastState.featureFlags.toString(16)} → 0x${state.featureFlags.toString(16)}`
      );
    if (state.terminalMode !== lastState.terminalMode)
      changes.push(
        `terminal: ${formatTerminalMode(lastState.terminalMode)} → ${formatTerminalMode(state.terminalMode)}`
      );

    if (changes.length > 0) {
      console.log(`  📝 Changes: ${changes.join(", ")}`);
    } else {
      console.log(`  ✅ No changes detected`);
    }
  }

  lastState = {
    version: state.version,
    registryHash: state.registryHash,
    featureFlags: state.featureFlags,
    terminalMode: state.terminalMode,
    rows: state.rows,
    cols: state.cols,
  };
}

// Initial read
const initialState = await readConfig();
if (initialState) {
  await displayConfig(initialState);
}

// Watch for changes using polling (cross-platform)
let lastModified: number | null = null;

async function watchConfig() {
  try {
    while (true) {
      const lockfileFile = file(lockfile);
      
      if (await lockfileFile.exists()) {
        const stats = await lockfileFile.stat();
        const currentModified = stats.mtimeMs;
        
        if (lastModified === null || currentModified !== lastModified) {
          lastModified = currentModified;
          
          const state = await readConfig();
          if (state) {
            await displayConfig(state);
          }
        }
      } else if (lastModified !== null) {
        // File was deleted
        console.log(`\n⚠️  ${lockfile} was deleted`);
        lastModified = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  } catch (error) {
    console.error(`Error watching ${lockfile}:`, error);
    process.exit(1);
  }
}

// Start watching
watchConfig();

// Keep process alive
process.on("SIGINT", () => {
  console.log("\n\n👋 Stopping monitor...");
  process.exit(0);
});

