import { getEnvironmentData } from "worker_threads";

type RunCommandTask = {
  type: "run-command";
  cmd: string[];
  cwd: string;
  env?: Record<string, string>;
};

type TaskEnvelope = {
  type: "task";
  id: number;
  payload: RunCommandTask;
};

type ResultEnvelope = {
  type: "result";
  id: number;
  ok: boolean;
  value?: { output: string; error: string; exitCode: number };
  error?: string;
};

async function executeRunCommand(task: RunCommandTask) {
  const workerDefaultEnv =
    (getEnvironmentData("playground.workerDefaultEnv") as Record<string, string> | undefined) || {};
  const mergedEnv = {
    ...process.env,
    ...workerDefaultEnv,
    ...(task.env || {}),
  };
  const proc = Bun.spawn({
    cmd: task.cmd,
    stdout: "pipe",
    stderr: "pipe",
    cwd: task.cwd,
    env: mergedEnv,
  });

  const [output, error] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { output, error, exitCode };
}

self.onmessage = async (event: MessageEvent<TaskEnvelope>) => {
  const message = event.data;
  if (!message || message.type !== "task") return;

  try {
    const payload = message.payload;
    if (!payload || payload.type !== "run-command") {
      throw new Error("Unsupported worker task payload");
    }

    const result = await executeRunCommand(payload);
    const response: ResultEnvelope = {
      type: "result",
      id: message.id,
      ok: true,
      value: result,
    };
    self.postMessage(response);
  } catch (error) {
    const response: ResultEnvelope = {
      type: "result",
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
