/**
 * Virtual Documentation Link System
 * Demonstrates advanced Bun.file virtual file management
 */

import { TemplateDocumentationScanner } from '../../packages/docs-tools/src/template-scanner';

/**
 * Virtual File Manager
 * Creates and manages virtual documentation links
 */
export class VirtualFileManager {
  private virtualFiles = new Map<string, any>();
  private exportCache = new Map<string, boolean>();

  /**
   * Create a virtual export file that may not exist yet
   * This is the revolutionary pattern you highlighted!
   */
  async createVirtualExport(
    filename: string,
    results: any[],
    format: 'json' | 'markdown' | 'csv' = 'json'
  ): Promise<void> {
    console.info(`🌐 Creating virtual export: ${filename}`);

    // Create the virtual file with MIME type
    const exportFile = (Bun as any).file(filename, {
      type: format === 'json' ? 'application/json' : 'text/plain',
    });

    // Check cache first to avoid redundant work
    const cacheKey = `${filename}:${format}`;
    if (this.exportCache.has(cacheKey)) {
      console.info(`📋 Using cached virtual export for ${filename}`);
      return;
    }

    // Generate content only if file doesn't exist or cache is empty
    if (!(await exportFile.exists())) {
      console.info(`🔨 Generating ${format} content for virtual file: ${filename}`);

      let content: string;
      switch (format) {
        case 'json':
          content = JSON.stringify(
            {
              generated: new Date().toISOString(),
              totalResults: results.length,
              results: results,
            },
            null,
            2
          );
          break;
        case 'markdown':
          content = this.generateMarkdownContent(results);
          break;
        case 'csv':
          content = this.generateCSVContent(results);
          break;
      }

      // Write the content to the virtual file
      await Bun.write(exportFile, new TextEncoder().encode(content));
      this.exportCache.set(cacheKey, true);

      console.info(`✅ Virtual file created: ${filename}`);
    } else {
      console.info(`📄 File already exists: ${filename}`);
    }
  }

  /**
   * Batch create multiple virtual exports
   */
  async createBatchExports(baseName: string, results: any[]): Promise<void> {
    console.info(`📦 Creating batch virtual exports for: ${baseName}`);

    const formats = ['json', 'markdown', 'csv'] as const;
    const timestamp = Date.now();

    for (const format of formats) {
      const filename = `${baseName}-${timestamp}.${format}`;
      await this.createVirtualExport(filename, results, format);
    }
  }

  /**
   * Generate markdown content
   */
  private generateMarkdownContent(results: any[]): string {
    let markdown = `# Documentation Search Results\n\n`;
    markdown += `> Generated on ${new Date().toISOString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Results**: ${results.length}\n`;
    markdown += `- **Export Format**: Markdown\n\n`;
    markdown += `## Results\n\n`;

    for (let i = 0; i < Math.min(results.length, 10); i++) {
      const result = results[i];
      markdown += `### ${i + 1}. ${result.title || 'Untitled'}\n\n`;
      markdown += `${result.description || 'No description'}\n\n`;
    }

    if (results.length > 10) {
      markdown += `*... and ${results.length - 10} more results*\n\n`;
    }

    return markdown;
  }

  /**
   * Generate CSV content
   */
  private generateCSVContent(results: any[]): string {
    let csv = 'Title,Description,URL,Timestamp\n';

    for (const result of results) {
      const title = (result.title || '').replace(/"/g, '""');
      const description = (result.description || '').replace(/"/g, '""');
      const url = result.url || '';
      const timestamp = result.timestamp || new Date().toISOString();

      csv += `"${title}","${description}","${url}","${timestamp}"\n`;
    }

    return csv;
  }

  /**
   * Check virtual file status
   */
  async checkVirtualFileStatus(filename: string): Promise<{
    exists: boolean;
    size?: number;
    type?: string;
    lastModified?: Date;
  }> {
    const virtualFile = (Bun as any).file(filename);

    if (await virtualFile.exists()) {
      const stats = await virtualFile.stat();
      return {
        exists: true,
        size: stats.size,
        type: stats.type,
        lastModified: new Date(stats.mtimeMs),
      };
    }

    return { exists: false };
  }

  /**
   * List all virtual files in current directory
   */
  async listVirtualFiles(pattern: string = '*'): Promise<string[]> {
    try {
      const files = await (Bun as any).glob(pattern);
      return files.filter((file: string) => this.exportCache.has(file) || file.includes('-'));
    } catch {
      return [];
    }
  }

  /**
   * Clean up virtual files
   */
  async cleanupVirtualFiles(olderThanHours: number = 24): Promise<number> {
    console.info(`🧹 Cleaning up virtual files older than ${olderThanHours} hours`);

    const files = await this.listVirtualFiles('*');
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const file of files) {
      try {
        const stats = await (Bun as any).file(file).stat();
        if (stats.mtimeMs < cutoffTime) {
          await (Bun as any).file(file).delete();
          this.exportCache.delete(file);
          cleaned++;
        }
      } catch {
        // Skip files that can't be accessed
      }
    }

    console.info(`✅ Cleaned up ${cleaned} virtual files`);
    return cleaned;
  }

  /**
   * Create conditional virtual exports
   */
  async createConditionalExports(
    conditions: {
      filename: string;
      results: any[];
      format: 'json' | 'markdown' | 'csv';
      condition: () => boolean;
    }[]
  ): Promise<void> {
    console.info(`🎯 Creating conditional virtual exports`);

    for (const { filename, results, format, condition } of conditions) {
      if (condition()) {
        await this.createVirtualExport(filename, results, format);
        console.info(`✅ Condition met: ${filename}`);
      } else {
        console.info(`⏭️ Condition not met: ${filename}`);
      }
    }
  }
}

/**
 * Demonstration of Virtual Documentation Link System
 */
export async function demonstrateVirtualFilesystem() {
  console.info('🌐 Virtual Documentation Link System Demo');
  console.info('='.repeat(60));

  const virtualManager = new VirtualFileManager();

  // Sample results for demonstration
  const sampleResults = [
    {
      title: 'Bun.spawn Documentation',
      description: 'Advanced process management',
      url: 'https://bun.sh/docs',
    },
    {
      title: 'ReadableStream API',
      description: 'Web Standards streaming',
      url: 'https://bun.sh/docs',
    },
    {
      title: 'Network Performance',
      description: 'High-speed networking',
      url: 'https://bun.sh/docs',
    },
  ];

  // Demo 1: Basic virtual export creation
  console.info('\n1️⃣ Basic Virtual Export Creation');
  console.info('-'.repeat(40));

  await virtualManager.createVirtualExport('search-results.json', sampleResults, 'json');
  await virtualManager.createVirtualExport('search-results.md', sampleResults, 'markdown');
  await virtualManager.createVirtualExport('search-results.csv', sampleResults, 'csv');

  // Demo 2: Check virtual file status
  console.info('\n2️⃣ Virtual File Status Check');
  console.info('-'.repeat(40));

  const jsonStatus = await virtualManager.checkVirtualFileStatus('search-results.json');
  console.info(`📄 search-results.json: ${jsonStatus.exists ? '✅ Exists' : '❌ Not found'}`);
  if (jsonStatus.exists) {
    console.info(`   Size: ${jsonStatus.size} bytes`);
    console.info(`   Modified: ${jsonStatus.lastModified?.toISOString()}`);
  }

  // Demo 3: Batch export creation
  console.info('\n3️⃣ Batch Virtual Export Creation');
  console.info('-'.repeat(40));

  await virtualManager.createBatchExports('batch-export', sampleResults);

  // Demo 4: Conditional exports
  console.info('\n4️⃣ Conditional Virtual Exports');
  console.info('-'.repeat(40));

  await virtualManager.createConditionalExports([
    {
      filename: 'conditional-large.json',
      results: sampleResults,
      format: 'json',
      condition: () => sampleResults.length > 2,
    },
    {
      filename: 'conditional-small.json',
      results: sampleResults,
      format: 'json',
      condition: () => sampleResults.length < 5,
    },
  ]);

  // Demo 5: List virtual files
  console.info('\n5️⃣ List Virtual Files');
  console.info('-'.repeat(40));

  const virtualFiles = await virtualManager.listVirtualFiles('*');
  console.info(`📁 Found ${virtualFiles.length} virtual files:`);
  virtualFiles.slice(0, 5).forEach(file => console.info(`   📄 ${file}`));

  // Demo 6: Show the revolutionary pattern in action
  console.info('\n6️⃣ Revolutionary Pattern Demonstration');
  console.info('-'.repeat(40));

  console.info('🎯 The pattern you highlighted:');
  console.info(`
const exportFile = Bun.file("search-results.json", { type: "application/json" });

if (!(await exportFile.exists())) {
  // Generate the results only if the file doesn't exist
  await Bun.write(exportFile, JSON.stringify(results));
}
  `);

  console.info('💡 Revolutionary benefits:');
  console.info('   - Virtual files can be created before they exist');
  console.info('   - Conditional generation prevents redundant work');
  console.info('   - MIME type handling is built-in');
  console.info('   - Perfect for caching and export systems');

  console.info('\n🎉 Virtual Documentation Link System Status: REVOLUTIONARY');
}

// Run demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateVirtualFilesystem().catch(console.error);
}
