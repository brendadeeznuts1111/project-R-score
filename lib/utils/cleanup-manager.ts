// lib/utils/cleanup-manager.ts — Cleanup manager for circular references and GC roots

type CleanupFn = () => void;

export class CleanupManager {
  private cleanups: Set<CleanupFn> = new Set();
  private isCleaned = false;

  register(cleanup: CleanupFn): () => void {
    if (this.isCleaned) {
      cleanup();
      return () => {};
    }

    this.cleanups.add(cleanup);

    // Return unregister function
    return () => {
      this.cleanups.delete(cleanup);
    };
  }

  cleanup(): void {
    if (this.isCleaned) return;

    for (const cleanup of this.cleanups) {
      try {
        cleanup();
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    this.cleanups.clear();
    this.isCleaned = true;
  }

  get size(): number {
    return this.cleanups.size;
  }
}

// Global cleanup manager instance
export const globalCleanupManager = new CleanupManager();

// Auto-cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    globalCleanupManager.cleanup();
  });

  process.on('SIGINT', () => {
    globalCleanupManager.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    globalCleanupManager.cleanup();
    process.exit(0);
  });
}
