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
  idleScaleDownMs?: number;
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
  minWorkers: number;
  maxWorkers: number;
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
  private idleSinceByWorker = new Map<Worker, number>();
  private idleReapTimer: ReturnType<typeof setInterval> | null = null;

  // Resolved config defaults — computed once in constructor
  private readonly maxQueueSize: number;
  private readonly taskTimeoutMs: number;
  private readonly maxErrorHistory: number;
  private readonly idleScaleDownMs: number;

  constructor(private readonly config: WorkerPoolConfig) {
    if (config.minWorkers < 1) throw new Error("minWorkers must be >= 1");
    if (config.maxWorkers < config.minWorkers) {
      throw new Error("maxWorkers must be >= minWorkers");
    }
    this.maxQueueSize = config.maxQueueSize ?? Number.POSITIVE_INFINITY;
    this.taskTimeoutMs = config.taskTimeoutMs ?? 0;
    this.maxErrorHistory = config.maxErrorHistory ?? 25;
    this.idleScaleDownMs = config.idleScaleDownMs ?? 10000;
    if (this.maxQueueSize < 1) {
      throw new Error("maxQueueSize must be >= 1");
    }
    if (this.taskTimeoutMs < 0) {
      throw new Error("taskTimeoutMs must be >= 0");
    }
    for (let i = 0; i < config.minWorkers; i += 1) {
      this.spawnWorker();
    }

    if (this.idleScaleDownMs > 0) {
      const intervalMs = Math.max(100, Math.min(this.idleScaleDownMs, 1000));
      this.idleReapTimer = setInterval(() => this.reapIdleWorkers(), intervalMs);
      this.idleReapTimer.unref?.();
    }
  }

  async execute(payload: TPayload, priority = 0): Promise<TResult> {
    if (this.closed) {
      throw new Error("UltraWorkerPool is closed");
    }

    return new Promise<TResult>((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        this.rejectedTasks += 1;
        const err = new Error(`UltraWorkerPool queue limit reached (${this.maxQueueSize})`);
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
      this.insertSorted(task);
      this.maybeScaleUp();
      this.processQueue();
    });
  }

  getStats(): WorkerPoolStats {
    let busyWorkers = 0;
    for (const id of this.inFlightByWorker.values()) if (id !== null) busyWorkers++;
    return {
      workers: this.workers.length,
      minWorkers: this.config.minWorkers,
      maxWorkers: this.config.maxWorkers,
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
      (worker as any).unref();
    }
  }

  terminateAll(reason = "pool terminated"): void {
    this.closed = true;
    if (this.idleReapTimer) {
      clearInterval(this.idleReapTimer);
      this.idleReapTimer = null;
    }
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

    this.workers.length = 0;
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
      this.idleSinceByWorker.set(worker, Date.now());
      this.processQueue();
    });

    worker.addEventListener("message", (event: MessageEvent<WorkerResultMessage<TResult>>) => {
      this.handleResponse(worker, event.data);
    });

    worker.addEventListener("error", (event) => {
      const err = event.error ?? new Error(event.message || "Worker error");
      this.recordError("worker-error", err);
      const taskId = this.workerToTaskId.get(worker);
      if (taskId !== undefined) {
        this.pendingByTaskId.get(taskId)?.reject(err);
        this.pendingByTaskId.delete(taskId);
      }
      this.replaceWorker(worker);
    });

    worker.addEventListener("close", () => {
      this.replaceWorker(worker);
    });

    this.workers.push(worker);
    this.inFlightByWorker.set(worker, null);
    this.idleSinceByWorker.set(worker, Date.now());
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
      this.idleSinceByWorker.delete(worker);
      this.pendingByTaskId.set(task.id, task);
      this.workerToTaskId.set(worker, task.id);
      try {
        worker.postMessage(message);
      } catch (error) {
        this.inFlightByWorker.set(worker, null);
        this.idleSinceByWorker.set(worker, Date.now());
        this.pendingByTaskId.delete(task.id);
        this.workerToTaskId.delete(worker);
        this.recordError("post-message-failed", error);
        task.reject(error instanceof Error ? error : new Error(String(error)));
        continue;
      }

      if (this.taskTimeoutMs > 0) {
        const timer = setTimeout(() => {
          if (this.closed) return;
          const timedOutTask = this.pendingByTaskId.get(task.id);
          if (!timedOutTask) return;
          this.timedOutTasks += 1;
          this.pendingByTaskId.delete(task.id);
          this.workerToTaskId.delete(worker);
          this.inFlightByWorker.set(worker, null);
          this.idleSinceByWorker.set(worker, Date.now());
          this.recordError("task-timeout", new Error(`Task ${task.id} timed out after ${this.taskTimeoutMs}ms`));
          timedOutTask.reject(new Error(`Worker task timeout after ${this.taskTimeoutMs}ms`));
          this.processQueue();
        }, this.taskTimeoutMs);
        this.timeoutByTaskId.set(task.id, timer);
      }
    }
  }

  /** Binary insertion — O(log n) vs O(n log n) full sort on every execute. */
  private insertSorted(task: WorkerTask<TPayload, TResult>): void {
    const q = this.queue;
    let lo = 0;
    let hi = q.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const cmp = this.compareTasks(task, q[mid]);
      if (cmp < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    q.splice(lo, 0, task);
  }

  /** Stable comparison: higher priority first, then FIFO by enqueue time, then task id. */
  private compareTasks(a: WorkerTask<TPayload, TResult>, b: WorkerTask<TPayload, TResult>): number {
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.enqueuedAt !== b.enqueuedAt) return a.enqueuedAt - b.enqueuedAt;
    return a.id - b.id;
  }

  private optimizeForFastPath(payload: TPayload): TPayload {
    if (typeof payload === "string") return payload;
    if (typeof payload !== "object" || payload === null) return payload;
    if (Object.getPrototypeOf(payload) !== Object.prototype) return payload;

    const record = payload as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const type = typeof record[key];
      if (type !== "string" && type !== "number" && type !== "boolean" && record[key] !== null && record[key] !== undefined) {
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
    this.idleSinceByWorker.set(worker, Date.now());

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
    this.maybeScaleDown();
  }

  private replaceWorker(worker: Worker): void {
    const idx = this.workers.indexOf(worker);
    if (idx < 0 && !this.inFlightByWorker.has(worker)) return;
    if (idx >= 0) this.workers.splice(idx, 1);
    this.inFlightByWorker.delete(worker);
    this.idleSinceByWorker.delete(worker);
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

  private maybeScaleDown(): void {
    if (this.closed) return;
    if (this.queue.length > 0) return;
    this.reapIdleWorkers();
  }

  private reapIdleWorkers(): void {
    if (this.closed) return;
    if (this.idleScaleDownMs <= 0) return;
    if (this.queue.length > 0 || this.pendingByTaskId.size > 0) return;

    while (this.workers.length > this.config.minWorkers) {
      const idleWorker = this.selectIdleWorkerForTermination();
      if (!idleWorker) break;
      const idleSince = this.idleSinceByWorker.get(idleWorker) ?? 0;
      const idleAgeMs = Date.now() - idleSince;
      if (idleAgeMs < this.idleScaleDownMs) break;
      this.removeWorker(idleWorker);
    }
  }

  private selectIdleWorkerForTermination(): Worker | null {
    let candidate: Worker | null = null;
    let oldestIdleSince = Number.POSITIVE_INFINITY;
    for (const worker of this.workers) {
      if (this.inFlightByWorker.get(worker) !== null) continue;
      const idleSince = this.idleSinceByWorker.get(worker) ?? Date.now();
      if (idleSince < oldestIdleSince) {
        oldestIdleSince = idleSince;
        candidate = worker;
      }
    }
    return candidate;
  }

  private removeWorker(worker: Worker): void {
    const idx = this.workers.indexOf(worker);
    if (idx >= 0) this.workers.splice(idx, 1);
    this.inFlightByWorker.delete(worker);
    this.idleSinceByWorker.delete(worker);
    this.workerToTaskId.delete(worker);
    try {
      worker.terminate();
    } catch {
      // best-effort cleanup on shutdown/scale-down path
    }
  }

  private recordError(event: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.errorHistory.push({
      at: new Date().toISOString(),
      event,
      message,
    });
    if (this.errorHistory.length > this.maxErrorHistory) {
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
