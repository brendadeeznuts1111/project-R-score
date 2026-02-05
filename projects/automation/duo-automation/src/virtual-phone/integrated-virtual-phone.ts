// Integrated Virtual Phone System - Complete Integration with Database & Buckets
import { VirtualPhoneSystem, PhoneRecord, VirtualPhoneConfig } from './virtual-phone-system';
import { DatabaseIntegration, DatabaseConfig } from './database-integration';
import { BucketIntegration, BucketConfig } from './bucket-integration';

export interface IntegratedSystemConfig {
  virtualPhone: VirtualPhoneConfig;
  database: DatabaseConfig;
  bucket: BucketConfig;
  autoSync: boolean;
  backupInterval: number; // minutes
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface SystemStatus {
  virtualPhone: {
    connected: boolean;
    totalRecords: number;
    activeRecords: number;
    lastSync: Date;
  };
  database: {
    connected: boolean;
    host: string;
    database: string;
    queryCount: number;
    lastQuery: Date;
  };
  bucket: {
    connected: boolean;
    provider: string;
    bucketName: string;
    totalObjects: number;
    totalSize: number;
    lastBackup: Date;
  };
  identityResolution: {
    active: boolean;
    averageConfidence: number;
    platformsAnalyzed: number;
    lastAnalysis: Date;
  };
  fintechIntelligence: {
    active: boolean;
    averageRiskScore: number;
    kycVerifiedCount: number;
    lastAnalysis: Date;
  };
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
  timestamp: Date;
  duration: number;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  recordsBackedUp: number;
  totalSize: number;
  compressionRatio: number;
  encryptionEnabled: boolean;
  timestamp: Date;
  error?: string;
}

export class IntegratedVirtualPhone {
  private config: IntegratedSystemConfig;
  private virtualPhoneSystem: VirtualPhoneSystem;
  private databaseIntegration: DatabaseIntegration;
  private bucketIntegration: BucketIntegration;
  private isInitialized: boolean = false;
  private backupTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(config: IntegratedSystemConfig) {
    this.config = config;
    this.virtualPhoneSystem = new VirtualPhoneSystem(config.virtualPhone);
    this.databaseIntegration = new DatabaseIntegration(config.database);
    this.bucketIntegration = new BucketIntegration(config.bucket);
  }

  /**
   * Initialize the complete integrated system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Integrated Virtual Phone System...');
      
      // Connect to all components
      const dbConnected = await this.databaseIntegration.connect();
      const bucketConnected = await this.bucketIntegration.connect();
      
      if (!dbConnected || !bucketConnected) {
        throw new Error('Failed to connect to database or bucket storage');
      }
      
      console.log('✅ Database and bucket connections established');
      
      // Start automatic processes
      if (this.config.autoSync) {
        this.startAutoSync();
      }
      
      if (this.config.backupInterval > 0) {
        this.startAutoBackup();
      }
      
      this.isInitialized = true;
      console.log('✅ Integrated Virtual Phone System initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize integrated system:', error);
      return false;
    }
  }

  /**
   * Create a new phone record with full integration
   */
  async createPhoneRecord(phoneNumber: string, carrier: string, region: string): Promise<PhoneRecord | null> {
    try {
      console.log(`📱 Creating phone record: ${phoneNumber}`);
      
      // Create record in virtual phone system
      const record = await this.virtualPhoneSystem.createPhoneRecord(phoneNumber, carrier, region);
      
      // Store in database
      const dbResult = await this.databaseIntegration.createPhoneRecord(record);
      if (!dbResult.success) {
        console.warn('⚠️ Failed to store in database:', dbResult.error);
      }
      
      // Store in bucket storage
      const bucketStored = await this.bucketIntegration.storePhoneRecord(record, this.config.compressionEnabled);
      if (!bucketStored) {
        console.warn('⚠️ Failed to store in bucket storage');
      }
      
      // Store identity data separately if available
      if (record.identityData) {
        await this.bucketIntegration.storeIdentityData(phoneNumber, record.identityData);
      }
      
      // Store fintech data separately if available
      if (record.fintechData) {
        await this.bucketIntegration.storeFintechData(phoneNumber, record.fintechData);
      }
      
      console.log(`✅ Phone record created and stored: ${phoneNumber}`);
      return record;
    } catch (error) {
      console.error('❌ Failed to create phone record:', error);
      return null;
    }
  }

  /**
   * Get phone record with full data integration
   */
  async getPhoneRecord(phoneNumber: string): Promise<PhoneRecord | null> {
    try {
      // Try database first (faster)
      const dbResult = await this.databaseIntegration.getPhoneRecord(phoneNumber);
      if (dbResult.success && dbResult.data && dbResult.data.length > 0) {
        return dbResult.data[0];
      }
      
      // Fallback to bucket storage
      const bucketRecord = await this.bucketIntegration.retrievePhoneRecord(phoneNumber);
      if (bucketRecord) {
        return bucketRecord;
      }
      
      // Fallback to virtual phone system
      return this.virtualPhoneSystem.getPhoneRecord(phoneNumber);
    } catch (error) {
      console.error('❌ Failed to get phone record:', error);
      return null;
    }
  }

  /**
   * Update phone record across all systems
   */
  async updatePhoneRecord(phoneNumber: string): Promise<PhoneRecord | null> {
    try {
      console.log(`🔄 Updating phone record: ${phoneNumber}`);
      
      // Update in virtual phone system
      const record = await this.virtualPhoneSystem.updatePhoneRecord(phoneNumber);
      if (!record) {
        return null;
      }
      
      // Update in database (would use UPDATE query in real implementation)
      const dbResult = await this.databaseIntegration.createPhoneRecord(record);
      if (!dbResult.success) {
        console.warn('⚠️ Failed to update in database:', dbResult.error);
      }
      
      // Update in bucket storage
      const bucketStored = await this.bucketIntegration.storePhoneRecord(record, this.config.compressionEnabled);
      if (!bucketStored) {
        console.warn('⚠️ Failed to update in bucket storage');
      }
      
      console.log(`✅ Phone record updated: ${phoneNumber}`);
      return record;
    } catch (error) {
      console.error('❌ Failed to update phone record:', error);
      return null;
    }
  }

  /**
   * Sync data between all systems
   */
  async syncData(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: [],
      timestamp: new Date(),
      duration: 0
    };

    try {
      console.log('🔄 Starting data synchronization...');
      
      // Get all records from virtual phone system
      const allRecords = this.virtualPhoneSystem.getAllPhoneRecords();
      result.recordsProcessed = allRecords.length;
      
      for (const record of allRecords) {
        try {
          // Check if record exists in database
          const dbResult = await this.databaseIntegration.getPhoneRecord(record.phoneNumber);
          
          if (dbResult.success && dbResult.data && dbResult.data.length > 0) {
            // Update existing record
            await this.databaseIntegration.createPhoneRecord(record);
            result.recordsUpdated++;
          } else {
            // Create new record
            await this.databaseIntegration.createPhoneRecord(record);
            result.recordsCreated++;
          }
          
          // Store in bucket
          await this.bucketIntegration.storePhoneRecord(record, this.config.compressionEnabled);
          
        } catch (error) {
          result.errors.push(`Failed to sync ${record.phoneNumber}: ${error}`);
        }
      }
      
      result.duration = Date.now() - startTime;
      console.log(`✅ Sync completed: ${result.recordsProcessed} records, ${result.duration}ms`);
      
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
      result.duration = Date.now() - startTime;
      
      console.error('❌ Sync failed:', error);
      return result;
    }
  }

  /**
   * Create backup of all data
   */
  async createBackup(backupName?: string): Promise<BackupResult> {
    try {
      console.log('💾 Creating system backup...');
      
      // Sync data before backup
      await this.syncData();
      
      // Create bucket backup
      const bucketResult = await this.bucketIntegration.createBackup(backupName);
      
      const result: BackupResult = {
        success: bucketResult.success,
        backupId: bucketResult.backupId,
        recordsBackedUp: bucketResult.objectsBackedUp,
        totalSize: bucketResult.totalSize,
        compressionRatio: bucketResult.compressionRatio,
        encryptionEnabled: this.config.encryptionEnabled,
        timestamp: bucketResult.timestamp,
        error: bucketResult.error
      };
      
      if (result.success) {
        console.log(`✅ Backup created: ${result.backupId}`);
      } else {
        console.error('❌ Backup failed:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return {
        success: false,
        backupId: backupName || `backup_${Date.now()}`,
        recordsBackedUp: 0,
        totalSize: 0,
        compressionRatio: 1.0,
        encryptionEnabled: this.config.encryptionEnabled,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      // Get virtual phone system status
      const phoneRecords = this.virtualPhoneSystem.getAllPhoneRecords();
      const bucketStats = this.bucketIntegration.getBucketStatistics();
      const dbStats = await this.databaseIntegration.getDatabaseStatistics();
      
      // Calculate identity resolution metrics
      const identityRecords = phoneRecords.filter(r => r.identityData);
      const avgIdentityConfidence = identityRecords.length > 0 
        ? identityRecords.reduce((sum, r) => sum + (r.identityData?.confidence || 0), 0) / identityRecords.length
        : 0;
      
      // Calculate fintech intelligence metrics
      const fintechRecords = phoneRecords.filter(r => r.fintechData);
      const avgRiskScore = fintechRecords.length > 0
        ? fintechRecords.reduce((sum, r) => sum + (r.fintechData?.trustFactor || 0), 0) / fintechRecords.length
        : 0;
      
      const kycVerifiedCount = fintechRecords.filter(r => r.fintechData?.kycStatus === 'verified').length;
      
      return {
        virtualPhone: {
          connected: this.isInitialized,
          totalRecords: phoneRecords.length,
          activeRecords: phoneRecords.filter(r => r.isActive).length,
          lastSync: new Date()
        },
        database: {
          connected: this.databaseIntegration.isConnected,
          host: this.config.database.host,
          database: this.config.database.database,
          queryCount: dbStats.data?.[0]?.totalRecords || 0,
          lastQuery: new Date()
        },
        bucket: {
          connected: this.bucketIntegration.isConnected,
          provider: this.config.bucket.provider,
          bucketName: this.config.bucket.bucketName,
          totalObjects: bucketStats.totalObjects,
          totalSize: bucketStats.totalSize,
          lastBackup: new Date()
        },
        identityResolution: {
          active: this.config.virtualPhone.identityResolution,
          averageConfidence: Math.round(avgIdentityConfidence * 100) / 100,
          platformsAnalyzed: identityRecords.reduce((sum, r) => sum + (r.identityData?.platforms.length || 0), 0),
          lastAnalysis: new Date()
        },
        fintechIntelligence: {
          active: this.config.virtualPhone.fintechIntelligence,
          averageRiskScore: Math.round(avgRiskScore * 100) / 100,
          kycVerifiedCount: kycVerifiedCount,
          lastAnalysis: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get system status:', error);
      throw error;
    }
  }

  /**
   * Get analytics data
   */
  async getAnalyticsData() {
    try {
      const phoneRecords = this.virtualPhoneSystem.getAllPhoneRecords();
      const dbStats = await this.databaseIntegration.getDatabaseStatistics();
      const bucketStats = this.bucketIntegration.getBucketStatistics();
      
      // Risk distribution
      const riskDistribution = {
        low: phoneRecords.filter(r => r.riskAssessment.overall === 'low').length,
        medium: phoneRecords.filter(r => r.riskAssessment.overall === 'medium').length,
        high: phoneRecords.filter(r => r.riskAssessment.overall === 'high').length
      };
      
      // Platform confidence analysis
      const platformConfidence = {
        cashapp: [],
        whatsapp: [],
        telegram: []
      };
      
      phoneRecords.forEach(record => {
        if (record.identityData?.platforms) {
          record.identityData.platforms.forEach(platform => {
            if (platformConfidence[platform.platform]) {
              platformConfidence[platform.platform].push(platform.confidence);
            }
          });
        }
      });
      
      // Calculate averages
      Object.keys(platformConfidence).forEach(platform => {
        const values = platformConfidence[platform];
        platformConfidence[platform] = values.length > 0 
          ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length * 100) / 100
          : 0;
      });
      
      return {
        overview: {
          totalRecords: phoneRecords.length,
          activeRecords: phoneRecords.filter(r => r.isActive).length,
          databaseRecords: dbStats.data?.[0]?.totalRecords || 0,
          bucketObjects: bucketStats.totalObjects,
          totalStorage: bucketStats.totalSize
        },
        riskDistribution,
        platformConfidence,
        compliance: {
          kycVerified: phoneRecords.filter(r => r.fintechData?.kycStatus === 'verified').length,
          identityVerified: phoneRecords.filter(r => r.identityData?.verificationStatus === 'verified').length,
          averageConfidence: Math.round(phoneRecords.reduce((sum, r) => sum + (r.identityData?.confidence || 0), 0) / phoneRecords.length * 100) / 100,
          averageTrustFactor: Math.round(phoneRecords.reduce((sum, r) => sum + (r.fintechData?.trustFactor || 0), 0) / phoneRecords.length * 100) / 100
        },
        performance: {
          databaseQueryTime: dbStats.executionTime || 0,
          bucketAccessTime: 0, // Would be measured in real implementation
          identityResolutionTime: 0, // Would be measured in real implementation
          fintechAnalysisTime: 0 // Would be measured in real implementation
        }
      };
    } catch (error) {
      console.error('❌ Failed to get analytics data:', error);
      throw error;
    }
  }

  /**
   * Export data in various formats
   */
  async exportData(format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    try {
      console.log(`📤 Exporting data in ${format} format...`);
      
      // Get all data from bucket
      const exportData = await this.bucketIntegration.exportData(format);
      
      console.log(`✅ Data exported successfully in ${format} format`);
      return exportData;
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Start automatic sync
   */
  private startAutoSync(): void {
    console.log('🔄 Starting automatic sync...');
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncData();
      } catch (error) {
        console.error('❌ Auto sync failed:', error);
      }
    }, 5 * 60 * 1000); // Sync every 5 minutes
  }

  /**
   * Start automatic backup
   */
  private startAutoBackup(): void {
    console.log(`💾 Starting automatic backup every ${this.config.backupInterval} minutes...`);
    this.backupTimer = setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        console.error('❌ Auto backup failed:', error);
      }
    }, this.config.backupInterval * 60 * 1000);
  }

  /**
   * Shutdown the integrated system
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down Integrated Virtual Phone System...');
      
      // Stop timers
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }
      
      if (this.backupTimer) {
        clearInterval(this.backupTimer);
        this.backupTimer = null;
      }
      
      // Create final backup
      await this.createBackup(`shutdown_backup_${Date.now()}`);
      
      // Disconnect from all systems
      await this.databaseIntegration.disconnect();
      await this.bucketIntegration.disconnect();
      
      this.isInitialized = false;
      console.log('✅ System shutdown complete');
    } catch (error) {
      console.error('❌ Failed to shutdown system:', error);
    }
  }

  /**
   * Get system health check
   */
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check database connection
      if (!this.databaseIntegration.isConnected) {
        issues.push('Database connection lost');
      }
      
      // Check bucket connection
      if (!this.bucketIntegration.isConnected) {
        issues.push('Bucket storage connection lost');
      }
      
      // Check virtual phone system
      if (!this.isInitialized) {
        issues.push('Virtual phone system not initialized');
      }
      
      // Check system resources
      const status = await this.getSystemStatus();
      if (status.virtualPhone.totalRecords === 0) {
        issues.push('No phone records found');
      }
      
      return {
        healthy: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Health check failed: ${error}`);
      return {
        healthy: false,
        issues
      };
    }
  }
}

// Export the integrated system
export { IntegratedVirtualPhone as default };
