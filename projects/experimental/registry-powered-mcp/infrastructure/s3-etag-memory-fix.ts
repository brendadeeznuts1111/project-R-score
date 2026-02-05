// infrastructure/s3-etag-memory-fix.ts
import { feature } from "bun:bundle";

// Fixes ETag parsing leak; unbounded growth prevented
export class S3ETagMemoryFix {
  private static etagsProcessed = 0;

  // Zero-cost when S3_ETAG_FIX is disabled
  static parseListObjectsResponse(response: any): any[] {
    if (!feature("S3_ETAG_FIX")) {
      // Legacy: memory leak on repeated calls
      return response.Contents || [];
    }

    // Component #81: Proper ETag string interning and cleanup
    const contents = response.Contents || [];

    for (const obj of contents) {
      if (obj.ETag) {
        // Intern ETag string to prevent duplicate allocations
        obj.ETag = this.internETag(obj.ETag);

        // Log processing (Component #11 audit)
        this.etagsProcessed++;
        if (this.etagsProcessed % 1000 === 0) {
          this.logETagProcessing(this.etagsProcessed);
        }
      }
    }

    return contents;
  }

  private static internETag(etag: string): string {
    // Use global ETag cache to deduplicate
    if (!globalThis.__bun_s3_etag_cache) {
      globalThis.__bun_s3_etag_cache = new Map<string, string>();
    }

    const cache = globalThis.__bun_s3_etag_cache;

    if (!cache.has(etag)) {
      cache.set(etag, etag);

      // LRU cleanup: keep only last 1000 ETags
      if (cache.size > 1000) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
    }

    return cache.get(etag)!;
  }

  // Wrapper for S3Client.listObjects
  static async listObjectsWithFix(
    client: any,
    params: any
  ): Promise<{ contents: any[]; nextToken?: string }> {
    if (!feature("S3_ETAG_FIX")) {
      return client.listObjects(params);
    }

    const response = await client.listObjects(params);
    const contents = this.parseListObjectsResponse(response);

    // Component #12: Monitor for excessive memory usage
    this.monitorMemoryFootprint(contents.length);

    return {
      contents,
      nextToken: response.NextContinuationToken
    };
  }

  private static monitorMemoryFootprint(itemCount: number): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    if (itemCount > 10000) {
      fetch("https://api.buncatalog.com/v1/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component: 81,
          action: "large_s3_listing",
          itemCount,
          severity: "low",
          timestamp: Date.now()
        })
      }).catch(() => {});
    }
  }

  private static logETagProcessing(count: number): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 81,
        action: "etags_processed",
        count,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { parseListObjectsResponse, listObjectsWithFix } = feature("S3_ETAG_FIX")
  ? S3ETagMemoryFix
  : {
      parseListObjectsResponse: (r: any) => r.Contents || [],
      listObjectsWithFix: (c: any, p: any) => c.listObjects(p)
    };