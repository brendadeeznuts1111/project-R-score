/**
 * Fire22 Package Staging API
 * Handles individual package approval workflows and status tracking
 */

interface PackageStatus {
  package: string;
  status: 'pending' | 'approved' | 'rejected';
  build: string;
  timestamp: string;
  reviewer?: string;
  reason?: string;
}

interface StagingApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

// In-memory storage for demo (in production, would use database)
const packageStatuses = new Map<string, PackageStatus>();

// Initialize all Fire22 packages with pending status
const fire22Packages = [
  '@fire22/telegram-bot',
  '@fire22/queue-system',
  '@fire22/multilingual',
  '@fire22/telegram-workflows',
  '@fire22/telegram-dashboard',
  '@fire22/telegram-benchmarks',
  '@fire22/core-dashboard',
  '@fire22/api-client',
  '@fire22/api-consolidated',
  '@fire22/pattern-system',
  '@fire22/sports-betting',
  '@fire22/security-registry',
  '@fire22/language-keys',
  '@fire22/build-system',
  '@fire22/telegram-integration',
];

// Initialize package statuses
fire22Packages.forEach(pkg => {
  packageStatuses.set(pkg, {
    package: pkg,
    status: 'pending',
    build: `#${pkg.split('/')[1].toUpperCase().substring(0, 2)}-${Math.floor(Math.random() * 999)}`,
    timestamp: new Date().toISOString(),
  });
});

export class StagingApi {
  /**
   * Get status of all packages
   */
  static getAllPackageStatuses(): PackageStatus[] {
    return Array.from(packageStatuses.values());
  }

  /**
   * Get status of specific package
   */
  static getPackageStatus(packageName: string): PackageStatus | null {
    return packageStatuses.get(packageName) || null;
  }

  /**
   * Approve a package for deployment
   */
  static approvePackage(packageName: string, reviewer?: string): StagingApiResponse {
    const packageStatus = packageStatuses.get(packageName);
    if (!packageStatus) {
      return {
        success: false,
        message: `Package ${packageName} not found`,
      };
    }

    if (packageStatus.status !== 'pending') {
      return {
        success: false,
        message: `Package ${packageName} is already ${packageStatus.status}`,
      };
    }

    packageStatus.status = 'approved';
    packageStatus.timestamp = new Date().toISOString();
    packageStatus.reviewer = reviewer;

    packageStatuses.set(packageName, packageStatus);

    console.log(`✅ ${packageName} approved by ${reviewer || 'system'}`);

    return {
      success: true,
      message: `Package ${packageName} approved successfully`,
      data: packageStatus,
    };
  }

  /**
   * Reject a package deployment
   */
  static rejectPackage(
    packageName: string,
    reason?: string,
    reviewer?: string
  ): StagingApiResponse {
    const packageStatus = packageStatuses.get(packageName);
    if (!packageStatus) {
      return {
        success: false,
        message: `Package ${packageName} not found`,
      };
    }

    if (packageStatus.status !== 'pending') {
      return {
        success: false,
        message: `Package ${packageName} is already ${packageStatus.status}`,
      };
    }

    packageStatus.status = 'rejected';
    packageStatus.timestamp = new Date().toISOString();
    packageStatus.reviewer = reviewer;
    packageStatus.reason = reason;

    packageStatuses.set(packageName, packageStatus);

    console.log(`❌ ${packageName} rejected by ${reviewer || 'system'}: ${reason}`);

    return {
      success: true,
      message: `Package ${packageName} rejected`,
      data: packageStatus,
    };
  }

  /**
   * Reset package status to pending
   */
  static resetPackageStatus(packageName: string): StagingApiResponse {
    const packageStatus = packageStatuses.get(packageName);
    if (!packageStatus) {
      return {
        success: false,
        message: `Package ${packageName} not found`,
      };
    }

    packageStatus.status = 'pending';
    packageStatus.timestamp = new Date().toISOString();
    delete packageStatus.reviewer;
    delete packageStatus.reason;

    packageStatuses.set(packageName, packageStatus);

    return {
      success: true,
      message: `Package ${packageName} reset to pending`,
      data: packageStatus,
    };
  }

  /**
   * Get deployment readiness summary
   */
  static getDeploymentReadiness(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    readyForDeploy: boolean;
    packages: PackageStatus[];
  } {
    const statuses = this.getAllPackageStatuses();
    const summary = {
      total: statuses.length,
      pending: statuses.filter(p => p.status === 'pending').length,
      approved: statuses.filter(p => p.status === 'approved').length,
      rejected: statuses.filter(p => p.status === 'rejected').length,
      readyForDeploy: false,
      packages: statuses,
    };

    // Ready for deploy if all packages are approved
    summary.readyForDeploy = summary.approved === summary.total;

    return summary;
  }

  /**
   * Handle HTTP requests for staging API
   */
  static async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /api/staging/status - Get all package statuses
      if (method === 'GET' && path === '/api/staging/status') {
        return new Response(
          JSON.stringify({
            success: true,
            data: this.getDeploymentReadiness(),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // GET /api/staging/package/:name - Get specific package status
      if (method === 'GET' && path.startsWith('/api/staging/package/')) {
        const packageName = decodeURIComponent(path.split('/').pop() || '');
        const status = this.getPackageStatus(packageName);

        if (!status) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Package not found',
            }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: status,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // POST /api/staging/approve-package - Approve a package
      if (method === 'POST' && path === '/api/staging/approve-package') {
        const body = await req.json();
        const { package: packageName, reviewer } = body;

        const result = this.approvePackage(packageName, reviewer);

        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // POST /api/staging/reject-package - Reject a package
      if (method === 'POST' && path === '/api/staging/reject-package') {
        const body = await req.json();
        const { package: packageName, reason, reviewer } = body;

        const result = this.rejectPackage(packageName, reason, reviewer);

        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // POST /api/staging/reset-package - Reset package status
      if (method === 'POST' && path === '/api/staging/reset-package') {
        const body = await req.json();
        const { package: packageName } = body;

        const result = this.resetPackageStatus(packageName);

        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 404 for unknown endpoints
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Endpoint not found',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Staging API Error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Internal server error',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }
}

// Export for use in main server
export default StagingApi;
