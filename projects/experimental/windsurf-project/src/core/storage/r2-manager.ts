/**
 * R2 Cache Manager for IPQS data and other transient lookups.
 */
export class R2Manager {
  private static instances: Map<string, R2Manager> = new Map();
  // Mock bucket interface for local testing
  private bucket: any;
  
  private constructor(private bucketName: string) {
    this.bucket = this.resolveBucket(bucketName);
  }
  
  static getInstance(bucketName: string): R2Manager {
    if (!this.instances.has(bucketName)) {
      this.instances.set(bucketName, new R2Manager(bucketName));
    }
    return this.instances.get(bucketName)!;
  }
  
  private resolveBucket(bucketName: string): any {
    // In local environment, we'll use a Map to simulate R2
    return new Map<string, { value: string, options?: any }>();
  }
  
  async get(key: string): Promise<string | null> {
    const obj = this.bucket.get(key);
    return obj ? obj.value : null;
  }
  
  async put(key: string, value: string, options?: any): Promise<void> {
    this.bucket.set(key, { value, options });
  }
  
  async delete(key: string): Promise<void> {
    this.bucket.delete(key);
  }
}
