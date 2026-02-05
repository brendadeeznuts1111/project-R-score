import { Buffer } from "node:buffer";

const CLOSE_REASON_MAX_BYTES = 120;

export function truncateCloseReason(reason: string, maxBytes = CLOSE_REASON_MAX_BYTES): string {
  if (!reason) return "invalid handshake";
  const buf = Buffer.from(reason, "utf-8");
  if (buf.length <= maxBytes) return reason;
  // Find valid UTF-8 boundary to avoid splitting multi-byte characters
  let end = maxBytes;
  // Walk back to find a valid UTF-8 character boundary
  // UTF-8 continuation bytes start with 10xxxxxx (0x80-0xBF)
  while (end > 0 && buf[end] >= 0x80 && buf[end] < 0xc0) {
    end--;
  }
  return buf.subarray(0, end).toString("utf-8");
}
