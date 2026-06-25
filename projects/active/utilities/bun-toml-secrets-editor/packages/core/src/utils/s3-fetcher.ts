/**
 * S3 URL fetch utilities using Bun's native S3 support
 */

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface S3FetchOptions {
  credentials?: S3Credentials;
  headers?: Record<string, string>;
  method?: string;
  body?: string | FormData | Blob;
}

/**
 * Fetch an S3 object using Bun's native S3 URL support
 */
export async function fetchS3Object(
  s3Url: string,
  options: S3FetchOptions = {}
): Promise<Response> {
  const fetchOptions: any = {};

  if (options.credentials) {
    fetchOptions.s3 = {
      accessKeyId: options.credentials.accessKeyId,
      secretAccessKey: options.credentials.secretAccessKey,
      region: options.credentials.region,
    };
  }

  if (options.headers) {
    fetchOptions.headers = options.headers;
  }

  if (options.method) {
    fetchOptions.method = options.method;
  }

  if (options.body) {
    fetchOptions.body = options.body;
  }

  return await fetch(s3Url, fetchOptions);
}

/**
 * Fetch S3 object as text
 */
export async function fetchS3Text(
  s3Url: string,
  options?: S3FetchOptions
): Promise<string> {
  const response = await fetchS3Object(s3Url, options);
  if (!response.ok) {
    throw new Error(`S3 fetch failed: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

/**
 * Fetch S3 object as JSON
 */
export async function fetchS3JSON<T = any>(
  s3Url: string,
  options?: S3FetchOptions
): Promise<T> {
  const text = await fetchS3Text(s3Url, options);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse S3 JSON response: ${error}`);
  }
}

/**
 * Check if S3 object exists
 */
export async function checkS3ObjectExists(
  s3Url: string,
  options?: S3FetchOptions
): Promise<boolean> {
  try {
    const response = await fetchS3Object(s3Url, { ...options, method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * List S3 objects (requires bucket-level access)
 */
export async function listS3Objects(
  bucketUrl: string,
  options?: S3FetchOptions
): Promise<string[]> {
  const response = await fetchS3Object(bucketUrl, {
    ...options,
    method: 'GET',
    headers: {
      ...options?.headers,
      'x-amz-content-type': 'application/xml'
    }
  });

  if (!response.ok) {
    throw new Error(`S3 list failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  // Parse XML response to extract object keys
  const keyMatches = text.match(/<Key>([^<]+)<\/Key>/g);
  return keyMatches ? keyMatches.map(match => match.replace(/<\/?Key>/g, '')) : [];
}
