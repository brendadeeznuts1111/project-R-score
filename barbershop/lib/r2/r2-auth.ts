
// lib/r2-auth.ts - Enhanced R2 Authentication
export class R2AuthHelper {
  private credentials: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  };
  
  constructor() {
    this.credentials = {
      accountId: process.env.R2_ACCOUNT_ID || '7a470541a704caaf91e71efccc78fd36',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '84c87a7398c721036cd6e95df42d718c',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '8a99fcc8f6202fc3961fa3e889318ced8228a483b7e57e788fb3cba5e5592015',
      bucketName: process.env.R2_BUCKET_NAME || 'bun-executables'
    };
  }
  
  getAuthHeaders(): Record<string, string> {
    const authString = `${this.credentials.accessKeyId}:${this.credentials.secretAccessKey}`;
    return {
      'Authorization': `Basic ${btoa(authString)}`,
      'Content-Type': 'application/json'
    };
  }
  
  getEndpoint(): string {
    return `https://${this.credentials.accountId}.r2.cloudflarestorage.com`;
  }
  
  getBucketUrl(): string {
    return `${this.getEndpoint()}/${this.credentials.bucketName}`;
  }
  
  async makeRequest(key: string, method: 'GET' | 'PUT' | 'DELETE', body?: string, metadata?: Record<string, string>): Promise<Response> {
    const url = `${this.getBucketUrl()}/${key}`;
    const headers = { ...this.getAuthHeaders() };
    
    if (metadata) {
      Object.entries(metadata).forEach(([k, v]) => {
        headers[`x-amz-meta-${k}`] = v;
      });
    }
    
    if (body) {
      headers['x-amz-content-sha256'] = await Bun.hash(body);
    }
    
    return fetch(url, { method, headers, body });
  }
}

export const r2Auth = new R2AuthHelper();
