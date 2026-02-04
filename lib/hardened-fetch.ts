/**
 * Hardened Fetch - Bun.connect with TLS certificate pinning
 * 
 * Implements S_hardening by enforcing strict TLS verification and optional
 * certificate fingerprint pinning for enhanced security.
 */

import { type Socket, connect } from 'bun';

interface HardenedFetchOptions {
  url: string;
  timeout?: number;
  pinFingerprint?: string; // SHA-256 fingerprint
  method?: string;
}

/**
 * Hardened fetch using Bun.connect with TLS verification
 * @param options Fetch options including URL, timeout, and optional cert pinning
 * @returns Response object similar to standard fetch
 */
export async function hardenedFetch(options: HardenedFetchOptions): Promise<Response> {
  const { hostname, pathname, port, protocol } = new URL(options.url);
  const isTLS = protocol === 'https:';

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let headersComplete = false;
    let statusCode = 200;
    let headers: Record<string, string> = {};
    let socketRef: Socket | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const socket = connect({
      hostname,
      port: parseInt(port) || (isTLS ? 443 : 80),
      tls: isTLS
        ? {
            rejectUnauthorized: true,
            checkServerIdentity: (host, cert) => {
              if (options.pinFingerprint && cert.pubkey) {
                const fingerprint = Bun.hash.sha256(cert.pubkey).toString('hex');
                if (fingerprint !== options.pinFingerprint) {
                  return new Error(`Certificate pin mismatch: ${fingerprint}`);
                }
              }
              return undefined; // Default verification
            },
          }
        : undefined,
      socket: {
        open(socket: Socket) {
          socketRef = socket;
          const method = options.method || 'HEAD';
          socket.write(
            `${method} ${pathname} HTTP/1.1\r\nHost: ${hostname}\r\nConnection: close\r\nUser-Agent: Bun-Native-Validator/1.0\r\n\r\n`,
          );
        },
        data(socket: Socket, data: Buffer) {
          chunks.push(data);
          if (!headersComplete) {
            const response = Buffer.concat(chunks).toString();
            if (response.includes('\r\n\r\n')) {
              headersComplete = true;
              const [headerText] = response.split('\r\n\r\n');
              const lines = headerText.split('\r\n');
              const statusLine = lines[0];
              const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
              if (statusMatch) {
                statusCode = parseInt(statusMatch[1]);
              }
              // Parse headers
              for (let i = 1; i < lines.length; i++) {
                const [key, ...valueParts] = lines[i].split(': ');
                if (key && valueParts.length > 0) {
                  headers[key.toLowerCase()] = valueParts.join(': ');
                }
              }
              // Resolve with headers only for HEAD requests
              if (options.method === 'HEAD' || options.method === undefined) {
                if (!resolved) {
                  resolved = true;
                  cleanup();
                  if (socketRef && typeof socketRef.end === 'function') {
                    socketRef.end();
                  }
                  resolve(
                    new Response(null, {
                      status: statusCode,
                      headers: new Headers(headers),
                    }),
                  );
                }
              }
            }
          }
        },
        close() {
          if (!headersComplete && !resolved) {
            const response = Buffer.concat(chunks).toString();
            const [headerText, ...bodyParts] = response.split('\r\n\r\n');
            const lines = headerText.split('\r\n');
            const statusLine = lines[0];
            const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
            if (statusMatch) {
              statusCode = parseInt(statusMatch[1]);
            }
            // Parse headers
            for (let i = 1; i < lines.length; i++) {
              const [key, ...valueParts] = lines[i].split(': ');
              if (key && valueParts.length > 0) {
                headers[key.toLowerCase()] = valueParts.join(': ');
              }
            }
            if (!resolved) {
              resolved = true;
              cleanup();
              resolve(
                new Response(bodyParts.join('\r\n\r\n'), {
                  status: statusCode,
                  headers: new Headers(headers),
                }),
              );
            }
          }
        },
        error(socket: Socket, error: Error) {
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(error);
          }
        },
      },
    });

    // Timeout handling
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          if (socketRef && typeof socketRef.end === 'function') {
            socketRef.end();
          }
          reject(new Error(`Connection timeout after ${options.timeout}ms`));
        }
      }, options.timeout);
    }
  });
}
