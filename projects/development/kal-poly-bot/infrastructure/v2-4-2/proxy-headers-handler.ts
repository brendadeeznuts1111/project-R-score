import "./types.d.ts";
// infrastructure/v2-4-2/proxy-headers-handler.ts
// Component #44: Custom Proxy Headers Handler (RFC 9112 Compliance)

import { feature } from "bun:bundle";

// Secure proxy authentication for MCP registry access
export class ProxyHeadersHandler {
  // Zero-cost when PROXY_HEADERS feature is disabled
  static createProxyConfig(
    url: string,
    headers?: Record<string, string>
  ): string | { url: string; headers: Record<string, string> } {
    if (!feature("PROXY_HEADERS")) {
      // Legacy string format only
      return url;
    }

    // New object format with RFC 9112 compliance
    const config: { url: string; headers: Record<string, string> } = {
      url,
      headers: {
        "Proxy-Connection": "Keep-Alive",
        "User-Agent": "Bun/v2.4.2-MCP",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        // Component #44: Authorization header override
        ...this.sanitizeHeaders(headers),
      },
    };

    // Integrates with Component #45 connection pooling
    if (feature("HTTP_AGENT_POOL")) {
      config.headers["Proxy-Keep-Alive"] = "timeout=5, max=1000";
      config.headers["Connection"] = "keep-alive";
    }

    // Add security headers for CVE prevention
    if (feature("SECURITY_HARDENING")) {
      config.headers["X-Content-Type-Options"] = "nosniff";
      config.headers["X-Frame-Options"] = "DENY";
      config.headers["X-XSS-Protection"] = "1; mode=block";
    }

    return config;
  }

  // Sanitize proxy headers to prevent injection (Component #45)
  private static sanitizeHeaders(
    headers?: Record<string, string>
  ): Record<string, string> {
    if (!headers) return {};

    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      // Validate header name (RFC 9112)
      if (!/^[a-zA-Z0-9-]+$/.test(key)) {
        console.warn(`Invalid header name: ${key}`);
        continue;
      }

      // Strip control characters and normalize headers
      const cleanValue = this.sanitizeHeaderValue(value);

      // Validate header value length (prevent DoS)
      if (cleanValue.length > 8192) {
        console.warn(
          `Header value too long for ${key}: ${cleanValue.length} chars`
        );
        continue;
      }

      // Check for header injection patterns
      if (/(?:\r?\n|\r)(?:[a-zA-Z0-9-]+):/.test(cleanValue)) {
        console.warn(`Header injection attempt detected in ${key}`);
        continue;
      }

      sanitized[key] = cleanValue;
    }
    return sanitized;
  }

  private static sanitizeHeaderValue(value: string): string {
    // Remove control characters except tab (ASCII 9) - use escaped hex codes
    return value.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, "");
  }

  // Handle Proxy-Authorization precedence
  static setAuthHeader(config: ProxyConfig, _token: string): ProxyConfig {
    if (!_token.trim()) {
      throw new Error("Token cannot be empty");
    }

    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${_token}`,
      },
    };
  }

  // Parse YAML 1.2 compliant proxy configuration
  static parseYamlProxyConfig(yamlContent: string): ProxyConfig | null {
    if (!feature("YAML12_STRICT")) {
      // Basic YAML parsing fallback
      try {
        const lines = yamlContent.split("\n");
        const config: any = {};

        for (const line of lines) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            config[match[1]] = match[2].trim();
          }
        }

        return config as ProxyConfig;
      } catch {
        return null;
      }
    }

    // YAML 1.2 strict parsing with security validation
    try {
      // Basic YAML 1.2 parser (simplified for demonstration)
      const config = this.parseYaml12Strict(yamlContent);

      if (!this.validateConfig(config).valid) {
        throw new Error("Invalid proxy configuration");
      }

      return config;
    } catch (error) {
      console.error("YAML parsing failed:", error);
      return null;
    }
  }

  private static parseYaml12Strict(content: string): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    const lines = content.split("\n");
    const currentSection: Record<string, unknown> = config;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (line.startsWith("#") || !line) continue;

      // Parse key-value pairs
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();

        // Handle different value types
        if (value.startsWith('"') && value.endsWith('"')) {
          currentSection[key] = value.slice(1, -1);
        } else if (value === "true" || value === "false") {
          currentSection[key] = value === "true";
        } else if (/^\d+$/.test(value)) {
          currentSection[key] = parseInt(value, 10);
        } else {
          currentSection[key] = value;
        }
      }
    }

    return config;
  }

  private static validateConfig(config: unknown): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config || typeof config !== "object") {
      errors.push("Configuration must be an object");
      return { valid: false, errors };
    }

    const cfg = config as Record<string, unknown>;

    if (cfg.timeout !== undefined && typeof cfg.timeout !== "number") {
      errors.push("timeout must be a number");
    }

    if (
      cfg.maxRedirects !== undefined &&
      typeof cfg.maxRedirects !== "number"
    ) {
      errors.push("maxRedirects must be a number");
    }

    return { valid: errors.length === 0, errors };
  }

  // Generate proxy configuration for MCP registry
  static generateMCPProxyConfig(
    registryUrl: string,
    authToken?: string
  ): string {
    const config = {
      url: registryUrl,
      headers: {
        "User-Agent": "Bun-MCP-Client/v2.4.2",
        Accept: "application/vnd.mcp.v2+json",
        "Content-Type": "application/json",
      },
      timeout: 30000,
      retries: 3,
    };

    if (authToken) {
      config.headers["Authorization"] = `Bearer ${authToken}`;
    }

    return JSON.stringify(config, null, 2);
  }
}

interface ProxyConfig {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// Zero-cost export
export const { createProxyConfig, setAuthHeader } = feature("PROXY_HEADERS")
  ? ProxyHeadersHandler
  : { createProxyConfig: (url: string) => url, setAuthHeader: () => {} };

export const { parseYamlProxyConfig, generateMCPProxyConfig } = feature(
  "YAML12_STRICT"
)
  ? ProxyHeadersHandler
  : {
      parseYamlProxyConfig: () => null,
      generateMCPProxyConfig: (url: string, token?: string) =>
        JSON.stringify({ url }),
    };

export default ProxyHeadersHandler;
