#!/usr/bin/env bun
// Safe Fetch Wrapper - Production-ready header management

/**
 * Safe Fetch Wrapper - Ensures correct headers for every request
 * Prevents common content-type and header mistakes
 */

import '../lib/http'; // Ensure lib/http is included

export interface SafeFetchOptions extends RequestInit {
  // Auto-detect and set appropriate headers
  autoHeaders?: boolean;
  // Validate headers before sending
  validateHeaders?: boolean;
  // Log warnings for missing recommended headers
  logWarnings?: boolean;
}

export interface HeaderValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  correctedHeaders: Record<string, string>;
}

/**
 * Main safe fetch function with automatic header management
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
  const {
    autoHeaders = true,
    validateHeaders = true,
    logWarnings = true,
    ...fetchOptions
  } = options;

  // Process headers
  const headers = new Headers(fetchOptions.headers);
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const hasBody = fetchOptions.body !== undefined;

  // Auto-set headers if enabled
  if (autoHeaders) {
    setAutoHeaders(headers, method, hasBody, fetchOptions.body);
  }

  // Validate headers if enabled
  if (validateHeaders) {
    const validation = validateRequestHeaders(method, hasBody, headers);
    
    if (!validation.valid) {
      const error = new Error(`Header validation failed:\n${validation.errors.join('\n')}`);
      if (logWarnings) {
        console.error('🚨 SafeFetch Error:', error.message);
        console.log('💡 Correct headers:', validation.correctedHeaders);
      }
      throw error;
    }
    
    if (logWarnings && validation.warnings.length > 0) {
      console.warn('⚠️ SafeFetch Warnings:');
      validation.warnings.forEach(warning => console.warn(`   • ${warning}`));
    }
  }

  // Make the request with processed headers
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers
    });

    // Validate response if needed
    if (validateHeaders && !response.ok) {
      console.warn(`⚠️ HTTP Error: ${response.status} ${response.statusText}`);
    }

    return response;
  } catch (error) {
    if (logWarnings) {
      console.error('🚨 SafeFetch Network Error:', error.message);
    }
    throw error;
  }
}

/**
 * Automatically sets appropriate headers based on request type
 */
function setAutoHeaders(headers: Headers, method: string, hasBody: boolean, body?: any): void {
  // Set User-Agent if not present
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'SafeFetch/1.0 (Bun)');
  }

  // GET requests need Accept header
  if (method === 'GET' && !headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // POST/PUT with body need Content-Type
  if (hasBody && ['POST', 'PUT', 'PATCH'].includes(method) && !headers.has('Content-Type')) {
    const contentType = detectContentType(body);
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
  }

  // Set Accept for POST/PUT if not present
  if (hasBody && ['POST', 'PUT', 'PATCH'].includes(method) && !headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
}

/**
 * Detect content type from body
 */
function detectContentType(body: any): string | null {
  if (body === null || body === undefined) return null;
  
  if (typeof body === 'string') {
    try {
      JSON.parse(body);
      return 'application/json';
    } catch {
      // If it looks like XML
      if (body.trim().startsWith('<')) {
        return 'application/xml';
      }
      return 'text/plain';
    }
  }
  
  if (body instanceof FormData) {
    return 'multipart/form-data'; // Browser sets boundary automatically
  }
  
  if (body instanceof URLSearchParams) {
    return 'application/x-www-form-urlencoded';
  }
  
  if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
    return 'application/octet-stream';
  }
  
  if (typeof body === 'object') {
    return 'application/json';
  }
  
  return null;
}

/**
 * Validates request headers
 */
function validateRequestHeaders(method: string, hasBody: boolean, headers: Headers): HeaderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const correctedHeaders: Record<string, string> = {};
  
  // Collect current headers
  headers.forEach((value, key) => {
    correctedHeaders[key] = value;
  });

  // GET request validations
  if (method === 'GET') {
    if (!headers.has('Accept')) {
      errors.push('GET requests require Accept header');
      correctedHeaders['Accept'] = 'application/json';
    }
    
    if (headers.has('Content-Type')) {
      errors.push('GET requests should not have Content-Type header');
      delete correctedHeaders['Content-Type'];
    }
  }

  // POST/PUT/PATCH with body validations
  if (hasBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
    if (!headers.has('Content-Type')) {
      errors.push('POST/PUT/PATCH with body require Content-Type header');
      correctedHeaders['Content-Type'] = 'application/json';
    }
    
    if (!headers.has('Accept')) {
      warnings.push('POST/PUT/PATCH should include Accept header');
      correctedHeaders['Accept'] = 'application/json';
    }
  }

  // Content-Type validation
  const contentType = headers.get('Content-Type');
  if (contentType) {
    // Check for common mistakes
    if (contentType.includes('json') && !contentType.includes('application/json')) {
      errors.push(`Invalid JSON Content-Type: ${contentType}. Use application/json`);
      correctedHeaders['Content-Type'] = 'application/json';
    }
    
    if (contentType.includes('xml') && !contentType.includes('application/xml') && !contentType.includes('rss+xml') && !contentType.includes('atom+xml')) {
      warnings.push(`Consider using standard XML Content-Type instead of: ${contentType}`);
    }
  }

  // Accept header validation
  const accept = headers.get('Accept');
  if (accept) {
    if (accept === '*/*' && method === 'GET') {
      warnings.push('Accept: */* is too broad, consider specific content types');
      correctedHeaders['Accept'] = 'application/json';
    }
  }

  // Recommended headers
  if (!headers.has('User-Agent')) {
    warnings.push('Missing User-Agent header');
    correctedHeaders['User-Agent'] = 'SafeFetch/1.0 (Bun)';
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    correctedHeaders
  };
}

/**
 * Convenience methods for common request types
 */
export const safeFetchAPI = {
  // GET JSON
  async getJSON(url: string, options: Omit<SafeFetchOptions, 'method' | 'body'> = {}): Promise<any> {
    const response = await safeFetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },

  // GET RSS/XML
  async getRSS(url: string, options: Omit<SafeFetchOptions, 'method' | 'body'> = {}): Promise<string> {
    const response = await safeFetch(url, {
      ...options,
      headers: {
        'Accept': 'application/rss+xml, application/atom+xml, application/xml',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.text();
  },

  // POST JSON
  async postJSON(url: string, data: any, options: Omit<SafeFetchOptions, 'method' | 'headers'> = {}): Promise<any> {
    // BETTER FIX - Completely isolate method
    const { method, ...cleanOptions } = options || {} as any;
    
    const response = await safeFetch(url, {
      method: 'POST',
      ...cleanOptions,
      body: typeof data === 'string' ? data : JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...cleanOptions.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },

  // POST Form
  async postForm(url: string, data: URLSearchParams | Record<string, string>, options: Omit<SafeFetchOptions, 'method' | 'headers'> = {}): Promise<any> {
    // BETTER FIX - Completely isolate method
    const { method, ...cleanOptions } = options || {} as any;
    const body = data instanceof URLSearchParams ? data : new URLSearchParams(data);
    
    const response = await safeFetch(url, {
      method: 'POST',
      ...cleanOptions,
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        ...cleanOptions.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Upload File
  async uploadFile(url: string, file: File | Blob, fieldName: string = 'file', options: Omit<SafeFetchOptions, 'method' | 'headers'> = {}): Promise<any> {
    // BETTER FIX - Completely isolate method
    const { method, ...cleanOptions } = options || {} as any;
    const formData = new FormData();
    formData.append(fieldName, file);
    
    const response = await safeFetch(url, {
      method: 'POST',
      ...cleanOptions,
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...cleanOptions.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
};

// Demo usage
if (import.meta.main) {
  console.log('🛡️ Safe Fetch Wrapper Demo\n');
  
  // Test the convenience methods
  async function demo() {
    try {
      console.log('1. Testing GET JSON...');
      const githubData = await safeFetchAPI.getJSON('https://api.github.com/repos/oven-sh/bun/releases/latest');
      console.log(`   ✅ GitHub API: ${githubData.name} (${githubData.tag_name})`);
      
      console.log('\n2. Testing GET RSS...');
      const rssData = await safeFetchAPI.getRSS('https://bun.com/rss.xml');
      console.log(`   ✅ RSS Feed: ${rssData.length} characters`);
      
      console.log('\n3. Testing POST JSON...');
      const postData = await safeFetchAPI.postJSON('https://httpbin.org/post', { 
        message: 'Hello from SafeFetch!',
        timestamp: new Date().toISOString()
      });
      console.log(`   ✅ POST Success: ${postData.json.message}`);
      
      console.log('\n4. Testing POST Form...');
      const formData = await safeFetchAPI.postForm('https://httpbin.org/post', {
        name: 'SafeFetch Demo',
        message: 'Testing form data'
      });
      console.log(`   ✅ Form Success: ${formData.form.name}`);
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
    }
  }
  
  demo();
}
