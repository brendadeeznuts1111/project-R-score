// jsonl-logger.ts - JSONL logging utility using Bun.JSONL
import type { DeviceLogEntry } from "../types.js";

interface LogEntry {
  deviceId: string;
  timestamp: string;
  event: string;
  [key: string]: any;
}

export class JSONLLogger {
  private logPath: string;
  private buffer: string = "";

  constructor(logPath: string) {
    this.logPath = logPath;
  }

  /**
   * Append a log entry (buffered for performance)
   */
  log(entry: LogEntry): void {
    const line = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    }) + "\n";
    
    this.buffer += line;
    
    // Flush buffer if it gets large (every 100 entries or 64KB)
    if (this.buffer.length > 64 * 1024 || this.buffer.split("\n").length > 100) {
      this.flush();
    }
  }

  /**
   * Flush buffered logs to file
   */
  async flush(): Promise<void> {
    if (!this.buffer) return;
    
    const file = Bun.file(this.logPath);
    const existing = await file.exists() ? await file.text() : "";
    
    await Bun.write(this.logPath, existing + this.buffer);
    this.buffer = "";
  }

  /**
   * Read and parse all log entries
   */
  async readAll(): Promise<DeviceLogEntry[]> {
    const file = Bun.file(this.logPath);
    
    if (!await file.exists()) {
      return [];
    }

    const text = await file.text();
    return Bun.JSONL.parse(text);
  }

  /**
   * Stream parse logs (for large files)
   */
  async *stream(): AsyncGenerator<DeviceLogEntry, void, unknown> {
    const file = Bun.file(this.logPath);
    
    if (!await file.exists()) {
      return;
    }

    // For large files, read in chunks
    const stream = file.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Parse remaining buffer
          if (buffer.trim()) {
            const result = Bun.JSONL.parseChunk(buffer);
            for (const entry of result.values) {
              yield entry as DeviceLogEntry;
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Parse complete entries
        const result = Bun.JSONL.parseChunk(buffer);
        for (const entry of result.values) {
          yield entry as DeviceLogEntry;
        }
        
        // Keep remainder
        buffer = buffer.slice(result.read);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Query logs by device ID
   */
  async queryByDevice(deviceId: string): Promise<DeviceLogEntry[]> {
    const allLogs = await this.readAll();
    return allLogs.filter(entry => entry.deviceId === deviceId);
  }

  /**
   * Query logs by event type
   */
  async queryByEvent(event: string): Promise<DeviceLogEntry[]> {
    const allLogs = await this.readAll();
    return allLogs.filter(entry => entry.event === event);
  }

  /**
   * Get latest N entries
   */
  async getLatest(count: number): Promise<DeviceLogEntry[]> {
    const allLogs = await this.readAll();
    return allLogs.slice(-count);
  }
}
