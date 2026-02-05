import http from "node:http";
import https from "node:https";

/**
 * Surgical Connection Pool (SCP)
 * High-performance, low-latency connection pooling for precision operations.
 * Optimized for Bun v1.3.5+ runtime.
 */
export class SurgicalConnectionPool {
  private static httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 60000,
  });

  private static httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 60000,
  });

  /**
   * Execute a high-frequency surgical request using the connection pool.
   * @param url - Target URL
   * @param options - request options
   */
  public static async execute(url: string, options: any = {}): Promise<any> {
    const isHttps = url.startsWith("https");
    const agent = isHttps ? this.httpsAgent : this.httpAgent;
    
    return new Promise((resolve, reject) => {
      const req = (isHttps ? https : http).request(url, { ...options, agent }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      });
      
      req.on("error", (err) => reject(err));
      req.end();
    });
  }

  /**
   * Get low-level pool diagnostics.
   * Provides insight into connection reuse and pooling efficiency.
   */
  public static getDiagnostics() {
    return {
      http: {
        // @ts-ignore
        activeSockets: Object.keys(this.httpAgent.sockets).length,
        // @ts-ignore
        freeSockets: Object.keys(this.httpAgent.freeSockets).length,
      },
      https: {
        // @ts-ignore
        activeSockets: Object.keys(this.httpsAgent.sockets).length,
        // @ts-ignore
        freeSockets: Object.keys(this.httpsAgent.freeSockets).length,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
