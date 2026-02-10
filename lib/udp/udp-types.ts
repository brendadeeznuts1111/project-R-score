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
  packetTrackingScope?: "link-local" | "site-local" | "global" | "admin";
  packetTrackingFlags?: number;
  packetSourceId?: number;
}

export type UDPServiceState = "idle" | "binding" | "bound" | "connected" | "closed";

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
}

export interface UDPSendPacket {
  data: Bun.udp.Data;
  port: number;
  address: string;
}

export type DataHandler = (datagram: UDPDatagram) => void;
export type DrainHandler = () => void;
export type ErrorHandler = (error: Error) => void;
