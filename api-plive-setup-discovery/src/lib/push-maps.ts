// [TOOL][PUSH][UPLOAD][IDENTIFIER][PUSH-MAPS-01][v2.0][ACTIVE]

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface PushOptions {
  mapsDir: string;
  endpoint: string;          // any URL you like
  identifier?: string;       // optional CLI override
  buildId?: string;          // optional build identifier
  dryRun?: boolean;
  maxRetries?: number;
  timeout?: number;
  service?: 'sentry' | 'datadog' | 'backtrace' | 'generic';
  userAgent?: string;        // custom user agent for requests
}

export interface PushResult {
  name: string;
  status: number;
  success: boolean;
  error?: string;
}

// [FUNCTION][IMPLEMENTATION][PUSH][PUSH-MAPS-02][v2.0][ACTIVE]
// Push discovered source maps to any endpoint with enhanced identifier support

export async function pushMaps(options: PushOptions): Promise<PushResult[]> {
  const {
    mapsDir,
    endpoint,
    identifier,
    buildId,
    dryRun = false,
    maxRetries = 3,
    timeout = 30000,
    service = 'generic',
    userAgent
  } = options;

  // resolution: CLI → Bun.secrets → Bun.env → abort
  const id =
    identifier ??
    Bun.env.MAP_IDENTIFIER;  // for now, use env; Bun.secrets when available

  if (!id) {
    throw new Error('Missing MAP_IDENTIFIER (Bun.secret or env)');
  }

  const files = await readdir(mapsDir);
  const maps = files.filter(f => f.endsWith('.map'));
  const results: PushResult[] = [];

  if (maps.length === 0) {
    console.log('[push] No .map files found to upload');
    return results;
  }

  console.log(`📤 Pushing ${maps.length} source map(s) to: ${endpoint}`);

  if (id) {
    console.log(`🏷️  Release identifier: ${id}`);
  }
  if (buildId) {
    console.log(`🆔 Build ID: ${buildId}`);
  }

  if (dryRun) {
    await generateDryRunCurl(maps, mapsDir, endpoint, id, buildId, service, userAgent);
    return maps.map(name => ({ name, status: 200, success: true }));
  }

  // Actual upload with retry logic
  for (const name of maps) {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const filePath = join(mapsDir, name);
        const fileData = await Bun.file(filePath).bytes();

        const formData = new FormData();
        formData.append('file', new File([fileData], name, {
          type: 'application/json'
        }));

        // Service-specific form fields
        addServiceSpecificFields(formData, name, id, buildId, service);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const headers: Record<string, string> = {
          'User-Agent': userAgent || 'Bun-SMD/2.0'
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          results.push({ name, status: response.status, success: true });
          console.log(`✅ [${attempt}/${maxRetries}] ${name} → ${response.status}`);
          break;
        } else {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      } catch (error: any) {
        lastError = error;
        console.log(`⚠️ [${attempt}/${maxRetries}] ${name} failed: ${error.message}`);

        if (attempt < maxRetries) {
          await Bun.sleep(1000 * Math.pow(2, attempt - 1)); // Exponential backoff
          continue;
        }

        results.push({
          name,
          status: 0,
          success: false,
          error: lastError.message
        });
      }
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`📊 Push complete: ${successCount}/${maps.length} successful`);

  return results;
}

// [FUNCTION][IMPLEMENTATION][PUSH][SERVICE-FIELDS-01][v2.0][ACTIVE]
// Add service-specific form fields for different crash reporting services

function addServiceSpecificFields(
  formData: FormData,
  fileName: string,
  identifier?: string,
  buildId?: string,
  service: string = 'generic'
): void {
  switch (service) {
    case 'sentry':
      formData.append('name', fileName);
      if (identifier) formData.append('version', identifier);
      if (buildId) formData.append('build_id', buildId);
      break;

    case 'datadog':
      formData.append('service', fileName.split('.')[0] || 'app');
      formData.append('version', identifier || buildId || 'unknown');
      formData.append('bundle_path', fileName);
      break;

    case 'backtrace':
      formData.append('name', fileName);
      if (identifier) formData.append('release', identifier);
      if (buildId) formData.append('build', buildId);
      break;

    default:
      // Generic service - use standard fields
      formData.append('name', fileName);
      if (identifier) formData.append('identifier', identifier);
      if (buildId) formData.append('build_id', buildId);
      break;
  }
}

// [FUNCTION][IMPLEMENTATION][PUSH][DRY-RUN-CURL-02][v2.0][ACTIVE]
// Generate dry-run curl command with service-specific fields

async function generateDryRunCurl(
  maps: string[],
  mapsDir: string,
  endpoint: string,
  identifier?: string,
  buildId?: string,
  service: string = 'generic',
  userAgent?: string
): Promise<void> {
  console.log('\n📋 DRY RUN: Would push maps via:');

  const curlParts = [
    'curl -X POST',
    `"${endpoint}"`,
    `-H "User-Agent: ${userAgent || 'Bun-SMD/2.0'}"`
  ];

  // Show form data for first file with identifier fields
  const sampleFile = maps[0];
  if (sampleFile) {
    curlParts.push(`-F "file=@${join(mapsDir, sampleFile)}"`);

    if (identifier) {
      const fieldName = getIdentifierFieldName(service);
      curlParts.push(`-F "${fieldName}=${identifier}"`);
    }

    if (buildId) {
      curlParts.push(`-F "build_id=${buildId}"`);
    }

    // Add service-specific fields for the sample
    addServiceSpecificDryRunFields(curlParts, sampleFile, identifier, buildId, service);
  }

  if (maps.length > 1) {
    curlParts.push(`# ... and ${maps.length - 1} more files`);
  }

  console.log(curlParts.join(' \\\n  '));
  console.log(`\nTotal files: ${maps.length}`);
}

// [FUNCTION][IMPLEMENTATION][PUSH][DRY-RUN-FIELDS-01][v2.0][ACTIVE]
// Add service-specific fields to dry-run curl output

function addServiceSpecificDryRunFields(
  curlParts: string[],
  fileName: string,
  identifier?: string,
  buildId?: string,
  service: string = 'generic'
): void {
  switch (service) {
    case 'sentry':
      if (identifier) curlParts.push(`-F "version=${identifier}"`);
      if (buildId) curlParts.push(`-F "build_id=${buildId}"`);
      break;

    case 'datadog':
      curlParts.push(`-F "service=${fileName.split('.')[0] || 'app'}"`);
      curlParts.push(`-F "version=${identifier || buildId || 'unknown'}"`);
      curlParts.push(`-F "bundle_path=${fileName}"`);
      break;

    case 'backtrace':
      if (identifier) curlParts.push(`-F "release=${identifier}"`);
      if (buildId) curlParts.push(`-F "build=${buildId}"`);
      break;

    default:
      if (identifier) curlParts.push(`-F "identifier=${identifier}"`);
      if (buildId) curlParts.push(`-F "build_id=${buildId}"`);
      break;
  }
}

// [FUNCTION][IMPLEMENTATION][PUSH][IDENTIFIER-FIELD-01][v2.0][ACTIVE]
// Get the appropriate field name for identifier based on service

function getIdentifierFieldName(service: string): string {
  const fieldMap: Record<string, string> = {
    sentry: 'version',
    datadog: 'version',
    backtrace: 'release',
    generic: 'identifier'
  };
  return fieldMap[service] || 'identifier';
}

// [FUNCTION][IMPLEMENTATION][PUSH][VALIDATE-ENDPOINT-01][v1.0][ACTIVE]
// Validate push endpoint URL

export function validatePushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}