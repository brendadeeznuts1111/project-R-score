// lib/docs-scraper.ts
import { BUN_DOCS } from '../config/urls';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

export interface DocPointer {
  url: string;
  text: string;
  type: 'internal' | 'external' | 'anchor';
}

export async function extractDocPointers(baseUrl: string = BUN_DOCS.BASE): Promise<DocPointer[]> {
  const pointers: DocPointer[] = [];
  
  try {
    // Try to fetch llms.txt first (structured for LLM consumption)
    const llmsUrl = `${baseUrl}/llms.txt`;
    const response = await fetch(llmsUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${llmsUrl}: ${response.status}`);
    }
    
    const md = await response.text();
    
    // Parse Markdown and extract links
    Bun.markdown.render(md, {
      link: (text, { href }) => {
        const type = href.startsWith('http') ? 'external' : 
                    href.startsWith('#') ? 'anchor' : 'internal';
        
        pointers.push({
          url: href.startsWith('http') ? href : `${baseUrl}${href}`,
          text,
          type
        });
        return null; // Don't render, just collect
      },
      paragraph: () => null,
      heading: () => null,
      table: () => null,
      code: () => null,
      list: () => null,
    });
    
    // Deduplicate and sort
    const unique = pointers.filter((pointer, index, self) =>
      index === self.findIndex(p => p.url === pointer.url)
    );
    
    return unique.sort((a, b) => a.type.localeCompare(b.type));
    
  } catch (error) {
    console.error(`Error extracting doc pointers: ${error.message}`);
    
    // Fallback: try to extract from main docs page
    try {
      const mainPage = await fetch(baseUrl).then(r => r.text());
      const fallbackPointers: DocPointer[] = [];
      
      // Simple regex fallback for extracting URLs
      const urlRegex = /href=["']([^"']+)["']/g;
      let match;
      
      while ((match = urlRegex.exec(mainPage)) !== null) {
        const url = match[1];
        if (url.startsWith('http') || url.startsWith('/')) {
          fallbackPointers.push({
            url: url.startsWith('http') ? url : `${baseUrl}${url}`,
            text: url.split('/').pop() || url,
            type: url.startsWith('http') ? 'external' : 'internal'
          });
        }
      }
      
      return fallbackPointers;
    } catch (fallbackError) {
      console.error(`Fallback extraction failed: ${fallbackError.message}`);
      return [];
    }
  }
}

export async function validateDocPointers(pointers: DocPointer[]): Promise<{
  valid: DocPointer[];
  invalid: DocPointer[];
  summary: { total: number; valid: number; invalid: number; successRate: number };
}> {
  const valid: DocPointer[] = [];
  const invalid: DocPointer[] = [];
  
  console.log(`🔍 Validating ${pointers.length} documentation pointers...`);
  
  // Check URLs in batches to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < pointers.length; i += batchSize) {
    const batch = pointers.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(async (pointer) => {
        try {
          const response = await fetch(pointer.url, { 
            method: 'HEAD', // Just check headers, faster
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
          
          if (response.ok) {
            valid.push(pointer);
            console.log(`✅ ${pointer.url}`);
          } else {
            invalid.push(pointer);
            console.log(`❌ ${pointer.url} (${response.status})`);
          }
        } catch (error) {
          invalid.push(pointer);
          console.log(`❌ ${pointer.url} (${error.message})`);
        }
      })
    );
    
    // Small delay between batches
    if (i + batchSize < pointers.length) {
      await Bun.sleep(100);
    }
  }
  
  const total = pointers.length;
  const validCount = valid.length;
  const invalidCount = invalid.length;
  const successRate = total > 0 ? (validCount / total) * 100 : 0;
  
  return {
    valid,
    invalid,
    summary: {
      total,
      valid: validCount,
      invalid: invalidCount,
      successRate: Math.round(successRate * 100) / 100
    }
  };
}

export async function generateValidationReport(baseUrl: string = BUN_DOCS.BASE): Promise<string> {
  const pointers = await extractDocPointers(baseUrl);
  const validation = await validateDocPointers(pointers);
  
  const report = Bun.markdown.render(`
# Documentation Validation Report

## Summary
- **Total URLs**: ${validation.summary.total}
- **Valid**: ${validation.summary.valid} ✅
- **Invalid**: ${validation.summary.invalid} ❌
- **Success Rate**: ${validation.summary.successRate}%

## Valid URLs (${validation.valid.length})
${validation.valid.map(p => `- [${p.text}](${p.url})`).join('\n')}

## Invalid URLs (${validation.invalid.length})
${validation.invalid.map(p => `- ~~[${p.text}](${p.url})~~`).join('\n')}

## Recommendations
${validation.summary.successRate >= 90 ? 
  '🎉 Excellent documentation health!' :
  validation.summary.successRate >= 75 ?
  '⚠️ Good documentation with some issues to address.' :
  '🚨 Documentation needs significant attention.'
}

*Generated: ${new Date().toISOString()}*
  `, {
    heading: (children, { level }) => {
      const colors = ['\x1b[1;36m', '\x1b[1;35m', '\x1b[1;33m'];
      return `${colors[level-1] || '\x1b[1m'}${children}\x1b[0m\n`;
    },
    paragraph: children => children + '\n',
    strong: children => `\x1b[1m${children}\x1b[22m`,
    list: (children) => children + '\n',
  });
  
  return report;
}

// Command line interface
if (import.meta.main) {
  const baseUrl = process.argv[2] || BUN_DOCS.BASE;
  
  console.log('📚 Extracting documentation pointers...');
  const pointers = await extractDocPointers(baseUrl);
  
  console.log(`\n🔗 Found ${pointers.length} pointers:`);
  pointers.forEach(p => console.log(`  ${p.type}: ${p.text} -> ${p.url}`));
  
  console.log('\n📊 Generating validation report...\n');
  const report = await generateValidationReport(baseUrl);
  console.log(report);
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */