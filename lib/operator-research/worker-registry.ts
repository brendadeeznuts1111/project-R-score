// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/child-process#inter-process-communication-ipc — Bun.spawn IPC
import { joinPath } from '../path-bun.ts';
import { resolveBunExecutable } from '../bun-executable.ts';
import { ROOT } from './paths.ts';
import type { EnrichResult, SeedDomain } from './types.ts';

export type WorkerTask = {
  taskId: string; // brand-ok — opaque research/wire id
  seed: SeedDomain;
  options: {
    screenshot: boolean;
    fixtureFallback: boolean;
    store: boolean;
  };
};

export type WorkerEntry = {
  workerId: string; // brand-ok — opaque research/wire id
  taskId: string; // brand-ok — opaque research/wire id
  proc: ReturnType<typeof Bun.spawn>;
  result: Promise<EnrichResult>;
};

const active = new Map<string, WorkerEntry>();

export function getWorkerStats() {
  return {
    active: active.size,
    workerIds: [...active.keys()],
  };
}

export function startWorker(task: WorkerTask): WorkerEntry {
  const workerId = `wv-${Bun.randomUUIDv7()}`;
  const script = joinPath(ROOT, 'lib/operator-research/enrich-worker.ts');
  const bunBin = resolveBunExecutable();

  let resolveResult!: (r: EnrichResult) => void;
  let rejectResult!: (e: Error) => void;
  const result = new Promise<EnrichResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const proc = Bun.spawn({
    cmd: [bunBin, script],
    cwd: ROOT,
    env: { ...Bun.env },
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    serialization: 'advanced',
    // eslint-disable-next-line harness/no-unknown-function-param -- IPC wire message before type guard
    ipc(message: unknown) {
      if (!message || typeof message !== 'object') return;
      const msg = message as { type?: string; result?: EnrichResult; error?: string };
      if (msg.type === 'result' && msg.result) {
        resolveResult(msg.result);
      } else if (msg.type === 'error') {
        rejectResult(new Error(msg.error ?? 'worker error'));
      }
    },
  });

  proc.send({
    type: 'enrich',
    taskId: task.taskId,
    workerId,
    seed: task.seed,
    options: task.options,
  });

  const entry: WorkerEntry = { workerId, taskId: task.taskId, proc, result };
  active.set(workerId, entry);

  let settled = false;
  void result.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    }
  );

  void (async () => {
    const code = await proc.exited;
    active.delete(workerId);
    try {
      proc.disconnect();
    } catch {
      /* ignore */
    }
    if (!settled) {
      const stderr = proc.stderr ? await new Response(proc.stderr).text() : '';
      rejectResult(
        new Error(
          code === 0
            ? `worker exited without IPC result: ${stderr.slice(0, 400)}`
            : `worker exited ${code}: ${stderr.slice(0, 400)}`
        )
      );
    }
  })();

  return entry;
}
// brand-ok — opaque research/wire id
export async function waitForTask(taskId: string): Promise<EnrichResult | null> {
  // brand-ok — opaque research/wire id
  for (const entry of active.values()) {
    if (entry.taskId === taskId) return entry.result;
  }
  return null;
}
