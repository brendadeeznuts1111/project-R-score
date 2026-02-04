/**
 * HTTP/2 Multiplexer - R-Score 0.900+ Target
 * 
 * Implements HTTP/2 multiplexing for improved P_ratio performance.
 * Uses single connection with multiple concurrent streams.
 */

import { type Socket, connect } from 'bun';

interface HTTP2Stream {
  id: number;
  headers: Record<string, string>;
  data: Buffer[];
  resolved: boolean;
  promise: {
    resolve: (value: Response) => void;
    reject: (reason?: any) => void;
  };
}

export class BunHTTP2Multiplexer {
  private socket: Socket | null = null;
  private streams = new Map<number, HTTP2Stream>();
  private nextStreamId = 1;
  private settings = {
    headerTableSize: 4096,
    enablePush: false,
    maxConcurrentStreams: 100,
    initialWindowSize: 65535,
    maxFrameSize: 16384,
  };
  private connected = false;

  async connect(hostname: string, port = 443): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = connect({
        hostname,
        port,
        tls: {
          rejectUnauthorized: true,
          ALPNProtocols: ['h2'], // Negotiate HTTP/2
        },
        socket: {
          open: () => {
            this.sendPreface();
            this.sendSettings();
            this.connected = true;
            resolve();
          },
          data: (socket, data) => this.handleFrame(data),
          error: (socket, err) => {
            this.connected = false;
            reject(err);
          },
          close: () => {
            this.connected = false;
            this.cleanup();
          },
        },
      });
    });
  }

  private sendPreface(): void {
    // HTTP/2 connection preface
    const preface = Buffer.from('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n');
    this.socket?.write(preface);
  }

  private sendSettings(): void {
    // SETTINGS frame (type=0x4, flags=0x0, stream=0x0)
    // Simplified - production would encode actual settings
    const frame = this.buildFrame(0x4, 0x0, 0x0, Buffer.alloc(0));
    this.socket?.write(frame);
  }

  async request(
    method: string,
    path: string,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    if (!this.connected) {
      throw new Error('Not connected to HTTP/2 server');
    }

    const streamId = this.nextStreamId;
    this.nextStreamId += 2; // Client streams use odd IDs

    return new Promise((resolve, reject) => {
      const stream: HTTP2Stream = {
        id: streamId,
        headers: {
          ':method': method,
          ':path': path,
          ':scheme': 'https',
          ':authority': 'bun.sh',
          ...headers,
        },
        data: [],
        resolved: false,
        promise: { resolve, reject },
      };
      this.streams.set(streamId, stream);

      // Send HEADERS frame with END_HEADERS flag
      const headerBlock = this.encodeHeaders(stream.headers);
      const headersFrame = this.buildFrame(0x1, 0x4, streamId, headerBlock); // END_HEADERS
      this.socket?.write(headersFrame);

      // Set timeout
      setTimeout(() => {
        if (!stream.resolved) {
          stream.resolved = true;
          this.streams.delete(streamId);
          reject(new Error(`Request timeout for stream ${streamId}`));
        }
      }, 10000);
    });
  }

  private handleFrame(data: Buffer): void {
    // Simplified HTTP/2 frame parsing
    // Full implementation would parse frame headers, handle WINDOW_UPDATE, etc.
    let offset = 0;
    while (offset + 9 <= data.length) {
      const length = (data.readUInt32BE(offset) >> 8) & 0xffffff;
      const type = data[offset + 3];
      const flags = data[offset + 4];
      const streamId = data.readUInt32BE(offset + 5) & 0x7fffffff;

      if (offset + 9 + length > data.length) {
        break; // Incomplete frame
      }

      const payload = data.slice(offset + 9, offset + 9 + length);

      if (type === 0x1) {
        // HEADERS frame - parse response headers
        // Simplified: just mark as headers received
      } else if (type === 0x0) {
        // DATA frame
        const stream = this.streams.get(streamId);
        if (stream) {
          stream.data.push(payload);
          if (flags & 0x1) {
            // END_STREAM flag
            stream.resolved = true;
            const body = Buffer.concat(stream.data).toString();
            stream.promise.resolve(
              new Response(body, {
                status: 200,
                headers: stream.headers,
              }),
            );
            this.streams.delete(streamId);
          }
        }
      }

      offset += 9 + length;
    }
  }

  private buildFrame(
    type: number,
    flags: number,
    streamId: number,
    payload: Buffer,
  ): Buffer {
    const frame = Buffer.allocUnsafe(9 + payload.length);
    const length = payload.length;
    frame.writeUInt32BE((length << 8) | type, 0);
    frame[3] = type;
    frame[4] = flags;
    frame.writeUInt32BE(streamId, 5);
    payload.copy(frame, 9);
    return frame;
  }

  private encodeHeaders(headers: Record<string, string>): Buffer {
    // Simplified HPACK encoding (production would use full HPACK)
    let result = '';
    for (const [key, value] of Object.entries(headers)) {
      result += `${key.toLowerCase()}: ${value}\r\n`;
    }
    return Buffer.from(result);
  }

  private cleanup(): void {
    // Reject all pending streams
    for (const stream of this.streams.values()) {
      if (!stream.resolved) {
        stream.resolved = true;
        stream.promise.reject(new Error('Connection closed'));
      }
    }
    this.streams.clear();
    this.socket = null;
  }

  getStats() {
    return {
      activeStreams: this.streams.size,
      totalStreams: (this.nextStreamId - 1) / 2,
      settings: this.settings,
      connected: this.connected,
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.end();
      this.cleanup();
    }
  }
}

/**
 * Multiplexed fetch - Fire all requests simultaneously on single HTTP/2 connection
 * P_ratio booster: Single connection, multiple streams
 */
export async function multiplexedFetch(urls: string[]): Promise<Response[]> {
  if (urls.length === 0) {
    return [];
  }

  const mux = new BunHTTP2Multiplexer();
  const { hostname, port } = new URL(urls[0]);
  const portNum = port ? parseInt(port) : 443;

  try {
    await mux.connect(hostname, portNum);

    // Fire all requests simultaneously on single connection
    const requests = urls.map((url) => {
      const { pathname } = new URL(url);
      return mux.request('GET', pathname);
    });

    const results = await Promise.all(requests);
    mux.disconnect();
    return results;
  } catch (error) {
    mux.disconnect();
    throw error;
  }
}
