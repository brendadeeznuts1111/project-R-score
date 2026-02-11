import { setEnvironmentData, getEnvironmentData } from "worker_threads";

export type WorkerTaskType = "heavy" | "light" | "background" | "critical";
export type WorkerPriority = "high" | "normal" | "low";

export interface WorkerConfig {
  taskType: WorkerTaskType;
  script: string;
  name?: string;
  priority?: WorkerPriority;
  environmentData?: Record<string, unknown>;
  preloadScripts?: string[];
  resourceLimits?: {
    maxOldGenerationSizeMb?: number;
    maxYoungGenerationSizeMb?: number;
  };
  threadId?: string;
}

export interface WorkerMetrics {
  created: Date;
  taskCount: number;
  lastActive: Date;
  memoryUsage?: number;
}

export interface WorkerEntry {
  worker: Worker;
  config: WorkerConfig;
  metrics: WorkerMetrics;
}

const workerRegistry = new Map<string, WorkerEntry>();

const DEFAULT_PRELOAD = ["./shared-utils.ts"];

const TASK_DEFAULTS: Record<WorkerTaskType, {
  smol: boolean;
  ref: boolean;
  resourceLimits: { maxOldGenerationSizeMb: number; maxYoungGenerationSizeMb: number };
}> = {
  heavy: {
    smol: false,
    ref: true,
    resourceLimits: { maxOldGenerationSizeMb: 2048, maxYoungGenerationSizeMb: 256 },
  },
  light: {
    smol: true,
    ref: true,
    resourceLimits: { maxOldGenerationSizeMb: 512, maxYoungGenerationSizeMb: 128 },
  },
  background: {
    smol: true,
    ref: false,
    resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 64 },
  },
  critical: {
    smol: false,
    ref: true,
    resourceLimits: { maxOldGenerationSizeMb: 1024, maxYoungGenerationSizeMb: 192 },
  },
};

export function setGlobalWorkerConfig(data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    setEnvironmentData(key, value);
  }
}

export function getGlobalWorkerConfig(key: string): unknown {
  return getEnvironmentData(key);
}

export function createWorker(config: WorkerConfig): {
  worker: Worker;
  id: string;
  metrics: WorkerMetrics;
} {
  const workerId =
    config.threadId || `worker-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const defaults = TASK_DEFAULTS[config.taskType];
  const resourceLimits = {
    ...defaults.resourceLimits,
    ...config.resourceLimits,
  };

  const worker = new Worker(config.script, {
    preload: config.preloadScripts || DEFAULT_PRELOAD,
    name: config.name || workerId,
    smol: defaults.smol,
    ref: defaults.ref,
    environmentData: config.environmentData
      ? new Map(Object.entries(config.environmentData))
      : undefined,
  });

  const metrics: WorkerMetrics = {
    created: new Date(),
    taskCount: 0,
    lastActive: new Date(),
  };

  workerRegistry.set(workerId, { worker, config, metrics });

  return { worker, id: workerId, metrics };
}

export function getWorkerEntry(id: string): WorkerEntry | undefined {
  return workerRegistry.get(id);
}

export function getTaskDefaults(taskType: WorkerTaskType) {
  return { ...TASK_DEFAULTS[taskType] };
}

export function getAllWorkerIds(): string[] {
  return [...workerRegistry.keys()];
}

export function terminateWorker(id: string): boolean {
  const entry = workerRegistry.get(id);
  if (!entry) return false;
  entry.worker.terminate();
  workerRegistry.delete(id);
  return true;
}

export function terminateAll(): number {
  let count = 0;
  for (const [id, entry] of workerRegistry) {
    entry.worker.terminate();
    workerRegistry.delete(id);
    count++;
  }
  return count;
}

export function getRegistrySize(): number {
  return workerRegistry.size;
}

/** Reset registry without terminating — for tests only */
export function _resetRegistry(): void {
  workerRegistry.clear();
}
