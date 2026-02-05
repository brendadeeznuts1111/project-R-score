#!/usr/bin/env bun
/**
 * Component #124: Worker-Manager
 * Primary API: new Worker()
 * Performance SLA: 20ms spawn
 * Parity Lock: 3u4v...5w6x
 * Status: ISOLATED
 */

import { feature } from "bun:bundle";

export class WorkerManager {
  private static instance: WorkerManager;
  private workers: Map<string, Worker> = new Map();

  private constructor() {}

  static getInstance(): WorkerManager {
    if (!this.instance) {
      this.instance = new WorkerManager();
    }
    return this.instance;
  }

  createWorker(path: string, name: string): Worker {
    if (!feature("WORKER_MANAGER")) {
      return new Worker(path);
    }

    const startTime = performance.now();
    const worker = new Worker(path);
    const duration = performance.now() - startTime;

    if (duration > 20) {
      console.warn(`⚠️  Worker spawn SLA breach: ${duration.toFixed(2)}ms > 20ms`);
    }

    this.workers.set(name, worker);
    return worker;
  }

  terminate(name: string): void {
    const worker = this.workers.get(name);
    if (worker) {
      worker.terminate();
      this.workers.delete(name);
    }
  }

  terminateAll(): void {
    for (const [name] of this.workers) {
      this.terminate(name);
    }
  }
}

export const workerManager = feature("WORKER_MANAGER")
  ? WorkerManager.getInstance()
  : {
      createWorker: (path: string) => new Worker(path),
      terminate: () => {},
      terminateAll: () => {},
    };

export default workerManager;
