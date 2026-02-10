#!/usr/bin/env bun

function spawnCmd(cmd: string[]) {
  return Bun.spawn({
    cmd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "ignore",
    env: {
      ...process.env,
    },
  });
}

async function run(): Promise<number> {
  const mini = spawnCmd(["bun", "run", "test:dashboard:mini"]);
  const miniCode = await mini.exited;
  if (miniCode !== 0) return miniCode;

  const endpoints = spawnCmd(["bun", "run", "test:dashboard:endpoints"]);
  const endpointCode = await endpoints.exited;
  if (endpointCode !== 0) return endpointCode;

  const websocket = spawnCmd(["bun", "run", "test:dashboard:websocket"]);
  const websocketCode = await websocket.exited;
  if (websocketCode !== 0) return websocketCode;

  console.log("[PASS] dashboard-suite :: mini + endpoints + websocket green");
  return 0;
}

const code = await run();
process.exit(code);
