/**
 * API Version Manager
 * Handles API versioning, compatibility, and migration
 */

export interface APIVersion {
  version: string;
  releaseDate: Date;
  status: 'active' | 'deprecated' | 'sunset';
  sunsetDate?: Date;
  breaking: boolean;
  changes: string[];
  migrationGuide?: string;
}

export interface VersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  versionHeader: string;
  enableVersioning: boolean;
  strictVersioning: boolean;
  fallbackToLatest: boolean;
}

export interface VersionedRequest extends Request {
  apiVersion: string;
  versionInfo?: APIVersion;
  originalPath: string;
  versionedPath: string;
}

export class APIVersionManager {
  private config: VersionConfig;
  private versions: Map<string, APIVersion> = new Map();
  private versionRoutes: Map<string, Map<string, any>> = new Map();

  constructor(config: VersionConfig) {
    this.config = config;
    this.initializeVersions();
  }

  /**
   * Initialize API versions
   */
  private initializeVersions(): void {
    // Define available API versions
    const versions: APIVersion[] = [
      {
        version: 'v1',
        releaseDate: new Date('2024-01-01'),
        status: 'active',
        breaking: false,
        changes: [
          'Initial API release',
          'Basic CRUD operations for users',
          'Authentication endpoints',
          'Dashboard data endpoints',
        ],
      },
      {
        version: 'v2',
        releaseDate: new Date('2024-02-01'),
        status: 'active',
        breaking: true,
        changes: [
          'Enhanced security with JWT tokens',
          'Real-time capabilities added',
          'Improved error handling',
          'Rate limiting implemented',
          'API documentation with OpenAPI 3.0',
        ],
        migrationGuide: 'https://docs.fire22.com/migration/v1-to-v2',
      },
      {
        version: 'v3',
        releaseDate: new Date('2024-03-01'),
        status: 'active',
        breaking: false,
        changes: [
          'Advanced analytics endpoints',
          'Bulk operations support',
          'Enhanced filtering and sorting',
          'GraphQL support (experimental)',
        ],
      },
    ];

    // Register versions
    versions.forEach(version => {
      this.versions.set(version.version, version);
      this.versionRoutes.set(version.version, new Map());
    });
  }

  /**
   * Parse API version from request
   */
  parseVersion(request: Request): {
    version: string;
    method: 'header' | 'url' | 'accept' | 'default';
  } {
    if (!this.config.enableVersioning) {
      return { version: this.config.defaultVersion, method: 'default' };
    }

    // Method 1: Version header
    const headerVersion = request.headers.get(this.config.versionHeader);
    if (headerVersion && this.isValidVersion(headerVersion)) {
      return { version: headerVersion, method: 'header' };
    }

    // Method 2: URL path versioning
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/api\/(v\d+)\//);
    if (pathMatch && this.isValidVersion(pathMatch[1])) {
      return { version: pathMatch[1], method: 'url' };
    }

    // Method 3: Accept header versioning
    const acceptHeader = request.headers.get('Accept');
    if (acceptHeader) {
      const versionMatch = acceptHeader.match(/application\/vnd\.fire22\.api\.([^+]+)/);
      if (versionMatch && this.isValidVersion(versionMatch[1])) {
        return { version: versionMatch[1], method: 'accept' };
      }
    }

    // Method 4: Default version
    return { version: this.config.defaultVersion, method: 'default' };
  }

  /**
   * Create versioned request
   */
  createVersionedRequest(request: Request): VersionedRequest {
    const { version } = this.parseVersion(request);
    const versionedRequest = request as VersionedRequest;

    versionedRequest.apiVersion = version;
    versionedRequest.versionInfo = this.versions.get(version);
    versionedRequest.originalPath = new URL(request.url).pathname;

    // Transform path to versioned path if needed
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`/api/${version}/`)) {
      url.pathname = `/api/${version}${url.pathname.replace(/^\/api/, '')}`;
    }
    versionedRequest.versionedPath = url.pathname;

    return versionedRequest;
  }

  /**
   * Register route for specific version
   */
  registerRoute(version: string, path: string, handler: any): void {
    if (!this.versionRoutes.has(version)) {
      this.versionRoutes.set(version, new Map());
    }

    const versionRoutes = this.versionRoutes.get(version)!;
    versionRoutes.set(path, handler);
  }

  /**
   * Get route handler for version
   */
  getRouteHandler(version: string, path: string): any {
    const versionRoutes = this.versionRoutes.get(version);
    if (!versionRoutes) {
      return null;
    }

    return versionRoutes.get(path) || null;
  }

  /**
   * Check if version is supported
   */
  isValidVersion(version: string): boolean {
    return this.config.supportedVersions.includes(version) || this.versions.has(version);
  }

  /**
   * Get version information
   */
  getVersionInfo(version: string): APIVersion | undefined {
    return this.versions.get(version);
  }

  /**
   * Get all supported versions
   */
  getSupportedVersions(): string[] {
    return Array.from(this.versions.keys()).filter(version => {
      const info = this.versions.get(version);
      return info && info.status === 'active';
    });
  }

  /**
   * Get deprecated versions
   */
  getDeprecatedVersions(): Array<{ version: string; sunsetDate?: Date }> {
    return Array.from(this.versions.entries())
      .filter(([_, info]) => info.status === 'deprecated')
      .map(([version, info]) => ({
        version,
        sunsetDate: info.sunsetDate,
      }));
  }

  /**
   * Check if version is deprecated
   */
  isVersionDeprecated(version: string): boolean {
    const info = this.versions.get(version);
    return info ? info.status === 'deprecated' : false;
  }

  /**
   * Check if version is sunset
   */
  isVersionSunset(version: string): boolean {
    const info = this.versions.get(version);
    return info ? info.status === 'sunset' : false;
  }

  /**
   * Create version compatibility response
   */
  createVersionResponse(request: VersionedRequest): Response {
    const supportedVersions = this.getSupportedVersions();
    const deprecatedVersions = this.getDeprecatedVersions();

    const response = {
      success: true,
      data: {
        requestedVersion: request.apiVersion,
        supportedVersions,
        deprecatedVersions,
        defaultVersion: this.config.defaultVersion,
        versionInfo: request.versionInfo,
        timestamp: new Date().toISOString(),
        requestId: (request as any).requestId || 'unknown',
      },
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Version': request.apiVersion,
      'X-Supported-Versions': supportedVersions.join(', '),
      'X-Default-Version': this.config.defaultVersion,
    };

    // Add deprecation warning
    if (this.isVersionDeprecated(request.apiVersion)) {
      headers['Warning'] = `299 fire22-api "Version ${request.apiVersion} is deprecated"`;
      headers['X-Deprecation-Notice'] =
        'This API version is deprecated and will be sunset soon. Please migrate to a newer version.';
    }

    return new Response(JSON.stringify(response), { headers });
  }

  /**
   * Create version error response
   */
  createVersionError(
    requestedVersion: string,
    supportedVersions: string[],
    requestId?: string
  ): Response {
    const error = {
      success: false,
      error: {
        code: 'UNSUPPORTED_API_VERSION',
        message: `API version '${requestedVersion}' is not supported`,
        details: {
          requestedVersion,
          supportedVersions,
          defaultVersion: this.config.defaultVersion,
        },
      },
      timestamp: new Date().toISOString(),
      requestId: requestId || 'unknown',
    };

    return new Response(JSON.stringify(error), {
      status: 406, // Not Acceptable
      headers: {
        'Content-Type': 'application/json',
        'X-Supported-Versions': supportedVersions.join(', '),
        'X-Default-Version': this.config.defaultVersion,
      },
    });
  }

  /**
   * Transform response for version compatibility
   */
  transformResponse(response: Response, request: VersionedRequest): Response {
    // Add version headers to all responses
    const headers = new Headers(response.headers);
    headers.set('X-API-Version', request.apiVersion);

    // Add deprecation headers if needed
    if (this.isVersionDeprecated(request.apiVersion)) {
      headers.set('Warning', `299 fire22-api "Version ${request.apiVersion} is deprecated"`);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Generate version comparison report
   */
  generateVersionReport(): {
    versions: Array<{
      version: string;
      status: string;
      releaseDate: Date;
      breaking: boolean;
      changes: string[];
      migrationGuide?: string;
    }>;
    summary: {
      totalVersions: number;
      activeVersions: number;
      deprecatedVersions: number;
      sunsetVersions: number;
      latestVersion: string;
    };
  } {
    const versionList = Array.from(this.versions.entries()).map(([version, info]) => ({
      version,
      status: info.status,
      releaseDate: info.releaseDate,
      breaking: info.breaking,
      changes: info.changes,
      migrationGuide: info.migrationGuide,
    }));

    const activeVersions = versionList.filter(v => v.status === 'active').length;
    const deprecatedVersions = versionList.filter(v => v.status === 'deprecated').length;
    const sunsetVersions = versionList.filter(v => v.status === 'sunset').length;
    const latestVersion =
      versionList
        .filter(v => v.status === 'active')
        .sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime())[0]?.version || 'v1';

    return {
      versions: versionList,
      summary: {
        totalVersions: versionList.length,
        activeVersions,
        deprecatedVersions,
        sunsetVersions,
        latestVersion,
      },
    };
  }

  /**
   * Validate version compatibility
   */
  validateCompatibility(requestVersion: string, requiredVersion: string): boolean {
    if (!this.isValidVersion(requestVersion) || !this.isValidVersion(requiredVersion)) {
      return false;
    }

    // Simple version comparison (v1 < v2 < v3, etc.)
    const v1 = parseInt(requestVersion.replace('v', ''));
    const v2 = parseInt(requiredVersion.replace('v', ''));

    return v1 >= v2;
  }

  /**
   * Get version middleware
   */
  getMiddleware(): (request: Request) => Response | null {
    return (request: Request): Response | null => {
      if (!this.config.enableVersioning) {
        return null;
      }

      const { version, method } = this.parseVersion(request);

      // Handle version info endpoint
      const url = new URL(request.url);
      if (url.pathname === '/api/versions' || url.pathname === '/api/versions/') {
        return this.createVersionResponse(this.createVersionedRequest(request));
      }

      // Check if version is valid
      if (this.config.strictVersioning && !this.isValidVersion(version)) {
        const supportedVersions = this.getSupportedVersions();
        return this.createVersionError(version, supportedVersions);
      }

      // Check if version is sunset
      if (this.isVersionSunset(version)) {
        const supportedVersions = this.getSupportedVersions();
        return this.createVersionError(version, supportedVersions);
      }

      // Continue with versioned request
      return null;
    };
  }
}

// Default version configuration
export const defaultVersionConfig: VersionConfig = {
  defaultVersion: 'v2',
  supportedVersions: ['v1', 'v2', 'v3'],
  versionHeader: 'X-API-Version',
  enableVersioning: true,
  strictVersioning: false,
  fallbackToLatest: true,
};
