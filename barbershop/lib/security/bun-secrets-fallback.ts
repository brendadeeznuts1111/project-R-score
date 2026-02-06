// lib/security/bun-secrets-fallback.ts - Enhanced Secrets with Fallbacks

export class BunSecretsFallback {
  private static secretStore = new Map<string, string>();
  
  static async set(service: string, name: string, value: string): Promise<void> {
    try {
      // Try native Bun.secrets first
      await Bun.secrets.set(service, name, value);
    } catch (error) {
      console.warn(`Bun.secrets.set failed, using fallback: ${error.message}`);
      // Fallback to in-memory store
      this.secretStore.set(`${service}:${name}`, value);
    }
  }
  
  static async get(service: string, name: string): Promise<string | undefined> {
    try {
      // Try native Bun.secrets first
      return await Bun.secrets.get(service, name);
    } catch (error) {
      console.warn(`Bun.secrets.get failed, using fallback: ${error.message}`);
      // Fallback to in-memory store
      return this.secretStore.get(`${service}:${name}`);
    }
  }
  
  static async delete(service: string, name: string): Promise<void> {
    try {
      // Try native Bun.secrets first
      await Bun.secrets.delete(service, name);
    } catch (error) {
      console.warn(`Bun.secrets.delete failed, using fallback: ${error.message}`);
      // Fallback to in-memory store
      this.secretStore.delete(`${service}:${name}`);
    }
  }
  
  static async list(): Promise<string[]> {
    try {
      // Try native Bun.secrets first
      return await Bun.secrets.list();
    } catch (error) {
      console.warn(`Bun.secrets.list failed, using fallback: ${error.message}`);
      // Fallback to in-memory store
      return Array.from(this.secretStore.keys());
    }
  }
  
  // Enhanced get with options (for future compatibility)
  static async getWithOptions(service: string, name: string, options?: {
    cache?: boolean;
    region?: string;
    ttl?: number;
  }): Promise<string | undefined> {
    // For now, just call basic get
    // Future: Handle options when Bun.secrets supports them
    return this.get(service, name);
  }
}
