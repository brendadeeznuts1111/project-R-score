type TaskId = number;

export interface WorkerPoolConfig {
  workerUrl: string | URL;
  minWorkers: number;
  maxWorkers: number;
  preload?: string[];
  fastPath?: boolean;
}

export interface WorkerTask<TPayload = unknown, TResult = unknown> {
  id: TaskId;
  payload: TPayload;
  priority: number;
  enqueuedAt: number;
  resolve: (value: TResult) => void;
  reject: (reason?: unknown) => void;
}

export interface WorkerTaskMessage<TPayload = unknown> {
  type: "task";
  id: TaskId;
  payload: TPayload;
}

export interface WorkerResultMessage<TResult = unknown> {
  type: "result";
  id: TaskId;
  ok: boolean;
  value?: TResult;
  error?: string;
}

export interface WorkerPoolStats {
  workers: number;
  busyWorkers: number;
  queuedTasks: number;
  inFlightTasks: number;
  createdWorkers: number;
  replacedWorkers: number;
  lastErrors: Array<{ at: string; event: string; message: string }>;
}

export class UltraWorkerPool<TPayload = unknown, TResult = unknown> {
  private workers: Worker[] = [];
  private queue: Array<WorkerTask<TPayload, TResult>> = [];
  private inFlightByWorker = new Map<Worker, TaskId | null>();
  private pendingByTaskId = new Map<TaskId, WorkerTask<TPayload, TResult>>();
  private workerToTaskId = new Map<Worker, TaskId>();
  private taskSeq = 0;
  private closed = false;
  private createdWorkers = 0;
  private replacedWorkers = 0;
  private errorHistory: Array<{ at: string; event: string; message: string }> = [];

  constructor(private readonly config: WorkerPoolConfig) {
    if (config.minWorkers < 1) throw new Error("minWorkers must be >= 1");
    if (config.maxWorkers < config.minWorkers) {
      throw new Error("maxWorkers must be >= minWorkers");
    }
    for (let i = 0; i < config.minWorkers; i += 1) {
      this.spawnWorker();
    }
  }

  async execute(payload: TPayload, priority = 0): Promise<TResult> {
    if (this.closed) {
      throw new Error("UltraWorkerPool is closed");
    }

    return await new Promise<TResult>((resolve, reject) => {
      const task: WorkerTask<TPayload, TResult> = {
        id: ++this.taskSeq,
        payload,
        priority,
        enqueuedAt: Date.now(),
        resolve,
        reject,
      };
      this.queue.push(task);
      // Higher priority first. Stable tie-break by enqueue time then task id.
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (a.enqueuedAt !== b.enqueuedAt) return a.enqueuedAt - b.enqueuedAt;
        return a.id - b.id;
      });
      this.maybeScaleUp();
      this.processQueue();
    });
  }

  getStats(): WorkerPoolStats {
    const busyWorkers = Array.from(this.inFlightByWorker.values()).filter((id) => id !== null).length;
    return {
      workers: this.workers.length,
      busyWorkers,
      queuedTasks: this.queue.length,
      inFlightTasks: this.pendingByTaskId.size,
      createdWorkers: this.createdWorkers,
      replacedWorkers: this.replacedWorkers,
      lastErrors: [...this.errorHistory],
    };
  }

  unref(): void {
    for (const worker of this.workers) {
      worker.unref();
    }
  }

  terminateAll(reason = "pool terminated"): void {
    this.closed = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      task?.reject(new Error(reason));
    }

    for (const [taskId, task] of this.pendingByTaskId.entries()) {
      task.reject(new Error(reason));
      this.pendingByTaskId.delete(taskId);
    }

    for (const worker of this.workers) {
      worker.terminate();
    }

    this.workers = [];
    this.inFlightByWorker.clear();
    this.workerToTaskId.clear();
  }

  private spawnWorker(): Worker {
    const worker = new Worker(this.config.workerUrl, {
      preload: this.config.preload,
    });
    this.createdWorkers += 1;

    worker.addEventListener("open", () => {
      this.inFlightByWorker.set(worker, null);
      this.processQueue();
    });

    worker.addEventListener("message", (event: MessageEvent<WorkerResultMessage<TResult>>) => {
      this.handleResponse(worker, event.data);
    });

    worker.addEventListener("error", (event) => {
      const taskId = this.workerToTaskId.get(worker);
      this.recordError("worker-error", event.error ?? new Error(event.message || "Worker error"));
      if (taskId !== undefined) {
        const task = this.pendingByTaskId.get(taskId);
        task?.reject(event.error ?? new Error(event.message || "Worker error"));
        this.pendingByTaskId.delete(taskId);
      }
      this.replaceWorker(worker);
    });

    worker.addEventListener("close", () => {
      this.replaceWorker(worker);
    });

    this.workers.push(worker);
    this.inFlightByWorker.set(worker, null);
    return worker;
  }

  private maybeScaleUp(): void {
    if (this.workers.length >= this.config.maxWorkers) return;
    const available = this.getAvailableWorker();
    if (!available && this.queue.length > 0) {
      this.spawnWorker();
    }
  }

  private processQueue(): void {
    if (this.closed) return;
    while (this.queue.length > 0) {
      const worker = this.getAvailableWorker();
      if (!worker) break;
      const task = this.queue.shift();
      if (!task) break;

      const optimizedPayload = this.config.fastPath ? this.optimizeForFastPath(task.payload) : task.payload;
      const message: WorkerTaskMessage<TPayload> = {
        type: "task",
        id: task.id,
        payload: optimizedPayload,
      };

      this.inFlightByWorker.set(worker, task.id);
      this.pendingByTaskId.set(task.id, task);
      this.workerToTaskId.set(worker, task.id);
      worker.postMessage(message);
    }
  }

  private optimizeForFastPath(payload: TPayload): TPayload {
    if (typeof payload === "string") return payload;
    if (typeof payload !== "object" || payload === null) return payload;
    if (Object.getPrototypeOf(payload) !== Object.prototype) return payload;

    for (const key of Object.keys(payload as Record<string, unknown>)) {
      const value = (payload as Record<string, unknown>)[key];
      const type = typeof value;
      if (type !== "string" && type !== "number" && type !== "boolean" && value !== null && value !== undefined) {
        return payload;
      }
    }
    return payload;
  }

  private getAvailableWorker(): Worker | undefined {
    return this.workers.find((worker) => this.inFlightByWorker.get(worker) === null);
  }

  private handleResponse(worker: Worker, message: WorkerResultMessage<TResult>): void {
    const taskId = this.workerToTaskId.get(worker);
    if (taskId === undefined) return;

    const task = this.pendingByTaskId.get(taskId);
    this.pendingByTaskId.delete(taskId);
    this.workerToTaskId.delete(worker);
    this.inFlightByWorker.set(worker, null);

    if (!task) {
      this.processQueue();
      return;
    }

    if (message.type !== "result" || message.id !== task.id) {
      task.reject(new Error("Worker returned mismatched task response"));
    } else if (message.ok) {
      task.resolve(message.value as TResult);
    } else {
      task.reject(new Error(message.error || "Worker task failed"));
    }

    this.processQueue();
  }

  private replaceWorker(worker: Worker): void {
    const idx = this.workers.indexOf(worker);
    if (idx >= 0) {
      this.workers.splice(idx, 1);
    }
    this.inFlightByWorker.delete(worker);
    this.replacedWorkers += 1;

    const taskId = this.workerToTaskId.get(worker);
    this.workerToTaskId.delete(worker);
    if (taskId !== undefined) {
      const task = this.pendingByTaskId.get(taskId);
      this.pendingByTaskId.delete(taskId);
      task?.reject(new Error("Worker closed before task completed"));
      this.recordError("worker-close", new Error(`Worker closed before task ${taskId} completed`));
    }

    if (!this.closed && this.workers.length < this.config.minWorkers) {
      this.spawnWorker();
    }
    this.processQueue();
  }

  private recordError(event: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.errorHistory.push({
      at: new Date().toISOString(),
      event,
      message,
    });
    if (this.errorHistory.length > 25) {
      this.errorHistory.shift();
    }
  }
}
