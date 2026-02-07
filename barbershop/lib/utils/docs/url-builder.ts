
// lib/docs/url-builder.ts - Documentation URL Builder
export class DocsUrlBuilder {
  private domain: 'sh' | 'com';
  
  constructor(domain: 'sh' | 'com' = 'sh') {
    this.domain = domain;
  }
  
  build(path: string, hash?: string): string {
    const baseUrl = this.domain === 'com' ? 'https://bun.com' : 'https://bun.sh';
    const url = `${baseUrl}/docs${path}`;
    return hash ? `${url}#${hash}` : url;
  }
  
  // Convenience methods
  runtime(section: string, hash?: string): string {
    return this.build(`/runtime/${section}`, hash);
  }
  
  secrets(hash?: string): string {
    return this.runtime('secrets', hash);
  }
  
  factorywager(section?: string): string {
    const path = section ? `/secrets/${section}` : '/secrets';
    return `https://docs.factory-wager.com${path}`;
  }
  
  // Switch domain
  toCom(): DocsUrlBuilder {
    return new DocsUrlBuilder('com');
  }
  
  toSh(): DocsUrlBuilder {
    return new DocsUrlBuilder('sh');
  }
}

// Export singleton instances
export const shBuilder = new DocsUrlBuilder('sh');
export const comBuilder = new DocsUrlBuilder('com');
