// UDP real-time datagram service

export { UDPRealtimeService } from "./udp-realtime-service";

export type {
  UDPServiceConfig,
  UDPServiceState,
  UDPDatagram,
  UDPServiceMetrics,
  UDPSendPacket,
  PeerInfo,
  DataHandler,
  DrainHandler,
  ErrorHandler,
  ShutdownHandler,
  StaleHandler,
} from "./udp-types";

export { MulticastAddressSelector } from "./multicast-selector";
export type {
  MulticastScope,
  Reliability,
  Security,
  Scale,
  MulticastIpFamily,
  MulticastRequirements,
  MulticastSelection,
} from "./multicast-selector";

export {
  decodePacketHeader,
  encodePacketHeader,
  PACKET_HEADER_SIZE,
  PACKET_VERSION,
  FLAG_CRC32,
  FLAG_HEARTBEAT,
  CRC_SIZE,
  stripPacketHeader,
  computeCRC,
  appendCRC,
  verifyAndStripCRC,
} from "./packet-id";
export type { PacketEncodeOptions, PacketHeader } from "./packet-id";
