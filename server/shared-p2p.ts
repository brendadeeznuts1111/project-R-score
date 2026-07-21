// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { PORTS, REDIS_URL as SHARED_REDIS_URL } from '../config/ports.ts';

export { PORTS, SHARED_REDIS_URL };

export const DEFAULT_PORT = PORTS.P2P_PROXY;
export const REDIS_URL = Bun.env.REDIS_URL || `redis://localhost:${PORTS.REDIS}`;

export function getEnvOrDefault(key: string, fallback: string): string {
  return Bun.env[key] ?? fallback;
}

export function getPortOrDefault(key: string, fallback: number): number {
  const val = Bun.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
    console.warn(`Invalid port for ${key}: "${val}", falling back to ${fallback}`);
    return fallback;
  }
  return parsed;
}
