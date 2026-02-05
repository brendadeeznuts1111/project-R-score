// infrastructure/npmrc-email-forwarder.ts
import { feature } from "bun:bundle";

// Forwards :email to Nexus/Artifactory registries
export class NpmrcEmailForwarder {
  private static readonly NPMRC_PATHS = [
    "~/.npmrc",
    "./.npmrc",
    "~/.bunfig.toml"
  ] as const;

  // Zero-cost when NPMRC_EMAIL is disabled
  static async getRegistryAuth(registry: string): Promise<{
    email?: string;
    username?: string;
    token?: string;
    password?: string;
  } | null> {
    if (!feature("NPMRC_EMAIL")) {
      // Legacy: email not forwarded
      return this.legacyGetAuth(registry);
    }

    const npmrc = await this.loadNpmrc();
    const registryKey = registry.replace(/^https?:/, '');

    // Check for email in .npmrc
    const email = npmrc[`${registryKey}:email`];
    const username = npmrc[`${registryKey}:username`];
    const token = npmrc[`${registryKey}:_authToken`];
    const password = npmrc[`${registryKey}:_password`];

    if (email) {
      // Log email usage (Component #11 audit)
      this.logEmailForward(registry, username || "token-auth");

      return {
        email,
        username,
        token,
        password
      };
    }

    return null;
  }

  private static async loadNpmrc(): Promise<Record<string, string>> {
    for (const path of this.NPMRC_PATHS) {
      try {
        const resolved = path.replace("~", process.env.HOME || "");
        const content = await Bun.file(resolved).text();
        return this.parseNpmrc(content);
      } catch {
        continue;
      }
    }
    return {};
  }

  private static parseNpmrc(content: string): Record<string, string> {
    const config: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        config[key.trim()] = value.trim().replace(/^"|"$/g, '');
      }
    }

    return config;
  }

  // Legacy: no email forwarding
  private static async legacyGetAuth(registry: string): Promise<any> {
    return null; // Email not included
  }

  private static logEmailForward(registry: string, authType: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 66,
        registry,
        authType,
        emailForwarded: true,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { getRegistryAuth } = feature("NPMRC_EMAIL")
  ? NpmrcEmailForwarder
  : { getRegistryAuth: async () => null };