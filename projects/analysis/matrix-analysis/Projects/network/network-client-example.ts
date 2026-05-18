/**
 * Unified Network System - Client Example
 * Demonstrates connecting to the unified network server
 */

/**
 * WebSocket Client with DNS Resolution
 */
class NetworkClient {
  private ws: WebSocket | null = null;
  private hostname: string;
  private port: number;

  constructor(hostname: string = "localhost", port: number = 3000) {
    this.hostname = hostname;
    this.port = port;
  }

  /**
   * Connect to the unified network server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `ws://${this.hostname}:${this.port}/ws`;
        console.info(`🔌 Connecting to ${url}...`);
        
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.info("✅ Connected to unified network server\n");
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        };

        this.ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.info("🔌 Disconnected from server");
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: any): void {
    switch (data.type) {
      case "welcome":
        console.info("📨 Welcome message:");
        console.info(`   Client ID: ${data.clientId}`);
        console.info(`   Server: ${data.server.hostname}`);
        console.info(`   Server IPv4: ${data.server.ipv4.join(", ")}`);
        console.info(`   Your IPv4: ${data.client.ipv4 || "N/A"}\n`);
        break;

      case "dns_resolved":
        console.info(`📡 DNS Resolution for ${data.hostname}:`);
        console.info(`   IPv4: ${data.ipv4?.join(", ") || "N/A"}`);
        console.info(`   IPv6: ${data.ipv6?.join(", ") || "N/A"}`);
        console.info(`   Cached: ${data.cached ? "Yes" : "No"}\n`);
        break;

      case "echo":
        console.info("📨 Echo:", data.original);
        break;

      case "error":
        console.error("❌ Error:", data.message);
        break;

      default:
        console.info("📨 Message:", data);
    }
  }

  /**
   * Request DNS resolution
   */
  resolveDNS(hostname: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("❌ Not connected");
      return;
    }

    console.info(`🔍 Requesting DNS resolution for ${hostname}...`);
    this.ws.send(JSON.stringify({
      type: "resolve",
      hostname,
    }));
  }

  /**
   * Send message
   */
  send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("❌ Not connected");
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Main execution
if (import.meta.main) {
  const hostname = process.argv[2] || "localhost";
  const port = parseInt(process.argv[3] || "3000", 10);

  console.info("🚀 Unified Network System - Client\n");
  console.info("=".repeat(60) + "\n");

  const client = new NetworkClient(hostname, port);

  try {
    await client.connect();

    // Example: Resolve some hostnames
    console.info("📡 Testing DNS Resolution:\n");
    client.resolveDNS("bun.sh");
    await new Promise(resolve => setTimeout(resolve, 1000));

    client.resolveDNS("github.com");
    await new Promise(resolve => setTimeout(resolve, 1000));

    client.resolveDNS("google.com");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send a test message
    console.info("\n📤 Sending test message...");
    client.send({
      type: "test",
      message: "Hello from client!",
      timestamp: Date.now(),
    });

    // Keep connection alive
    console.info("\n💡 Client connected. Press Ctrl+C to exit.\n");
    
    // Keep process alive
    process.on("SIGINT", () => {
      console.info("\n🛑 Disconnecting...");
      client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error("❌ Failed to connect:", error);
    process.exit(1);
  }
}

export { NetworkClient };
