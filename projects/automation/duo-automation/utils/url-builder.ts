// utils/url-builder.ts - Builder pattern for complex URL construction

export class URLBuilder {
  private url: URL;
  
  constructor(baseUrl: string) {
    this.url = new URL(baseUrl);
  }
  
  /**
   * Create a new URL builder instance
   */
  static create(baseUrl: string): URLBuilder {
    return new URLBuilder(baseUrl);
  }
  
  /**
   * Add path segments to the URL
   */
  path(...segments: string[]): URLBuilder {
    const cleanPath = segments
      .filter(segment => segment && segment !== '')
      .map(segment => segment.replace(/^\/+|\/+$/g, ''))
      .join('/');
    
    this.url.pathname = cleanPath ? `/${cleanPath}` : '/';
    return this;
  }
  
  /**
   * Add a query parameter
   */
  query(key: string, value: string): URLBuilder {
    this.url.searchParams.set(key, value);
    return this;
  }
  
  /**
   * Add multiple query parameters
   */
  queries(params: Record<string, string>): URLBuilder {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        this.url.searchParams.set(key, value);
      }
    });
    return this;
  }
  
  /**
   * Add a hash fragment
   */
  hash(fragment: string): URLBuilder {
    this.url.hash = fragment;
    return this;
  }
  
  /**
   * Set the protocol
   */
  protocol(protocol: 'http' | 'https'): URLBuilder {
    this.url.protocol = protocol;
    return this;
  }
  
  /**
   * Set the port
   */
  port(port: number): URLBuilder {
    this.url.port = port.toString();
    return this;
  }
  
  /**
   * Build the final URL
   */
  build(): string {
    return this.url.toString();
  }
  
  /**
   * Convert to string (alias for build)
   */
  toString(): string {
    return this.build();
  }
  
  /**
   * Clone the builder
   */
  clone(): URLBuilder {
    const cloned = new URLBuilder(this.url.toString());
    return cloned;
  }
}

// Predefined builders for common patterns
export class RegistryURLBuilder {
  static search(query: string, limit?: number): string {
    const builder = URLBuilder.create('https://registry.factory-wager.com')
      .path('-', 'v1', 'search')
      .query('text', query);
    
    if (limit) {
      builder.query('limit', limit.toString());
    }
    
    return builder.build();
  }
  
  static package(packageName: string, version?: string): string {
    const segments = ['@duoplus', packageName];
    if (version) {
      segments.push(version);
    }
    
    return URLBuilder.create('https://registry.factory-wager.com')
      .path(...segments)
      .build();
  }
  
  static download(packageName: string, version: string, filename: string): string {
    return URLBuilder.create('https://registry.factory-wager.com')
      .path('@duoplus', packageName, '-', filename)
      .build();
  }
}

export class APIURLBuilder {
  static endpoint(endpoint: string, version: string = 'v1', baseUrl?: string): string {
    const base = baseUrl || 'http://localhost:3000';
    return URLBuilder.create(base)
      .path('api', version, endpoint)
      .build();
  }
  
  static withQuery(endpoint: string, params: Record<string, string>, version: string = 'v1'): string {
    return URLBuilder.create('http://localhost:3000')
      .path('api', version, endpoint)
      .queries(params)
      .build();
  }
}
