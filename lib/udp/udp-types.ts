export interface UDPServiceConfig {
  port?: number;
  hostname?: string;
  connect?: { hostname: string; port: number };
  broadcast?: boolean;
  ttl?: number;
  multicastGroups?: Array<{ address: string; interfaceAddress?: string }>;
  multicastTTL?: number;
  multicastLoopback?: boolean;
  packetTracking?: boolean;
  packetTrackingScope?: "interface-local" | "link-local" | "site-local" | "organization" | "global" | "admin";
  packetTrackingFlags?: number;
  packetSourceId?: number;
  /** Sliding-window size for duplicate detection (default 2048). */
  dedupWindow?: number;
  /** Default timeout in ms for graceful shutdown (default 5000). */
  shutdownTimeoutMs?: number;
  /** Heartbeat interval in ms. Requires packetTracking. 0 = disabled (default). */
  heartbeatIntervalMs?: number;
  /** Peer stale timeout in ms. Fires onStale when peer silent this long (default 3× heartbeat). */
  heartbeatTimeoutMs?: number;
  /** Auto-flush interval in ms for batched sends. 0 = disabled (default). */
  batchFlushIntervalMs?: number;
  /** Circuit breaker config. When set, send/sendMany/scheduleSend reject with
   *  CircuitBreakerOpenError when the breaker is OPEN. Backpressure (send returns false
   *  or sendMany returns 0) counts as a failure. */
  circuitBreaker?: {
    failureThreshold?: number;
    resetTimeoutMs?: number;
    successThreshold?: number;
  };
}

export type UDPServiceState = "idle" | "binding" | "bound" | "connected" | "draining" | "closed";

export interface UDPDatagram {
  data: Buffer;
  port: number;
  address: string;
  receivedAt: number;
  sequenceId?: number;
  sourceId?: number;
  timestampUs?: bigint;
  scope?: "interface-local" | "link-local" | "site-local" | "organization" | "global" | "admin";
  flags?: number;
  crcValid?: boolean;
}

export interface UDPServiceMetrics {
  packetsSent: number;
  packetsReceived: number;
  bytesSent: number;
  bytesReceived: number;
  sendErrors: number;
  backpressureEvents: number;
  packetsLost: number;
  packetsOutOfOrder: number;
  packetsDuplicate: number;
  sequenceId: number;
  state: UDPServiceState;
  boundPort: number | null;
  uptimeMs: number;
  heartbeatsSent: number;
  heartbeatsReceived: number;
  stalePeers: number;
  pendingBatchSize: number;
  batchFlushes: number;
}

export interface PeerInfo {
  address: string;
  port: number;
  sourceId?: number;
  lastSeenAt: number;
  stale: boolean;
}

export interface UDPSendPacket {
  data: Bun.udp.Data;
  port: number;
  address: string;
}

export type DataHandler = (datagram: UDPDatagram) => void;
export type DrainHandler = () => void;
export type ErrorHandler = (error: Error) => void;
export type ShutdownHandler = () => void;
export type StaleHandler = (peer: PeerInfo) => void;
