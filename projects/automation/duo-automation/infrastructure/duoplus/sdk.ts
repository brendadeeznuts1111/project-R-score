// duoplus/sdk.ts
import { DuoPlusPhoneManager } from './phone-provisioning.js';
import { DuoPlusRpaManager } from './rpa-manager.js';
import { DuoPlusBatchManager } from './batch-ops.js';
import { DuoPlusTeamManager } from './team-manager.js';
import { DUOPLUS_CONFIG, AgentConfig, DuoPlusCloudPhone, DuoPlusCloudNumber } from './config.js';

export class DuoPlusSDK {
  public readonly apiKey: string;
  public readonly phones: DuoPlusPhoneManager;
  public readonly rpa: DuoPlusRpaManager;
  public readonly batch: DuoPlusBatchManager;
  public readonly team: DuoPlusTeamManager;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('DuoPlus API key is required');
    }

    this.apiKey = apiKey;
    this.phones = new DuoPlusPhoneManager(apiKey);
    this.rpa = new DuoPlusRpaManager(apiKey);
    this.batch = new DuoPlusBatchManager(apiKey);
    this.team = new DuoPlusTeamManager(apiKey);
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    accountInfo: {
      accountId: string;
      email: string;
      plan: string;
      credits: number;
    };
    apiVersion: string;
  }> {
    try {
      const response = await fetch(`${DUOPLUS_CONFIG.baseUrl}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        accountInfo: {
          accountId: data.account_id,
          email: data.email,
          plan: data.plan,
          credits: data.credits
        },
        apiVersion: data.api_version
      };
    } catch (error: unknown) {
      return {
        success: false,
        accountInfo: {
          accountId: '',
          email: '',
          plan: '',
          credits: 0
        },
        apiVersion: ''
      };
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<{
    status: 'operational' | 'degraded' | 'maintenance';
    services: {
      cloudPhones: 'operational' | 'degraded';
      cloudNumbers: 'operational' | 'degraded';
      rpa: 'operational' | 'degraded';
      batchOps: 'operational' | 'degraded';
      teamManagement: 'operational' | 'degraded';
    };
    announcements: Array<{
      id: string;
      title: string;
      message: string;
      severity: 'info' | 'warning' | 'critical';
      createdAt: Date;
    }>;
  }> {
    try {
      const response = await fetch(`${DUOPLUS_CONFIG.baseUrl}/system/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        status: data.status,
        services: data.services,
        announcements: data.announcements.map((ann: any) => ({
          id: ann.id,
          title: ann.title,
          message: ann.message,
          severity: ann.severity,
          createdAt: new Date(ann.created_at)
        }))
      };
    } catch (error: unknown) {
      throw new Error(`Failed to get system status: ${error instanceof Error ? error.message : String(error)}`); 
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(timeframe: 'day' | 'week' | 'month' = 'month'): Promise<{
    timeframe: string;
    phones: {
      total: number;
      active: number;
      expiring: number;
    };
    numbers: {
      total: number;
      active: number;
    };
    rpa: {
      tasksCreated: number;
      tasksCompleted: number;
      successRate: number;
    };
    batch: {
      operations: number;
      filesProcessed: number;
    };
    costs: {
      monthly: number;
      projected: number;
    };
  }> {
    try {
      const response = await fetch(`${DUOPLUS_CONFIG.baseUrl}/usage/stats?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data;
    } catch (error: unknown) {
      throw new Error(`Failed to get usage stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create complete agent setup
   */
  async createCompleteAgent(config: AgentConfig): Promise<{
    phone: DuoPlusCloudPhone;
    number: DuoPlusCloudNumber;
    warmingTask?: any;
  }> {
    try {
      // 1. Create cloud phone
      const phone = await this.phones.createCloudPhone({
        androidVersion: config.androidVersion,
        region: config.region,
        proxy: config.proxy,
        autoRenew: config.autoRenew,
        teamId: config.teamId
      });

      // 2. Purchase cloud number
      const number = await this.phones.purchaseCloudNumber({
        country: config.phoneCountry,
        type: config.phoneType,
        purpose: 'sms'
      });

      // 3. Bind number to phone
      await this.phones.bindNumberToPhone(number.id, phone.id);

      // 4. Configure anti-detection
      await this.phones.configureAntiDetection(phone.id, {
        appSpecific: config.platformSpecificSettings,
        network: {
          dnsLeakProtection: true, // From Update Log
          webrtcLeakProtection: true
        }
      });

      // 5. Start warming if requested
      let warmingTask;
      if (config.warmupDays > 0) {
        const template = config.platform === 'tiktok' ? 'tiktok-account-warming' 
                        : config.platform === 'reddit' ? 'reddit-account-warming'
                        : 'instagram-engagement';

        warmingTask = await this.rpa.createRpaTask({
          phoneId: phone.id,
          template,
          parameters: {
            duration: config.warmupDays,
            ...config.warmingParams
          },
          schedule: { 
            type: 'recurring', 
            cron: '0 */6 * * *' // Every 6 hours
          },
          rpaMode: 'accessibility'
        });
      }

      return {
        phone,
        number,
        warmingTask
      };
    } catch (error: unknown) {
      throw new Error(`Failed to create complete agent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deploy agent matrix (multiple agents)
   */
  async deployAgentMatrix(config: {
    agentCount: number;
    baseConfig: AgentConfig;
    batchSize?: number; // Default 500 per update log
    progressCallback?: (completed: number, total: number) => void;
  }): Promise<Array<{
    phone: DuoPlusCloudPhone;
    number: DuoPlusCloudNumber;
    warmingTask?: any;
  }>> {
    const batchSize = config.batchSize || 500;
    const agents: any[] = [];
    
    for (let i = 0; i < config.agentCount; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, config.agentCount);
      const batchCount = batchEnd - i;
      
      console.log(`📦 Deploying batch ${Math.floor(i / batchSize) + 1} (${i + 1}-${batchEnd})...`);
      
      // Create agents in parallel for this batch
      const batchPromises = Array.from({ length: batchCount }, async (_, index) => {
        const agentConfig = {
          ...config.baseConfig,
          // Add unique identifiers for this agent
          proxy: config.baseConfig.proxy ? {
            ...config.baseConfig.proxy,
            username: `${config.baseConfig.proxy.username}_${i + index}`
          } : undefined
        };

        return await this.createCompleteAgent(agentConfig);
      });

      const batchAgents = await Promise.all(batchPromises);
      agents.push(...batchAgents);
      
      // Report progress
      if (config.progressCallback) {
        config.progressCallback(agents.length, config.agentCount);
      }
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < config.agentCount) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return agents;
  }

  /**
   * Get verification codes for all agents
   */
  async getVerificationCodes(phoneNumbers: string[], service: string): Promise<Array<{
    phoneNumber: string;
    code: string | null;
    timestamp: Date;
  }>> {
    const results = await Promise.all(
      phoneNumbers.map(async (phoneNumber) => {
        try {
          const messages = await this.phones.getSMS(phoneNumber, 10);
          const verificationSMS = messages.find(m => 
            m.content.toLowerCase().includes(service.toLowerCase()) && 
            (m.content.includes('verification') || m.content.includes('code'))
          );

          let code = null;
          if (verificationSMS) {
            // Extract 6-digit code
            const match = verificationSMS.content.match(/\b\d{6}\b/);
            code = match ? match[0] : null;
          }

          return {
            phoneNumber,
            code,
            timestamp: new Date()
          };
        } catch (error: unknown) {
          return {
            phoneNumber,
            code: null,
            timestamp: new Date()
          };
        }
      })
    );

    return results;
  }

  /**
   * Health check for all agents
   */
  async getAgentHealth(phoneIds: string[]): Promise<Array<{
    phoneId: string;
    status: 'healthy' | 'warning' | 'critical';
    lastActive: Date;
    issues: string[];
    expiry: {
      date: Date;
      daysUntil: number;
    };
  }>> {
    const results = await Promise.all(
      phoneIds.map(async (phoneId) => {
        try {
          const [expiry, workflows] = await Promise.all([
            this.phones.getPhoneExpiry(phoneId),
            this.rpa.listRpaWorkflows({ phoneId, limit: 10 })
          ]);

          const issues: string[] = [];
          let status: 'healthy' | 'warning' | 'critical' = 'healthy';

          // Check expiry
          if (expiry.daysUntilExpiry < 3) {
            issues.push('Phone expires soon');
            status = 'critical';
          } else if (expiry.daysUntilExpiry < 7) {
            issues.push('Phone expires within 7 days');
            status = 'warning';
          }

          // Check failed workflows
          const failedWorkflows = workflows.filter(w => w.status === 'failed');
          if (failedWorkflows.length > 0) {
            issues.push(`${failedWorkflows.length} failed workflows`);
            if (status !== 'critical') {
              status = 'warning';
            }
          }

          return {
            phoneId,
            status,
            lastActive: new Date(),
            issues,
            expiry: {
              date: expiry.expiryDate,
              daysUntil: expiry.daysUntilExpiry
            }
          };
        } catch (error: unknown) {
          return {
            phoneId,
            status: 'critical',
            lastActive: new Date(),
            issues: ['Unable to fetch phone status'],
            expiry: {
              date: new Date(),
              daysUntil: 0
            }
          };
        }
      })
    );

    return results as Array<{
      phoneId: string;
      status: 'healthy' | 'warning' | 'critical';
      lastActive: Date;
      issues: string[];
      expiry: {
        date: Date;
        daysUntil: number;
      };
    }>;
  }

  /**
   * Bulk renew expiring phones
   */
  async bulkRenewExpiringPhones(daysThreshold: number = 7): Promise<{
    renewed: number;
    failed: number;
    total: number;
  }> {
    try {
      // Get all phones
      const expiringPhones = await this.phones.listPhones({
        status: 'active'
      });

      const batchResult = await this.batch.bulkRenewPhones({
        phoneIds: expiringPhones.map(p => p.id),
        duration: 30,
        autoRenew: true
      });

      return {
        renewed: batchResult.succeeded,
        failed: batchResult.failed,
        total: expiringPhones.length
      };
    } catch (error: unknown) {
      throw new Error(`Failed to bulk renew phones: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default DuoPlusSDK;
