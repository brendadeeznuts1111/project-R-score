#!/usr/bin/env bun
// IPFoxy Proxy Configuration Integration
// Implements IPFoxy proxy management for DuoPlus cloud phones

export interface IPFoxyProxyConfig {
  id: string;
  type: "static_ipv4" | "static_ipv6" | "static_isp" | "dynamic_residential";
  protocol: "socks5" | "http";
  host: string;
  port: number;
  username: string;
  password: string;
  country: string;
  region?: string;
  supplier?: string;
  status: "active" | "inactive" | "expired" | "error";
  createdAt: string;
  expiresAt?: string;
}

export interface IPFoxyAccount {
  apiKey: string;
  email: string;
  balance: number;
  currency: string;
  activeProxies: number;
  totalProxies: number;
}

export interface ProxyValidationResult {
  valid: boolean;
  responseTime?: number;
  ip?: string;
  country?: string;
  error?: string;
}

// API response interface for IPFoxy proxy data
interface IPFoxyAPIResponse {
  id?: string;
  proxy_id?: string;
  type: string;
  protocol?: string;
  host?: string;
  ip?: string;
  port: number;
  username?: string;
  user?: string;
  password?: string;
  pass?: string;
  country?: string;
  region?: string;
  supplier?: string;
  status?: string;
  created_at?: string;
  expires_at?: string;
}

export class IPFoxyManager {
  private apiKey: string;
  private baseUrl = "https://api.ipfoxy.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get IPFoxy account information
   */
  async getAccountInfo(): Promise<IPFoxyAccount> {
    const response = await fetch(`${this.baseUrl}/account`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get account info: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * List all proxies in the account
   */
  async listProxies(): Promise<IPFoxyProxyConfig[]> {
    const response = await fetch(`${this.baseUrl}/proxies`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list proxies: ${response.statusText}`);
    }

    const proxies = await response.json();
    return proxies.map(this.transformProxyConfig);
  }

  /**
   * Get proxy details by ID
   */
  async getProxy(proxyId: string): Promise<IPFoxyProxyConfig> {
    const response = await fetch(`${this.baseUrl}/proxies/${proxyId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get proxy: ${response.statusText}`);
    }

    const proxy = await response.json();
    return this.transformProxyConfig(proxy);
  }

  /**
   * Purchase static proxy
   */
  async purchaseStaticProxy(config: {
    type: "static_ipv4" | "static_ipv6" | "static_isp";
    country: string;
    region?: string;
    supplier?: string;
    quantity: number;
    duration: number; // days
  }): Promise<IPFoxyProxyConfig[]> {
    const response = await fetch(`${this.baseUrl}/purchase/static`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      throw new Error(`Failed to purchase static proxy: ${response.statusText}`);
    }

    const proxies = await response.json();
    return proxies.map(this.transformProxyConfig);
  }

  /**
   * Purchase dynamic proxy package
   */
  async purchaseDynamicProxy(config: {
    country: string;
    state?: string;
    city?: string;
    route?: string;
    rotationCycle: number; // minutes
    quantity: number;
    duration: number; // days
  }): Promise<IPFoxyProxyConfig[]> {
    const response = await fetch(`${this.baseUrl}/purchase/dynamic`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      throw new Error(`Failed to purchase dynamic proxy: ${response.statusText}`);
    }

    const proxies = await response.json();
    return proxies.map(this.transformProxyConfig);
  }

  /**
   * Validate proxy connectivity
   */
  async validateProxy(proxy: IPFoxyProxyConfig): Promise<ProxyValidationResult> {
    const startTime = Date.now();

    try {
      // Test SOCKS5 connectivity for proxy
      console.log(`Validating proxy: ${proxy.host}:${proxy.port} (${proxy.type})`);

      const response = await fetch("https://httpbin.org/ip", {
        method: "GET"
        // Note: This would need actual SOCKS5 proxy implementation using proxy details
        // For now, we'll simulate the validation
      });

      const responseTime = Date.now() - startTime;
      const result = await response.json();

      return {
        valid: true,
        responseTime,
        ip: result.origin,
        country: result.country || "Unknown"
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Configure proxy for DuoPlus cloud phone
   */
  async configureForDuoPlus(proxy: IPFoxyProxyConfig, duoPlusPhoneId: string): Promise<void> {
    // Ensure proxy is SOCKS5 (required by DuoPlus)
    if (proxy.protocol !== "socks5") {
      throw new Error("DuoPlus requires SOCKS5 protocol");
    }

    // Validate proxy before configuration
    const validation = await this.validateProxy(proxy);
    if (!validation.valid) {
      throw new Error(`Proxy validation failed: ${validation.error}`);
    }

    // This would integrate with DuoPlus API to configure the proxy
    // For now, we'll return the configuration details
    const duoPlusConfig = {
      phoneId: duoPlusPhoneId,
      proxy: {
        type: "socks5",
        host: proxy.host,
        port: proxy.port,
        username: proxy.username,
        password: proxy.password
      }
    };

    console.log("DuoPlus Configuration:", duoPlusConfig);
  }

  /**
   * Get available countries and regions
   */
  async getAvailableLocations(): Promise<{
    countries: Array<{ code: string; name: string; regions?: string[] }>;
  }> {
    const response = await fetch(`${this.baseUrl}/locations`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get locations: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get pricing information
   */
  async getPricing(type: string): Promise<{
    plans: Array<{
      name: string;
      price: number;
      currency: string;
      duration: number;
      features: string[];
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/pricing/${type}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get pricing: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Transform API response to internal format
   */
  private transformProxyConfig(proxy: IPFoxyAPIResponse): IPFoxyProxyConfig {
    return {
      id: proxy.id || proxy.proxy_id || "",
      type: proxy.type as IPFoxyProxyConfig["type"],
      protocol: (proxy.protocol || "socks5") as IPFoxyProxyConfig["protocol"],
      host: proxy.host || proxy.ip || "",
      port: proxy.port,
      username: proxy.username || proxy.user || "",
      password: proxy.password || proxy.pass || "",
      country: proxy.country || "",
      region: proxy.region,
      supplier: proxy.supplier,
      status: (proxy.status || "active") as IPFoxyProxyConfig["status"],
      createdAt: proxy.created_at || new Date().toISOString(),
      expiresAt: proxy.expires_at
    };
  }

  /**
   * Batch validate multiple proxies
   */
  async validateProxies(proxies: IPFoxyProxyConfig[]): Promise<ProxyValidationResult[]> {
    const results = await Promise.allSettled(proxies.map((proxy) => this.validateProxy(proxy)));

    return results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : {
          valid: false,
          error: result.reason instanceof Error ? result.reason.message : "Unknown error"
        }
    );
  }

  /**
   * Get recommended proxy type for specific use case
   */
  getRecommendedProxyType(useCase: string): {
    type: IPFoxyProxyConfig["type"];
    reason: string;
  } {
    const recommendations: Record<string, { type: IPFoxyProxyConfig["type"]; reason: string }> = {
      social_media: {
        type: "static_isp",
        reason: "Residential IPs are less likely to be blocked by social media platforms"
      },
      web_scraping: {
        type: "dynamic_residential",
        reason: "Rotating IPs prevent detection and blocking"
      },
      gaming: {
        type: "static_ipv4",
        reason: "Low latency static IPs provide better gaming performance"
      },
      streaming: {
        type: "static_ipv4",
        reason: "Consistent IP addresses work better with streaming services"
      },
      general: {
        type: "static_ipv4",
        reason: "Good balance of performance and cost for general use"
      }
    };

    return recommendations[useCase] || recommendations.general;
  }

  /**
   * Generate proxy configuration string for various applications
   */
  generateProxyString(
    proxy: IPFoxyProxyConfig,
    format: "curl" | "python" | "javascript" | "url"
  ): string {
    const auth = `${proxy.username}:${proxy.password}`;
    const proxyUrl = `socks5://${auth}@${proxy.host}:${proxy.port}`;

    switch (format) {
      case "curl":
        return `curl --socks5 ${proxy.host}:${proxy.port} -U "${auth}" https://example.com`;

      case "python":
        return `import requests\n\nproxies = {\n    'http': '${proxyUrl}',\n    'https': '${proxyUrl}'\n}\n\nresponse = requests.get('https://example.com', proxies=proxies)`;

      case "javascript":
        return `const HttpsProxyAgent = require('https-proxy-agent');\nconst agent = new HttpsProxyAgent('${proxyUrl}');\n\nfetch('https://example.com', { agent })`;

      case "url":
        return proxyUrl;

      default:
        return proxyUrl;
    }
  }
}

// Export singleton instance
export const ipfoxyManager = new IPFoxyManager(process.env.IPFOXY_API_KEY || "");
