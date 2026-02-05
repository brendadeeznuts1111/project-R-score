/**
 * TLS Helpers
 *
 * Config-aware wrappers around tls-config: build TLS for Bun.serve,
 * fetch TLS info (with caching), and format TUI badges.
 */

import { readFileSync } from "node:fs";
import { buildTLSConfig as buildNativeTLSConfig, getTLSStatus, type TLSConfig } from "../tls-config";
import { c } from "./tui";

export interface TLSInfo {
  enabled: boolean;
  protocol?: string;
  cipher?: string;
  serverName?: string;
  certExpiry?: Date;
  certIssuer?: string;
  certSubject?: string;
  sniDomains?: string[];
  sniEnabled?: boolean;
  hasDH?: boolean;
  hasCustomCA?: boolean;
}

export interface ConfigWithTLS {
  TLS: TLSConfig;
}

let cachedTLSInfo: TLSInfo | null = null;

/**
 * Build TLS configuration for Bun.serve.
 * Validates cert files; returns undefined if TLS disabled or invalid.
 */
export function buildTLSConfig(config: ConfigWithTLS): ReturnType<typeof buildNativeTLSConfig> {
  try {
    const tlsArray = buildNativeTLSConfig(config.TLS);

    if (tlsArray) {
      for (const entry of tlsArray) {
        if (!entry.key.size || !entry.cert.size) {
          console.error(`${c.err}TLS Error: Certificate files not found for ${entry.serverName}${c.reset}`);
          return undefined;
        }
      }
    }

    return tlsArray;
  } catch (err) {
    console.error(`${c.err}TLS Configuration Error:${c.reset}`, err);
    return undefined;
  }
}

/**
 * Get TLS status information for dashboard display and API.
 * Supports SNI; caches result for runtime.
 */
export function getTLSInfo(config: ConfigWithTLS): TLSInfo {
  if (cachedTLSInfo) return cachedTLSInfo;

  const status = getTLSStatus(config.TLS);

  if (!status.enabled || status.domainCount === 0) {
    cachedTLSInfo = { enabled: false };
    return cachedTLSInfo;
  }

  const primaryDomain = config.TLS.DOMAINS[0];

  try {
    const certContent = readFileSync(primaryDomain.certPath, "utf-8");
    const cnMatch = certContent.match(/Subject:.*?CN\s*=\s*([^\n,]+)/i);
    const issuerMatch = certContent.match(/Issuer:.*?CN\s*=\s*([^\n,]+)/i);
    const validToMatch = certContent.match(/Not After\s*:\s*([^\n]+)/i);

    cachedTLSInfo = {
      enabled: true,
      protocol: "TLS 1.3",
      cipher: "BoringSSL",
      serverName: primaryDomain.serverName,
      certSubject: cnMatch?.[1]?.trim(),
      certIssuer: issuerMatch?.[1]?.trim() || (primaryDomain.caPath ? "Custom CA" : "Unknown"),
      certExpiry: validToMatch?.[1] ? new Date(validToMatch[1]) : undefined,
      sniDomains: status.domains.map((d) => d.serverName),
      sniEnabled: status.domainCount > 1,
      hasDH: status.domains.some((d) => d.hasDH),
      hasCustomCA: status.domains.some((d) => d.hasCA),
    };
  } catch {
    cachedTLSInfo = {
      enabled: true,
      protocol: "TLS 1.3",
      cipher: "BoringSSL",
      serverName: primaryDomain.serverName,
      sniDomains: status.domains.map((d) => d.serverName),
      sniEnabled: status.domainCount > 1,
    };
  }

  return cachedTLSInfo;
}

/**
 * Create TLS status badge for console TUI (e.g. analytics header).
 */
export function createTLSBadge(config: ConfigWithTLS): string {
  const tls = getTLSInfo(config);
  if (!tls.enabled) {
    return `${c.yellow}🔓 HTTP${c.reset}`;
  }

  const sniCount = tls.sniDomains?.length || 1;
  const sniSuffix = sniCount > 1 ? ` (${sniCount} SNI)` : "";
  const dhBadge = tls.hasDH ? " +PFS" : "";

  return `${c.ok}🔒 HTTPS${sniSuffix}${dhBadge}${c.reset}`;
}
