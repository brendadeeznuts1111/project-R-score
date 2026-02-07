// lib/har-analyzer/bun-serve-types.ts (v1.3.4 compatible)
// Protocol-aware HAR capture server using Bun.serve()
//
// v1.3.4 fix: Server.protocol is now typed as "http" | "https" | null
// The protocol property is on the SERVER instance, not on individual requests.
import type { Server } from "bun";

// Captured request entry for HAR generation
export interface CapturedEntry {
  url: string;
  method: string;
  protocol: "http" | "https";
  httpVersion: string;
  status: number;
  statusText: string;
  requestHeaders: { name: string; value: string }[];
  responseHeaders: { name: string; value: string }[];
  mimeType: string;
  size: number;
  transferSize: number;
  startTime: number;
  waitTime: number;
  receiveTime: number;
  totalTime: number;
}

// Protocol → HTTP version mapping
// HTTPS connections negotiate HTTP/2 via ALPN; plain HTTP falls back to 1.1
export function inferHttpVersion(protocol: "http" | "https"): string {
  return protocol === "https" ? "http/2.0" : "http/1.1";
}

// Protocol detection from HAR entries (combines HAR data + v1.3.4 server.protocol)
export interface HARProtocolDetection {
  httpVersion: string;               // "h2", "h3", "http/1.1"
  requestProtocol: "http" | "https"; // From Server.protocol (v1.3.4+) or URL scheme
  isSecure: boolean;
  isHTTP2: boolean;
  isHTTP3: boolean;
}

export interface HAREntry {
  request: { url: string; method: string; httpVersion?: string; headers: { name: string; value: string }[] };
  response: { status: number; httpVersion?: string; headers: { name: string; value: string }[]; content: { size: number; mimeType: string }; _transferSize?: number };
  timings: { blocked: number; dns: number; ssl: number; connect: number; send: number; wait: number; receive: number };
  time: number;
  startedDateTime: string;
}

// Analyze protocol from a HAR entry, optionally with the server's protocol (v1.3.4)
export function analyzeProtocolFromHAR(entry: HAREntry, serverProtocol?: "http" | "https" | null): HARProtocolDetection {
  const httpVersion = entry.response.httpVersion || entry.request.httpVersion || "http/1.1";

  return {
    httpVersion,
    requestProtocol: serverProtocol || (entry.request.url.startsWith("https:") ? "https" : "http"),
    isSecure: entry.request.url.startsWith("https:"),
    isHTTP2: httpVersion === "h2" || httpVersion === "HTTP/2" || httpVersion === "http/2.0",
    isHTTP3: httpVersion === "h3" || httpVersion === "HTTP/3",
  };
}

// Protocol-aware HAR capture server
// Uses server.protocol (v1.3.4 typed) to tag captured entries
//
// NOTE: HTTPS redirect logic is the caller's responsibility.
// Bun has a known issue where process.env.NODE_ENV inside a Bun.serve()
// fetch handler in an imported module corrupts server initialization.
export function createHARServer(options?: {
  tls?: { key: string; cert: string };
  onRequest?: (entry: CapturedEntry) => void;
}): Server {
  const captured: CapturedEntry[] = [];
  let serverRef: Server;

  serverRef = Bun.serve({
    port: 0,
    fetch(req): Response {
      // server.protocol is typed "http" | "https" | null (v1.3.4)
      const proto = serverRef.protocol ?? (req.url.startsWith("https:") ? "https" as const : "http" as const);
      const start = performance.now();
      const extraHeaders = proto === "https"
        ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" }
        : undefined;

      return handle(req, proto, start, captured, options?.onRequest, extraHeaders);
    },

    // TLS config when certs provided
    ...(options?.tls && {
      tls: {
        key: Bun.file(options.tls.key),
        cert: Bun.file(options.tls.cert),
        alpnProtocols: ["h2", "http/1.1"],
      },
    }),
  });

  return serverRef;
}

function handle(
  req: Request,
  protocol: "http" | "https",
  startTime: number,
  entries: CapturedEntry[],
  onRequest?: (entry: CapturedEntry) => void,
  extraHeaders?: Record<string, string>,
): Response {
  const res = new Response("OK", extraHeaders ? { headers: extraHeaders } : undefined);
  const waitDone = performance.now();
  const entry: CapturedEntry = {
    url: req.url,
    method: req.method,
    protocol,
    httpVersion: inferHttpVersion(protocol),
    status: res.status,
    statusText: res.statusText,
    requestHeaders: [...req.headers.entries()].map(([name, value]) => ({ name, value })),
    responseHeaders: [...res.headers.entries()].map(([name, value]) => ({ name, value })),
    mimeType: res.headers.get("content-type") || "application/octet-stream",
    size: 2,
    transferSize: 2,
    startTime,
    waitTime: waitDone - startTime,
    receiveTime: 0,
    totalTime: waitDone - startTime,
  };
  entries.push(entry);
  onRequest?.(entry);
  return res;
}
