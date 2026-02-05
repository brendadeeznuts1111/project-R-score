
// Bun Native HTTP Client - Replaces axios
export class BunHttpClient {
  private baseURL: string;
  private timeout: number;
  
  constructor(baseURL = '', timeout = 30000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }
  
  async get(url: string, options = {}) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'GET',
      signal: AbortSignal.timeout(this.timeout),
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return {
      data: await response.json(),
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  }
  
  async post(url: string, data = {}, options = {}) {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout),
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return {
      data: await response.json(),
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  }
}

export const http = new BunHttpClient();
