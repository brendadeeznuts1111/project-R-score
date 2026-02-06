// lib/security/secrets-field.ts - Advanced Secret Exposure Analysis

import { factoryWagerSecurityCitadel } from './factorywager-security-citadel';
import { integratedSecretManager } from './integrated-secret-manager';

interface SystemState {
  id: string;
  main: {
    exposure: number;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

interface SecretsFieldScore {
  field: Float32Array;
  maxExposure: number;
  anomaly: "DB_LEAK_RISK" | "VAULT_ARBITRAGE" | "SECURE";
}

interface VaultExposure {
  api: number;
  database: number;
  csrf: number;
  vault: number;
  session: number;
  encryption: number;
  backup: number;
  audit: number;
}

// Vault exposure weights for different secret types
const VAULT_WEIGHTS = {
  1: 0.9,  // api
  2: 1.0,  // database
  3: 0.7,  // csrf
  4: 1.2,  // vault
  5: 0.8,  // session
  6: 0.6,  // encryption
  7: 0.5,  // backup
  8: 0.4   // audit
};

// Mock XGBoost booster (in production, use actual ML model)
class SecretBooster {
  async predict(field: Float32Array): Promise<Float32Array> {
    // Simulate ML prediction with security-aware transformations
    const boosted = new Float32Array(field.length);
    
    for (let i = 0; i < field.length; i++) {
      // Apply security-specific transformations
      let value = field[i];
      
      // Boost high-risk patterns
      if (i === 1 && value > 0.7) value *= 1.3; // Database risk
      if (i === 3 && value > 0.6) value *= 1.5; // Vault risk
      
      // Apply non-linear security scoring
      boosted[i] = Math.tanh(value * 1.2) * (1 + Math.sin(value * Math.PI) * 0.1);
      
      // Ensure values stay in valid range
      boosted[i] = Math.max(0, Math.min(1, boosted[i]));
    }
    
    return boosted;
  }
}

const secretBooster = new SecretBooster();

export class SecretsField {
  private static readonly FIELD_SIZE = 8;
  private static readonly CRITICAL_THRESHOLDS = {
    DB_LEAK_RISK: 0.95,
    VAULT_ARBITRAGE: 0.95,
    HIGH_RISK: 0.8,
    MEDIUM_RISK: 0.6
  };

  /**
   * Compute secret exposure field scores with ML enhancement
   */
  static async compute(state: SystemState): Promise<SecretsFieldScore> {
    console.log(`🔍 Computing secrets field for system: ${state.id}`);
    
    const field = new Float32Array(SecretsField.FIELD_SIZE);
    
    // Get vault exposures from FactoryWager Security Citadel
    const exposure = await SecretsField.getVaultExposures(state.id);
    
    // Main secret tension (normalized)
    field[0] = Math.min(1, state.main.exposure / 10);
    
    // Propagate with exposure weight and security context
    for (let i = 1; i < field.length; i++) {
      const weight = VAULT_WEIGHTS[i];
      const expRatio = exposure[i] / (exposure[0] || 1);
      const inertia = 1 - expRatio;
      
      // Security-aware field calculation
      field[i] = 0.8 * field[0] * weight + 0.2 * inertia;
      
      // Apply secret-specific risk factors
      field[i] = SecretsField.applySecretTypeRisk(i, field[i], exposure);
    }
    
    // Apply XGBoost-style ML enhancement
    const boosted = await secretBooster.predict(field);
    
    // Detect anomalies
    const anomaly = SecretsField.detectAnomaly(boosted);
    
    const result = {
      field: boosted,
      maxExposure: Math.max(...boosted),
      anomaly
    };
    
    // Log to FactoryWager audit system
    await SecretsField.logFieldAnalysis(state.id, result);
    
    return result;
  }

  /**
   * Get vault exposures from FactoryWager Security Citadel with Redis tracking
   */
  private static async getVaultExposures(systemId: string): Promise<VaultExposure> {
    try {
      // Try Redis vault first for real-time exposure tracking
      const { RedisVault } = await import('./redis-vault');
      
      console.log(`📊 Getting Redis vault exposures for: ${systemId}`);
      const redisExposures = await RedisVault.getVaultExposures(systemId);
      
      if (redisExposures.some(count => count > 0)) {
        console.log(`✅ Using Redis vault exposures: ${redisExposures.join(', ')}`);
        
        return {
          api: SecretsField.calculateExposure(redisExposures[0] || 0, 0.3),
          database: SecretsField.calculateExposure(redisExposures[1] || 0, 0.4),
          csrf: SecretsField.calculateExposure(redisExposures[2] || 0, 0.2),
          vault: SecretsField.calculateExposure(redisExposures[3] || 0, 0.8),
          session: SecretsField.calculateExposure(redisExposures[4] || 0, 0.3),
          encryption: SecretsField.calculateExposure(redisExposures[5] || 0, 0.5),
          backup: SecretsField.calculateExposure(redisExposures[6] || 0, 0.6),
          audit: SecretsField.calculateExposure(redisExposures[7] || 0, 0.2)
        };
      }
      
      // Fallback to Security Citadel stats
      console.log(`⚠️  Redis vault empty, using Security Citadel fallback`);
      const stats = await factoryWagerSecurityCitadel.getDashboardStats();
      
      // Calculate exposure based on secret metrics
      const exposure: VaultExposure = {
        api: SecretsField.calculateExposure(stats.totalSecrets, 0.3),
        database: SecretsField.calculateExposure(stats.totalVersions, 0.4),
        csrf: SecretsField.calculateExposure(stats.activeAutomations, 0.2),
        vault: SecretsField.calculateExposure(stats.totalSecrets, 0.8),
        session: SecretsField.calculateExposure(stats.recentActivity, 0.3),
        encryption: SecretsField.calculateExposure(stats.totalVersions, 0.5),
        backup: SecretsField.calculateExposure(stats.totalSecrets, 0.6),
        audit: SecretsField.calculateExposure(stats.complianceScore, 0.2)
      };
      
      return exposure;
    } catch (error) {
      console.warn(`Failed to get vault exposures, using defaults: ${error.message}`);
      
      // Fallback exposure values
      return {
        api: 0.3,
        database: 0.4,
        csrf: 0.2,
        vault: 0.8,
        session: 0.3,
        encryption: 0.5,
        backup: 0.6,
        audit: 0.2
      };
    }
  }

  /**
   * Calculate exposure score based on metrics and risk factor
   */
  private static calculateExposure(metric: number, riskFactor: number): number {
    // Normalize and apply risk factor
    const normalized = Math.min(1, metric / 100);
    return normalized * riskFactor;
  }

  /**
   * Apply secret type-specific risk factors
   */
  private static applySecretTypeRisk(index: number, value: number, exposure: VaultExposure): number {
    switch (index) {
      case 1: // API keys
        return value * (1 + exposure.api * 0.3);
      case 2: // Database credentials
        return value * (1 + exposure.database * 0.5);
      case 3: // CSRF tokens
        return value * (1 + exposure.csrf * 0.2);
      case 4: // Vault secrets
        return value * (1 + exposure.vault * 0.7);
      case 5: // Session tokens
        return value * (1 + exposure.session * 0.3);
      case 6: // Encryption keys
        return value * (1 + exposure.encryption * 0.4);
      case 7: // Backup secrets
        return value * (1 + exposure.backup * 0.5);
      case 8: // Audit logs
        return value * (1 + exposure.audit * 0.2);
      default:
        return value;
    }
  }

  /**
   * Detect security anomalies based on field scores
   */
  private static detectAnomaly(field: Float32Array): "DB_LEAK_RISK" | "VAULT_ARBITRAGE" | "SECURE" {
    // Check for critical database leak risk
    if (field[1] > SecretsField.CRITICAL_THRESHOLDS.DB_LEAK_RISK) {
      return "DB_LEAK_RISK";
    }
    
    // Check for vault arbitrage risk
    if (field[3] > SecretsField.CRITICAL_THRESHOLDS.VAULT_ARBITRAGE) {
      return "VAULT_ARBITRAGE";
    }
    
    // Check for other high-risk patterns
    const highRiskCount = Array.from(field).filter(v => v > SecretsField.CRITICAL_THRESHOLDS.HIGH_RISK).length;
    if (highRiskCount >= 3) {
      return field[3] > field[1] ? "VAULT_ARBITRAGE" : "DB_LEAK_RISK";
    }
    
    return "SECURE";
  }

  /**
   * Log field analysis to FactoryWager audit system
   */
  private static async logFieldAnalysis(systemId: string, result: SecretsFieldScore): Promise<void> {
    try {
      await integratedSecretManager.setSecret('security', 'field-analysis', JSON.stringify({
        systemId,
        timestamp: new Date().toISOString(),
        field: Array.from(result.field),
        maxExposure: result.maxExposure,
        anomaly: result.anomaly,
        riskLevel: SecretsField.getRiskLevel(result.maxExposure)
      }), 'secrets-field', {
        category: 'security-analysis',
        systemId,
        anomaly: result.anomaly,
        riskLevel: SecretsField.getRiskLevel(result.maxExposure)
      });
    } catch (error) {
      console.warn(`Failed to log field analysis: ${error.message}`);
    }
  }

  /**
   * Get risk level based on exposure score
   */
  private static getRiskLevel(exposure: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (exposure > SecretsField.CRITICAL_THRESHOLDS.DB_LEAK_RISK) return 'CRITICAL';
    if (exposure > SecretsField.CRITICAL_THRESHOLDS.HIGH_RISK) return 'HIGH';
    if (exposure > SecretsField.CRITICAL_THRESHOLDS.MEDIUM_RISK) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get security recommendations based on field analysis
   */
  static async getRecommendations(result: SecretsFieldScore): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Analyze field patterns
    const fieldArray = Array.from(result.field);
    
    // Database-specific recommendations
    if (fieldArray[1] > 0.7) {
      recommendations.push("🔐 Rotate database credentials immediately");
      recommendations.push("🛡️ Enable database connection encryption");
      recommendations.push("📊 Implement database access monitoring");
    }
    
    // Vault-specific recommendations
    if (fieldArray[3] > 0.7) {
      recommendations.push("🏰 Review vault access policies");
      recommendations.push("🔄 Enable vault secret rotation");
      recommendations.push("🚨 Implement vault intrusion detection");
    }
    
    // API key recommendations
    if (fieldArray[0] > 0.6) {
      recommendations.push("🔑 Audit API key usage and permissions");
      recommendations.push("⏰ Set up API key expiration policies");
      recommendations.push("📱 Implement API key rotation schedule");
    }
    
    // General security recommendations
    if (result.maxExposure > 0.8) {
      recommendations.push("🚨 Immediate security review required");
      recommendations.push("📞 Notify security team");
      recommendations.push("🔒 Consider temporary access restrictions");
    }
    
    // FactoryWager specific recommendations
    recommendations.push("🏰 Use FactoryWager Security Citadel for enhanced monitoring");
    recommendations.push("📊 Enable real-time secret exposure tracking");
    recommendations.push("🔍 Schedule regular security field analysis");
    
    return recommendations;
  }

  /**
   * Generate security field report
   */
  static async generateReport(systemId: string, result: SecretsFieldScore): Promise<{
    summary: string;
    details: any;
    recommendations: string[];
    factorywager: any;
  }> {
    const recommendations = await SecretsField.getRecommendations(result);
    
    // Get FactoryWager context
    const stats = await factoryWagerSecurityCitadel.getDashboardStats();
    
    return {
      summary: `Security field analysis for ${systemId}: ${result.anomaly} (Max exposure: ${(result.maxExposure * 100).toFixed(1)}%)`,
      details: {
        systemId,
        timestamp: new Date().toISOString(),
        field: {
          main: result.field[0],
          api: result.field[1],
          database: result.field[2],
          csrf: result.field[3],
          vault: result.field[4],
          session: result.field[5],
          encryption: result.field[6],
          backup: result.field[7],
          audit: result.field[8]
        },
        maxExposure: result.maxExposure,
        anomaly: result.anomaly,
        riskLevel: SecretsField.getRiskLevel(result.maxExposure)
      },
      recommendations,
      factorywager: {
        version: '5.1',
        totalSecrets: stats.totalSecrets,
        totalVersions: stats.totalVersions,
        complianceScore: stats.complianceScore,
        dashboardUrl: 'http://localhost:8080',
        documentation: 'https://docs.factory-wager.com/secrets'
      }
    };
  }
}

// Export types for external use
export type { SystemState, SecretsFieldScore, VaultExposure };
