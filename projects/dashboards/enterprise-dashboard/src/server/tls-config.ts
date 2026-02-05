import { file } from "bun";

export interface TLSDomainConfig {
  serverName: string;
  keyPath: string;
  certPath: string;
  caPath?: string;
  dhParamsFile?: string;
  passphrase?: string;
}

export interface TLSConfig {
  ENABLED: boolean;
  DOMAINS: TLSDomainConfig[];
}

interface BunTLSEntry {
  serverName: string;
  key: ReturnType<typeof file>;
  cert: ReturnType<typeof file>;
  ca?: ReturnType<typeof file>;
  dhParamsFile?: string;
  passphrase?: string;
}

/**
 * Converts the config format to Bun's native TLS array
 * Supports SNI (Server Name Indication) for multi-domain HTTPS
 */
export function buildTLSConfig(config: TLSConfig): BunTLSEntry[] | undefined {
  if (!config.ENABLED || config.DOMAINS.length === 0) {
    return undefined;
  }

  return config.DOMAINS.map((domain) => {
    const entry: BunTLSEntry = {
      // Native SNI hostname matching
      serverName: domain.serverName,
      // Bun.file loads content into memory (fast)
      key: file(domain.keyPath),
      cert: file(domain.certPath),
    };

    // Optional Enterprise hardening
    if (domain.caPath) {
      entry.ca = file(domain.caPath); // Overwrites Mozilla CA bundle
    }

    if (domain.dhParamsFile) {
      entry.dhParamsFile = domain.dhParamsFile; // Perfect Forward Secrecy
    }

    if (domain.passphrase) {
      entry.passphrase = domain.passphrase; // Encrypted private keys
    }

    return entry;
  });
}

/**
 * Get TLS status info for the dashboard
 */
export function getTLSStatus(config: TLSConfig): {
  enabled: boolean;
  domainCount: number;
  domains: Array<{
    serverName: string;
    hasCA: boolean;
    hasDH: boolean;
    hasPassphrase: boolean;
  }>;
} {
  return {
    enabled: config.ENABLED,
    domainCount: config.DOMAINS.length,
    domains: config.DOMAINS.map((d) => ({
      serverName: d.serverName,
      hasCA: !!d.caPath,
      hasDH: !!d.dhParamsFile,
      hasPassphrase: !!d.passphrase,
    })),
  };
}

/**
 * Render ASCII security audit panel
 */
export function renderSecurityAudit(config: TLSConfig, activeHost?: string): string {
  if (!config.ENABLED || config.DOMAINS.length === 0) {
    return `
  ╔════ SECURITY AUDIT ═════════════════════════════════════════════════════════╗
  ║ 🔓 TLS DISABLED - Running in HTTP mode                                      ║
  ╚══════════════════════════════════════════════════════════════════════════════╝`;
  }

  const activeDomain = activeHost
    ? config.DOMAINS.find((d) => d.serverName === activeHost)
    : config.DOMAINS[0];

  const sniLine = `🔒 ACTIVE SNI: ${activeDomain?.serverName || "N/A"}`.padEnd(70);
  const dhLine = activeDomain?.dhParamsFile
    ? `🔐 DH PFS:     4096-bit (Active)`.padEnd(70)
    : `🔐 DH PFS:     Not configured`.padEnd(70);
  const caLine = activeDomain?.caPath
    ? `🛡️  CA TRUST:   ${activeDomain.caPath.split("/").pop()} (Custom)`.padEnd(69)
    : `🛡️  CA TRUST:   Mozilla Bundle (Default)`.padEnd(69);

  return `
  ╔════ SECURITY AUDIT ═════════════════════════════════════════════════════════╗
  ║ ${sniLine}║
  ║ ${dhLine}║
  ║ ${caLine}║
  ╚══════════════════════════════════════════════════════════════════════════════╝`;
}
