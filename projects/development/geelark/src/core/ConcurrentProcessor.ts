/**
 * Concurrent Processing Utilities for Runtime Optimization
 * Provides worker pool pattern and batch processing for collections
 */

export interface ProcessOptions {
  concurrency?: number;
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface ProcessingResult<T, R> {
  results: R[];
  errors: Array<{ item: T; error: Error }>;
  processed: number;
  failed: number;
  duration: number;
}

/**
 * Simple worker pool implementation for concurrent processing
 */
export class WorkerPool<T, R> {
  private queue: Array<{ item: T; resolve: (result: R) => void; reject: (error: Error) => void }> = [];
  private workers: Array<Promise<void>> = [];
  private processing = false;

  constructor(
    private processor: (item: T) => Promise<R>,
    private concurrency: number = 5
  ) {}

  /**
   * Process items with limited concurrency
   */
  async process(items: T[]): Promise<R[]> {
    return new Promise((resolve, reject) => {
      const results: R[] = [];
      let completed = 0;
      let hasError = false;

      const processItem = async (item: T, index: number) => {
        try {
          const result = await this.processor(item);
          if (!hasError) {
            results[index] = result;
            completed++;

            if (completed === items.length) {
              resolve(results.filter(Boolean));
            }
          }
        } catch (error) {
          if (!hasError) {
            hasError = true;
            reject(error as Error);
          }
        }
      };

      // Start processing with concurrency limit
      const startIndex = Math.min(this.concurrency, items.length);
      for (let i = 0; i < startIndex; i++) {
        processItem(items[i], i);
      }

      // Process remaining items as workers become available
      for (let i = startIndex; i < items.length; i++) {
        this.queue.push({ item: items[i], resolve: () => {}, reject: () => {} });
      }
    });
  }
}

/**
 * Process collections concurrently with error handling and retry logic
 */
export async function processConcurrently<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: ProcessOptions = {}
): Promise<ProcessingResult<T, R>> {
  const {
    concurrency = 5,
    batchSize = 10,
    retryAttempts = 3,
    retryDelay = 1000,
    timeout = 30000
  } = options;

  const startTime = Date.now();
  const results: R[] = [];
  const errors: Array<{ item: T; error: Error }> = [];
  let processed = 0;
  let failed = 0;

  // Process items in batches with concurrency control
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length));

    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = i + batchIndex;
      let lastError: Error | null = null;

      // Retry logic
      for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        try {
          // Add timeout to prevent hanging
          const result = await Promise.race([
            processor(item),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Processing timeout')), timeout)
            )
          ]);

          results[globalIndex] = result;
          processed++;
          return;
        } catch (error) {
          lastError = error as Error;
          if (attempt < retryAttempts) {
            // Exponential backoff
            await new Promise(resolve =>
              setTimeout(resolve, retryDelay * Math.pow(2, attempt))
            );
          }
        }
      }

      // All attempts failed
      errors.push({ item, error: lastError! });
      failed++;
    });

    // Wait for batch to complete with concurrency limit
    const concurrentBatches = [];
    for (let j = 0; j < batchPromises.length; j += concurrency) {
      const concurrentBatch = batchPromises.slice(j, Math.min(j + concurrency, batchPromises.length));
      concurrentBatches.push(Promise.allSettled(concurrentBatch));
    }

    await Promise.all(concurrentBatches);
  }

  return {
    results: results.filter(Boolean),
    errors,
    processed,
    failed,
    duration: Date.now() - startTime
  };
}

/**
 * Map-reduce style processing for large collections
 */
export async function mapReduceConcurrently<T, I, R>(
  items: T[],
  mapper: (item: T) => Promise<I>,
  reducer: (intermediate: I[]) => Promise<R>,
  options: ProcessOptions = {}
): Promise<R> {
  const { concurrency = 5, batchSize = 20 } = options;

  // Map phase - process items concurrently
  const mappedResults = await processConcurrently(
    items,
    mapper,
    { ...options, concurrency, batchSize }
  );

  // Reduce phase - combine results
  return await reducer(mappedResults.results);
}

/**
 * Filter collections concurrently
 */
export async function filterConcurrently<T>(
  items: T[],
  predicate: (item: T) => Promise<boolean>,
  options: ProcessOptions = {}
): Promise<T[]> {
  const { concurrency = 10 } = options;

  const results = await processConcurrently(
    items,
    async (item) => {
      const passes = await predicate(item);
      return passes ? item : null;
    },
    options
  );

  return results.results.filter(Boolean) as T[];
}

/**
 * Find first matching item concurrently
 */
export async function findConcurrently<T>(
  items: T[],
  predicate: (item: T) => Promise<boolean>,
  options: ProcessOptions = {}
): Promise<T | null> {
  const { concurrency = Math.min(10, items.length) } = options;

  // Process items in batches until we find a match
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, Math.min(i + concurrency, items.length));

    const batchPromises = batch.map(async (item) => {
      const passes = await predicate(item);
      return passes ? item : null;
    });

    const batchResults = await Promise.all(batchPromises);
    const found = batchResults.find(result => result !== null);

    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Process items with progress tracking
 */
export async function processWithProgress<T, R>(
  items: T[],
  processor: (item: T, progress: (current: number, total: number) => void) => Promise<R>,
  options: ProcessOptions = {}
): Promise<ProcessingResult<T, R>> {
  let completed = 0;
  const total = items.length;

  const wrappedProcessor = async (item: T): Promise<R> => {
    const result = await processor(item, (current, totalItems) => {
      const progress = Math.round((current / totalItems) * 100);
      if (current % Math.max(1, Math.floor(totalItems / 20)) === 0) { // Log every 5%
        console.log(`📊 Progress: ${progress}% (${current}/${totalItems})`);
      }
    });
    completed++;
    return result;
  };

  const results = await processConcurrently(items, wrappedProcessor, options);

  console.log(`✅ Processing complete: ${results.processed}/${total} items processed`);
  return results;
}

// Export commonly used configurations
export const CONCURRENT_CONFIGS = {
  IO_BOUND: { concurrency: 20, batchSize: 50, retryAttempts: 5, timeout: 60000 },
  CPU_BOUND: { concurrency: 4, batchSize: 10, retryAttempts: 2, timeout: 30000 },
  NETWORK: { concurrency: 10, batchSize: 25, retryAttempts: 3, timeout: 45000 },
  FAST: { concurrency: 50, batchSize: 100, retryAttempts: 1, timeout: 10000 }
} as const;
