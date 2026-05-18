/**
 * This example demonstrates Bun's process spawning APIs.
 * Reference: https://bun.com/docs/api/spawn
 */

console.info("--- Spawning Processes with Bun ---\n");

// 1. Bun.spawn (Asynchronous)
console.info("Running 'echo hello' asynchronously...");
const proc = Bun.spawn(["echo", "hello from Bun.spawn"]);

const text = await new Response(proc.stdout).text();
console.info(`Output: ${text.trim()}`);
console.info(`Exit code: ${await proc.exited}\n`);

// 2. Bun.spawnSync (Synchronous)
console.info("Running 'ls -lh' synchronously...");
const result = Bun.spawnSync(["ls", "-lh"], {
  cwd: import.meta.dir, // run in current directory
});

console.info(`Command succeeded: ${result.success}`);
if (result.success) {
  console.info("Output summary (first 2 lines):");
  console.info(result.stdout.toString().split("\n").slice(0, 2).join("\n"));
}
console.info("");

// 3. Piping processes
console.info("Piping processes: 'echo hi' | 'grep hi'");
const echo = Bun.spawn(["echo", "hi there"], { stdout: "pipe" });
const grep = Bun.spawn(["grep", "hi"], { stdin: echo.stdout });

const pipedOutput = await new Response(grep.stdout).text();
console.info(`Result: ${pipedOutput.trim()}`);
