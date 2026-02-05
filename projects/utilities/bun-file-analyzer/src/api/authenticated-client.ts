import { Bun } from "bun";

// Type guard for Bun availability
declare const Bun: any | undefined;

// Enhanced cookie interface with partitioned support
interface EnhancedCookieInit extends Bun.CookieInit {
  partitioned?: boolean; // CHIPS privacy support
}

// Cookie Store Delete Options (following Cookie Store API standard)
interface CookieStoreDeleteOptions {
  name?: string;
  domain?: string;
  path?: string;
  partitioned?: boolean;
}

interface CookieClientConfig {
  defaultOptions?: RequestInit;
  securityPolicy?: {
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    partitioned?: boolean; // Default partitioned setting
  };
  interceptors?: {
    request?: (url: string, options: RequestInit) => Promise<{ url: string; options: RequestInit }>;
    response?: (response: Response, url: string) => Promise<Response>;
  };
  monitoring?: {
    enabled?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
  performance?: {
    maxHeaderSize?: number;
    enableSizeGuard?: boolean;
    evictionStrategy?: 'lru' | 'priority' | 'size';
  };
  session?: {
    autoRefresh?: boolean;
    refreshThreshold?: number; // seconds before expiry
    refreshEndpoint?: string;
  };
  multiTenant?: {
    enabled?: boolean;
    scopeSeparator?: string;
  };
  privacy?: {
    enableCHIPS?: boolean; // Enable partitioned cookies by default
    partitionKey?: string; // Custom partition key (e.g., 'top-level-site')
  };
}

interface RequestMetrics {
  url: string;
  method: string;
  duration: number;
  status: number;
  cookieCount: number;
  timestamp: number;
}

let jar: any;
let metrics: RequestMetrics[] = [];
let config: CookieClientConfig = {};

if (import.meta.hot) {
  jar = import.meta.hot.data.jar ?? (typeof Bun !== 'undefined' && Bun.CookieMap ? new Bun.CookieMap() : new Map());
  metrics = import.meta.hot.data.metrics ?? [];
  config = import.meta.hot.data.config ?? {};
} else {
  jar = typeof Bun !== 'undefined' && Bun.CookieMap ? new Bun.CookieMap() : new Map();
}

export function createCookieClient(clientConfig?: CookieClientConfig) {
  config = {
    securityPolicy: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      partitioned: false, // Default to non-partitioned for backward compatibility
    },
    monitoring: {
      enabled: true,
      logLevel: 'info',
    },
    privacy: {
      enableCHIPS: false, // Disable CHIPS by default
      partitionKey: 'top-level-site', // Standard CHIPS partition key
    },
    ...clientConfig,
  };

  const log = (level: string, message: string, data?: any) => {
    if (!config.monitoring?.enabled) return;
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[config.monitoring?.logLevel || 'info'];
    const messageLevel = levels[level as keyof typeof levels];
    
    if (messageLevel >= currentLevel) {
      if (typeof Bun !== 'undefined' && Bun.color) {
        const colors = {
          debug: 'hsl(210, 90%, 55%)',
          info: 'hsl(145, 63%, 42%)', 
          warn: 'hsl(38, 92%, 50%)',
          error: 'hsl(0, 84%, 60%)'
        };
        console.log(
          `%c[${level.toUpperCase()}] CookieClient: ${message}`,
          `color: ${Bun.color(colors[level as keyof typeof colors], 'ansi')}`,
          data || ''
        );
      } else {
        console.log(`[${level.toUpperCase()}] CookieClient: ${message}`, data || '');
      }
    }
  };

  return {
    async fetch(url: string, options: RequestInit = {}): Promise<Response> {
      const startTime = Date.now();
      const method = options.method || 'GET';
      
      try {
        log('debug', `Starting ${method} request to ${url}`);
        
        // Apply request interceptors
        let processedOptions = { ...config.defaultOptions, ...options };
        let processedUrl = url;
        
        if (config.interceptors?.request) {
          const result = await config.interceptors.request(url, processedOptions);
          processedUrl = result.url;
          processedOptions = result.options;
        }
        
        // Auto-refresh session if needed
        await this.refreshIfNeeded();
        
        // Build cookie header with size guard
        const cookieHeader = this.toHeaderString();

        const headers = new Headers(processedOptions.headers);
        if (cookieHeader) {
          headers.set("Cookie", cookieHeader);
        }
        
        // Add security headers
        headers.set('X-Requested-With', 'CookieClient');
        
        const response = await fetch(processedUrl, { 
          ...processedOptions, 
          headers, 
          credentials: "include" 
        });

        // Process Set-Cookie headers
        const setCookies = response.headers.getSetCookie?.() || [];
        let newCookieCount = 0;
        
        for (const header of setCookies) {
          try {
            let cookie;
            if (typeof Bun !== 'undefined' && Bun.Cookie) {
              cookie = Bun.Cookie.parse(header);
            } else {
              // Simple fallback parsing
              const [nameValue] = header.split(';');
              const [name, value] = nameValue.split('=');
              cookie = { name, value };
            }
            
            // Apply security policy
            const cookieOptions = {
              ...config.securityPolicy,
              domain: cookie.domain,
              path: cookie.path,
              expires: cookie.expires,
              httpOnly: cookie.httpOnly ?? config.securityPolicy?.httpOnly,
              secure: cookie.secure ?? config.securityPolicy?.secure,
              sameSite: cookie.sameSite ?? config.securityPolicy?.sameSite,
            };
            
            if (typeof Bun !== 'undefined' && Bun.CookieMap && jar.set) {
              jar.set(cookie.name, cookie.value, cookieOptions);
            } else {
              // Map fallback
              (jar as Map<string, string>).set(cookie.name, cookie.value);
            }
            newCookieCount++;
            
            log('debug', `Stored cookie: ${cookie.name}`);
          } catch (cookieError) {
            log('warn', `Failed to parse cookie: ${header}`, cookieError);
          }
        }
        
        // Apply response interceptors
        let finalResponse = response;
        if (config.interceptors?.response) {
          finalResponse = await config.interceptors.response(response, processedUrl);
        }
        
        // Record metrics
        const duration = Date.now() - startTime;
        const metric: RequestMetrics = {
          url: processedUrl,
          method,
          duration,
          status: finalResponse.status,
          cookieCount: jar.size,
          timestamp: Date.now(),
        };
        
        metrics.push(metric);
        if (metrics.length > 100) metrics.shift(); // Keep last 100 requests
        
        log('info', `Request completed in ${duration}ms`, {
          status: finalResponse.status,
          cookies: newCookieCount,
          total: jar.size,
        });
        
        return finalResponse;
      } catch (error) {
        const duration = Date.now() - startTime;
        log('error', `Request failed after ${duration}ms`, error);
        throw new Error(`Cookie client fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    getCookies() {
      return Object.fromEntries(jar.entries());
    },

    clearCookies() {
      jar.clear?.();
    },

    setCookie(name: string, value: string, options?: EnhancedCookieInit) {
      // Apply privacy settings for CHIPS
      const enhancedOptions = {
        ...config.securityPolicy,
        ...options,
        partitioned: options?.partitioned ?? config.privacy?.enableCHIPS ?? false
      };
      
      // Log partitioned cookie creation for privacy auditing
      if (enhancedOptions.partitioned) {
        log('debug', `Setting partitioned cookie: ${name} (CHIPS enabled)`);
      }
      
      jar.set(name, value, enhancedOptions);
    },

    getCookie(name: string): string | null {
      return jar.get(name);
    },

    // Enhanced method to get rich cookie object
    getCookieObject(name: string): any | null {
      const value = jar.get(name);
      if (!value) return null;
      
      // Use Bun.Cookie.parse for rich cookie object if available
      if (typeof Bun !== 'undefined' && Bun.Cookie) {
        try {
          return Bun.Cookie.parse(`${name}=${value}`);
        } catch (error) {
          log('warn', `Failed to parse cookie ${name}:`, error);
          return { name, value };
        }
      }
      
      // Fallback to simple object
      return { name, value };
    },

    hasCookie(name: string): boolean {
      return jar.has(name);
    },

    getCookies(): Record<string, string> {
      const cookies: Record<string, string> = {};
      jar.forEach((value: string, name: string) => {
        cookies[name] = value;
      });
      return cookies;
    },

    // Enhanced delete methods following Cookie Store API standard
    delete(nameOrOptions: string | CookieStoreDeleteOptions, options?: Omit<CookieStoreDeleteOptions, "name">): void {
      if (typeof nameOrOptions === 'string') {
        // delete(name, options) overload
        const name = nameOrOptions;
        const deleteOptions = options || {};
        
        if (Object.keys(deleteOptions).length === 0) {
          // Simple deletion by name only
          jar.delete(name);
          log('debug', `Deleted cookie: ${name}`);
        } else {
          // Deletion with domain/path constraints
          this.deleteWithConstraints(name, deleteOptions);
        }
      } else {
        // delete(options) overload
        const deleteOptions = nameOrOptions;
        
        if (deleteOptions.name) {
          this.deleteWithConstraints(deleteOptions.name, deleteOptions);
        } else {
          log('warn', 'Delete options must include a name property');
        }
      }
    },

    deleteWithConstraints(name: string, options: Omit<CookieStoreDeleteOptions, "name">): void {
      const { domain, path, partitioned } = options;
      
      // For Bun.CookieMap, we need to handle deletion with constraints
      if (typeof Bun !== 'undefined' && Bun.CookieMap && jar.delete) {
        try {
          // Try to delete with full options
          jar.delete(name, { domain, path, partitioned });
          log('debug', `Deleted cookie with constraints: ${name} (domain: ${domain || 'any'}, path: ${path || 'any'}, partitioned: ${partitioned || false})`);
        } catch (error) {
          // Fallback: try without partitioned if not supported
          try {
            jar.delete(name, { domain, path });
            log('debug', `Deleted cookie with domain/path: ${name} (domain: ${domain || 'any'}, path: ${path || 'any'})`);
          } catch (fallbackError) {
            // Final fallback: simple deletion
            jar.delete(name);
            log('debug', `Deleted cookie (fallback): ${name}`);
          }
        }
      } else {
        // Map fallback - simple deletion
        (jar as Map<string, string>).delete(name);
        log('debug', `Deleted cookie (Map fallback): ${name}`);
      }
    },

    // Legacy method for backward compatibility
    deleteCookie(name: string, options?: EnhancedCookieInit) {
      if (options) {
        jar.delete(name, options);
      } else {
        jar.delete(name);
      }
    },

    // Partitioned cookie utility methods
    setPartitionedCookie(name: string, value: string, options?: Omit<EnhancedCookieInit, 'partitioned'>) {
      return this.setCookie(name, value, { ...options, partitioned: true });
    },

    getPartitionedCookies(): Record<string, string> {
      const partitioned: Record<string, string> = {};
      jar.forEach((value: string, name: string) => {
        // Check if this is a partitioned cookie (simplified check)
        if (name.includes('_partitioned') || config.privacy?.enableCHIPS) {
          partitioned[name] = value;
        }
      });
      return partitioned;
    },

    clearPartitionedCookies() {
      const partitionedCookies = this.getPartitionedCookies();
      Object.keys(partitionedCookies).forEach(name => {
        this.deleteCookie(name);
      });
      log('info', `Cleared ${Object.keys(partitionedCookies).length} partitioned cookies`);
    },

    getSetCookieHeaders(): string[] {
      const headers: string[] = [];
      jar.forEach((value: string, name: string) => {
        if (typeof Bun !== 'undefined' && Bun.Cookie) {
          const cookie = new Bun.Cookie(name, value);
          headers.push(cookie.toString());
        } else {
          headers.push(`${name}=${value}`);
        }
      });
      return headers;
    },

    toHeaderString(maxSize?: number): string {
      const header = Array.from(jar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
      
      // Apply size guard if enabled
      if (config.performance?.enableSizeGuard) {
        const sizeLimit = maxSize || config.performance.maxHeaderSize || 4096;
        if (header.length > sizeLimit) {
          log('warn', `Cookie header exceeds ${sizeLimit} bytes (${header.length} bytes)`);
          return this.applyEvictionStrategy(header, sizeLimit);
        }
      }
      
      return header;
    },

    applyEvictionStrategy(header: string, maxSize: number): string {
      const strategy = config.performance?.evictionStrategy || 'priority';
      const cookies = Array.from(jar.entries());
      
      log('debug', `Applying ${strategy} eviction strategy`);
      
      switch (strategy) {
        case 'lru':
          // Remove least recently used cookies (simplified)
          return cookies
            .slice(-Math.floor(cookies.length * 0.7)) // Keep 70%
            .map(([name, value]) => `${name}=${value}`)
            .join("; ");
            
        case 'size':
          // Remove largest cookies first
          return cookies
            .sort(([, a], [, b]) => a.length - b.length)
            .filter(([name, value]) => {
              const testHeader = Array.from(jar.entries())
                .filter(([n]) => n !== name)
                .map(([n, v]) => `${n}=${v}`)
                .join("; ");
              return testHeader.length < maxSize;
            })
            .map(([name, value]) => `${name}=${value}`)
            .join("; ");
            
        case 'priority':
        default:
          // Keep essential cookies (session, auth) first
          const priorityCookies = ['sessionId', 'auth-token', 'csrf-token'];
          const essential = cookies.filter(([name]) => priorityCookies.includes(name));
          const optional = cookies.filter(([name]) => !priorityCookies.includes(name));
          
          let result = essential.map(([name, value]) => `${name}=${value}`).join("; ");
          
          for (const [name, value] of optional) {
            const testHeader = result ? `${result}; ${name}=${value}` : `${name}=${value}`;
            if (testHeader.length < maxSize) {
              result = testHeader;
            } else {
              break;
            }
          }
          
          return result;
      }
    },

    createScopedJar(scope: string): any {
      if (!config.multiTenant?.enabled) {
        log('warn', 'Multi-tenant mode not enabled, returning main jar');
        return {
          getCookies: () => this.getCookies(),
          size: jar.size
        };
      }
      
      const separator = config.multiTenant.scopeSeparator || ':';
      const scopedJar = typeof Bun !== 'undefined' && Bun.CookieMap 
        ? new Bun.CookieMap()
        : new Map();
      
      // Copy only scope-relevant cookies
      jar.forEach((value: string, name: string) => {
        if (name.startsWith(`${scope}${separator}`)) {
          const scopedName = name.replace(`${scope}${separator}`, '');
          if (typeof Bun !== 'undefined' && Bun.CookieMap && scopedJar.set) {
            scopedJar.set(scopedName, value);
          } else {
            (scopedJar as Map<string, string>).set(scopedName, value);
          }
        }
      });
      
      log('debug', `Created scoped jar for '${scope}' with ${scopedJar.size} cookies`);
      
      // Return an object with the same interface as the main client
      return {
        getCookies: () => {
          const cookies: Record<string, string> = {};
          scopedJar.forEach((value: string, name: string) => {
            cookies[name] = value;
          });
          return cookies;
        },
        size: scopedJar.size,
        get: (name: string) => scopedJar.get(name),
        has: (name: string) => scopedJar.has(name),
        forEach: (callback: (value: string, name: string) => void) => {
          scopedJar.forEach(callback);
        }
      };
    },

    async refreshIfNeeded(): Promise<boolean> {
      if (!config.session?.autoRefresh) {
        return false;
      }
      
      const sessionCookie = this.getCookie('sessionId');
      if (!sessionCookie) {
        return false;
      }
      
      // For simplicity, we'll check if we should refresh based on time
      // In a real implementation, you'd parse the cookie's expiry
      const threshold = config.session.refreshThreshold || 300; // 5 minutes default
      
      // This is a simplified check - in production you'd parse actual expiry
      const lastRefresh = (jar as any)._lastRefresh || 0;
      const timeSinceRefresh = (Date.now() - lastRefresh) / 1000;
      
      if (timeSinceRefresh > threshold) {
        try {
          let refreshEndpoint = config.session.refreshEndpoint || '/api/auth/refresh';
          // Ensure we have a full URL for fetch
          if (!refreshEndpoint.startsWith('http')) {
            refreshEndpoint = `https://api.example.com${refreshEndpoint}`;
          }
          
          const response = await fetch(refreshEndpoint, {
            method: 'POST',
            headers: {
              'Cookie': this.toHeaderString(),
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            (jar as any)._lastRefresh = Date.now();
            log('info', 'Session refreshed successfully');
            return true;
          }
        } catch (error) {
          log('warn', 'Failed to refresh session (demo mode)', error);
          // In demo mode, we'll just update the timestamp
          (jar as any)._lastRefresh = Date.now();
          return false;
        }
      }
      
      return false;
    },

    get size(): number {
      return jar.size;
    },

    getMetrics(): RequestMetrics[] {
      return [...metrics];
    },
    
    getAverageResponseTime(): number {
      if (metrics.length === 0) return 0;
      const total = metrics.reduce((sum, m) => sum + m.duration, 0);
      return Math.round(total / metrics.length);
    },
    
    getSuccessRate(): number {
      if (metrics.length === 0) return 0;
      const successful = metrics.filter(m => m.status < 400).length;
      return Math.round((successful / metrics.length) * 100);
    },
    
    clearMetrics(): void {
      metrics = [];
    },
    
    updateConfig(newConfig: Partial<CookieClientConfig>): void {
      config = { ...config, ...newConfig };
    },
    
    getConfig(): CookieClientConfig {
      return { ...config };
    },
    
    exportCookies(): string {
      return JSON.stringify(Object.fromEntries(jar.entries()));
    },
    
    importCookies(cookieData: string): void {
      try {
        const cookies = JSON.parse(cookieData);
        for (const [name, value] of Object.entries(cookies)) {
          jar.set(name, value as string, config.securityPolicy);
        }
        log('info', `Imported ${Object.keys(cookies).length} cookies`);
      } catch (error) {
        log('error', 'Failed to import cookies', error);
        throw new Error('Invalid cookie data format');
      }
    },
    
    debug(label: string = "Cookie Client"): void {
      if (typeof Bun !== 'undefined' && Bun.color) {
        console.log(
          `%c${label} (${jar.size} cookies, ${metrics.length} metrics):`,
          `color: ${Bun.color("hsl(28, 80%, 52%)", "ansi")}; font-weight: bold` 
        );

        for (const [name, value] of jar.entries()) {
          const truncated = value.length > 20 ? value.slice(0, 20) + "..." : value;
          const isSecure = name.startsWith('_secure') ? '🔒' : '';
          console.log(
            `  %c${isSecure}${name}%c = %c${truncated}`,
            `color: ${Bun.color("hsl(210, 90%, 55%)", "ansi")}`,
            "color: reset",
            `color: ${Bun.color("hsl(145, 63%, 42%)", "ansi")}` 
          );
        }
        
        if (metrics.length > 0) {
          console.log(
            `  %c📊 Avg: ${this.getAverageResponseTime()}ms, Success: ${this.getSuccessRate()}%`,
            `color: ${Bun.color("hsl(25, 85%, 55%)", "ansi")}`
          );
        }
      } else {
        console.log(`${label} (${jar.size} cookies, ${metrics.length} metrics):`);
        for (const [name, value] of jar.entries()) {
          console.log(`  ${name} = ${value}`);
        }
      }
    },
  };
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    import.meta.hot.data.jar = jar;
    import.meta.hot.data.metrics = metrics;
    import.meta.hot.data.config = config;
  });
}
