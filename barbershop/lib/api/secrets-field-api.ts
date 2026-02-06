// lib/api/secrets-field-api.ts - 3D Secret Field API Endpoints

import { SecretsField } from '../security/secrets-field';
import { RedisVault } from '../security/redis-vault';
import { factoryWagerSecurityCitadel } from '../security/factorywager-security-citadel';
import { integratedSecretManager } from '../security/integrated-secret-manager';

interface SystemState {
  id: string;
  main: {
    exposure: number;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

interface Field3DPoint {
  x: number;
  y: number;
  z: number;
  value: number;
  type: 'api' | 'database' | 'csrf' | 'vault' | 'session' | 'encryption' | 'backup' | 'audit';
  risk: 'low' | 'medium' | 'high' | 'critical';
}

interface Field3DData {
  timestamp: string;
  systemId: string;
  points: Field3DPoint[];
  maxExposure: number;
  anomaly: string;
  riskScore: number;
  metadata: {
    totalSecrets: number;
    activeRotations: number;
    complianceScore: number;
    recentActivity: number;
  };
}

interface RotationRequest {
  secretKey?: string;
  force?: boolean;
  reason?: string;
  requestedBy?: string;
}

interface RotationResponse {
  success: boolean;
  rotated?: Array<{
    key: string;
    oldValue: string;
    newValue: string;
    timestamp: string;
  }>;
  errors?: string[];
  metadata: {
    totalRotated: number;
    duration: number;
    requestedBy: string;
  };
}

export class SecretsFieldAPI {
  private static readonly FIELD_TYPES = ['api', 'database', 'csrf', 'vault', 'session', 'encryption', 'backup', 'audit'];
  private static readonly UPDATE_INTERVAL = 5000; // 5 seconds
  private static readonly COMPRESSION_THRESHOLD = 1000; // Compress if > 1000 points
  
  /**
   * GET /api/secrets/field - 3D field JSON
   */
  static async getField3D(systemId?: string): Promise<Field3DData> {
    try {
      const targetSystemId = systemId || await this.getDefaultSystemId();
      console.log(`📊 Generating 3D field for system: ${targetSystemId}`);
      
      // Get system state
      const state = await this.getSystemState(targetSystemId);
      
      // Compute secrets field
      const fieldResult = await SecretsField.compute(state);
      
      // Get additional metadata
      const stats = await factoryWagerSecurityCitadel.getDashboardStats();
      const redisExposures = await RedisVault.getVaultExposures(targetSystemId);
      
      // Convert to 3D points
      const points = this.convertTo3DPoints(fieldResult.field, redisExposures);
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(fieldResult.field, redisExposures);
      
      const field3D: Field3DData = {
        timestamp: new Date().toISOString(),
        systemId: targetSystemId,
        points,
        maxExposure: fieldResult.maxExposure,
        anomaly: fieldResult.anomaly,
        riskScore,
        metadata: {
          totalSecrets: stats.totalSecrets,
          activeRotations: stats.activeAutomations,
          complianceScore: stats.complianceScore,
          recentActivity: stats.recentActivity
        }
      };
      
      // Cache the field data
      await this.cacheFieldData(targetSystemId, field3D);
      
      return field3D;
    } catch (error) {
      console.error('❌ Failed to generate 3D field:', error.message);
      throw new Error(`Field generation failed: ${error.message}`);
    }
  }
  
  /**
   * POST /api/secrets/rotate - Auto-rotate secrets
   */
  static async rotateSecrets(request: RotationRequest): Promise<RotationResponse> {
    const startTime = Date.now();
    const rotated: Array<{ key: string; oldValue: string; newValue: string; timestamp: string }> = [];
    const errors: string[] = [];
    
    try {
      console.log(`🔄 Starting secret rotation: ${JSON.stringify(request)}`);
      
      // Log rotation request
      await integratedSecretManager.setSecret('rotation', 'request', JSON.stringify({
        ...request,
        timestamp: new Date().toISOString()
      }), 'secrets-field-api', {
        operation: 'rotate-request',
        requestedBy: request.requestedBy || 'api'
      });
      
      if (request.secretKey) {
        // Rotate specific secret
        try {
          const result = await this.rotateSingleSecret(request.secretKey, request.force, request.reason);
          if (result) {
            rotated.push(result);
          }
        } catch (error) {
          errors.push(`Failed to rotate ${request.secretKey}: ${error.message}`);
        }
      } else {
        // Rotate high-risk secrets
        const highRiskSecrets = await this.getHighRiskSecrets();
        
        for (const secretKey of highRiskSecrets) {
          try {
            const result = await this.rotateSingleSecret(secretKey, request.force, request.reason);
            if (result) {
              rotated.push(result);
            }
          } catch (error) {
            errors.push(`Failed to rotate ${secretKey}: ${error.message}`);
          }
        }
      }
      
      const duration = Date.now() - startTime;
      
      const response: RotationResponse = {
        success: rotated.length > 0 && errors.length === 0,
        rotated,
        errors: errors.length > 0 ? errors : undefined,
        metadata: {
          totalRotated: rotated.length,
          duration,
          requestedBy: request.requestedBy || 'api'
        }
      };
      
      // Log rotation result
      await integratedSecretManager.setSecret('rotation', 'result', JSON.stringify(response), 'secrets-field-api', {
        operation: 'rotate-result',
        success: response.success,
        totalRotated: response.metadata.totalRotated
      });
      
      console.log(`✅ Rotation completed: ${rotated.length} rotated, ${errors.length} errors`);
      return response;
      
    } catch (error) {
      console.error('❌ Rotation failed:', error.message);
      throw new Error(`Rotation failed: ${error.message}`);
    }
  }
  
  /**
   * WebSocket /ws/secrets-3d - Live compressed field updates
   */
  static createFieldWebSocket(systemId?: string): {
    onMessage: (data: any) => void;
    sendUpdate: () => Promise<void>;
    close: () => void;
  } {
    const targetSystemId = systemId || 'default';
    let interval: NodeJS.Timeout | null = null;
    let lastFieldData: Field3DData | null = null;
    let subscribers: Array<(data: any) => void> = [];
    
    const sendUpdate = async () => {
      try {
        const fieldData = await this.getField3D(targetSystemId);
        
        // Only send if there are significant changes
        if (this.hasSignificantChanges(lastFieldData, fieldData)) {
          const compressedData = this.compressFieldData(fieldData);
          
          subscribers.forEach(callback => {
            try {
              callback({
                type: 'field-update',
                data: compressedData,
                timestamp: new Date().toISOString()
              });
            } catch (error) {
              console.warn('WebSocket send error:', error.message);
            }
          });
          
          lastFieldData = fieldData;
        }
      } catch (error) {
        console.error('WebSocket update error:', error.message);
      }
    };
    
    const onMessage = (data: any) => {
      subscribers.push(data);
      
      // Start interval if this is the first subscriber
      if (subscribers.length === 1 && !interval) {
        interval = setInterval(sendUpdate, this.UPDATE_INTERVAL);
        sendUpdate(); // Send immediate update
      }
    };
    
    const close = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      subscribers = [];
    };
    
    return { onMessage, sendUpdate, close };
  }
  
  /**
   * Convert field data to 3D points
   */
  private static convertTo3DPoints(field: Float32Array, exposures: number[]): Field3DPoint[] {
    const points: Field3DPoint[] = [];
    
    this.FIELD_TYPES.forEach((type, index) => {
      const value = field[index] || 0;
      const exposure = exposures[index] || 0;
      
      // Create 3D coordinates based on field type and exposure
      const point: Field3DPoint = {
        x: Math.cos((index / this.FIELD_TYPES.length) * Math.PI * 2) * (1 + exposure * 0.1),
        y: Math.sin((index / this.FIELD_TYPES.length) * Math.PI * 2) * (1 + exposure * 0.1),
        z: value * 10, // Height based on exposure value
        value,
        type: type as any,
        risk: this.getRiskLevel(value)
      };
      
      points.push(point);
      
      // Add intermediate points for smoother visualization
      if (value > 0.3) {
        for (let i = 1; i <= 3; i++) {
          const intermediatePoint: Field3DPoint = {
            x: point.x * (1 - i * 0.2),
            y: point.y * (1 - i * 0.2),
            z: point.z * (1 - i * 0.3),
            value: value * (1 - i * 0.2),
            type: type as any,
            risk: this.getRiskLevel(value * (1 - i * 0.2))
          };
          points.push(intermediatePoint);
        }
      }
    });
    
    return points;
  }
  
  /**
   * Get risk level based on exposure value
   */
  private static getRiskLevel(value: number): 'low' | 'medium' | 'high' | 'critical' {
    if (value > 0.8) return 'critical';
    if (value > 0.6) return 'high';
    if (value > 0.3) return 'medium';
    return 'low';
  }
  
  /**
   * Calculate risk score
   */
  private static calculateRiskScore(field: Float32Array, exposures: number[]): number {
    let totalRisk = 0;
    const weights = [0.8, 1.0, 0.7, 1.2, 0.8, 0.6, 0.5, 0.4];
    
    field.forEach((value, index) => {
      const exposure = exposures[index] || 0;
      const weight = weights[index] || 0.5;
      totalRisk += value * weight * (1 + exposure * 0.1);
    });
    
    return Math.min(100, totalRisk * 10);
  }
  
  /**
   * Get default system ID
   */
  private static async getDefaultSystemId(): Promise<string> {
    return process.env.SYSTEM_ID || 'factorywager-default';
  }
  
  /**
   * Get system state
   */
  private static async getSystemState(systemId: string): Promise<SystemState> {
    try {
      const stats = await factoryWagerSecurityCitadel.getDashboardStats();
      const analytics = await RedisVault.getExposureAnalytics(systemId, 1);
      
      const mainExposure = Math.min(10, (
        stats.totalSecrets * 0.1 +
        stats.totalVersions * 0.05 +
        (100 - stats.complianceScore) * 0.1 +
        analytics.total * 0.01
      ));
      
      return {
        id: systemId,
        main: {
          exposure: mainExposure
        },
        timestamp: new Date().toISOString(),
        metadata: {
          totalSecrets: stats.totalSecrets,
          analytics: analytics
        }
      };
    } catch (error) {
      return {
        id: systemId,
        main: {
          exposure: 5.0
        },
        timestamp: new Date().toISOString(),
        metadata: {
          fallback: true,
          error: error.message
        }
      };
    }
  }
  
  /**
   * Rotate single secret
   */
  private static async rotateSingleSecret(secretKey: string, force?: boolean, reason?: string): Promise<{
    key: string;
    oldValue: string;
    newValue: string;
    timestamp: string;
  } | null> {
    try {
      const [service, name] = secretKey.split(':');
      const oldValue = await integratedSecretManager.getSecret(service || 'default', name || secretKey);
      
      if (!oldValue && !force) {
        throw new Error('Secret not found and force not specified');
      }
      
      // Generate new secret value
      const newValue = this.generateSecretValue(secretKey);
      
      // Store new version
      await integratedSecretManager.setSecret(service || 'default', name || secretKey, newValue, 'rotation-api', {
        operation: 'rotate',
        reason: reason || 'scheduled rotation',
        previousValue: oldValue ? oldValue.substring(0, 10) + '...' : 'none',
        timestamp: new Date().toISOString()
      });
      
      // Create version entry
      await factoryWagerSecurityCitadel.createImmutableVersion(
        secretKey,
        newValue,
        'rotation-api',
        reason || 'Scheduled secret rotation'
      );
      
      return {
        key: secretKey,
        oldValue: oldValue || 'none',
        newValue,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to rotate ${secretKey}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get high-risk secrets that need rotation
   */
  private static async getHighRiskSecrets(): Promise<string[]> {
    // In production, this would query the system for high-risk secrets
    return [
      'api:github-token',
      'database:primary-password',
      'vault:master-key',
      'encryption:aes-key'
    ];
  }
  
  /**
   * Generate new secret value
   */
  private static generateSecretValue(secretKey: string): string {
    const length = 32;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * Cache field data
   */
  private static async cacheFieldData(systemId: string, fieldData: Field3DData): Promise<void> {
    try {
      await integratedSecretManager.setSecret('cache', `field-3d-${systemId}`, JSON.stringify(fieldData), 'secrets-field-api', {
        type: 'field-cache',
        systemId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to cache field data:', error.message);
    }
  }
  
  /**
   * Check for significant changes
   */
  private static hasSignificantChanges(oldData: Field3DData | null, newData: Field3DData): boolean {
    if (!oldData) return true;
    
    // Check for significant changes in exposure or anomaly
    const exposureChange = Math.abs(oldData.maxExposure - newData.maxExposure);
    const anomalyChanged = oldData.anomaly !== newData.anomaly;
    const riskChange = Math.abs(oldData.riskScore - newData.riskScore);
    
    return exposureChange > 0.05 || anomalyChanged || riskChange > 5;
  }
  
  /**
   * Compress field data for WebSocket transmission
   */
  private static compressFieldData(fieldData: Field3DData): any {
    if (fieldData.points.length <= this.COMPRESSION_THRESHOLD) {
      return fieldData;
    }
    
    // Compress by reducing point precision and removing redundant points
    const compressedPoints = fieldData.points.map(point => ({
      x: Math.round(point.x * 100) / 100,
      y: Math.round(point.y * 100) / 100,
      z: Math.round(point.z * 100) / 100,
      v: Math.round(point.value * 100) / 100,
      t: point.type[0], // First letter of type
      r: point.risk[0]  // First letter of risk
    }));
    
    return {
      ...fieldData,
      points: compressedPoints,
      compressed: true
    };
  }
}

// Export types
export type { SystemState, Field3DData, Field3DPoint, RotationRequest, RotationResponse };
