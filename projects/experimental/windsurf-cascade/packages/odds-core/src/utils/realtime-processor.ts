// packages/odds-core/src/utils/realtime-processor.ts - Real-time metadata processing

import { EventEmitter } from 'events';
import { 
  RealtimeMetadata, 
  RealtimeMarketUpdate, 
  ProcessingStep,
  RealtimeMetrics,
  RealtimeEvent
} from '../types/realtime';
import { DataCategory } from '../types/topics';
import { 
  QualityAssessorFactory 
} from './lazy-quality';
import { 
  TopicServiceFactory 
} from './topic-services';
import { 
  MetadataBuilder 
} from './metadata';

/**
 * Real-time metadata processor
 */
export class RealtimeMetadataProcessor extends EventEmitter {
  private processingQueue: ProcessingQueue;
  private metrics: RealtimeMetrics;
  private isProcessing = false;
  private batchSize = 100;
  private processingInterval = 10; // ms
  private processingTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.processingQueue = new ProcessingQueue();
    this.metrics = {
      processingLatency: 0,
      queueDepth: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  /**
   * Start the processor
   */
  async start(): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Processor is already running');
    }

    this.isProcessing = true;
    this.startProcessingLoop();
    this.startMetricsCollection();
    
    this.emit('processorStarted', { timestamp: Date.now() });
    console.log('🚀 Real-time metadata processor started');
  }

  /**
   * Stop the processor
   */
  async stop(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    this.emit('processorStopped', { timestamp: Date.now() });
    console.log('🛑 Real-time metadata processor stopped');
  }

  /**
   * Process a single market update
   */
  async processUpdate(update: RealtimeMarketUpdate): Promise<RealtimeMetadata> {
    const startTime = performance.now();
    
    try {
      // Add to processing queue
      const task = new ProcessingTask(update);
      this.processingQueue.enqueue(task);
      
      // Process immediately if queue is small
      if (this.processingQueue.size() < 10) {
        return await this.processTask(task);
      }

      // Return promise that resolves when task is processed
      return new Promise((resolve, reject) => {
        task.onComplete = resolve;
        task.onError = reject;
      });

    } catch (error) {
      this.metrics.errorRate++;
      this.emit('processingError', { update, error });
      throw error;
    }
  }

  /**
   * Process batch of updates
   */
  async processBatch(updates: RealtimeMarketUpdate[]): Promise<RealtimeMetadata[]> {
    const startTime = performance.now();
    
    try {
      const tasks = updates.map(update => new ProcessingTask(update));
      tasks.forEach(task => this.processingQueue.enqueue(task));
      
      // Process batch
      const results = await Promise.all(
        tasks.map(task => this.processTask(task))
      );

      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime, updates.length);

      this.emit('batchProcessed', { 
        count: updates.length, 
        processingTime,
        results 
      });

      return results;

    } catch (error) {
      this.metrics.errorRate++;
      this.emit('batchProcessingError', { updates, error });
      throw error;
    }
  }

  /**
   * Get processing metrics
   */
  getMetrics(): RealtimeMetrics {
    this.metrics.queueDepth = this.processingQueue.size();
    return { ...this.metrics };
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): ProcessingStats {
    return {
      totalProcessed: this.processingQueue.getTotalProcessed(),
      queueDepth: this.processingQueue.size(),
      averageLatency: this.metrics.processingLatency,
      throughput: this.metrics.throughput,
      errorRate: this.metrics.errorRate,
      uptime: this.isProcessing ? Date.now() - (this as any).startTime : 0
    };
  }

  /**
   * Start processing loop
   */
  private startProcessingLoop(): void {
    this.processingTimer = setInterval(async () => {
      if (!this.isProcessing || this.processingQueue.isEmpty()) {
        return;
      }

      try {
        const batchSize = Math.min(this.batchSize, this.processingQueue.size());
        const tasks: ProcessingTask[] = [];

        // Dequeue batch
        for (let i = 0; i < batchSize; i++) {
          const task = this.processingQueue.dequeue();
          if (task) {
            tasks.push(task);
          }
        }

        if (tasks.length > 0) {
          await this.processBatchTasks(tasks);
        }

      } catch (error) {
        console.error('❌ Processing loop error:', error);
        this.emit('processingLoopError', error);
      }
    }, this.processingInterval);
  }

  /**
   * Process batch of tasks
   */
  private async processBatchTasks(tasks: ProcessingTask[]): Promise<void> {
    const startTime = performance.now();

    try {
      // Process tasks in parallel
      const promises = tasks.map(task => this.processTask(task));
      const results = await Promise.allSettled(promises);

      // Handle results
      results.forEach((result, index) => {
        const task = tasks[index];
        if (result.status === 'fulfilled') {
          if (task.onComplete) {
            task.onComplete(result.value);
          }
        } else {
          if (task.onError) {
            task.onError(result.reason);
          }
          this.metrics.errorRate++;
        }
      });

      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime, tasks.length);

    } catch (error) {
      console.error('❌ Batch processing error:', error);
      throw error;
    }
  }

  /**
   * Process individual task
   */
  private async processTask(task: ProcessingTask): Promise<RealtimeMetadata> {
    const startTime = performance.now();
    
    try {
      // Create processing pipeline
      const pipeline = new ProcessingPipeline();
      
      // Execute pipeline
      const metadata = await pipeline.execute(task.update);
      
      const processingTime = performance.now() - startTime;
      task.processingTime = processingTime;
      task.completed = true;

      this.emit('taskProcessed', { task, metadata, processingTime });
      return metadata;

    } catch (error) {
      task.error = error as Error;
      task.failed = true;
      throw error;
    }
  }

  /**
   * Update processing metrics
   */
  private updateMetrics(processingTime: number, taskCount: number): void {
    // Update latency (exponential moving average)
    this.metrics.processingLatency = 
      this.metrics.processingLatency * 0.9 + processingTime * 0.1;

    // Update throughput
    this.metrics.throughput = 
      this.metrics.throughput * 0.9 + (taskCount / processingTime * 1000) * 0.1;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 1000);
  }

  /**
   * Collect system metrics
   */
  private collectMetrics(): void {
    // Simulate metric collection
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    this.metrics.cpuUsage = Math.random() * 100; // Simulated
  }
}

/**
 * Processing pipeline for metadata
 */
class ProcessingPipeline {
  private steps: ProcessingStep[] = [];

  constructor() {
    this.initializeSteps();
  }

  /**
   * Execute processing pipeline
   */
  async execute(update: RealtimeMarketUpdate): Promise<RealtimeMetadata> {
    let metadata: RealtimeMetadata | null = null;

    for (const step of this.steps) {
      try {
        step.status = 'processing';
        step.startTime = performance.now();

        if (step.name === 'validation') {
          await this.validateUpdate(update);
        } else if (step.name === 'metadata_creation') {
          metadata = await this.createMetadata(update);
        } else if (step.name === 'quality_assessment') {
          if (metadata) {
            metadata = await this.assessQuality(metadata);
          }
        } else if (step.name === 'topic_analysis') {
          if (metadata) {
            metadata = await this.analyzeTopics(metadata);
          }
        } else if (step.name === 'enrichment') {
          if (metadata) {
            metadata = await this.enrichMetadata(metadata);
          }
        }

        step.endTime = performance.now();
        step.latency = step.endTime - step.startTime;
        step.status = 'completed';

      } catch (error) {
        step.status = 'failed';
        step.error = (error as Error).message;
        throw error;
      }
    }

    if (!metadata) {
      throw new Error('Pipeline failed to produce metadata');
    }

    return metadata;
  }

  /**
   * Initialize processing steps
   */
  private initializeSteps(): void {
    this.steps = [
      { id: '1', name: 'validation', status: 'pending', startTime: 0 },
      { id: '2', name: 'metadata_creation', status: 'pending', startTime: 0 },
      { id: '3', name: 'quality_assessment', status: 'pending', startTime: 0 },
      { id: '4', name: 'topic_analysis', status: 'pending', startTime: 0 },
      { id: '5', name: 'enrichment', status: 'pending', startTime: 0 }
    ];
  }

  /**
   * Validate market update
   */
  private async validateUpdate(update: RealtimeMarketUpdate): Promise<void> {
    if (!update.symbol || typeof update.symbol !== 'string') {
      throw new Error('Invalid symbol');
    }

    if (!update.price || typeof update.price !== 'number' || update.price <= 0) {
      throw new Error('Invalid price');
    }

    if (!update.timestamp || typeof update.timestamp !== 'number') {
      throw new Error('Invalid timestamp');
    }

    // Check for stale data
    const age = Date.now() - update.timestamp;
    if (age > 60000) { // 1 minute
      throw new Error('Data is too old');
    }
  }

  /**
   * Create metadata from update
   */
  private async createMetadata(update: RealtimeMarketUpdate): Promise<RealtimeMetadata> {
    const builder = new MetadataBuilder(`realtime_${update.symbol}_${Date.now()}`)
      .setSource({ provider: update.source, reliability: 0.9 });

    const baseMetadata = builder.build();
    
    return {
      ...baseMetadata,
      realtime: {
        lastUpdated: update.timestamp,
        updateFrequency: 0, // Will be calculated
        dataFreshness: this.calculateFreshness(update.timestamp),
        streamId: this.generateStreamId(update.symbol),
        timestamp: Date.now()
      },
      stream: {
        source: update.source,
        latency: 0, // Will be calculated
        isLive: true,
        quality: {
          bandwidth: 1000,
          packetLoss: 0,
          jitter: 0,
          reliability: 0.95,
          status: 'excellent'
        }
      }
    };
  }

  /**
   * Assess quality of metadata
   */
  private async assessQuality(metadata: RealtimeMetadata): Promise<RealtimeMetadata> {
    const quickAssessor = QualityAssessorFactory.getQuickAssessor();
    
    // Create market data for quality assessment
    const marketData = {
      symbol: metadata.id.replace('realtime_', '').split('_')[0],
      price: 0, // Would be extracted from original update
      volume: 0,
      exchange: metadata.stream.source
    };

    const qualityScore = quickAssessor.assessQuick(marketData);
    
    // Update metadata with quality information
    if (metadata.quality) {
      metadata.quality.overall = qualityScore;
    }

    return metadata;
  }

  /**
   * Analyze topics for metadata
   */
  private async analyzeTopics(metadata: RealtimeMetadata): Promise<RealtimeMetadata> {
    const analyzer = TopicServiceFactory.getAnalysisService();
    
    // Extract symbol from metadata ID
    const symbol = metadata.id.replace('realtime_', '').split('_')[0];
    
    const analysis = analyzer.analyzeTopics({
      symbol,
      exchange: metadata.stream.source,
      assetClass: 'unknown'
    });

    // Update metadata with topic analysis
    metadata.topics = [analysis.primaryTopic];

    return metadata;
  }

  /**
   * Enrich metadata with additional information
   */
  private async enrichMetadata(metadata: RealtimeMetadata): Promise<RealtimeMetadata> {
    // Add additional enrichment logic here
    // For example: market sentiment, related assets, etc.
    
    return metadata;
  }

  /**
   * Calculate data freshness
   */
  private calculateFreshness(timestamp: number): number {
    const age = Date.now() - timestamp;
    return Math.max(0, 1 - (age / 30000)); // Fresh over 30 seconds
  }

  /**
   * Generate stream ID
   */
  private generateStreamId(symbol: string): string {
    return `stream_${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Processing queue for managing tasks
 */
class ProcessingQueue {
  private queue: ProcessingTask[] = [];
  private totalProcessed = 0;

  enqueue(task: ProcessingTask): void {
    this.queue.push(task);
  }

  dequeue(): ProcessingTask | null {
    return this.queue.shift() || null;
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  getTotalProcessed(): number {
    return this.totalProcessed;
  }

  incrementProcessed(): void {
    this.totalProcessed++;
  }
}

/**
 * Processing task
 */
class ProcessingTask {
  public onComplete?: (metadata: RealtimeMetadata) => void;
  public onError?: (error: Error) => void;
  public processingTime = 0;
  public completed = false;
  public failed = false;
  public error?: Error;

  constructor(public update: RealtimeMarketUpdate) {}
}

/**
 * Processing statistics
 */
interface ProcessingStats {
  totalProcessed: number;
  queueDepth: number;
  averageLatency: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}
