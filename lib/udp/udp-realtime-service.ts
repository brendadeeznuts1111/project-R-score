import type {
  UDPServiceConfig,
  UDPServiceState,
  UDPServiceMetrics,
  UDPDatagram,
  UDPSendPacket,
  DataHandler,
  DrainHandler,
  ErrorHandler,
} from "./udp-types";
import {
  decodePacketHeader,
  encodePacketHeader,
  PACKET_HEADER_SIZE,
  FLAG_CRC32,
  CRC_SIZE,
  stripPacketHeader,
  appendCRC,
  verifyAndStripCRC,
} from "./packet-id";

type UDPSocket = Bun.udp.Socket<"buffer"> | Bun.udp.ConnectedSocket<"buffer">;

export class UDPRealtimeService {
  private config: UDPServiceConfig;
  private socket: UDPSocket | null = null;
  private _state: UDPServiceState = "idle";
  private isConnected = false;

  private dataHandlers: DataHandler[] = [];
  private drainHandlers: DrainHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];

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
  };

  // Packet ID tracking (opt-in via config.packetTracking)
  private outSeq = 0;
  private readonly sourceId: number;
  private inStates = new Map<number, { nextExpected: number; seen: Set<number> }>();
  private static readonly DEDUP_WINDOW = 2048;

  constructor(config: UDPServiceConfig = {}) {
    this.config = config;
    this.sourceId = Number.isInteger(config.packetSourceId)
      ? Math.max(0, Math.min(0xffff, Number(config.packetSourceId)))
      : Math.floor(Math.random() * 0x10000);
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

            this.trackInbound(header.sequenceId, header.sourceId);
          } else if (data.byteLength >= 4) {
            // Backward compatibility for legacy 4-byte sequence prefix.
            sequenceId = data.readUInt32BE(0);
            sourceId = 0;
            payload = data.subarray(4);
            this.trackInbound(sequenceId, 0);
          }
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

    this.applySocketOptions();
  }

  send(data: Bun.udp.Data, port?: number, address?: string): boolean {
    if (this._state !== "bound" && this._state !== "connected") {
      throw new Error(`Cannot send: state is "${this._state}", expected "bound" or "connected"`);
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

    this.metrics.packetsSent += sent;
    return sent;
  }

  onMessage(handler: DataHandler): void {
    this.dataHandlers.push(handler);
  }

  onDrainEvent(handler: DrainHandler): void {
    this.drainHandlers.push(handler);
  }

  onErrorEvent(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  joinMulticast(address: string, interfaceAddress?: string): boolean {
    if (!this.socket) throw new Error("Socket not bound");
    return this.socket.addMembership(address, interfaceAddress);
  }

  leaveMulticast(address: string, interfaceAddress?: string): boolean {
    if (!this.socket) throw new Error("Socket not bound");
    return this.socket.dropMembership(address, interfaceAddress);
  }

  getMetrics(): UDPServiceMetrics {
    return {
      ...this.metrics,
      sequenceId: this.outSeq,
      state: this._state,
      boundPort: this.port,
    };
  }

  close(): void {
    if (this._state === "closed") return;
    this.socket?.close();
    this.socket = null;
    this._state = "closed";
  }

  reset(): void {
    this.close();
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
    };
    this.outSeq = 0;
    this.inStates.clear();
    this.dataHandlers = [];
    this.drainHandlers = [];
    this.errorHandlers = [];
    this._state = "idle";
  }

  private frameOutbound(data: Bun.udp.Data): Buffer {
    const payload = toBuffer(data);
    const baseFlags = this.config.packetTrackingFlags ?? 0;
    const header = encodePacketHeader({
      scope: this.config.packetTrackingScope ?? "site-local",
      flags: baseFlags | FLAG_CRC32,
      sourceId: this.sourceId,
      sequenceId: this.outSeq++,
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
    if (state.seen.size > UDPRealtimeService.DEDUP_WINDOW) {
      const cutoff = seq - UDPRealtimeService.DEDUP_WINDOW;
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
