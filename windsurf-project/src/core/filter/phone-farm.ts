import { Readable } from 'stream';

interface FarmOptions {
  stream: Readable;
  worker: (phone: string) => Promise<any>;
  concurrency?: number;
  filter?: (result: any) => boolean;
  chunkSize?: number;
}

/**
 * High-throughput parallel phone processing farm.
 */
export class PhoneFarm {
  private results: any[] = [];
  private processed = 0;
  
  constructor() {}
  
  async exec(options: FarmOptions): Promise<any[]> {
    const {
      stream,
      worker,
      concurrency = 10,
      filter,
      chunkSize = 100
    } = options;
    
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      let activeChunks = 0;
      let streamEnded = false;

      const processNextChunk = async () => {
        if (chunks.length === 0) {
           if (streamEnded && activeChunks === 0) resolve(this.results);
           return;
        }
        
        activeChunks++;
        const currentChunk = chunks.splice(0, chunkSize);
        await this.processChunk(currentChunk, worker, filter, concurrency);
        activeChunks--;
        
        if (streamEnded && chunks.length === 0 && activeChunks === 0) {
          resolve(this.results);
        } else {
          processNextChunk();
        }
      };
      
      stream.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        chunks.push(...lines);
        
        if (chunks.length >= chunkSize && activeChunks < concurrency) {
          processNextChunk();
        }
      });
      
      stream.on('end', () => {
        streamEnded = true;
        if (activeChunks === 0) processNextChunk();
      });
      
      stream.on('error', reject);
    });
  }
  
  private async processChunk(
    phones: string[],
    worker: (phone: string) => Promise<any>,
    filter?: (result: any) => boolean,
    concurrency: number = 10
  ): Promise<void> {
    const workerPromises = [];
    for (let i = 0; i < Math.min(concurrency, phones.length); i++) {
      workerPromises.push(this.createWorker(phones, worker, filter, i, concurrency));
    }
    await Promise.all(workerPromises);
  }
  
  private async createWorker(
    phones: string[],
    worker: (phone: string) => Promise<any>,
    filter: ((result: any) => boolean) | undefined,
    workerId: number,
    concurrency: number
  ): Promise<void> {
    for (let i = workerId; i < phones.length; i += concurrency) {
      try {
        const phone = phones[i]?.trim();
        if (!phone) continue;
        const result = await worker(phone);
        if (!filter || filter(result)) {
          this.results.push(result);
        }
        this.processed++;
      } catch (error) {
        console.error(`Worker ${workerId} failed on phone ${phones[i]}:`, error);
      }
    }
  }
  
  get throughput(): number {
    return this.processed;
  }
}
