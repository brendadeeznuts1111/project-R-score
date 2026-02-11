import type {
  UDPServiceConfig,
  UDPServiceState,
  UDPServiceMetrics,
  UDPDatagram,
  UDPSendPacket,
  PeerInfo,
  DataHandler,
  DrainHandler,
  ErrorHandler,
  ShutdownHandler,
  StaleHandler,
} from "./udp-types";
import {
  decodePacketHeader,
  encodePacketHeader,
  PACKET_HEADER_SIZE,
  FLAG_CRC32,
  FLAG_HEARTBEAT,
  stripPacketHeader,
  appendCRC,
  verifyAndStripCRC,
} from "./packet-id";
import { CircuitBreaker, CircuitBreakerOpenError } from "../core/circuit-breaker";

type UDPSocket = Bun.udp.Socket<"buffer"> | Bun.udp.ConnectedSocket<"buffer">;

export class UDPRealtimeService {
  private config: UDPServiceConfig;
  private socket: UDPSocket | null = null;
  private _state: UDPServiceState = "idle";
  private isConnected = false;

  private dataHandlers: DataHandler[] = [];
  private drainHandlers: DrainHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private shutdownHandlers: ShutdownHandler[] = [];
  private staleHandlers: StaleHandler[] = [];

  private metrics = {
    packetsSent: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    sendErrors: 0,
    backpressureEvents: 0,
    packetsLost: 0,
    packetsOutOfOrder: 0,
    packetsDuplicate: 0,
    heartbeatsSent: 0,
    heartbeatsReceived: 0,
    stalePeers: 0,
    batchFlushes: 0,
  };

  // Packet ID tracking (opt-in via config.packetTracking)
  private outSeq = 0;
  private readonly sourceId: number;
  private inStates = new Map<number, { nextExpected: number; seen: Set<number> }>();
  private readonly dedupWindow: number;
  private static readonly MAX_SEQ = 0xFFFFFFFF;

  private bindTime = 0;
  private shutdownPromise: Promise<void> | null = null;

  // Heartbeat
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private peers = new Map<string, PeerInfo>();

  // Batch send
  private batchQueue: UDPSendPacket[] = [];
  private batchConnectedQueue: Bun.udp.Data[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;

  // Circuit breaker
  private breaker: CircuitBreaker | null = null;

  constructor(config: UDPServiceConfig = {}) {
    this.config = config;
    this.sourceId = Number.isInteger(config.packetSourceId)
      ? Math.max(0, Math.min(0xffff, Number(config.packetSourceId)))
      : Math.floor(Math.random() * 0x10000);
    this.dedupWindow = Math.max(1, config.dedupWindow ?? 2048);
  }

  get state(): UDPServiceState {
    return this._state;
  }

  get port(): number | null {
    return this.socket?.port ?? null;
  }

  async bind(): Promise<void> {
    if (this._state !== "idle") {
      throw new Error(`Cannot bind: state is "${this._state}", expected "idle"`);
    }

    this._state = "binding";
    this.isConnected = !!this.config.connect;

    const handler = {
      data: (_socket: any, data: Buffer, port: number, address: string) => {
        this.metrics.packetsReceived++;
        this.metrics.bytesReceived += data.byteLength;

        let payload = data;
        let sequenceId: number | undefined;
        let sourceId: number | undefined;
        let timestampUs: bigint | undefined;
        let scope: UDPDatagram["scope"];
        let flags: number | undefined;
        let crcValid: boolean | undefined;
        let isHeartbeat = false;

        if (this.config.packetTracking) {
          const header = decodePacketHeader(data);
          if (header) {
            sequenceId = header.sequenceId;
            sourceId = header.sourceId;
            timestampUs = header.timestampUs;
            scope = header.scope;
            flags = header.flags;
            payload = stripPacketHeader(data);

            if (header.flags & FLAG_CRC32) {
              const result = verifyAndStripCRC(payload);
              crcValid = result.crcValid;
              payload = result.payload;
            }

            isHeartbeat = !!(header.flags & FLAG_HEARTBEAT);
            this.trackInbound(header.sequenceId, header.sourceId);
          } else if (data.byteLength >= 4) {
            // Backward compatibility for legacy 4-byte sequence prefix.
            sequenceId = data.readUInt32BE(0);
            sourceId = 0;
            payload = data.subarray(4);
            this.trackInbound(sequenceId, 0);
          }
        }

        // Update peer tracking
        this.touchPeer(address, port, sourceId);

        if (isHeartbeat) {
          this.metrics.heartbeatsReceived++;
          return; // don't fire data handlers for heartbeats
        }

        const datagram: UDPDatagram = {
          data: payload,
          port,
          address,
          receivedAt: performance.now(),
          sequenceId,
          sourceId,
          timestampUs,
          scope,
          flags,
          crcValid,
        };
        for (const h of this.dataHandlers) h(datagram);
      },
      drain: () => {
        this.metrics.backpressureEvents++;
        for (const h of this.drainHandlers) h();
      },
      error: (_socket: any, error: Error) => {
        this.metrics.sendErrors++;
        for (const h of this.errorHandlers) h(error);
      },
    };

    try {
      if (this.isConnected) {
        this.socket = await Bun.udpSocket({
          hostname: this.config.hostname,
          port: this.config.port,
          socket: handler as Bun.udp.ConnectedSocketHandler<"buffer">,
          connect: this.config.connect!,
        });
        this._state = "connected";
      } else {
        this.socket = await Bun.udpSocket({
          hostname: this.config.hostname,
          port: this.config.port,
          socket: handler as Bun.udp.SocketHandler<"buffer">,
        });
        this._state = "bound";
      }
    } catch (err) {
      this._state = "idle";
      this.isConnected = false;
      throw err;
    }

    this.bindTime = performance.now();
    this.applySocketOptions();
    this.startHeartbeat();
    this.startBatchTimer();

    if (this.config.circuitBreaker) {
      const cb = this.config.circuitBreaker;
      this.breaker = new CircuitBreaker("udp-send", {
        failureThreshold: cb.failureThreshold ?? 5,
        resetTimeoutMs: cb.resetTimeoutMs ?? 10_000,
        successThreshold: cb.successThreshold ?? 2,
        callTimeoutMs: 0, // not used for sync sends
      });
    }
  }

  send(data: Bun.udp.Data, port?: number, address?: string): boolean {
    if (this._state !== "bound" && this._state !== "connected") {
      throw new Error(`Cannot send: state is "${this._state}", expected "bound" or "connected"`);
    }

    if (this.breaker?.isOpen()) {
      this.breaker.recordRejection();
      throw new CircuitBreakerOpenError("udp-send", null, 0);
    }

    const framed = this.config.packetTracking ? this.frameOutbound(data) : data;
    const byteLen = dataByteLength(framed);

    let ok: boolean;

    if (this.isConnected) {
      ok = (this.socket as Bun.udp.ConnectedSocket<"buffer">).send(framed);
    } else {
      if (port === undefined || address === undefined) {
        throw new Error("Port and address are required for unconnected sockets");
      }
      ok = (this.socket as Bun.udp.Socket<"buffer">).send(framed, port, address);
    }

    if (ok) {
      this.breaker?.recordSuccess();
    } else {
      this.breaker?.recordFailure(new Error("backpressure"));
    }

    this.metrics.packetsSent++;
    this.metrics.bytesSent += byteLen;
    return ok;
  }

  sendMany(packets: readonly Bun.udp.Data[]): number;
  sendMany(packets: readonly UDPSendPacket[]): number;
  sendMany(packets: readonly any[]): number {
    if (this._state !== "bound" && this._state !== "connected") {
      throw new Error(`Cannot sendMany: state is "${this._state}", expected "bound" or "connected"`);
    }

    if (this.breaker?.isOpen()) {
      this.breaker.recordRejection();
      throw new CircuitBreakerOpenError("udp-send", null, 0);
    }

    let sent: number;

    if (this.isConnected) {
      const payloads = this.config.packetTracking
        ? (packets as readonly Bun.udp.Data[]).map((p) => this.frameOutbound(p))
        : (packets as readonly Bun.udp.Data[]);
      sent = (this.socket as Bun.udp.ConnectedSocket<"buffer">).sendMany(payloads);
      for (const p of payloads) {
        this.metrics.bytesSent += dataByteLength(p);
      }
    } else {
      // Flatten UDPSendPacket[] into [data, port, addr, ...] flat array
      const flat: (Bun.udp.Data | string | number)[] = [];
      for (const p of packets as readonly UDPSendPacket[]) {
        const payload = this.config.packetTracking ? this.frameOutbound(p.data) : p.data;
        flat.push(payload, p.port, p.address);
        this.metrics.bytesSent += dataByteLength(payload);
      }
      sent = (this.socket as Bun.udp.Socket<"buffer">).sendMany(flat);
    }

    if (packets.length > 0 && sent === 0) {
      this.breaker?.recordFailure(new Error("sendMany: 0 packets sent"));
    } else if (sent > 0) {
      this.breaker?.recordSuccess();
    }

    this.metrics.packetsSent += sent;
    return sent;
  }

  // ---- Batch send ----

  /**
   * Queue a datagram for batched sending. Use `flush()` to send immediately,
   * or rely on the auto-flush timer (config.batchFlushIntervalMs).
   */
  scheduleSend(data: Bun.udp.Data, port?: number, address?: string): void {
    if (this._state !== "bound" && this._state !== "connected") {
      throw new Error(`Cannot scheduleSend: state is "${this._state}", expected "bound" or "connected"`);
    }

    if (this.breaker?.isOpen()) {
      this.breaker.recordRejection();
      throw new CircuitBreakerOpenError("udp-send", null, 0);
    }

    if (this.isConnected) {
      this.batchConnectedQueue.push(data);
    } else {
      if (port === undefined || address === undefined) {
        throw new Error("Port and address are required for unconnected sockets");
      }
      this.batchQueue.push({ data, port, address });
    }
  }

  /**
   * Flush all queued datagrams immediately via sendMany.
   * Returns the number of packets sent.
   */
  flush(): number {
    if (this._state !== "bound" && this._state !== "connected") return 0;

    let sent = 0;
    if (this.isConnected && this.batchConnectedQueue.length > 0) {
      const batch = this.batchConnectedQueue.splice(0);
      sent = this.sendMany(batch);
    } else if (!this.isConnected && this.batchQueue.length > 0) {
      const batch = this.batchQueue.splice(0);
      sent = this.sendMany(batch);
    }

    if (sent > 0) this.metrics.batchFlushes++;
    return sent;
  }

  get pendingBatchSize(): number {
    return this.isConnected ? this.batchConnectedQueue.length : this.batchQueue.length;
  }

  // ---- Event handlers ----

  onMessage(handler: DataHandler): void {
    this.dataHandlers.push(handler);
  }

  offMessage(handler: DataHandler): boolean {
    return removeFromArray(this.dataHandlers, handler);
  }

  onDrainEvent(handler: DrainHandler): void {
    this.drainHandlers.push(handler);
  }

  offDrainEvent(handler: DrainHandler): boolean {
    return removeFromArray(this.drainHandlers, handler);
  }

  onErrorEvent(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  offErrorEvent(handler: ErrorHandler): boolean {
    return removeFromArray(this.errorHandlers, handler);
  }

  onShutdown(handler: ShutdownHandler): void {
    this.shutdownHandlers.push(handler);
  }

  offShutdown(handler: ShutdownHandler): boolean {
    return removeFromArray(this.shutdownHandlers, handler);
  }

  onStale(handler: StaleHandler): void {
    this.staleHandlers.push(handler);
  }

  offStale(handler: StaleHandler): boolean {
    return removeFromArray(this.staleHandlers, handler);
  }

  // ---- Peer info ----

  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  // ---- Multicast ----

  joinMulticast(address: string, interfaceAddress?: string): boolean {
    if (!this.socket) throw new Error("Socket not bound");
    return this.socket.addMembership(address, interfaceAddress);
  }

  leaveMulticast(address: string, interfaceAddress?: string): boolean {
    if (!this.socket) throw new Error("Socket not bound");
    return this.socket.dropMembership(address, interfaceAddress);
  }

  // ---- Metrics ----

  getMetrics(): UDPServiceMetrics {
    const uptimeMs = this.bindTime > 0 && this._state !== "idle" && this._state !== "closed"
      ? performance.now() - this.bindTime
      : 0;
    return {
      ...this.metrics,
      sequenceId: this.outSeq,
      state: this._state,
      boundPort: this.port,
      uptimeMs,
      pendingBatchSize: this.pendingBatchSize,
    };
  }

  /**
   * Returns the circuit breaker instance, or null if not configured.
   */
  getCircuitBreaker(): CircuitBreaker | null {
    return this.breaker;
  }

  // ---- Lifecycle ----

  /**
   * Graceful shutdown: transitions to "draining", flushes pending batch,
   * notifies shutdown handlers, waits up to `timeoutMs` for drain, then closes.
   */
  shutdown(timeoutMs?: number): Promise<void> {
    if (this._state === "closed") return Promise.resolve();
    if (this._state === "draining") return this.shutdownPromise ?? Promise.resolve();

    if (this._state !== "bound" && this._state !== "connected") {
      this.close();
      return Promise.resolve();
    }

    this.stopTimers();

    // Flush pending batch while still in bound/connected state
    this.flush();

    this._state = "draining";

    const timeout = timeoutMs ?? this.config.shutdownTimeoutMs ?? 5000;

    this.shutdownPromise = new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        for (const h of this.shutdownHandlers) h();
        this.close();
        resolve();
      };

      this.onDrainEvent(finish);
      setTimeout(finish, timeout);
    });

    return this.shutdownPromise;
  }

  close(): void {
    if (this._state === "closed") return;
    this.stopTimers();
    this.socket?.close();
    this.socket = null;
    this._state = "closed";
  }

  reset(): void {
    this.close();
    this.breaker?.destroy();
    this.breaker = null;
    this.metrics = {
      packetsSent: 0,
      packetsReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      sendErrors: 0,
      backpressureEvents: 0,
      packetsLost: 0,
      packetsOutOfOrder: 0,
      packetsDuplicate: 0,
      heartbeatsSent: 0,
      heartbeatsReceived: 0,
      stalePeers: 0,
      batchFlushes: 0,
    };
    this.outSeq = 0;
    this.bindTime = 0;
    this.inStates.clear();
    this.peers.clear();
    this.batchQueue = [];
    this.batchConnectedQueue = [];
    this.dataHandlers = [];
    this.drainHandlers = [];
    this.errorHandlers = [];
    this.shutdownHandlers = [];
    this.staleHandlers = [];
    this.shutdownPromise = null;
    this._state = "idle";
  }

  // ---- Private: heartbeat ----

  private startHeartbeat(): void {
    const interval = this.config.heartbeatIntervalMs;
    if (!interval || !this.config.packetTracking) return;

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, interval);

    const staleTimeout = this.config.heartbeatTimeoutMs ?? interval * 3;
    this.staleCheckTimer = setInterval(() => {
      this.checkStalePeers(staleTimeout);
    }, Math.max(interval, 500));
  }

  private sendHeartbeat(): void {
    if (this._state !== "bound" && this._state !== "connected") return;

    const baseFlags = this.config.packetTrackingFlags ?? 0;
    const seq = this.outSeq;
    this.outSeq = (this.outSeq + 1) & UDPRealtimeService.MAX_SEQ;
    const header = encodePacketHeader({
      scope: this.config.packetTrackingScope ?? "site-local",
      flags: baseFlags | FLAG_CRC32 | FLAG_HEARTBEAT,
      sourceId: this.sourceId,
      sequenceId: seq,
    });
    // Empty payload heartbeat — just header + CRC of empty buffer
    const payloadWithCRC = appendCRC(Buffer.alloc(0));
    const framed = Buffer.allocUnsafe(PACKET_HEADER_SIZE + payloadWithCRC.byteLength);
    header.copy(framed, 0);
    payloadWithCRC.copy(framed, PACKET_HEADER_SIZE);

    if (this.isConnected) {
      (this.socket as Bun.udp.ConnectedSocket<"buffer">).send(framed);
    }
    // For unconnected sockets, heartbeats are only sent to known peers
    // by the application. We don't know the destination here.

    this.metrics.heartbeatsSent++;
  }

  private touchPeer(address: string, port: number, sourceId?: number): void {
    const key = `${address}:${port}`;
    const existing = this.peers.get(key);
    if (existing) {
      existing.lastSeenAt = performance.now();
      existing.sourceId = sourceId;
      if (existing.stale) {
        existing.stale = false;
        this.metrics.stalePeers = Math.max(0, this.metrics.stalePeers - 1);
      }
    } else {
      this.peers.set(key, {
        address,
        port,
        sourceId,
        lastSeenAt: performance.now(),
        stale: false,
      });
    }
  }

  private checkStalePeers(timeoutMs: number): void {
    const now = performance.now();
    this.peers.forEach((peer) => {
      if (!peer.stale && now - peer.lastSeenAt > timeoutMs) {
        peer.stale = true;
        this.metrics.stalePeers++;
        for (const h of this.staleHandlers) h({ ...peer });
      }
    });
  }

  // ---- Private: batch timer ----

  private startBatchTimer(): void {
    const interval = this.config.batchFlushIntervalMs;
    if (!interval) return;

    this.batchTimer = setInterval(() => {
      this.flush();
    }, interval);
  }

  // ---- Private: timers ----

  private stopTimers(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.staleCheckTimer) { clearInterval(this.staleCheckTimer); this.staleCheckTimer = null; }
    if (this.batchTimer) { clearInterval(this.batchTimer); this.batchTimer = null; }
  }

  // ---- Private: packet framing ----

  private frameOutbound(data: Bun.udp.Data): Buffer {
    const payload = toBuffer(data);
    const baseFlags = this.config.packetTrackingFlags ?? 0;
    const seq = this.outSeq;
    this.outSeq = (this.outSeq + 1) & UDPRealtimeService.MAX_SEQ;
    const header = encodePacketHeader({
      scope: this.config.packetTrackingScope ?? "site-local",
      flags: baseFlags | FLAG_CRC32,
      sourceId: this.sourceId,
      sequenceId: seq,
    });
    // CRC covers payload only — verified after header is stripped on receive
    const payloadWithCRC = appendCRC(payload);
    const framed = Buffer.allocUnsafe(PACKET_HEADER_SIZE + payloadWithCRC.byteLength);
    header.copy(framed, 0);
    payloadWithCRC.copy(framed, PACKET_HEADER_SIZE);
    return framed;
  }

  private trackInbound(seq: number, sourceId: number): void {
    let state = this.inStates.get(sourceId);
    if (!state) {
      state = { nextExpected: 0, seen: new Set<number>() };
      this.inStates.set(sourceId, state);
    }

    if (state.seen.has(seq)) {
      this.metrics.packetsDuplicate++;
      return;
    }

    state.seen.add(seq);

    // Prune window
    if (state.seen.size > this.dedupWindow) {
      const cutoff = seq - this.dedupWindow;
      state.seen.forEach((s) => { if (s < cutoff) state!.seen.delete(s); });
    }

    if (seq === state.nextExpected) {
      state.nextExpected++;
      // Advance past any already-seen
      while (state.seen.has(state.nextExpected)) state.nextExpected++;
    } else if (seq > state.nextExpected) {
      this.metrics.packetsLost += seq - state.nextExpected;
      state.nextExpected = seq + 1;
    } else {
      // seq < expected but not duplicate — arrived late
      this.metrics.packetsOutOfOrder++;
    }
  }

  private applySocketOptions(): void {
    if (!this.socket) return;

    if (this.config.broadcast) {
      this.socket.setBroadcast(true);
    }
    if (this.config.ttl !== undefined) {
      this.socket.setTTL(this.config.ttl);
    }
    if (this.config.multicastTTL !== undefined) {
      this.socket.setMulticastTTL(this.config.multicastTTL);
    }
    if (this.config.multicastLoopback !== undefined) {
      this.socket.setMulticastLoopback(this.config.multicastLoopback);
    }
    if (this.config.multicastGroups) {
      for (const g of this.config.multicastGroups) {
        this.socket.addMembership(g.address, g.interfaceAddress);
      }
    }
  }
}

function dataByteLength(data: Bun.udp.Data): number {
  if (typeof data === "string") return Buffer.byteLength(data);
  if ("byteLength" in data) return data.byteLength;
  return 0;
}

function toBuffer(data: Bun.udp.Data): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === "string") return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return Buffer.from(data);
}

function removeFromArray<T>(arr: T[], item: T): boolean {
  const idx = arr.indexOf(item);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  return true;
}
