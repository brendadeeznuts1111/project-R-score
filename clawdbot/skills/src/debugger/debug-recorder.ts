/**
 * src/debugger/debug-recorder.ts
 * Debug Session Recording & Replay
 * - Record terminal input/output/resize/signal events
 * - Save to local storage or R2
 * - Replay at variable speeds
 * - Memory-safe with event limits
 */

import { createBunR2StorageFromEnv } from "../storage/bun-r2-storage";

// =============================================================================
// Types
// =============================================================================

export type EventType = "input" | "output" | "resize" | "signal" | "marker";

export interface DebugEvent {
  timestamp: number;
  type: EventType;
  data: any;
}

export interface DebugSession {
  sessionId: string;
  skillId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  duration: number;
  events: DebugEvent[];
  metadata: {
    terminalCols: number;
    terminalRows: number;
    platform: string;
    bunVersion: string;
    [key: string]: any;
  };
}

export interface RecordingOptions {
  maxEvents?: number; // Max events to record (default: 10000)
  saveToR2?: boolean; // Save to R2 storage (default: false)
  localPath?: string; // Local save path (default: ./recordings)
}

export interface ReplayOptions {
  speed?: number; // Playback speed multiplier (default: 1.0)
  skipPauses?: boolean; // Skip long pauses (default: false)
  maxPauseMs?: number; // Max pause duration in ms (default: 2000)
  onEvent?: (event: DebugEvent) => void; // Event callback
}

// =============================================================================
// DebugRecorder Class
// =============================================================================

export class DebugRecorder {
  private recording: DebugEvent[] = [];
  private isRecording = false;
  private sessionId = "";
  private skillId = "";
  private userId = "";
  private startTime = 0;
  private options: RecordingOptions;

  private static readonly DEFAULT_MAX_EVENTS = 10000;
  private static readonly DEFAULT_LOCAL_PATH = "./recordings";

  constructor(options: RecordingOptions = {}) {
    this.options = {
      maxEvents: options.maxEvents || DebugRecorder.DEFAULT_MAX_EVENTS,
      saveToR2: options.saveToR2 || false,
      localPath: options.localPath || DebugRecorder.DEFAULT_LOCAL_PATH,
    };
  }

  /**
   * Start recording a debug session
   */
  startRecording(skillId: string, userId: string = "default"): string {
    if (this.isRecording) {
      throw new Error("Recording already in progress");
    }

    this.skillId = skillId;
    this.userId = userId;
    this.sessionId = `debug-${skillId}-${userId}-${Date.now()}`;
    this.startTime = Date.now();
    this.recording = [];
    this.isRecording = true;

    console.log(`Recording started: ${this.sessionId}`);

    // Record initial marker
    this.record({
      type: "marker",
      data: { event: "session_start", skillId, userId },
    });

    return this.sessionId;
  }

  /**
   * Record an event
   */
  record(event: Omit<DebugEvent, "timestamp">): void {
    if (!this.isRecording) return;

    // Check event limit
    if (this.recording.length >= this.options.maxEvents!) {
      console.warn("Recording buffer full, stopping recording");
      this.stopRecording();
      return;
    }

    this.recording.push({
      timestamp: Date.now(),
      type: event.type,
      data: event.data,
    });
  }

  /**
   * Record terminal output
   */
  recordOutput(data: Uint8Array | string): void {
    this.record({
      type: "output",
      data:
        typeof data === "string"
          ? data
          : Buffer.from(data).toString("base64"),
    });
  }

  /**
   * Record terminal input
   */
  recordInput(data: Uint8Array | string): void {
    this.record({
      type: "input",
      data:
        typeof data === "string"
          ? data
          : Buffer.from(data).toString("base64"),
    });
  }

  /**
   * Record terminal resize
   */
  recordResize(cols: number, rows: number): void {
    this.record({
      type: "resize",
      data: { cols, rows },
    });
  }

  /**
   * Record signal
   */
  recordSignal(signal: string): void {
    this.record({
      type: "signal",
      data: signal,
    });
  }

  /**
   * Add a marker event
   */
  addMarker(name: string, data?: any): void {
    this.record({
      type: "marker",
      data: { event: name, ...data },
    });
  }

  /**
   * Stop recording and return the session
   */
  stopRecording(): DebugSession {
    if (!this.isRecording) {
      throw new Error("No recording in progress");
    }

    this.isRecording = false;
    const endTime = Date.now();

    // Record end marker
    this.recording.push({
      timestamp: endTime,
      type: "marker",
      data: { event: "session_end" },
    });

    const session: DebugSession = {
      sessionId: this.sessionId,
      skillId: this.skillId,
      userId: this.userId,
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      events: this.recording,
      metadata: {
        terminalCols: process.stdout.columns || 80,
        terminalRows: process.stdout.rows || 24,
        platform: process.platform,
        bunVersion: Bun.version,
      },
    };

    console.log(
      `Recording stopped: ${session.duration}ms, ${session.events.length} events`
    );

    // Auto-save
    this.saveSession(session).catch((err) => {
      console.error("Failed to save recording:", err);
    });

    return session;
  }

  /**
   * Check if currently recording
   */
  isActive(): boolean {
    return this.isRecording;
  }

  /**
   * Get current recording stats
   */
  getStats(): {
    sessionId: string;
    events: number;
    duration: number;
    isRecording: boolean;
  } {
    return {
      sessionId: this.sessionId,
      events: this.recording.length,
      duration: this.isRecording ? Date.now() - this.startTime : 0,
      isRecording: this.isRecording,
    };
  }

  /**
   * Save session to storage
   */
  async saveSession(session: DebugSession): Promise<string> {
    const filename = `${session.sessionId}.json`;
    const data = JSON.stringify(session, null, 2);

    if (this.options.saveToR2) {
      // Save to R2
      const storage = createBunR2StorageFromEnv();
      if (storage) {
        const key = `debug-sessions/${filename}`;
        await storage.putObject(key, new TextEncoder().encode(data), {
          contentType: "application/json",
        });
        console.log(`Session saved to R2: ${key}`);
        return key;
      }
    }

    // Save locally
    const localPath = `${this.options.localPath}/${filename}`;
    await Bun.write(localPath, data);
    console.log(`Session saved locally: ${localPath}`);
    return localPath;
  }

  /**
   * Load session from storage
   */
  static async loadSession(
    sessionIdOrPath: string,
    fromR2 = false
  ): Promise<DebugSession> {
    let data: string;

    if (fromR2) {
      const storage = createBunR2StorageFromEnv();
      if (!storage) {
        throw new Error("R2 storage not configured");
      }

      const key = sessionIdOrPath.includes("/")
        ? sessionIdOrPath
        : `debug-sessions/${sessionIdOrPath}.json`;

      const bytes = await storage.getObject(key);
      data = new TextDecoder().decode(bytes);
    } else {
      const path = sessionIdOrPath.endsWith(".json")
        ? sessionIdOrPath
        : `./recordings/${sessionIdOrPath}.json`;

      data = await Bun.file(path).text();
    }

    return JSON.parse(data);
  }

  /**
   * List available recordings
   */
  static async listRecordings(
    localPath = "./recordings"
  ): Promise<Array<{ filename: string; sessionId: string; size: number }>> {
    const { readdir, stat } = await import("fs/promises");
    const path = await import("path");

    try {
      const files = await readdir(localPath);
      const recordings = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(localPath, file);
          const stats = await stat(filePath);

          recordings.push({
            filename: file,
            sessionId: file.replace(".json", ""),
            size: stats.size,
          });
        }
      }

      return recordings;
    } catch {
      return [];
    }
  }

  /**
   * Replay a recorded session
   */
  static async replay(
    session: DebugSession,
    options: ReplayOptions = {}
  ): Promise<void> {
    const {
      speed = 1.0,
      skipPauses = false,
      maxPauseMs = 2000,
      onEvent,
    } = options;

    console.log(`Replaying session: ${session.sessionId}`);
    console.log(`Duration: ${session.duration}ms, Events: ${session.events.length}`);
    console.log(`Speed: ${speed}x\n`);

    if (session.events.length === 0) {
      console.log("No events to replay");
      return;
    }

    let lastTimestamp = session.events[0].timestamp;

    for (const event of session.events) {
      // Calculate delay
      let delay = (event.timestamp - lastTimestamp) / speed;

      // Skip or cap long pauses
      if (skipPauses && delay > maxPauseMs) {
        delay = 0;
      } else if (delay > maxPauseMs) {
        delay = maxPauseMs / speed;
      }

      if (delay > 0) {
        await Bun.sleep(delay);
      }

      // Process event
      switch (event.type) {
        case "output":
          let outputData = event.data;
          if (typeof event.data === "string" && /^[A-Za-z0-9+/=]+$/.test(event.data)) {
            // Decode base64, keeping as Buffer for binary-safe stdout write
            const decoded = Buffer.from(event.data, "base64");
            // Only convert to string if it's valid UTF-8, otherwise write raw bytes
            try {
              const textDecoder = new TextDecoder("utf-8", { fatal: true });
              outputData = textDecoder.decode(decoded);
            } catch {
              // Binary data - write buffer directly
              process.stdout.write(decoded);
              break;
            }
          }
          process.stdout.write(outputData);
          break;

        case "input":
          // Input is typically not shown during replay
          // But we track it for the callback
          break;

        case "resize":
          // Could resize terminal if supported
          break;

        case "marker":
          if (event.data.event === "session_start") {
            console.log(`\n--- Session Start ---\n`);
          } else if (event.data.event === "session_end") {
            console.log(`\n--- Session End ---\n`);
          }
          break;

        case "signal":
          console.log(`[Signal: ${event.data}]`);
          break;
      }

      // Callback
      if (onEvent) {
        onEvent(event);
      }

      lastTimestamp = event.timestamp;
    }

    console.log(`\nReplay complete`);
  }

  /**
   * Create a terminal wrapper that records all I/O
   */
  wrapTerminal(terminal: any): any {
    const recorder = this;

    // Store original methods
    const originalWrite = terminal.write?.bind(terminal);
    const originalResize = terminal.resize?.bind(terminal);

    // Wrap write
    if (originalWrite) {
      terminal.write = (data: string | Uint8Array) => {
        recorder.recordInput(data);
        return originalWrite(data);
      };
    }

    // Wrap data callback
    const originalData = terminal.data;
    terminal.data = (term: any, data: Uint8Array) => {
      recorder.recordOutput(data);
      if (originalData) {
        originalData(term, data);
      }
    };

    // Wrap resize
    if (originalResize) {
      terminal.resize = (cols: number, rows: number) => {
        recorder.recordResize(cols, rows);
        return originalResize(cols, rows);
      };
    }

    return terminal;
  }
}

// =============================================================================
// Export
// =============================================================================

export default DebugRecorder;
