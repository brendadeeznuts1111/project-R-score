/**
 * This example demonstrates Bun's process spawning APIs.
 * Reference: https://bun.com/docs/api/spawn
 */

console.log("--- Spawning Processes with Bun ---\n");

// 1. Bun.spawn (Asynchronous)
console.log("Running 'echo hello' asynchronously...");
const proc = Bun.spawn(["echo", "hello from Bun.spawn"]);

const text = await new Response(proc.stdout).text();
console.log(`Output: ${text.trim()}`);
console.log(`Exit code: ${await proc.exited}\n`);

// 2. Bun.spawnSync (Synchronous)
console.log("Running 'ls -lh' synchronously...");
const result = Bun.spawnSync(["ls", "-lh"], {
  cwd: import.meta.dir, // run in current directory
});

console.log(`Command succeeded: ${result.success}`);
if (result.success) {
  console.log("Output summary (first 2 lines):");
  console.log(result.stdout.toString().split("\n").slice(0, 2).join("\n"));
}
console.log("");

// 3. Piping processes
console.log("Piping processes: 'echo hi' | 'grep hi'");
const echo = Bun.spawn(["echo", "hi there"], { stdout: "pipe" });
const grep = Bun.spawn(["grep", "hi"], { stdin: echo.stdout });

const pipedOutput = await new Response(grep.stdout).text();
console.log(`Result: ${pipedOutput.trim()}`);
