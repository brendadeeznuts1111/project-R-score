// registry/auth.ts
//! JWT issuer that reads from 13-byte config

import { jwt } from "bun";
import { getConfig } from "../src/config/manager";

// MurmurHash3 implementation for registry hash
function murmurHash3(data: string): number {
  const seed = 0x9747b28c;
  let h = seed >>> 0;

  for (let i = 0; i < data.length; i++) {
    let k = data.charCodeAt(i);
    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
  }

  h ^= data.length;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;

  return h >>> 0;
}

// Issuer URL is derived from registryHash + feature flags
async function getIssuer(): Promise<string> {
  const config = await getConfig();

  // If PRIVATE_REGISTRY flag is enabled, use local issuer
  if (config.features.PRIVATE_REGISTRY) {
    const isLocal =
      config.registryHash === murmurHash3("http://localhost:4873");
    if (isLocal) {
      // Local development issuer (runs on same port)
      return `http://localhost:4873/_auth`;
    } else {
      // Remote private registry issuer (external)
      return `https://auth.mycompany.com`;
    }
  }

  // Public issuer (external)
  return "https://auth.example.com";
}

// Get token algorithm from config
async function getTokenAlgorithm(): Promise<string> {
  const config = await getConfig();
  // PREMIUM_TYPES flag determines algorithm
  return config.features.PREMIUM_TYPES ? "EdDSA" : "RS256";
}

// Issue token for local user (used by dashboard login)
export async function issueLocalToken(userId: string): Promise<string> {
  const issuer = await getIssuer();
  const algorithm = await getTokenAlgorithm();
  const config = await getConfig();

  // Simplified JWT signing - in production, use actual crypto
  const payload = {
    userId,
    scope: ["publish", "install"],
    iss: issuer,
    aud: config.registryHash.toString(16), // Use hash as audience
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  };

  // In production, use actual JWT signing with the selected algorithm
  // For now, return a mock token
  return `mock-token.${btoa(JSON.stringify(payload))}.signature`;
}

// Verify token (used by publish/install endpoints)
export async function verifyToken(token: string): Promise<any> {
  try {
    const config = await getConfig();
    const issuer = await getIssuer();

    // Simplified verification - in production, use actual JWT verification
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const payload = JSON.parse(atob(parts[1]));

    // Verify issuer
    if (payload.iss !== issuer) {
      throw new Error("Invalid issuer");
    }

    // Verify audience (registry hash)
    if (payload.aud !== config.registryHash.toString(16)) {
      throw new Error("Invalid audience");
    }

    // Verify expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Token expired");
    }

    return payload;
  } catch (error) {
    throw new Error(`Token verification failed: ${error}`);
  }
}

