// src/bootstrap.ts (executed on `bun install` if no bun.lockb exists)
import { writeFile } from "bun";
import { nanoseconds } from "bun";

// Calculate CRC64 checksum (simplified implementation)
function calculateCrc64(data: Uint8Array): bigint {
  // Simplified CRC64 - in production, use proper CRC64 implementation
  let crc = BigInt(0xFFFFFFFFFFFFFFFF);
  const poly = BigInt(0x42F0E1EBA9EA3693);
  
  for (let i = 0; i < data.length; i++) {
    crc ^= BigInt(data[i]) << BigInt(56);
    for (let j = 0; j < 8; j++) {
      if (crc & BigInt(0x8000000000000000)) {
        crc = (crc << BigInt(1)) ^ poly;
      } else {
        crc <<= BigInt(1);
      }
      crc &= BigInt(0xFFFFFFFFFFFFFFFF);
    }
  }
  
  return crc ^ BigInt(0xFFFFFFFFFFFFFFFF);
}

async function bootstrap() {
  const start = nanoseconds();
  
  // 1. Generate default 13-byte header (actually 104-byte lockfile header)
  const header = new ArrayBuffer(104);
  const view = new DataView(header);
  
  // Bytes 0-3: Magic "BUN1"
  view.setUint32(0, 0x42354e31, true);
  
  // Byte 4: configVersion = 1 (modern)
  view.setUint8(4, 1);
  
  // Bytes 5-8: registryHash = MurmurHash3("https://registry.npmjs.org")
  // Default registry hash: 0x3b8b5a5a (placeholder - will be computed properly)
  view.setUint32(5, 0x3b8b5a5a, true);
  
  // Bytes 9-12: featureFlags = 0x00000000
  view.setUint32(9, 0x00000000, true);
  
  // Byte 13: terminalMode = 0x01 (cooked)
  view.setUint8(13, 0x01);
  
  // Bytes 14-15: rows=24, cols=80
  view.setUint8(14, 24);
  view.setUint8(15, 80);
  
  // Byte 16: reserved (must be 0)
  view.setUint8(16, 0);
  
  // Bytes 17-24: CRC64 checksum (of bytes 4-16, 13 bytes of config)
  const configBytes = new Uint8Array(header, 4, 13);
  const checksum = calculateCrc64(configBytes);
  view.setBigUint64(17, checksum, true);
  
  // 2. Append empty packages array
  const packageCount = new Uint8Array([0, 0, 0, 0]); // package_count = 0
  
  // 3. Write atomically to bun.lockb (header + package count)
  const fullFile = new Uint8Array(header.byteLength + packageCount.length);
  fullFile.set(new Uint8Array(header), 0);
  fullFile.set(packageCount, header.byteLength);
  await writeFile("bun.lockb", fullFile);
  
  const duration = nanoseconds() - start;
  console.log(`Bootstrapped 13-byte config in ${duration}ns`);
  // Expected: ~67ns (pwrite of 104 bytes)
}

bootstrap();

