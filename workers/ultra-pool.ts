type TaskId = number;

export interface WorkerPoolConfig {
  workerUrl: string | URL;
  minWorkers: number;
  maxWorkers: number;
  preload?: string[];
  fastPath?: boolean;
  maxQueueSize?: number;
  taskTimeoutMs?: number;
  maxErrorHistory?: number;
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
  timedOutTasks: number;
  rejectedTasks: number;
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
  private timedOutTasks = 0;
  private rejectedTasks = 0;
  private errorHistory: Array<{ at: string; event: string; message: string }> = [];
  private timeoutByTaskId = new Map<TaskId, ReturnType<typeof setTimeout>>();

  constructor(private readonly config: WorkerPoolConfig) {
    if (config.minWorkers < 1) throw new Error("minWorkers must be >= 1");
    if (config.maxWorkers < config.minWorkers) {
      throw new Error("maxWorkers must be >= minWorkers");
    }
    if ((config.maxQueueSize ?? Number.POSITIVE_INFINITY) < 1) {
      throw new Error("maxQueueSize must be >= 1");
    }
    if ((config.taskTimeoutMs ?? 0) < 0) {
      throw new Error("taskTimeoutMs must be >= 0");
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
      if (this.queue.length >= (this.config.maxQueueSize ?? Number.POSITIVE_INFINITY)) {
        this.rejectedTasks += 1;
        const err = new Error(`UltraWorkerPool queue limit reached (${this.config.maxQueueSize})`);
        this.recordError("queue-overflow", err);
        reject(err);
        return;
      }
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
      timedOutTasks: this.timedOutTasks,
      rejectedTasks: this.rejectedTasks,
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
      this.clearTaskTimeout(taskId);
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
      try {
        worker.postMessage(message);
      } catch (error) {
        this.inFlightByWorker.set(worker, null);
        this.pendingByTaskId.delete(task.id);
        this.workerToTaskId.delete(worker);
        this.recordError("post-message-failed", error);
        task.reject(error instanceof Error ? error : new Error(String(error)));
        continue;
      }

      const timeoutMs = this.config.taskTimeoutMs ?? 0;
      if (timeoutMs > 0) {
        const timer = setTimeout(() => {
          if (this.closed) return;
          const timedOutTask = this.pendingByTaskId.get(task.id);
          if (!timedOutTask) return;
          this.timedOutTasks += 1;
          this.pendingByTaskId.delete(task.id);
          this.workerToTaskId.delete(worker);
          this.inFlightByWorker.set(worker, null);
          this.recordError("task-timeout", new Error(`Task ${task.id} timed out after ${timeoutMs}ms`));
          timedOutTask.reject(new Error(`Worker task timeout after ${timeoutMs}ms`));
          this.processQueue();
        }, timeoutMs);
        this.timeoutByTaskId.set(task.id, timer);
      }
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
    this.clearTaskTimeout(taskId);

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
    if (!this.inFlightByWorker.has(worker) && !this.workerToTaskId.has(worker) && !this.workers.includes(worker)) {
      return;
    }
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
      this.clearTaskTimeout(taskId);
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
    if (this.errorHistory.length > (this.config.maxErrorHistory ?? 25)) {
      this.errorHistory.shift();
    }
  }

  private clearTaskTimeout(taskId: TaskId): void {
    const timer = this.timeoutByTaskId.get(taskId);
    if (!timer) return;
    clearTimeout(timer);
    this.timeoutByTaskId.delete(taskId);
  }
}
