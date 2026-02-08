// config/content-types.ts
// Constants for common content types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  MULTIPART_FORM: 'multipart/form-data',
  TEXT_PLAIN: 'text/plain',
  TEXT_HTML: 'text/html',
  OCTET_STREAM: 'application/octet-stream',
  // Binary data types
  BINARY: {
    ARRAY_BUFFER: 'application/octet-stream',
    UINT8_ARRAY: 'application/octet-stream',
    DATA_VIEW: 'application/octet-stream',
  }
} as const;

// Utility to handle content-type with typed arrays
export class ContentTypeHandler {
  static getContentType(data: any): string {
    if (data instanceof Blob) {
      return data.type || CONTENT_TYPES.OCTET_STREAM;
    }
    
    if (data instanceof FormData) {
      return CONTENT_TYPES.MULTIPART_FORM;
    }
    
    if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
      return CONTENT_TYPES.BINARY.ARRAY_BUFFER;
    }
    
    if (typeof data === 'string') {
      try {
        JSON.parse(data);
        return CONTENT_TYPES.JSON;
      } catch {
        return CONTENT_TYPES.TEXT_PLAIN;
      }
    }
    
    if (typeof data === 'object') {
      return CONTENT_TYPES.JSON;
    }
    
    return CONTENT_TYPES.TEXT_PLAIN;
  }
  
  // Create a fetch request with proper content-type
  static createRequest(url: string, data: any, method = 'POST'): Request {
    const contentType = this.getContentType(data);
    const headers = new Headers({
      'Content-Type': contentType
    });
    
    let body: BodyInit;
    
    // Handle different data types
    if (data instanceof Uint8Array) {
      body = data;
    } else if (data instanceof ArrayBuffer) {
      body = data;
    } else if (data instanceof Blob) {
      body = data;
    } else if (data instanceof FormData) {
      body = data;
      // FormData sets its own content-type with boundary
      headers.delete('Content-Type');
    } else if (typeof data === 'object') {
      body = JSON.stringify(data);
    } else {
      body = String(data);
    }
    
    return new Request(url, {
      method,
      headers,
      body
    });
  }
}
