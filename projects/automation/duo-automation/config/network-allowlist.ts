// [DUOPLUS][CONFIG][NETWORK][FEAT][META:{compliance:true}] [CRITICAL] [#REF:NETWORK-ALLOW-LIST][BUN:6.1-NATIVE]

import { readFileSync, existsSync, mkdirSync } from "fs";
import { allowListViolationError } from "./errors";

export interface AllowListDomain {
  name: string;
  environment: string;
  port?: string;
  protocol?: string;
  reason?: string;
  approved_by?: string;
  tags?: string;
}

export interface AllowListConfig {
  metadata?: {
    version?: string;
    last_updated?: string;
    approved_by?: string;
  };
  default_policy: "allow" | "deny";
  domains: AllowListDomain[];
  denies?: Array<{
    name: string;
    reason?: string;
    cwe?: string;
    tags?: string;
  }>;
  rate_limits?: Array<{
    domain: string;
    requests_per_minute: number;
    burst?: number;
  }>;
  logging?: {
    allowed?: "info" | "warn" | "error";
    denied?: "info" | "warn" | "error";
    alert_on_deny?: boolean;
    webhook?: string;
  };
}

function resolveConfigPath(environment: string): string {
  if (environment === "prod") {
    return "config/network-allowlist-v1.yaml";
  }
  return `config/network-allowlist-v1.${environment}.yaml`;
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const regex = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${regex}$`);
}

function ensureLogsDir(): void {
  try {
    if (!existsSync("logs")) {
      mkdirSync("logs", { recursive: true });
    }
  } catch {
    // Best effort; logging is non-blocking.
  }
}

async function appendLog(path: string, line: string): Promise<void> {
  ensureLogsDir();
  try {
    await Bun.write(path, `${line}\n`, { append: true });
  } catch {
    // Best effort only.
  }
}

export class NetworkAllowList {
  private config: AllowListConfig;
  private readonly environment: string;

  constructor(env: string = process.env.NODE_ENV || "dev") {
    this.environment = env;
    this.config = this.loadConfig();
  }

  private loadConfig(): AllowListConfig {
    const configPath = resolveConfigPath(this.environment);
    if (!existsSync(configPath)) {
      throw new Error(`Allow-list config not found: ${configPath}`);
    }

    // @ts-ignore - Bun.YAML not in older type defs
    const parsed = Bun.YAML.parse(readFileSync(configPath, "utf-8")) as AllowListConfig;
    return parsed;
  }

  validate(url: string): boolean {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");

    const denies = this.config.denies || [];
    const denied = denies.find((entry) => wildcardToRegExp(entry.name).test(hostname));

    if (denied) {
      this.logViolation(hostname, "DENIED", denied.reason || "Denied by rule");
      throw allowListViolationError(hostname, denied.reason || "Denied by rule");
    }

    const allowed = this.config.domains.find((domain) => {
      if (domain.environment !== this.environment) return false;

      const domainMatch = wildcardToRegExp(domain.name).test(hostname);
      if (!domainMatch) return false;

      const protocol = parsed.protocol.replace(":", "");
      if (domain.protocol && domain.protocol !== protocol) return false;

      if (domain.port && domain.port.includes("-")) {
        const [min, max] = domain.port.split("-").map(Number);
        const portNum = Number(port);
        return portNum >= min && portNum <= max;
      }

      return !domain.port || domain.port === port;
    });

    if (allowed) {
      this.logViolation(hostname, "ALLOWED", allowed.reason || "Allow-list match");
      return true;
    }

    if (this.config.default_policy === "deny") {
      this.logViolation(hostname, "DENIED", "Default policy");
      throw allowListViolationError(hostname, "Not in allow-list");
    }

    return true;
  }

  private async logViolation(hostname: string, action: "ALLOWED" | "DENIED", reason: string): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      hostname,
      action,
      reason,
      environment: this.environment,
      ref: `[#REF:NETWORK-${crypto.randomUUID().slice(0, 8)}]`
    };

    await appendLog("logs/network-violations.log", JSON.stringify(logEntry));

    if (action === "DENIED" && this.config.logging?.alert_on_deny && this.config.logging.webhook) {
      fetch(this.config.logging.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntry)
      }).catch(() => undefined);
    }
  }
}
