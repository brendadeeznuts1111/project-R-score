import { setEnvironmentData, getEnvironmentData } from "worker_threads";

export type ProTaskType = "heavy" | "light" | "background" | "critical" | "inline";

export interface ProWorkerConfig {
  taskType: ProTaskType;
  script?: string;
  inlineCode?: string;
  name?: string;
  environmentData?: Record<string, unknown>;
  preloadScripts?: string[];
}

const TASK_SMOL: Record<ProTaskType, boolean> = {
  heavy: false,
  light: true,
  background: true,
  critical: false,
  inline: true,
};

const TASK_REF: Record<ProTaskType, boolean> = {
  heavy: true,
  light: true,
  background: false,
  critical: true,
  inline: true,
};

const DEFAULT_PRELOAD = ["./shared-utils.ts"];

export class ProWorkerFactory {
  private static instance: ProWorkerFactory;
  private registry = new Map<string, { worker: Worker; config: ProWorkerConfig }>();

  private constructor() {}

  static getInstance(): ProWorkerFactory {
    if (!this.instance) {
      this.instance = new ProWorkerFactory();
    }
    return this.instance;
  }

  create(config: ProWorkerConfig): Worker {
    const script = this.resolveScript(config);

    const worker = new Worker(script, {
      name: config.name || `worker-${Date.now()}`,
      smol: TASK_SMOL[config.taskType],
      ref: TASK_REF[config.taskType],
      preload: config.taskType === "inline" ? [] : (config.preloadScripts || DEFAULT_PRELOAD),
      environmentData: config.environmentData
        ? new Map(Object.entries(config.environmentData))
        : undefined,
    });

    if (config.name) {
      this.registry.set(config.name, { worker, config });
    }

    return worker;
  }

  get(name: string): Worker | undefined {
    return this.registry.get(name)?.worker;
  }

  terminate(name: string): boolean {
    const entry = this.registry.get(name);
    if (!entry) return false;
    entry.worker.terminate();
    this.registry.delete(name);
    return true;
  }

  terminateAll(): number {
    let count = 0;
    for (const [name, entry] of this.registry) {
      entry.worker.terminate();
      this.registry.delete(name);
      count++;
    }
    return count;
  }

  get size(): number {
    return this.registry.size;
  }

  /** Reset singleton + registry — for tests only */
  static _reset(): void {
    if (this.instance) {
      this.instance.terminateAll();
      this.instance.registry.clear();
    }
    this.instance = undefined as any;
  }

  private resolveScript(config: ProWorkerConfig): string {
    if (config.taskType === "inline") {
      if (!config.inlineCode) {
        throw new Error("inline taskType requires inlineCode");
      }
      const blob = new Blob([config.inlineCode], { type: "application/javascript" });
      return URL.createObjectURL(blob);
    }

    if (!config.script) {
      throw new Error(`taskType "${config.taskType}" requires a script path`);
    }
    return config.script;
  }
}
