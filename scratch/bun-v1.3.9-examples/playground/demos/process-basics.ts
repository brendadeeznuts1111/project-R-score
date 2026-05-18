#!/usr/bin/env bun
/**
 * Demo: Process Basics
 * 
 * Command-line args, stdin, stdout, stderr, env vars, uptime
 */

console.info("🔧 Bun Process Basics Demo\n");
console.info("=".repeat(70));

// 1. Command-line arguments
console.info("\n1️⃣ Command-line Arguments (Bun.argv)");
console.info("-".repeat(70));
console.info("Script:", Bun.argv[1]);
console.info("Arguments:", Bun.argv.slice(2));
console.info("Full argv:", Bun.argv);

// 2. Environment variables
console.info("\n2️⃣ Environment Variables (process.env)");
console.info("-".repeat(70));
console.info("PATH exists:", !!process.env.PATH);
console.info("HOME:", process.env.HOME || "(not set)");
console.info("Bun version from env:", process.env.BUN_VERSION || "(not set)");

// Set env variable (runtime only)
process.env.MY_VAR = "hello from bun";
console.info("Set MY_VAR:", process.env.MY_VAR);

// NODE_ENV behavior
console.info("\n📦 NODE_ENV Behavior");
console.info("Default NODE_ENV:", process.env.NODE_ENV || "(not set - defaults to 'development')");
console.info("In Bun, NODE_ENV defaults to 'development' for bun run/bun test");
console.info("Can be overridden: NODE_ENV=production bun run script.ts");

// 3. Process info
console.info("\n3️⃣ Process Information");
console.info("-".repeat(70));
console.info("Process ID (pid):", process.pid);
console.info("Parent PID (ppid):", process.ppid);
console.info("Platform:", process.platform);
console.info("Architecture:", process.arch);
console.info("Node.js version:", process.version);

// 4. Process uptime
console.info("\n4️⃣ Process Uptime");
console.info("-".repeat(70));
console.info("Uptime (seconds):", process.uptime().toFixed(2));
console.info("Start time:", new Date(Date.now() - process.uptime() * 1000).toISOString());

// 5. Time zone
console.info("\n5️⃣ Time Zone (Multiple changes work in Bun!)");
console.info("-".repeat(70));
console.info("Initial timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.info("Initial offset:", new Date().getTimezoneOffset(), "minutes");

// Unlike Jest, Bun allows multiple TZ changes at runtime
console.info("\n🌎 Changing to Los Angeles:");
process.env.TZ = "America/Los_Angeles";
console.info("  Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.info("  Offset:", new Date().getTimezoneOffset(), "minutes");
console.info("  Time:", new Date().toLocaleTimeString());

console.info("\n🗽 Changing to New York:");
process.env.TZ = "America/New_York";
console.info("  Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.info("  Offset:", new Date().getTimezoneOffset(), "minutes");
console.info("  Time:", new Date().toLocaleTimeString());

console.info("\n🗼 Changing to Paris:");
process.env.TZ = "Europe/Paris";
console.info("  Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.info("  Offset:", new Date().getTimezoneOffset(), "minutes");
console.info("  Time:", new Date().toLocaleTimeString());

console.info("\n✅ Bun allows multiple TZ changes at runtime (unlike Jest)!");

// 6. Spawn with stdout/stderr
console.info("\n6️⃣ Spawn Process with stdout/stderr");
console.info("-".repeat(70));

const proc = Bun.spawn(["echo", "Hello from spawned process"]);
const output = await proc.stdout.text();
console.info("stdout:", output.trim());
console.info("Exit code:", await proc.exited);

// 7. Spawn with error output
console.info("\n7️⃣ Spawn with stderr capture");
console.info("-".repeat(70));

try {
  const errorProc = Bun.spawn(["ls", "/nonexistent/path"]);
  const stderr = await errorProc.stderr.text();
  const exitCode = await errorProc.exited;
  console.info("stderr:", stderr.trim() || "(empty)");
  console.info("Exit code:", exitCode);
} catch (e) {
  console.info("Process failed (expected)");
}

console.info("\n✅ Process basics demo complete!");
