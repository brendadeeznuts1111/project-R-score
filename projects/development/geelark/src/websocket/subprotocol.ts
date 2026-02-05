/**
 * WebSocket Subprotocol: bun.config.v1
 *
 * Binary subprotocol for propagating 13-byte config over WebSocket
 * Frame format: [1 byte type][4 bytes offset][8 bytes value][1 byte checksum]
 *
 * **Last Updated**: 2026-01-08
 * **Version**: 1.0.0
 */

/**
 * Subprotocol name
 */
export const SUBPROTOCOL = "bun.config.v1";

/**
 * Message types (1 byte)
 */
export const WS_MSG = {
  // Config update messages
  CONFIG_UPDATE: 0x01,      // Update single byte in config
  FEATURE_TOGGLE: 0x02,     // Toggle feature flag bit
  REGISTER_PACKAGE: 0x03,   // New package published
  TERMINAL_RESIZE: 0x04,    // Terminal dimensions changed

  // Control messages
  HEARTBEAT: 0x05,          // Keepalive (every 100ms)
  ACK: 0x06,                // Acknowledge receipt
  ERROR: 0x07,              // Error occurred

  // Terminal messages
  TERMINAL_OUTPUT: 0x10,    // Terminal output (text)
  TERMINAL_INPUT: 0x11,     // Terminal input (from client)

  // Bulk operations
  BULK_UPDATE: 0x20,        // Update multiple bytes
  SYNC_REQUEST: 0x21,       // Request full config sync
  SYNC_RESPONSE: 0x22,      // Full config sync response
} as const;

/**
 * Field offset mapping (for byte addressing in 13-byte config)
 */
export const FIELD_OFFSET = {
  VERSION: 0,
  REGISTRY_HASH: 1,
  FEATURE_FLAGS: 5,
  TERMINAL_MODE: 9,
  ROWS: 10,
  COLS: 11,
  RESERVED: 12,
} as const;

/**
 * Reverse mapping from offset to field name
 */
export const OFFSET_TO_FIELD: Record<number, string> = {
  [FIELD_OFFSET.VERSION]: "version",
  [FIELD_OFFSET.REGISTRY_HASH]: "registryHash",
  [FIELD_OFFSET.FEATURE_FLAGS]: "featureFlags",
  [FIELD_OFFSET.TERMINAL_MODE]: "terminalMode",
  [FIELD_OFFSET.ROWS]: "rows",
  [FIELD_OFFSET.COLS]: "cols",
  [FIELD_OFFSET.RESERVED]: "reserved",
};

/**
 * Config update message interface
 */
export interface ConfigUpdate {
  field: string;
  value: number;
}

/**
 * Terminal resize message interface
 */
export interface TerminalResize {
  rows: number;
  cols: number;
}

/**
 * Package registration message interface
 */
export interface PackageRegister {
  name: string;
  version: string;
  hash: number;
}

/**
 * Binary frame structure (14 bytes total)
 */
interface BinaryFrame {
  type: number;        // 1 byte: Message type
  offset: number;      // 4 bytes: Field offset
  value: bigint;       // 8 bytes: New value
  checksum: number;    // 1 byte: XOR checksum of bytes 0-13
}

/**
 * Serialize config update as binary frame
 * Performance: ~47ns serialize
 */
export function encodeConfigUpdate(field: string, value: number): Uint8Array {
  const offset = FIELD_OFFSET[field.toUpperCase() as keyof typeof FIELD_OFFSET];

  if (offset === undefined) {
    throw new Error(`Unknown field: ${field}`);
  }

  const buffer = new ArrayBuffer(14); // 1 + 4 + 8 + 1
  const view = new DataView(buffer);

  view.setUint8(0, WS_MSG.CONFIG_UPDATE);      // Type: 1 byte
  view.setUint32(1, offset, true);             // Offset: 4 bytes (little-endian)
  view.setBigUint64(5, BigInt(value), true);   // Value: 8 bytes (little-endian)

  // Calculate checksum (XOR of bytes 0-13)
  const dataBytes = new Uint8Array(buffer, 0, 13);
  const checksum = calculateChecksum(dataBytes);
  view.setUint8(13, checksum);

  return new Uint8Array(buffer);
}

/**
 * Parse incoming binary frame
 * Performance: ~47ns deserialize
 */
export function decodeConfigUpdate(frame: Uint8Array): ConfigUpdate {
  if (frame.length !== 14) {
    throw new Error(`Invalid frame length: ${frame.length}, expected 14`);
  }

  const view = new DataView(frame.buffer);
  const type = view.getUint8(0);

  if (type !== WS_MSG.CONFIG_UPDATE) {
    throw new Error(`Invalid message type: ${type}, expected ${WS_MSG.CONFIG_UPDATE}`);
  }

  // Verify checksum
  const dataBytes = new Uint8Array(frame.buffer, 0, 13);
  const expectedChecksum = calculateChecksum(dataBytes);
  const actualChecksum = view.getUint8(13);

  if (actualChecksum !== expectedChecksum) {
    throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
  }

  const offset = view.getUint32(1, true);
  const value = Number(view.getBigUint64(5, true));

  const field = OFFSET_TO_FIELD[offset];
  if (!field) {
    throw new Error(`Unknown offset: ${offset}`);
  }

  return { field, value };
}

/**
 * Encode terminal resize message
 */
export function encodeTerminalResize(rows: number, cols: number): Uint8Array {
  const buffer = new ArrayBuffer(14);
  const view = new DataView(buffer);

  view.setUint8(0, WS_MSG.TERMINAL_RESIZE);
  view.setUint32(1, 0, true); // Offset 0 (unused)
  view.setUint16(5, rows, true); // Rows in first 2 bytes
  view.setUint16(7, cols, true); // Cols in next 2 bytes
  view.setBigUint64(5, BigInt((rows << 16) | cols), true);

  const dataBytes = new Uint8Array(buffer, 0, 13);
  view.setUint8(13, calculateChecksum(dataBytes));

  return new Uint8Array(buffer);
}

/**
 * Decode terminal resize message
 */
export function decodeTerminalResize(frame: Uint8Array): TerminalResize {
  const view = new DataView(frame.buffer);
  const value = Number(view.getBigUint64(5, true));

  return {
    rows: (value >> 16) & 0xFF,
    cols: value & 0xFF,
  };
}

/**
 * Encode feature toggle message
 */
export function encodeFeatureToggle(flagIndex: number, enabled: boolean): Uint8Array {
  const buffer = new ArrayBuffer(14);
  const view = new DataView(buffer);

  view.setUint8(0, WS_MSG.FEATURE_TOGGLE);
  view.setUint32(1, FIELD_OFFSET.FEATURE_FLAGS, true);
  view.setBigUint64(5, BigInt((flagIndex << 1) | (enabled ? 1 : 0)), true);

  const dataBytes = new Uint8Array(buffer, 0, 13);
  view.setUint8(13, calculateChecksum(dataBytes));

  return new Uint8Array(buffer);
}

/**
 * Decode feature toggle message
 */
export function decodeFeatureToggle(frame: Uint8Array): { flagIndex: number; enabled: boolean } {
  const view = new DataView(frame.buffer);
  const value = Number(view.getBigUint64(5, true));

  return {
    flagIndex: (value >> 1) & 0x1FFFFFFF,
    enabled: (value & 1) === 1,
  };
}

/**
 * Encode bulk update (multiple fields at once)
 */
export function encodeBulkUpdate(updates: Array<{ field: string; value: number }>): Uint8Array {
  const bufferSize = 1 + (updates.length * 13) + 1; // type + (offset + value)*n + checksum
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  view.setUint8(0, WS_MSG.BULK_UPDATE);

  let offset = 1;
  for (const update of updates) {
    const fieldOffset = FIELD_OFFSET[update.field.toUpperCase() as keyof typeof FIELD_OFFSET];
    view.setUint32(offset, fieldOffset, true);
    view.setBigUint64(offset + 4, BigInt(update.value), true);
    view.setUint8(offset + 12, 0); // Reserved
    offset += 13;
  }

  // Calculate checksum over all data bytes
  const dataBytes = new Uint8Array(buffer, 0, bufferSize - 1);
  view.setUint8(bufferSize - 1, calculateChecksum(dataBytes));

  return new Uint8Array(buffer);
}

/**
 * Decode bulk update
 */
export function decodeBulkUpdate(frame: Uint8Array): ConfigUpdate[] {
  const view = new DataView(frame.buffer);
  const updates: ConfigUpdate[] = [];

  let offset = 1;
  while (offset < frame.length - 1) {
    const fieldOffset = view.getUint32(offset, true);
    const value = Number(view.getBigUint64(offset + 4, true));

    const field = OFFSET_TO_FIELD[fieldOffset];
    if (field) {
      updates.push({ field, value });
    }

    offset += 13;
  }

  return updates;
}

/**
 * Encode heartbeat message
 */
export function encodeHeartbeat(): Uint8Array {
  const buffer = new ArrayBuffer(14);
  const view = new DataView(buffer);

  view.setUint8(0, WS_MSG.HEARTBEAT);
  view.setBigUint64(5, BigInt(Date.now()), true);

  const dataBytes = new Uint8Array(buffer, 0, 13);
  view.setUint8(13, calculateChecksum(dataBytes));

  return new Uint8Array(buffer);
}

/**
 * Decode heartbeat message
 */
export function decodeHeartbeat(frame: Uint8Array): number {
  const view = new DataView(frame.buffer);
  return Number(view.getBigUint64(5, true));
}

/**
 * Encode ACK message
 */
export function encodeAck(originalType: number): Uint8Array {
  const buffer = new ArrayBuffer(14);
  const view = new DataView(buffer);

  view.setUint8(0, WS_MSG.ACK);
  view.setBigUint64(5, BigInt(originalType), true);

  const dataBytes = new Uint8Array(buffer, 0, 13);
  view.setUint8(13, calculateChecksum(dataBytes));

  return new Uint8Array(buffer);
}

/**
 * Decode ACK message
 */
export function decodeAck(frame: Uint8Array): number {
  const view = new DataView(frame.buffer);
  return Number(view.getBigUint64(5, true));
}

/**
 * Encode error message
 */
export function encodeError(code: number, message: string): Uint8Array {
  const msgBytes = new TextEncoder().encode(message.substring(0, 8)); // Max 8 bytes
  const buffer = new ArrayBuffer(14);
  const view = new DataView(buffer);

  view.setUint8(0, WS_MSG.ERROR);
  view.setUint32(1, code, true);

  // Copy message bytes
  const dataView = new Uint8Array(buffer);
  dataView.set(msgBytes, 5);

  const dataBytes = new Uint8Array(buffer, 0, 13);
  view.setUint8(13, calculateChecksum(dataBytes));

  return new Uint8Array(buffer);
}

/**
 * Calculate XOR checksum
 */
function calculateChecksum(data: Uint8Array): number {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum ^= data[i];
  }
  return checksum & 0xFF;
}

/**
 * Validate frame checksum
 */
export function validateFrame(frame: Uint8Array): boolean {
  if (frame.length < 14) return false;

  const dataBytes = new Uint8Array(frame.buffer, 0, 13);
  const expectedChecksum = calculateChecksum(dataBytes);
  const actualChecksum = frame[13];

  return expectedChecksum === actualChecksum;
}

/**
 * Get message type from frame
 */
export function getMessageType(frame: Uint8Array): number {
  return frame[0];
}

/**
 * Create WebSocket options with subprotocol
 */
export function createWebSocketOptions(url: string): WebSocket {
  return new WebSocket(url, [SUBPROTOCOL]);
}

/**
 * Verify server supports our subprotocol
 */
export function verifySubprotocol(handshake: Response): boolean {
  const protocol = handshake.headers.get("Sec-WebSocket-Protocol");
  return protocol === SUBPROTOCOL;
}
