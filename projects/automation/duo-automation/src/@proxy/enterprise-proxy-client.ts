/**
 * Enterprise Proxy Integration for Secure API Calls
 * 
 * Uses Bun's custom proxy headers support for routing Venmo/Cash App API calls
 * through authenticated corporate proxies with CONNECT and direct proxy support.
 */

export interface ProxyConfig {
  url: string;
  headers?: Record<string, string>;
  authenticate?: (challenge: string) => string;
}

export class EnterpriseProxyClient {
  private proxyConfig: ProxyConfig | null = null;
  
  constructor(proxyConfig?: ProxyConfig) {
    this.proxyConfig = proxyConfig || this.loadProxyFromEnvironment();
  }
  
  /**
   * Load proxy configuration from environment variables
   */
  private loadProxyFromEnvironment(): ProxyConfig | null {
    const proxyUrl = process.env.CORPORATE_PROXY_URL;
    if (!proxyUrl) {
      return null;
    }
    
    const headers: Record<string, string> = {};
    
    // Add JWT token if available
    if (process.env.PROXY_JWT_TOKEN) {
      headers["Proxy-Authorization"] = `Bearer ${process.env.PROXY_JWT_TOKEN}`;
    }
    
    // Add tenant routing for multi-tenant environments
    if (process.env.TENANT_ID) {
      headers["X-Tenant-ID"] = process.env.TENANT_ID;
    }
    
    // Add custom routing headers
    if (process.env.PROXY_ROUTING) {
      headers["X-Proxy-Routing"] = process.env.PROXY_ROUTING;
    }
    
    // Add service identification
    if (process.env.SERVICE_NAME) {
      headers["X-Service-Name"] = process.env.SERVICE_NAME;
    }
    
    return {
      url: proxyUrl,
      headers
    };
  }
  
  /**
   * Make authenticated request through corporate proxy
   */
  async fetchThroughProxy(
    url: string,
    options: RequestInit & { proxy?: ProxyConfig } = {}
  ): Promise<Response> {
    const proxy = options.proxy || this.proxyConfig;
    
    if (!proxy) {
      // No proxy configured, make direct request
      return fetch(url, options);
    }
    
    // Merge proxy headers with request headers
    const headers = new Headers(options.headers);
    
    // Add proxy-specific headers
    if (proxy.headers) {
      Object.entries(proxy.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }
    
    // Make request through proxy
    return fetch(url, {
      ...options,
      headers,
      proxy: {
        url: proxy.url,
        headers: proxy.headers
      }
    });
  }
  
  /**
   * Test proxy connectivity
   */
  async testProxyConnectivity(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    if (!this.proxyConfig) {
      return { connected: false, error: "No proxy configured" };
    }
    
    try {
      const startTime = Date.now();
      const response = await this.fetchThroughProxy("https://httpbin.org/ip", {
        method: "GET"
      });
      
      const latency = Date.now() - startTime;
      const data = await response.json();
      
      return {
        connected: response.ok,
        latency,
        proxyIp: data.origin
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}

/**
 * Venmo Service with Enterprise Proxy Support
 */
export class VenmoService {
  private proxyClient: EnterpriseProxyClient;
  
  constructor(proxyConfig?: ProxyConfig) {
    this.proxyClient = new EnterpriseProxyClient(proxyConfig);
  }
  
  /**
   * Create Venmo payment through proxy
   */
  async createPayment(paymentData: {
    amount: number;
    recipient: string;
    note?: string;
    audience?: "private" | "friends" | "public";
  }): Promise<any> {
    const response = await this.proxyClient.fetchThroughProxy(
      "https://api.venmo.com/v1/payments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.VENMO_ACCESS_TOKEN}`,
          "User-Agent": "FactoryWager/1.1.0"
        },
        body: JSON.stringify({
          amount: -paymentData.amount, // Venmo uses negative for payments
          note: paymentData.note || "FactoryWager Payment",
          audience: paymentData.audience || "private",
          user_id: paymentData.recipient
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Venmo API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Get Venmo user information
   */
  async getUserInfo(userId: string): Promise<any> {
    const response = await this.proxyClient.fetchThroughProxy(
      `https://api.venmo.com/v1/users/${userId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.VENMO_ACCESS_TOKEN}`,
          "User-Agent": "FactoryWager/1.1.0"
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Venmo API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Get payment history
   */
  async getPaymentHistory(options: {
    limit?: number;
    before?: string;
    after?: string;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (options.limit) params.set("limit", options.limit.toString());
    if (options.before) params.set("before", options.before);
    if (options.after) params.set("after", options.after);
    
    const response = await this.proxyClient.fetchThroughProxy(
      `https://api.venmo.com/v1/payments?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.VENMO_ACCESS_TOKEN}`,
          "User-Agent": "FactoryWager/1.1.0"
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Venmo API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
}

/**
 * Cash App Service with Enterprise Proxy Support
 */
export class CashAppService {
  private proxyClient: EnterpriseProxyClient;
  
  constructor(proxyConfig?: ProxyConfig) {
    this.proxyClient = new EnterpriseProxyClient(proxyConfig);
  }
  
  /**
   * Create Cash App payment through proxy
   */
  async createPayment(paymentData: {
    amount: number;
    recipient: string;
    note?: string;
  }): Promise<any> {
    const response = await this.proxyClient.fetchThroughProxy(
      "https://api.cash.app/v1/payments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CASHAPP_ACCESS_TOKEN}`,
          "User-Agent": "FactoryWager/1.1.0"
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          cashtag: paymentData.recipient,
          note: paymentData.note || "FactoryWager Payment"
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Cash App API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Get Cash App user information
   */
  async getUserInfo(cashtag: string): Promise<any> {
    const response = await this.proxyClient.fetchThroughProxy(
      `https://api.cash.app/v1/users/${cashtag}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.CASHAPP_ACCESS_TOKEN}`,
          "User-Agent": "FactoryWager/1.1.0"
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Cash App API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
}

/**
 * Unified Payment Service with Proxy Support
 */
export class UnifiedPaymentService {
  private venmoService: VenmoService;
  private cashAppService: CashAppService;
  private proxyClient: EnterpriseProxyClient;
  
  constructor(proxyConfig?: ProxyConfig) {
    this.proxyClient = new EnterpriseProxyClient(proxyConfig);
    this.venmoService = new VenmoService(proxyConfig);
    this.cashAppService = new CashAppService(proxyConfig);
  }
  
  /**
   * Create payment using specified provider
   */
  async createPayment(provider: "venmo" | "cashapp", paymentData: any): Promise<any> {
    switch (provider) {
      case "venmo":
        return this.venmoService.createPayment(paymentData);
      case "cashapp":
        return this.cashAppService.createPayment(paymentData);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  
  /**
   * Test proxy connectivity for all services
   */
  async testConnectivity(): Promise<{
    proxy: any;
    venmo: boolean;
    cashapp: boolean;
  }> {
    const proxyTest = await this.proxyClient.testProxyConnectivity();
    
    // Test Venmo connectivity
    let venmoConnected = false;
    try {
      const venmoResponse = await this.venmoService.getUserInfo("self");
      venmoConnected = !!venmoResponse.data;
    } catch (error) {
      venmoConnected = false;
    }
    
    // Test Cash App connectivity
    let cashappConnected = false;
    try {
      const cashAppResponse = await this.cashAppService.getUserInfo("$factory-wager");
      cashappConnected = !!cashAppResponse.data;
    } catch (error) {
      cashappConnected = false;
    }
    
    return {
      proxy: proxyTest,
      venmo: venmoConnected,
      cashapp: cashappConnected
    };
  }
}

/**
 * Environment-based proxy configuration
 */
export function createProxyFromEnvironment(): EnterpriseProxyClient {
  return new EnterpriseProxyClient();
}

/**
 * Example usage in production
 */
export async function exampleEnterprisePayment() {
  // Auto-configure from environment
  const paymentService = new UnifiedPaymentService();
  
  // Test connectivity
  const connectivity = await paymentService.testConnectivity();
  console.log("Proxy connectivity:", connectivity);
  
  // Create payment through proxy
  const payment = await paymentService.createPayment("venmo", {
    amount: 25.50,
    recipient: "alice-smith",
    note: "Family reunion BBQ"
  });
  
  console.log("Payment created:", payment);
  
  return payment;
}

export default EnterpriseProxyClient;
