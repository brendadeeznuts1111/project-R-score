/**
 * TLS Configuration using Bun.file
 *
 * https://bun.sh/docs/runtime/http#tls
 */

import { loadConfig } from "../config/ConfigLoader.js";

export interface TLSOptions {
  /**
   * Path to certificate file
   */
  cert: string;

  /**
   * Path to private key file
   */
  key: string;

  /**
   * Path to CA certificate (optional)
   */
  ca?: string;

  /**
   * Minimum TLS version
   * @default "1.2"
   */
  minVersion?: "1.0" | "1.1" | "1.2" | "1.3";

  /**
   * Allowed ciphers
   */
  ciphers?: string[];

  /**
   * Request client certificate
   */
  requestCert?: boolean;

  /**
   * Reject unauthorized connections
   */
  rejectUnauthorized?: boolean;
}

/**
 * Load TLS certificates from disk using Bun.file
 * More efficient than fs.readFile for static certificates
 */
export async function loadTLS(options: TLSOptions): Promise<{
  cert: string;
  key: string;
  ca?: string;
}> {
  // Load certificate
  const certFile = Bun.file(options.cert);
  if (!await certFile.exists()) {
    throw new Error(`Certificate file not found: ${options.cert}`);
  }
  const cert = await certFile.text();

  // Load key
  const keyFile = Bun.file(options.key);
  if (!await keyFile.exists()) {
    throw new Error(`Private key file not found: ${options.key}`);
  }
  const key = await keyFile.text();

  // Load CA if provided
  let ca: string | undefined;
  if (options.ca) {
    const caFile = Bun.file(options.ca);
    if (await caFile.exists()) {
      ca = await caFile.text();
    }
  }

  return { cert, key, ca };
}

/**
 * Create a self-signed certificate for development
 * Note: This is for development only!
 */
export async function generateDevCert(
  domain = "localhost"
): Promise<{ cert: string; key: string }> {
  // This would normally use OpenSSL or similar
  // For now, return a placeholder
  console.warn("⚠️  Using placeholder certificates - not for production!");

  return {
    cert: `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHBfRkM8+z7MA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnBs
YWNlaG8wHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjARMQ8wDQYDVQQD
DAZwbGFjZW8wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARz7CKcO1YbC2cOKdm
3w6XcVHqkDYLcyHWHvWZqYgqLH3wQ5s7pLj7N9dZM0mY6dG6fA8h6nN8P5L7o2s
Yz4mHqo2wUwYjAKBgNVHRQEAwIBATANBgkqhkiG9w0BAQsFAAOBgQBYhQBM3pN8
-----END CERTIFICATE-----`,
    key: `-----BEGIN PRIVATE KEY-----
MIIBVQIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEAz7CKcO1YbC2cOKd
m3w6XcVHqkDYLcyHWHvWZqYgqLH3wQ5s7pLj7N9dZM0mY6dG6fA8h6nN8P5L7o2s
Yz4mHqo2wIDAQABAkAqLH3wQ5s7pLj7N9dZM0mY6dG6fA8h6nN8P5L7o2sYz4mH
qo2G6fA8h6nN8P5L7o2sYz4mHqo2wIDAQABAkAqLH3wQ5s7pLj7N9dZM0mY6dG6
-----END PRIVATE KEY-----`,
  };
}

/**
 * Verify TLS certificate is valid
 */
export async function verifyCert(certPath: string): Promise<boolean> {
  try {
    const certFile = Bun.file(certPath);
    if (!await certFile.exists()) return false;

    const cert = await certFile.text();

    // Basic validation - check for PEM markers
    const hasBegin = cert.includes("BEGIN CERTIFICATE");
    const hasEnd = cert.includes("END CERTIFICATE");

    return hasBegin && hasEnd;
  } catch {
    return false;
  }
}

/**
 * Get TLS config from environment
 */
export function getTLSFromEnv(): TLSOptions | null {
  const cert = process.env.TLS_CERT;
  const key = process.env.TLS_KEY;
  const ca = process.env.TLS_CA;

  if (!cert || !key) return null;

  return {
    cert,
    key,
    ca,
    minVersion: "1.2",
    rejectUnauthorized: process.env.TLS_REJECT_UNAUTHORIZED !== "false",
  };
}

/**
 * TLS configuration presets
 */
export const TLS_PRESETS = {
  /**
   * Development - self-signed, no verification
   */
  development: {
    minVersion: "1.2" as const,
    rejectUnauthorized: false,
  },

  /**
   * Production - strict verification
   */
  production: {
    minVersion: "1.3" as const,
    rejectUnauthorized: true,
    requestCert: false,
  },

  /**
   * Mutual TLS - client certificates required
   */
  mutualTLS: {
    minVersion: "1.3" as const,
    rejectUnauthorized: true,
    requestCert: true,
  },
};
