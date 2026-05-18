// src/api/workers/ai-generation-worker.ts
// Bun Worker for parallel AI generation (Phase 3)

interface AIGenerationRequest {
  title: string;
  scope: string;
  type: string;
  context?: Record<string, any>;
}

interface GeneratedContent {
  header: string;
  grepable: string;
  config: string;
  metadata: {
    hash: string;
    timestamp: string;
  };
}

interface WorkerMessage {
  type: 'generate';
  requests: AIGenerationRequest[];
  batchId: number;
}

// Worker receives messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, requests, batchId } = event.data;

  if (type === 'generate') {
    try {
      // Import the service dynamically in the worker
      const { aiRegistryService } = await import('../services/ai-registry-service');
      
      // Process requests in parallel within the worker
      const results = await Promise.all(
        requests.map(req => aiRegistryService.generate(req))
      );

      // Send results back to main thread
      self.postMessage({
        batchId,
        results,
        success: true
      });
    } catch (error) {
      // Send error back to main thread
      self.postMessage({
        batchId,
        error: error.message,
        success: false
      });
    }
  }
};

// Handle errors
self.onerror = (error) => {
  console.error('Worker error:', error);
};

