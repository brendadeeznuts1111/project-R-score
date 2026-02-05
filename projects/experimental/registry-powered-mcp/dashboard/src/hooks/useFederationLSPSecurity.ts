/**
 * FederationMatrix LSP Security Integration
 * Integrates security test runner diagnostics with FederationMatrix component
 */

import { SecurityTestRunner, type LSPDiagnostic, type FederationConfig } from '../../../test/scripts/security-test-runner';

// Federation LSP Security Service
export class FederationLSPSecurityService {
  private securityRunner: SecurityTestRunner;
  private diagnostics: LSPDiagnostic[] = [];
  private lastUpdate: Date = new Date();

  constructor(federationConfig?: FederationConfig) {
    this.securityRunner = new SecurityTestRunner(federationConfig);
  }

  async updateSecurityDiagnostics(): Promise<LSPDiagnostic[]> {
    try {
      const results = await this.securityRunner.runAllTests();

      // Extract LSP diagnostics from all test results
      this.diagnostics = results.flatMap(result =>
        result.lspDiagnostics || []
      );

      this.lastUpdate = new Date();
      return this.diagnostics;
    } catch (error) {
      console.error('Failed to update security diagnostics:', error);
      return [];
    }
  }

  getSecurityStatusForSystem(systemName: string): {
    compliance: { [key: string]: 'compliant' | 'non-compliant' | 'unknown' };
    violations: LSPDiagnostic[];
    overall: 'secure' | 'warning' | 'critical';
  } {
    const systemDiagnostics = this.diagnostics.filter(d => d.federationSystem === systemName);

    const compliance: { [key: string]: 'compliant' | 'non-compliant' | 'unknown' } = {
      SOC2: 'unknown',
      GDPR: 'unknown',
      HIPAA: 'unknown',
      RBAC: 'unknown'
    };

    // Determine compliance status based on diagnostics
    systemDiagnostics.forEach(diagnostic => {
      if (diagnostic.complianceFramework) {
        switch (diagnostic.severity) {
          case 'error':
            compliance[diagnostic.complianceFramework] = 'non-compliant';
            break;
          case 'warning':
            if (compliance[diagnostic.complianceFramework] !== 'non-compliant') {
              compliance[diagnostic.complianceFramework] = 'non-compliant';
            }
            break;
          case 'info':
            if (compliance[diagnostic.complianceFramework] === 'unknown') {
              compliance[diagnostic.complianceFramework] = 'compliant';
            }
            break;
        }
      }
    });

    // Set defaults for systems without specific diagnostics
    const knownCompliantSystems = {
      SOC2: ['AWS ECR', 'AWS SSM', 'GitHub Packages', 'Hyper-Bun'],
      GDPR: ['Hyper-Bun', 'GitHub Packages'],
      HIPAA: ['AWS SSM', 'Hyper-Bun'],
      RBAC: ['Hyper-Bun', 'JFrog', 'Sonatype Nexus']
    };

    Object.keys(compliance).forEach(framework => {
      if (compliance[framework] === 'unknown') {
        compliance[framework] = knownCompliantSystems[framework as keyof typeof knownCompliantSystems]
          .includes(systemName) ? 'compliant' : 'non-compliant';
      }
    });

    // Determine overall security status
    const violationSeverities = systemDiagnostics.map(d => d.severity);
    let overall: 'secure' | 'warning' | 'critical' = 'secure';

    if (violationSeverities.includes('error')) {
      overall = 'critical';
    } else if (violationSeverities.includes('warning')) {
      overall = 'warning';
    }

    return {
      compliance,
      violations: systemDiagnostics,
      overall
    };
  }

  getAllDiagnostics(): LSPDiagnostic[] {
    return this.diagnostics;
  }

  getLastUpdate(): Date {
    return this.lastUpdate;
  }

  async refreshDiagnostics(): Promise<void> {
    await this.updateSecurityDiagnostics();
  }
}

// Hook for FederationMatrix component integration
export function useFederationLSPSecurity() {
  const securityService = new FederationLSPSecurityService();

  const getSystemSecurityStatus = (systemName: string) => {
    return securityService.getSecurityStatusForSystem(systemName);
  };

  const refreshSecurityData = async () => {
    await securityService.refreshDiagnostics();
  };

  const getSecurityDiagnostics = () => {
    return securityService.getAllDiagnostics();
  };

  return {
    getSystemSecurityStatus,
    refreshSecurityData,
    getSecurityDiagnostics,
    lastUpdate: securityService.getLastUpdate()
  };
}

// Export types for component usage
export type { LSPDiagnostic, FederationConfig };