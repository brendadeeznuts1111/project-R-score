// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
import { awaitSettled, promiseStatus } from '../peek-settle.ts';

export type TaskRecord<T = unknown> = {
  id: string; // brand-ok — opaque research/wire id
  kind: string;
  createdAt: string;
  promise: Promise<T>;
};

export type TaskView<T = unknown> = {
  id: string; // brand-ok — opaque research/wire id
  kind: string;
  createdAt: string;
  status: 'pending' | 'fulfilled' | 'rejected' | 'sync';
  peeked: boolean;
  result?: T;
  error?: string;
};

const tasks = new Map<string, TaskRecord>();

export function registerTask<T>(id: string, kind: string, promise: Promise<T>): TaskRecord<T> {
  // brand-ok — opaque research/wire id
  const record: TaskRecord<T> = {
    id,
    kind,
    createdAt: new Date().toISOString(),
    promise,
  };
  tasks.set(id, record as TaskRecord);
  // Keep map bounded
  if (tasks.size > 500) {
    const oldest = tasks.keys().next().value;
    if (oldest) tasks.delete(oldest);
  }
  return record;
}

export function getTaskPromise(taskId: string): Promise<unknown> | undefined {
  // brand-ok — opaque research/wire id
  return tasks.get(taskId)?.promise;
}

export function getTask(taskId: string): TaskRecord | undefined {
  // brand-ok — opaque research/wire id
  return tasks.get(taskId);
}

export function listTaskIds(): string[] {
  return [...tasks.keys()];
}

/**
 * Optimistic task status via Bun.peek — return settled results without awaiting.
 */
export async function resolveTaskView(taskId: string): Promise<TaskView | null> {
  // brand-ok — opaque research/wire id
  const record = tasks.get(taskId);
  if (!record) return null;

  const status = promiseStatus(record.promise);
  if (status === 'fulfilled' || status === 'sync') {
    try {
      const result = Bun.peek(record.promise);
      // Bun.peek on fulfilled promise returns the value (not the promise)
      if (result !== record.promise) {
        return {
          id: record.id,
          kind: record.kind,
          createdAt: record.createdAt,
          status: 'fulfilled',
          peeked: true,
          result,
        };
      }
    } catch (err) {
      return {
        id: record.id,
        kind: record.kind,
        createdAt: record.createdAt,
        status: 'rejected',
        peeked: true,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (status === 'rejected') {
    try {
      await awaitSettled(record.promise);
    } catch (err) {
      return {
        id: record.id,
        kind: record.kind,
        createdAt: record.createdAt,
        status: 'rejected',
        peeked: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  try {
    const result = await record.promise;
    return {
      id: record.id,
      kind: record.kind,
      createdAt: record.createdAt,
      status: 'fulfilled',
      peeked: false,
      result,
    };
  } catch (err) {
    return {
      id: record.id,
      kind: record.kind,
      createdAt: record.createdAt,
      status: 'rejected',
      peeked: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
