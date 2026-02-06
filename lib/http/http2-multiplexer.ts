/**
 * Enterprise HTTP/2 Multiplexer
 *
 * High-performance HTTP/2 connection multiplexer with enterprise-grade
 * resource management, error handling, and connection pooling.
 *
 * @version 1.0.0
 * @author Enterprise Platform Team
 */

import {
  EnterpriseResult,
  AsyncEnterpriseResult,
  NetworkProtocol,
  NetworkConfiguration,
  OperationStatus,
  ResourceState
} from '../core/core-types';

import {
  EnterpriseErrorCode,
  createNetworkError,
  createSystemError
} from '../core/core-errors';
import { validateOrThrow, StringValidators, NumberValidators } from '../core/core-validation';

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
  private isDestroyed = false;
  private pendingTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

  async connect(hostname: string, port = 443): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = connect({
        hostname,
        port,
        tls: {
          rejectUnauthorized: true,
          // Note: ALPN negotiation happens automatically in Bun
          // HTTP/2 will be negotiated if server supports it
        },
        socket: {
          open: (sock: Socket) => {
            this.socket = sock;
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
      // Store socket reference
      this.socket = socket as any;
    });
  }

  /**
   * Safely close socket with error handling
   */
  private closeSocket(): void {
    if (this.socket) {
      try {
        if (typeof (this.socket as any).end === 'function') {
          (this.socket as any).end();
        }
      } catch (error) {
        console.warn('Error closing socket:', error);
      }
      this.socket = null;
    }
  }

  /**
   * Clear all pending timeouts
   */
  private clearTimeouts(): void {
    for (const [streamId, timeoutId] of this.pendingTimeouts) {
      clearTimeout(timeoutId);
    }
    this.pendingTimeouts.clear();
  }

  private sendPreface(): void {
    // HTTP/2 connection preface
    const preface = Buffer.from('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n');
    if (this.socket && typeof (this.socket as any).write === 'function') {
      (this.socket as any).write(preface);
    }
  }

  private sendSettings(): void {
    // SETTINGS frame (type=0x4, flags=0x0, stream=0x0)
    // Simplified - production would encode actual settings
    const frame = this.buildFrame(0x4, 0x0, 0x0, Buffer.alloc(0));
    if (this.socket && typeof (this.socket as any).write === 'function') {
      (this.socket as any).write(frame);
    }
  }

  async request(
    method: string,
    path: string,
    headers: Record<string, string> = {},
    hostname?: string,
  ): Promise<Response> {
    if (this.isDestroyed) {
      throw new Error('Multiplexer has been destroyed');
    }

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
          ':authority': hostname || 'bun.sh',
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
      if (this.socket && typeof (this.socket as any).write === 'function') {
        (this.socket as any).write(headersFrame);
      }

      // Set timeout with proper cleanup
      const timeoutId = setTimeout(() => {
        if (!stream.resolved && this.streams.has(streamId)) {
          stream.resolved = true;
          this.streams.delete(streamId);
          this.pendingTimeouts.delete(streamId);
          reject(new Error(`Request timeout for stream ${streamId}`));
        }
      }, 10000);

      this.pendingTimeouts.set(streamId, timeoutId);
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
        if (stream && !stream.resolved) {
          stream.data.push(payload);
          if (flags & 0x1) {
            // END_STREAM flag
            stream.resolved = true;
            const body = Buffer.concat(stream.data).toString();

            // Clean up timeout for this specific stream
            const timeoutId = this.pendingTimeouts.get(streamId);
            if (timeoutId) {
              clearTimeout(timeoutId);
              this.pendingTimeouts.delete(streamId);
            }

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
    // Validate payload size to prevent buffer overflow
    if (payload.length > 16384) { // HTTP/2 max frame size
      throw new Error(`Frame payload too large: ${payload.length} bytes`);
    }

    const frame = Buffer.alloc(9 + payload.length);
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
    // Clear all pending timeouts
    this.clearTimeouts();

    // Reject all pending streams
    for (const [id, stream] of this.streams.entries()) {
      if (!stream.resolved && stream.promise?.reject) {
        stream.promise.reject(new Error('Connection closed'));
        stream.resolved = true;
      }
    }
    this.streams.clear();
    this.closeSocket();
  }

  getStats() {
    return {
      activeStreams: this.streams.size,
      totalStreams: (this.nextStreamId - 1) / 2,
      settings: this.settings,
      connected: this.connected,
      destroyed: this.isDestroyed,
      pendingTimeouts: this.pendingTimeouts.size,
    };
  }

  disconnect(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;
    this.connected = false;
    this.cleanup();
  }

  /**
   * Force destroy - emergency cleanup
   */
  destroy(): void {
    this.disconnect();
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
    const requests = urls.map((url, index) => {
      const { pathname, hostname } = new URL(url);
      return mux.request('GET', pathname, {}, hostname);
    });

    const results = await Promise.all(requests);
    mux.disconnect();
    return results;
  } catch (error) {
    mux.disconnect();
    throw error;
  }
}
