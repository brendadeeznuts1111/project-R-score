#!/usr/bin/env bun
/**
 * Demo: Process Basics
 * 
 * Command-line args, stdin, stdout, stderr, env vars, uptime
 */

console.log("🔧 Bun Process Basics Demo\n");
console.log("=".repeat(70));

// 1. Command-line arguments
console.log("\n1️⃣ Command-line Arguments (Bun.argv)");
console.log("-".repeat(70));
console.log("Script:", Bun.argv[1]);
console.log("Arguments:", Bun.argv.slice(2));
console.log("Full argv:", Bun.argv);

// 2. Environment variables
console.log("\n2️⃣ Environment Variables (process.env)");
console.log("-".repeat(70));
console.log("PATH exists:", !!process.env.PATH);
console.log("HOME:", process.env.HOME || "(not set)");
console.log("Bun version from env:", process.env.BUN_VERSION || "(not set)");

// Set env variable (runtime only)
process.env.MY_VAR = "hello from bun";
console.log("Set MY_VAR:", process.env.MY_VAR);

// NODE_ENV behavior
console.log("\n📦 NODE_ENV Behavior");
console.log("Default NODE_ENV:", process.env.NODE_ENV || "(not set - defaults to 'development')");
console.log("In Bun, NODE_ENV defaults to 'development' for bun run/bun test");
console.log("Can be overridden: NODE_ENV=production bun run script.ts");

// 3. Process info
console.log("\n3️⃣ Process Information");
console.log("-".repeat(70));
console.log("Process ID (pid):", process.pid);
console.log("Parent PID (ppid):", process.ppid);
console.log("Platform:", process.platform);
console.log("Architecture:", process.arch);
console.log("Node.js version:", process.version);

// 4. Process uptime
console.log("\n4️⃣ Process Uptime");
console.log("-".repeat(70));
console.log("Uptime (seconds):", process.uptime().toFixed(2));
console.log("Start time:", new Date(Date.now() - process.uptime() * 1000).toISOString());

// 5. Time zone
console.log("\n5️⃣ Time Zone (Multiple changes work in Bun!)");
console.log("-".repeat(70));
console.log("Initial timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log("Initial offset:", new Date().getTimezoneOffset(), "minutes");

// Unlike Jest, Bun allows multiple TZ changes at runtime
console.log("\n🌎 Changing to Los Angeles:");
process.env.TZ = "America/Los_Angeles";
console.log("  Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log("  Offset:", new Date().getTimezoneOffset(), "minutes");
console.log("  Time:", new Date().toLocaleTimeString());

console.log("\n🗽 Changing to New York:");
process.env.TZ = "America/New_York";
console.log("  Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log("  Offset:", new Date().getTimezoneOffset(), "minutes");
console.log("  Time:", new Date().toLocaleTimeString());

console.log("\n🗼 Changing to Paris:");
process.env.TZ = "Europe/Paris";
console.log("  Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log("  Offset:", new Date().getTimezoneOffset(), "minutes");
console.log("  Time:", new Date().toLocaleTimeString());

console.log("\n✅ Bun allows multiple TZ changes at runtime (unlike Jest)!");

// 6. Spawn with stdout/stderr
console.log("\n6️⃣ Spawn Process with stdout/stderr");
console.log("-".repeat(70));

const proc = Bun.spawn(["echo", "Hello from spawned process"]);
const output = await proc.stdout.text();
console.log("stdout:", output.trim());
console.log("Exit code:", await proc.exited);

// 7. Spawn with error output
console.log("\n7️⃣ Spawn with stderr capture");
console.log("-".repeat(70));

try {
  const errorProc = Bun.spawn(["ls", "/nonexistent/path"]);
  const stderr = await errorProc.stderr.text();
  const exitCode = await errorProc.exited;
  console.log("stderr:", stderr.trim() || "(empty)");
  console.log("Exit code:", exitCode);
} catch (e) {
  console.log("Process failed (expected)");
}

console.log("\n✅ Process basics demo complete!");
