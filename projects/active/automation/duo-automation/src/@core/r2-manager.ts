/**
 * Simple R2 Manager for caching
 */

export class R2Manager {
  private cache = new Map<string, string>();
  
  async get(key: string): Promise<string | null> {
    return this.cache.get(key) || null;
  }
  
  async put(key: string, value: string): Promise<void> {
    this.cache.set(key, value);
  }
  
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
}
