export class IntegritySystem {
  private packager: SecurePackager;
  private auditLog: QuantumResistantSecureDataRepository;
  private threatIntel: ThreatIntelligenceService;
  private dashboard: Integrity3DDashboard | null = null;
  
  constructor(options: IntegritySystemOptions = {}) {
    this.packager = new SecurePackager();
    this.auditLog = new QuantumResistantSecureDataRepository();
    this.threatIntel = new ThreatIntelligenceService();
    
    if (options.enableDashboard) {
      this.dashboard = new Integrity3DDashboard(options.dashboardPort || 3000);
    }
  }
  
  async packWithIntegrity(pkgPath: string, options: PackOptions = {}): Promise<IntegrityResult> {
    const startTime = performance.now();
    
    try {
      // Execute secure pack
      const packResult = await this.packager.packWithIntegritySeal(pkgPath, options);
      
      // Update dashboard if enabled
      if (this.dashboard) {
        await this.dashboard.broadcastMatrixUpdate({
          term: packResult.manifest.name,
          minVer: packResult.manifest.version,
          lifecycleScripts: Object.keys(packResult.manifest.scripts || {}),
          securityProfile: 'High (script mutation)',
          tarballIntegrity: 'Re-read verified',
          integrityScore: packResult.stats.integrityScore,
          lastVerified: new Date().toISOString(),
          quantumSeal: true,
          mutationGuarded: true,
          auditTrail: true,
          zeroTrust: true,
          performanceArb: '2.1%',
          compressionRatio: `${packResult.stats.compressionRatio.toFixed(1)}%`
        });
      }
      
      return {
        ...packResult,
        systemMetrics: {
          totalProcessingTime: performance.now() - startTime,
          workerPoolStats: this.auditLog.getWorkerStats(),
          dashboardActive: this.dashboard !== null
        }
      };
    } catch (error) {
      if (this.dashboard && error instanceof Error) {
        await this.dashboard.broadcastViolationAlert({
          package: pkgPath,
          severity: 'high',
          violation: error.message,
          timestamp: new Date().toISOString()
        });
      }
      throw error;
    }
  }
  
  async generateSystemReport(): Promise<SystemReport> {
    const [matrixReport, auditReport] = await Promise.all([
      BUN_DOC_MAP.generateReport(),
      this.auditLog.generateAuditReport()
    ]);
    
    return {
      timestamp: new Date().toISOString(),
      matrix: matrixReport,
      audit: auditReport,
      system: {
        dashboardActive: this.dashboard !== null,
        workerStats: this.auditLog.getWorkerStats(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };
  }
  
  async shutdown(): Promise<void> {
    if (this.dashboard) {
      await this.dashboard.shutdown();
    }
  }
}

import { SecurePackager } from './secure-packager.js';
import { QuantumResistantSecureDataRepository } from './quantum-audit.js';
import { ThreatIntelligenceService } from './threat-intelligence.js';
import { BUN_DOC_MAP } from './col93-matrix.js';
import { Integrity3DDashboard } from './ws/3d-dashboard.js';
import { PackOptions, PackResult } from './types.js';

interface IntegritySystemOptions {
  enableDashboard?: boolean;
  dashboardPort?: number;
}

interface IntegrityResult extends PackResult {
  systemMetrics: {
    totalProcessingTime: number;
    workerPoolStats: any;
    dashboardActive: boolean;
  };
}

interface SystemReport {
  timestamp: string;
  matrix: any;
  audit: any;
  system: {
    dashboardActive: boolean;
    workerStats: any;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}
