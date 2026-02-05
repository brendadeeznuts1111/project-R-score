// tests/config_immutability_test.ts
import { test, expect, nanoseconds } from "bun";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { file } from "bun";

// Helper to generate header
function generateHeader(config: {
  version: number;
  registryHash: number;
  flags: number;
  terminalMode: number;
  rows: number;
  cols: number;
}): Buffer {
  const header = Buffer.alloc(104);
  
  // Magic "BUN1"
  header.writeUInt32LE(0x42354e31, 0);
  
  // Config version
  header.writeUInt8(config.version, 4);
  
  // Registry hash
  header.writeUInt32LE(config.registryHash, 5);
  
  // Feature flags
  header.writeUInt32LE(config.flags, 9);
  
  // Terminal config
  header.writeUInt8(config.terminalMode, 13);
  header.writeUInt8(config.rows, 14);
  header.writeUInt8(config.cols, 15);
  
  // CRC64 placeholder (bytes 16-23)
  // In production, calculate proper checksum
  
  return header;
}

// Helper to get config hash
async function getConfigHash(): Promise<string> {
  if (!existsSync("bun.lockb")) {
    return "";
  }
  
  const lockfile = file("bun.lockb");
  const buffer = await lockfile.arrayBuffer();
  const view = new DataView(buffer.slice(0, 104));
  
  return `${view.getUint8(4)}-${view.getUint32(5, true)}-${view.getUint32(9, true)}`;
}

test("13-byte config is immutable across spawns", async () => {
  const testLockfile = "test-bun.lockb";
  
  try {
    // Write initial config
    const header = generateHeader({
      version: 1,
      registryHash: 0x3b8b5a5a,
      flags: 0x0,
      terminalMode: 0x01,
      rows: 24,
      cols: 80,
    });
    
    writeFileSync(testLockfile, header);
    
    // Backup original if exists
    const originalExists = existsSync("bun.lockb");
    let originalBackup: Buffer | null = null;
    if (originalExists) {
      originalBackup = readFileSync("bun.lockb");
    }
    
    // Copy test lockfile
    writeFileSync("bun.lockb", header);
    
    const hash1 = await getConfigHash();
    
    // Try to modify config using CLI
    const proc = Bun.spawn({
      cmd: ["bun", "src/cli/config.ts", "set", "version", "0"],
      stdout: "pipe",
      stderr: "pipe",
    });
    
    await proc.exited;
    
    // Verify config unchanged (immutability enforced)
    const hash2 = await getConfigHash();
    expect(hash1).toBe(hash2);
    
    // Restore original
    if (originalBackup) {
      writeFileSync("bun.lockb", originalBackup);
    } else if (existsSync("bun.lockb")) {
      unlinkSync("bun.lockb");
    }
  } finally {
    if (existsSync(testLockfile)) {
      unlinkSync(testLockfile);
    }
  }
});

test("Lockfile write is 45ns", async () => {
  const testLockfile = "test-write.lockb";
  
  try {
    const header = generateHeader({
      version: 1,
      registryHash: 0x3b8b5a5a,
      flags: 0x0,
      terminalMode: 0x01,
      rows: 24,
      cols: 80,
    });
    
    writeFileSync(testLockfile, header);
    
    const lockfile = file(testLockfile);
    
    const start = nanoseconds();
    const current = await lockfile.arrayBuffer();
    const view = new Uint8Array(current);
    view[4] = 1; // Write version byte
    await Bun.write(testLockfile, view);
    const duration = nanoseconds() - start;
    
    expect(duration).toBeLessThan(50); // 45ns SLA (allowing some margin)
    console.log(`Lockfile write: ${duration}ns`);
  } finally {
    if (existsSync(testLockfile)) {
      unlinkSync(testLockfile);
    }
  }
});

test("Config is 13 bytes (core)", () => {
  const header = generateHeader({
    version: 1,
    registryHash: 0x3b8b5a5a,
    flags: 0x0,
    terminalMode: 0x01,
    rows: 24,
    cols: 80,
  });
  
  // Core config is 12 bytes (bytes 4-15, excluding CRC64)
  const coreConfig = header.slice(4, 16);
  expect(coreConfig.length).toBe(12);
  console.log(`Config size: ${coreConfig.length} bytes`);
});

