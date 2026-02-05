import config from '../src/config/config-loader';
// utils/urlpattern-content-disposition.ts - Pattern-based content-disposition
import { R2ContentManager } from '../src/storage/r2-content-manager.ts';
import { classifyPath } from './urlpattern-r2.ts';

// Pattern-specific content-disposition rules
const PATTERN_DISPOSITION_RULES: Record<string, (params: Record<string, string>) => {
  type: 'inline' | 'attachment';
  filename?: string;
  contentType?: string;
}> = {
  'PATTERN_1_APPLE_IDS': (params) => ({
    type: 'attachment',
    filename: `apple-id-${params.userId}.${params.ext}`,
    contentType: 'application/json'
  }),
  
  'PATTERN_2_REPORTS': (params) => ({
    type: params.type === 'confidential' ? 'attachment' : 'inline',
    filename: `report-${params.type}-${params.date}.${params.ext}`,
    contentType: params.ext === 'pdf' ? 'application/pdf' : 'application/json'
  }),
  
  'PATTERN_9_SCREENSHOTS': (params) => ({
    type: 'inline',
    filename: `screenshot-${params.taskId}.${params.ext}`,
    contentType: 'image/png'
  }),
  
  'PATTERN_5_SUCCESSES': (params) => ({
    type: 'attachment',
    filename: `success-${params.userId}.${params.ext}`
  }),
  
  'PATTERN_6_FAILURES': (params) => ({
    type: 'attachment',
    filename: `failure-${params.userId}.${params.ext}`
  })
};

// Auto-configure content-disposition based on URL pattern
export function getContentDispositionByPath(path: string): {
  type: 'inline' | 'attachment';
  filename?: string;
  contentType?: string;
} | null {
  const classified = classifyPath(path);
  if (!classified) return null;
  
  const rule = PATTERN_DISPOSITION_RULES[classified.pattern];
  if (!rule) {
    // Default rule for unknown patterns
    const ext = path.split('.').pop();
    return {
      type: ['json', 'txt', 'html', 'pdf'].includes(ext || '') ? 'inline' : 'attachment',
      filename: path.split('/').pop()
    };
  }
  
  return rule(classified.metadata);
}

// Enhanced upload with pattern-aware content-disposition
export async function uploadWithPatternAwareDisposition(
  manager: R2ContentManager,
  data: unknown,
  path: string,
  options: {
    overrideDisposition?: boolean;
    customFilename?: string;
    compression?: boolean;
  } = {}
) {
  const disposition = getContentDispositionByPath(path);
  
  if (!disposition && !options.overrideDisposition) {
    throw new Error(`No content-disposition rule for path: ${path}`);
  }
  
  return manager.uploadWithDisposition(
    data,
    path,
    {
      contentDisposition: {
        type: disposition?.type || 'attachment',
        filename: options.customFilename || disposition?.filename || path.split('/').pop()
      },
      contentType: disposition?.contentType,
      compression: options.compression ? 'zstd' : undefined,
      classify: true
    }
  );
}

// Batch upload with pattern-aware disposition
export async function bulkUploadWithDisposition(
  manager: R2ContentManager,
  items: Array<{ data: unknown; path: string; customFilename?: string }>,
  options: {
    batchSize?: number;
    reportProgress?: boolean;
  } = {}
) {
  const batchSize = options.batchSize || 50;
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    if (options.reportProgress) {
      console.log(`📦 Uploading batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)}`);
    }
    
    const batchResults = await Promise.allSettled(
      batch.map(item => 
        uploadWithPatternAwareDisposition(manager, item.data, item.path, {
          customFilename: item.customFilename
        })
      )
    );
    
    results.push(...batchResults);
  }
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  return {
    total: items.length,
    successful,
    failed,
    results: results.map((r, idx) => ({
      item: items[idx],
      success: r.status === 'fulfilled',
      error: r.status === 'rejected' ? (r.reason as Error).message : undefined,
      result: r.status === 'fulfilled' ? r.value : undefined
    }))
  };
}

// CLI interface
if (import.meta.main) {
  const { config } = await import('dotenv');
  config({ path: './.env' });
  
  const manager = new R2ContentManager(config.getEndpoint('storage').r2.bucket!);
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'upload':
      const path = args[1];
      const data = args[2] || '{}';
      
      const result = await uploadWithPatternAwareDisposition(
        manager,
        JSON.parse(data),
        path
      );
      
      console.log('✅ Upload successful:');
      console.log(`   Path: ${result.path}`);
      console.log(`   Content-Disposition: ${result.contentDisposition}`);
      console.log(`   Pattern: ${result.classification?.pattern}`);
      break;
      
    case 'bulk':
      const count = parseInt(args[1]) || 10;
      const items = Array(count).fill(0).map((_, i) => ({
        data: { id: i, name: `User ${i}` },
        path: `apple-ids/user${i}.json`
      }));
      
      const bulkResult = await bulkUploadWithDisposition(manager, items, {
        reportProgress: true
      });
      
      console.log(`\n📊 Bulk upload results:`);
      console.log(`   Total: ${bulkResult.total}`);
      console.log(`   Successful: ${bulkResult.successful}`);
      console.log(`   Failed: ${bulkResult.failed}`);
      break;
      
    case 'analyze':
      const analyzePath = args[1];
      const disposition = getContentDispositionByPath(analyzePath);
      const classified = classifyPath(analyzePath);
      
      console.log(`🔍 Analysis for: ${analyzePath}`);
      console.log(`   Pattern: ${classified?.pattern || 'none'}`);
      console.log(`   Parameters:`, classified?.metadata || {});
      console.log(`   Content-Disposition:`, disposition);
      break;
      
    default:
      console.log('Commands:');
      console.log('  upload <path> [json]  - Upload with pattern-aware disposition');
      console.log('  bulk [count]          - Bulk upload test');
      console.log('  analyze <path>        - Analyze path for content-disposition');
      break;
  }
}
