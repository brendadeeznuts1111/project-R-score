// src/hash.ts - MurmurHash3 implementation
export function murmurHash3(input: string): number {
  // MurmurHash3 32-bit hash
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  
  const data = new TextEncoder().encode(input);
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  const nblocks = Math.floor(data.length / 4);
  
  // Process 4-byte blocks
  for (let i = 0; i < nblocks; i++) {
    let k1 = data[i * 4];
    k1 |= data[i * 4 + 1] << 8;
    k1 |= data[i * 4 + 2] << 16;
    k1 |= data[i * 4 + 3] << 24;
    
    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);
    
    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }
  
  // Handle remaining bytes
  let k1 = 0;
  const tail = data.length % 4;
  const offset = nblocks * 4;
  
  if (tail >= 3) k1 ^= data[offset + 2] << 16;
  if (tail >= 2) k1 ^= data[offset + 1] << 8;
  if (tail >= 1) {
    k1 ^= data[offset];
    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);
    h1 ^= k1;
  }
  
  // Finalization
  h1 ^= data.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;
  
  return h1 >>> 0; // Convert to unsigned 32-bit
}

// Feature flag masks
export const FEATURE_FLAGS = {
  DEBUG: 0x00000001,
  PREMIUM_TYPES: 0x00000002,
  PREMIUM: 0x00000004,
  EXPERIMENTAL: 0x00000008,
} as const;

export function getFlagMask(flag: string): number {
  return FEATURE_FLAGS[flag as keyof typeof FEATURE_FLAGS] || 0;
}

