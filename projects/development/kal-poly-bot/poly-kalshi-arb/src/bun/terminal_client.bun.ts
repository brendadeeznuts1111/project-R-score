/**
 * Terminal Client - WebSocket interface for Kalman Terminal API
 *
 * Provides a browser/Node.js client for interacting with the PTY terminal
 * and debugging the Kalman Filter trading system.
 */

interface TerminalMessage {
  type: "connected" | "terminal_output" | "kalman_result" | "error";
  sessionId?: string;
  data?: string;
  result?: string;
  message?: string;
  timestamp?: number;
}

interface TerminalClientConfig {
  url: string;
  sessionId?: string;
  cols: number;
  rows: number;
  autoReconnect: boolean;
  reconnectDelay: number;
}

export class KalmanTerminalClient {
  private ws: WebSocket | null = null;
  private config: TerminalClientConfig;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers = new Map<string, Function[]>();

  constructor(config: Partial<TerminalClientConfig> = {}) {
    this.config = {
      url: "ws://localhost:3001",
      cols: 120,
      rows: 40,
      autoReconnect: true,
      reconnectDelay: 1000,
      ...config,
    };
  }

  /**
   * Connect to terminal server and create session
   */
  async connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        console.log("🔌 Connected to Kalman Terminal Server");

        if (!this.config.sessionId) {
          // Create new session
          this.createSession()
            .then((sessionId) => {
              this.sessionId = sessionId;
              resolve(sessionId);
            })
            .catch(reject);
        } else {
          this.sessionId = this.config.sessionId;
          resolve(this.config.sessionId);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: TerminalMessage = JSON.parse(event.data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("🔌 Disconnected from terminal server");
        this.emit("disconnected");

        if (
          this.config.autoReconnect &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(
              `🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
            );
            this.connect();
          }, this.config.reconnectDelay);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.emit("error", error);
        reject(error);
      };
    });
  }

  /**
   * Create new terminal session via HTTP API
   */
  private async createSession(): Promise<string> {
    const response = await fetch(
      `${this.config.url.replace("ws", "http")}/terminal`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    const data = await response.json();
    return data.sessionId;
  }

  /**
   * Send input to terminal
   */
  sendInput(input: string): boolean {
    if (!this.ws || !this.sessionId) return false;

    this.ws.send(
      JSON.stringify({
        type: "terminal_input",
        sessionId: this.sessionId,
        input,
      })
    );

    return true;
  }

  /**
   * Resize terminal
   */
  resize(cols: number, rows: number): boolean {
    if (!this.ws || !this.sessionId) return false;

    this.ws.send(
      JSON.stringify({
        type: "terminal_resize",
        sessionId: this.sessionId,
        cols,
        rows,
      })
    );

    return true;
  }

  /**
   * Execute Kalman Filter command
   */
  async executeKalmanCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.sessionId) {
        reject(new Error("Not connected"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Command timeout"));
      }, 10000);

      const handleResult = (message: TerminalMessage) => {
        if (
          message.type === "kalman_result" &&
          message.sessionId === this.sessionId
        ) {
          clearTimeout(timeout);
          this.off("kalman_result", handleResult);
          resolve(message.result || "");
        }
      };

      this.on("kalman_result", handleResult);

      this.ws.send(
        JSON.stringify({
          type: "kalman_command",
          sessionId: this.sessionId,
          command,
        })
      );
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: TerminalMessage): void {
    switch (message.type) {
      case "connected":
        console.log("✅", message.message);
        this.emit("connected", message);
        break;
      case "terminal_output":
        this.emit("output", message.data || "");
        break;
      case "kalman_result":
        this.emit("kalman_result", message);
        break;
      case "error":
        console.error("❌", message.message);
        this.emit("error", message.message);
        break;
    }
  }

  /**
   * Event handling
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
  }

  /**
   * Get session info
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Interactive terminal demo
 */
async function runTerminalDemo(): Promise<void> {
  console.log("🎯 Kalman Filter Terminal Demo");
  console.log("================================");

  const client = new KalmanTerminalClient();

  // Set up event handlers
  client.on("output", (data: string) => {
    process.stdout.write(data);
  });

  client.on("connected", () => {
    console.log(
      '✅ Terminal ready! Type commands or "help" for available options.'
    );
  });

  client.on("error", (error: string) => {
    console.error("❌ Error:", error);
  });

  try {
    // Connect to terminal
    await client.connect();

    // Set up stdin handling for interactive input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", async (key: string) => {
      // Handle special keys
      if (key === "\u0003") {
        // Ctrl+C
        console.log("\n👋 Goodbye!");
        client.disconnect();
        process.exit(0);
      }

      // Send to terminal
      client.sendInput(key);
    });

    // Run some demo commands
    setTimeout(async () => {
      console.log("\n🚀 Running demo commands...");

      // Check Kalman status
      const status = await client.executeKalmanCommand("kalman-status");
      console.log("\n📊 Kalman Status:");
      console.log(status);

      // Run test
      setTimeout(async () => {
        const test = await client.executeKalmanCommand("kalman-test");
        console.log("\n🧪 Test Results:");
        console.log(test);
      }, 2000);
    }, 3000);
  } catch (error) {
    console.error("Failed to connect:", error);
    process.exit(1);
  }
}

/**
 * Browser-based terminal interface
 */
export function createBrowserTerminal(
  container: HTMLElement
): KalmanTerminalClient {
  const client = new KalmanTerminalClient();

  // Create terminal UI
  const terminal = document.createElement("div");
  terminal.style.cssText = `
    background: #1a1a1a;
    color: #00ff00;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    padding: 20px;
    border-radius: 8px;
    height: 400px;
    overflow-y: auto;
    white-space: pre-wrap;
    border: 1px solid #333;
  `;

  const input = document.createElement("input");
  input.style.cssText = `
    width: 100%;
    background: #2a2a2a;
    color: #00ff00;
    border: 1px solid #333;
    padding: 10px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    margin-top: 10px;
    border-radius: 4px;
  `;
  input.placeholder = "Enter commands...";

  container.appendChild(terminal);
  container.appendChild(input);

  // Handle output
  client.on("output", (data: string) => {
    terminal.textContent += data;
    terminal.scrollTop = terminal.scrollHeight;
  });

  client.on("connected", () => {
    terminal.textContent += "✅ Connected to Kalman Terminal\n";
  });

  client.on("error", (error: string) => {
    terminal.textContent += `❌ Error: ${error}\n`;
  });

  // Handle input
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const command = input.value + "\n";
      client.sendInput(command);
      terminal.textContent += command;
      input.value = "";
    }
  });

  // Connect
  client.connect().catch(console.error);

  return client;
}

// CLI interface
if (import.meta.main) {
  runTerminalDemo().catch(console.error);
}

export default KalmanTerminalClient;
