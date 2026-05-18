// duoplus/rpa-manager.ts
import { DUOPLUS_CONFIG, RpaTask, RpaWorkflow, RpaTemplate } from './config.js';

export class DuoPlusRpaManager {
  private apiKey: string;
  private rateLimiter: Map<string, number[]> = new Map();
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Rate limiting helper
   */
  private async checkRateLimit(endpoint: string, limit: number, windowMs: number = 60000): Promise<void> {
    const now = Date.now();
    const requests = this.rateLimiter.get(endpoint) || [];
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= limit) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded for ${endpoint}. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    recentRequests.push(now);
    this.rateLimiter.set(endpoint, recentRequests);
  }

  /**
   * Create RPA Task via API
   * From Update Log: "Create RPA Task" endpoint
   */
  async createRpaTask(config: {
    phoneId: string;
    template: 'tiktok-auto-comment' | 'tiktok-account-warming' | 'reddit-account-warming' | 'instagram-engagement' | 'custom';
    parameters: Record<string, any>;
    schedule?: {
      type: 'immediate' | 'scheduled' | 'recurring';
      cron?: string; // For recurring tasks
      executeAt?: Date; // For scheduled tasks
    };
    rpaMode?: 'accessibility' | 'legacy'; // From Update Log: "New RPA mode"
    priority?: 'low' | 'normal' | 'high';
  }): Promise<RpaTask> {
    await this.checkRateLimit('createRpaTask', DUOPLUS_CONFIG.rateLimits.createRpaTask);
    
    try {
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.rpaTasks}`,
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone_id: config.phoneId,
            template_name: config.template,
            parameters: config.parameters,
            schedule: config.schedule ? {
              type: config.schedule.type,
              cron: config.schedule.cron,
              execute_at: config.schedule.executeAt?.toISOString()
            } : undefined,
            rpa_mode: config.rpaMode || 'accessibility',
            priority: config.priority || 'normal'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        taskId: data.task_id,
        status: data.status, // 'pending', 'running', 'completed', 'failed'
        createdAt: new Date(data.created_at),
        workflow: data.workflow_id,
        phoneId: config.phoneId
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get RPA Workflow Management List
   * From Update Log: "RPA Workflow Management List" endpoint
   */
  async listRpaWorkflows(filters?: {
    phoneId?: string;
    phoneIds?: string[];
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<RpaWorkflow[]> {
    await this.checkRateLimit('listWorkflows', DUOPLUS_CONFIG.rateLimits.listWorkflows);
    
    try {
      const params = new URLSearchParams();
      if (filters?.phoneId) params.append('phone_id', filters.phoneId);
      if (filters?.phoneIds) {
        // For multiple phone IDs, we'll need to make multiple API calls
        // or the API should support comma-separated values
        params.append('phone_ids', filters.phoneIds.join(','));
      }
      if (filters?.status) params.append('status', filters.status);
      if (filters?.fromDate) params.append('from', filters.fromDate.toISOString());
      if (filters?.toDate) params.append('to', filters.toDate.toISOString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await fetch(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.rpaWorkflows}?${params.toString()}`,
        {
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`DuoPlus API Error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      return data.workflows.map((wf: any) => ({
        workflowId: wf.workflow_id,
        taskId: wf.task_id,
        phoneId: wf.phone_id,
        status: wf.status,
        progress: wf.progress || 0,
        logs: wf.logs || [],
        createdAt: new Date(wf.created_at),
        completedAt: wf.completed_at ? new Date(wf.completed_at) : null
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Pre-built RPA Templates
   * From Update Log: "Multiple practical RPA templates"
   */
  async getRpaTemplates(): Promise<RpaTemplate[]> {
    return [
      {
        name: 'tiktok-auto-comment',
        description: 'Automatically comment on TikTok videos',
        parameters: {
          videoUrls: 'array of video URLs',
          comments: 'array of comment texts',
          interval: 'seconds between comments',
          maxComments: 'maximum comments per session'
        },
        riskLevel: 'medium'
      },
      {
        name: 'tiktok-account-warming',
        description: 'Warm up new TikTok accounts safely',
        parameters: {
          dailyActions: 'number of actions per day',
          actionTypes: 'like, follow, comment ratios',
          duration: 'days to run warming',
          targetHashtags: 'array of hashtags to engage with'
        },
        riskLevel: 'low'
      },
      {
        name: 'reddit-account-warming',
        description: 'Build karma and activity on Reddit',
        parameters: {
          subreddits: 'array of subreddits to engage with',
          postFrequency: 'posts per day',
          commentFrequency: 'comments per day',
          upvoteRatio: 'target upvote/downvote ratio'
        },
        riskLevel: 'low',
        // From Update Log: "Optimized Reddit anti-detection"
        antiDetection: true
      },
      {
        name: 'instagram-engagement',
        description: 'Instagram organic growth automation',
        parameters: {
          targetAccounts: 'accounts to engage with',
          dailyLikes: 'likes per day',
          dailyFollows: 'follows per day',
          storyViews: 'stories to view per day'
        },
        riskLevel: 'medium'
      },
      {
        name: 'twitter-automation',
        description: 'Twitter engagement and posting',
        parameters: {
          tweetInterval: 'minutes between tweets',
          hashtags: 'array of hashtags to use',
          engageWithTrending: 'engage with trending topics',
          dailyRetweets: 'retweets per day'
        },
        riskLevel: 'medium'
      }
    ];
  }

  /**
   * Stop RPA Task
   */
  async stopRpaTask(taskId: string): Promise<void> {
    try {
      await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/rpa-tasks/${taskId}/stop`,
        {},
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause RPA Task
   */
  async pauseRpaTask(taskId: string): Promise<void> {
    try {
      await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/rpa-tasks/${taskId}/pause`,
        {},
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resume RPA Task
   */
  async resumeRpaTask(taskId: string): Promise<void> {
    try {
      await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/rpa-tasks/${taskId}/resume`,
        {},
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get RPA Task Logs
   */
  async getRpaTaskLogs(taskId: string, limit: number = 100): Promise<string[]> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}/rpa-tasks/${taskId}/logs`,
        {
          params: { limit },
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return response.data.logs || [];
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get RPA Task Statistics
   */
  async getRpaTaskStats(taskId: string): Promise<{
    taskId: string;
    status: string;
    progress: number;
    startTime: Date;
    endTime?: Date;
    actionsCompleted: number;
    errors: number;
    successRate: number;
  }> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}/rpa-tasks/${taskId}/stats`,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        taskId,
        status: response.data.status,
        progress: response.data.progress || 0,
        startTime: new Date(response.data.start_time),
        endTime: response.data.end_time ? new Date(response.data.end_time) : undefined,
        actionsCompleted: response.data.actions_completed || 0,
        errors: response.data.errors || 0,
        successRate: response.data.success_rate || 0
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create custom RPA workflow
   */
  async createCustomWorkflow(config: {
    name: string;
    description: string;
    steps: Array<{
      action: string;
      parameters: Record<string, any>;
      timeout?: number;
      retryCount?: number;
    }>;
    targetPlatforms: string[];
  }): Promise<string> {
    try {
      const response = await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/rpa-workflows/custom`,
        {
          name: config.name,
          description: config.description,
          steps: config.steps,
          target_platforms: config.targetPlatforms
        },
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.workflow_id;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('DuoPlus API Error')) {
        throw error;
      }
      throw new Error(`DuoPlus API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
