// lib/security/secrets.ts — Secrets manager for MCP system

export class SecretManager {
  private secrets: Map<string, string> = new Map();

  /**
   * Get a secret by key
   */
  get(key: string): string | undefined {
    return this.secrets.get(key);
  }

  /**
   * Set a secret
   */
  set(key: string, value: string): void {
    this.secrets.set(key, value);
  }

  /**
   * Check if secret exists
   */
  has(key: string): boolean {
    return this.secrets.has(key);
  }

  /**
   * Delete a secret
   */
  delete(key: string): boolean {
    return this.secrets.delete(key);
  }

  /**
   * List all secret keys
   */
  keys(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Clear all secrets
   */
  clear(): void {
    this.secrets.clear();
  }
}
