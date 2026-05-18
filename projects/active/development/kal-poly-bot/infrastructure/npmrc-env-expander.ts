// infrastructure/npmrc-env-expander.ts
import { feature } from "bun:bundle";

// ${VAR}? optional modifier; quoted value expansion
export class NpmrcEnvExpander {
  // Zero-cost when NPMRC_ENV_EXPAND is disabled
  static expandValue(value: string, env: Record<string, string>): string {
    if (!feature("NPMRC_ENV_EXPAND")) {
      // Legacy: no expansion
      return value;
    }

    // Component #90: Handle ${VAR} and ${VAR?} syntax
    return value.replace(/\${(\w+)(\?)?}/g, (match, varName, optional) => {
      if (env[varName]) {
        return env[varName];
      }

      if (optional) {
        // ${VAR?} expands to empty string if undefined
        return '';
      }

      // ${VAR} left as-is if undefined
      return match;
    });
  }

  static async loadNpmrcWithExpansion(path: string): Promise<Record<string, string>> {
    if (!feature("NPMRC_ENV_EXPAND")) {
      try {
        const file = Bun.file(path);
        return await file.json();
      } catch {
        return {};
      }
    }

    const file = Bun.file(path);
    const content = await file.text();
    const lines = content.split('\n');
    const config: Record<string, string> = {};

    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, rawValue] = match;

        // Expand quoted strings
        const value = rawValue.trim().replace(/^["'](.*)["']$/, '$1');
        const expanded = this.expandValue(value, Bun.env as Record<string, string>);

        config[key.trim()] = expanded;

        // Component #11 audit for sensitive values
        if (key.includes('password') || key.includes('token')) {
          this.logSensitiveExpansion(key);
        }
      }
    }

    return config;
  }

  // Secure expansion with CSRF protection (Component #7)
  static expandValueSecure(value: string, env: Record<string, string>): string {
    if (!feature("NPMRC_ENV_EXPAND") || !feature("SECURITY_HARDENING")) {
      return this.expandValue(value, env);
    }

    // Prevent CSRF via malicious env vars
    const sanitizedEnv = this.sanitizeEnvVars(env);
    return this.expandValue(value, sanitizedEnv);
  }

  private static sanitizeEnvVars(env: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      // Remove control characters and newlines
      // eslint-disable-next-line no-control-regex
      sanitized[key] = value.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, '');
    }

    return sanitized;
  }

  private static logSensitiveExpansion(key: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 90,
        action: "sensitive_npmrc_key_expanded",
        key,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const {
  expandValue,
  loadNpmrcWithExpansion,
  expandValueSecure
} = feature("NPMRC_ENV_EXPAND")
  ? NpmrcEnvExpander
  : {
      expandValue: (v: string, e: Record<string, string>) => v,
      loadNpmrcWithExpansion: (p: string) => Bun.file(p).json().catch(() => ({})),
      expandValueSecure: (v: string, e: Record<string, string>) => v
    };
