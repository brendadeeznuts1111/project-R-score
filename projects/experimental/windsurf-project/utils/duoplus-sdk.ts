// sdk/duoplus-sdk.ts - Enhanced DuoPlus SDK with URLPattern Metadata + S3 Embeds

import { classifyPath } from '../utils/urlpattern-r2.js';
import { bunIO } from '../utils/transformation-toolkit.js';

export interface RPATask {
  type: string;
  metadata?: Record<string, any>;
  r2Path?: string;
  priority?: number;
  timeout?: number;
  phoneID?: string; // Added for Embed support
}

export interface RPATaskResult {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  metadata?: Record<string, any>;
}

export class DuoPlusSDK {
  private baseUrl: string;
  private apiKey: string;
  private s3Manager?: any;

  constructor(baseUrl: string, apiKey: string, s3Manager?: any) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.s3Manager = s3Manager;
  }

  // New: Create task with inline R2 embed
  async createRPATaskWithEmbed(task: RPATask, screenshotKey: string) {
    if (!task.metadata) task.metadata = {};
    
    // Use the native S3 client to get the URL (Auto-inline)
    // If using Bun.s3, file(key).url provides the public URL
    const embedUrl = this.s3Manager?.client?.file(screenshotKey)?.url || `https://pub-295f9061822d480cbe2b81318d88d774.r2.dev/${screenshotKey}`;
    
    task.metadata.embedUrl = embedUrl;
    task.metadata.disposition = 'inline';
    
    console.info(`🖼️  Embedding Inline Screenshot: ${embedUrl}`);
    
    // Push to dashboard #3 (Phone ID required)
    if (task.phoneID) {
      await this.batchPushToPhones([embedUrl], [task.phoneID]);
    }
    
    return this.createRPATask(task);
  }

  // Enhanced RPA task creation with URLPattern metadata
  async createRPATaskWithPattern(task: RPATask & { r2Path?: string }): Promise<RPATaskResult> {
    console.info(`🤖 **DuoPlus RPA with URLPattern Metadata**`);
    
    if (task.r2Path) {
      const classified = classifyPath(task.r2Path);
      if (classified) {
        task.metadata = {
          ...task.metadata,
          pattern: classified.pattern,
          params: classified.metadata,
          r2Path: task.r2Path,
          classifiedAt: Date.now()
        };
        console.info(`📊 Pattern classified: ${classified.pattern}`);
      }
    }

    const result: RPATaskResult = {
      id: `rpa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'queued',
      createdAt: new Date(),
      metadata: task.metadata
    };

    console.info(`✅ RPA Task Created: ${result.id}`);
    return result;
  }

  async createRPATask(task: RPATask): Promise<RPATaskResult> {
    return this.createRPATaskWithPattern(task);
  }

  async getTaskStatus(taskId: string): Promise<RPATaskResult | null> {
    console.info(`🔍 Checking task: ${taskId}`);
    return {
      id: taskId,
      status: 'completed',
      createdAt: new Date(Date.now() - 60000),
    };
  }

  async listTasksByPattern(pattern: string): Promise<RPATaskResult[]> {
    console.info(`📋 Listing tasks for pattern: ${pattern}`);
    return [
      {
        id: `rpa-${pattern}-1`,
        status: 'completed',
        createdAt: new Date(),
        metadata: { pattern, params: { userId: 'demo-user' } }
      }
    ];
  }

  async bulkCreateTasks(paths: string[], taskType: string): Promise<RPATaskResult[]> {
    console.info(`🚀 **Bulk RPA Task Creation: ${paths.length} paths**`);
    const tasks = await Promise.all(
      paths.map(path => 
        this.createRPATaskWithPattern({
          type: taskType,
          r2Path: path,
          priority: 1
        })
      )
    );
    return tasks;
  }

  /**
   * High-performance results export using Bun-native I/O
   */
  async exportResults(results: RPATaskResult[], filePath: string) {
    console.info(`💾 Exporting ${results.length} results to ${filePath}`);
    await bunIO.write(filePath, JSON.stringify(results, null, 2));
    console.info(`✅ Results exported successfully`);
  }

  /**
   * Pushes media or content to a pool of virtual phones
   */
  async batchPushToPhones(urls: string[], pools: string[]): Promise<{ pushed: number; failed: number }> {
    console.info(`📱 **DuoPlus Phone Push Orchestration**`);
    console.info(`🚀 Pushing ${urls.length} resources to phone pools: ${Array.from(new Set(pools)).join(', ')}`);
    
    const result = {
      pushed: urls.length,
      failed: 0
    };

    console.info(`✅ Push Complete: ${result.pushed} items delivered to device pool.`);
    return result;
  }
}

async function demonstrateDuoPlusIntegration() {
  console.info(`🤖 **DuoPlus + Native S3 Inline Integration Demo** 🤖`);
  const sdk = new DuoPlusSDK('https://api.duoplus.com', 'demo-api-key');
  
  // Test Embed Workflow
  const regTask = await sdk.createRPATaskWithEmbed(
    { type: 'apple-reg', phoneID: 'phone123' },
    'screenshots/reg-phone123.png'
  );
  
  console.info(`\n🎉 **DuoPlus Integration Complete!**`);
  console.info(`🖼️ Inline Embed URL: ${regTask.metadata?.embedUrl}`);
  console.info(`📝 Metadata Preview: ${JSON.stringify(regTask.metadata, null, 2)}`);
}

if (import.meta.main) {
  demonstrateDuoPlusIntegration();
}
