/**
 * bun-write-delete-array-demo.ts
 * Demonstrates Bun.write, unlink (node:fs), and array ops
 * in the style of service-color-secrets.ts
 *
 * Run: bun run bun-write-delete-array-demo.ts
 */

import { mkdir, rm } from "node:fs/promises";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

interface SecretEntry {
  name: string;
  value: string;
  status: "active" | "expired" | "revoked";
}

const DEMO_DIR = "./demo-write-delete-tmp";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Bun.write — write string, JSON, binary, and BunFile copy
// ═══════════════════════════════════════════════════════════════════════════════

async function demoBunWrite() {
  console.log(`\n${c.cyan}${c.bold}━━━ Bun.write ━━━${c.reset}\n`);

  // Create demo dir
  await mkdir(DEMO_DIR, { recursive: true });

  // 1a. Write a plain string
  const strPath = `${DEMO_DIR}/hello.txt`;
  const strBytes = await Bun.write(strPath, "Hello from Bun.write!\n");
  console.log(`${c.green}[string]${c.reset}  Wrote ${strBytes} bytes → ${strPath}`);
  console.log(`${c.dim}  content: ${JSON.stringify(await Bun.file(strPath).text())}${c.reset}`);

  // 1b. Write JSON (secret statuses array)
  const secrets: SecretEntry[] = [
    { name: "API_KEY",      value: "sk-abc1...z999", status: "active" },
    { name: "DB_PASSWORD",  value: "pg-xxxx...yyyy", status: "active" },
    { name: "OLD_TOKEN",    value: "tok-dead...beef", status: "expired" },
    { name: "REVOKED_CERT", value: "cert-0000...ffff", status: "revoked" },
  ];
  const jsonPath = `${DEMO_DIR}/secrets.json`;
  const jsonBytes = await Bun.write(jsonPath, JSON.stringify(secrets, null, 2));
  console.log(`${c.green}[json]${c.reset}    Wrote ${jsonBytes} bytes → ${jsonPath}`);
  const parsed = await Bun.file(jsonPath).json();
  console.log(`${c.dim}  parsed back ${parsed.length} entries${c.reset}`);

  // 1c. Write binary (Uint8Array)
  const binData = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE]);
  const binPath = `${DEMO_DIR}/token.bin`;
  const binBytes = await Bun.write(binPath, binData);
  console.log(`${c.green}[binary]${c.reset}  Wrote ${binBytes} bytes → ${binPath}`);
  const readBack = await Bun.file(binPath).bytes();
  console.log(`${c.dim}  hex: ${Buffer.from(readBack).toString("hex")}${c.reset}`);

  // 1d. Zero-copy file copy (BunFile as source)
  const copyPath = `${DEMO_DIR}/secrets-backup.json`;
  const copyBytes = await Bun.write(copyPath, Bun.file(jsonPath));
  console.log(`${c.green}[copy]${c.reset}    Copied ${copyBytes} bytes → ${copyPath} (zero-copy)`);
  const copyMatch = await Bun.file(copyPath).text() === await Bun.file(jsonPath).text();
  console.log(`${c.dim}  content matches original: ${copyMatch}${c.reset}`);

  // 1e. Write to stdout
  await Bun.write(Bun.stdout, `${c.green}[stdout]${c.reset}  Direct write to Bun.stdout\n`);

  return { secrets, jsonPath };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Bun.file().delete() — delete files and verify
// ═══════════════════════════════════════════════════════════════════════════════

async function demoBunDelete() {
  console.log(`\n${c.cyan}${c.bold}━━━ Bun.file().delete() ━━━${c.reset}\n`);

  // Create 3 temp files to delete
  const filesToDelete = ["temp-a.txt", "temp-b.txt", "temp-c.txt"];
  for (const name of filesToDelete) {
    await Bun.write(`${DEMO_DIR}/${name}`, `contents of ${name}`);
  }
  console.log(`${c.dim}Created ${filesToDelete.length} temp files${c.reset}`);

  // Delete each and verify
  for (const name of filesToDelete) {
    const path = `${DEMO_DIR}/${name}`;
    const existedBefore = await Bun.file(path).exists();
    await Bun.file(path).delete();
    const existsAfter = await Bun.file(path).exists();
    console.log(
      `${c.red}[delete]${c.reset}  ${name}  existed: ${existedBefore} → exists after: ${existsAfter}`
    );
  }

  // Verify deleting already-gone file (throws ENOENT)
  const ghostPath = `${DEMO_DIR}/never-existed.txt`;
  try {
    await Bun.file(ghostPath).delete();
    console.log(`${c.yellow}[delete]${c.reset}  non-existent file: no error thrown`);
  } catch (e: any) {
    console.log(`${c.yellow}[delete]${c.reset}  non-existent file threw: ${e.message}`);
  }

  // Delete the binary file from earlier
  const binPath = `${DEMO_DIR}/token.bin`;
  await Bun.file(binPath).delete();
  console.log(`${c.red}[delete]${c.reset}  token.bin  exists after: ${await Bun.file(binPath).exists()}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Array ops — filter, map, reduce on secret statuses (per spec pattern)
// ═══════════════════════════════════════════════════════════════════════════════

async function demoArrayOps(secrets: SecretEntry[], jsonPath: string) {
  console.log(`\n${c.cyan}${c.bold}━━━ Array Operations ━━━${c.reset}\n`);

  // 3a. filter — active secrets only
  const active = secrets.filter((s) => s.status === "active");
  console.log(`${c.green}[filter]${c.reset}  Active secrets: ${active.map((s) => s.name).join(", ")}`);

  // 3b. filter — non-active (expired + revoked)
  const stale = secrets.filter((s) => s.status !== "active");
  console.log(`${c.yellow}[filter]${c.reset}  Stale secrets:  ${stale.map((s) => s.name).join(", ")}`);

  // 3c. map — build masked display rows
  const masked = secrets.map((s) => ({
    name: s.name,
    masked: s.value.slice(0, 6) + "••••" + s.value.slice(-4),
    status: s.status,
  }));
  console.log(`${c.green}[map]${c.reset}     Masked values:`);
  for (const row of masked) {
    const statusColor = row.status === "active" ? c.green : row.status === "expired" ? c.yellow : c.red;
    console.log(`  ${row.name.padEnd(14)} ${row.masked.padEnd(20)} ${statusColor}${row.status}${c.reset}`);
  }

  // 3d. reduce — count by status
  const counts = secrets.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log(`${c.green}[reduce]${c.reset}  Status counts: ${JSON.stringify(counts)}`);

  // 3e. find — first expired
  const firstExpired = secrets.find((s) => s.status === "expired");
  console.log(`${c.yellow}[find]${c.reset}    First expired: ${firstExpired?.name ?? "none"}`);

  // 3f. some/every
  const hasRevoked = secrets.some((s) => s.status === "revoked");
  const allActive = secrets.every((s) => s.status === "active");
  console.log(`${c.green}[some]${c.reset}    Has revoked: ${hasRevoked}`);
  console.log(`${c.green}[every]${c.reset}   All active:   ${allActive}`);

  // 3g. sort — by status priority (error first, then warning, then success)
  const priority: Record<string, number> = { revoked: 0, expired: 1, active: 2 };
  const sorted = [...secrets].sort((a, b) => priority[a.status] - priority[b.status]);
  console.log(`${c.green}[sort]${c.reset}    By severity: ${sorted.map((s) => `${s.name}(${s.status})`).join(" → ")}`);

  // 3h. Write filtered results back with Bun.write
  const activeJsonPath = `${DEMO_DIR}/active-secrets.json`;
  const activeBytes = await Bun.write(activeJsonPath, JSON.stringify(active, null, 2));
  console.log(`\n${c.green}[write]${c.reset}   Wrote ${active.length} active secrets (${activeBytes} bytes) → ${activeJsonPath}`);

  // 3i. Delete the stale entries file after writing
  const stalePath = `${DEMO_DIR}/stale-secrets.json`;
  await Bun.write(stalePath, JSON.stringify(stale, null, 2));
  console.log(`${c.yellow}[write]${c.reset}   Wrote ${stale.length} stale secrets → ${stalePath}`);
  await Bun.file(stalePath).delete();
  console.log(`${c.red}[delete]${c.reset}  Deleted stale secrets file (exists: ${await Bun.file(stalePath).exists()})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const totalStart = Bun.nanoseconds();

const { secrets, jsonPath } = await demoBunWrite();
await demoBunDelete();
await demoArrayOps(secrets, jsonPath);

// Cleanup
await rm(DEMO_DIR, { recursive: true, force: true });

const elapsed = (Bun.nanoseconds() - totalStart) / 1e6;
console.log(`\n${c.cyan}${c.bold}Done${c.reset} ${c.dim}(${elapsed.toFixed(2)}ms, temp files cleaned up)${c.reset}`);
