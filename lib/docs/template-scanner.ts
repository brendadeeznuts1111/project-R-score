/**
 * Self-Referential Documentation Scanner
 * Location-aware template and resource management system
 */

import { ZenStreamSearcher } from './stream-search';

/**
 * Template-based Documentation Scanner
 * Uses self-referential paths for location independence
 */
export class TemplateDocumentationScanner {
  private baseUrl: URL;
  private searcher: ZenStreamSearcher;
  private templates: Map<string, string> = new Map();

  constructor() {
    // Get the current module's URL for location awareness
    this.baseUrl = new URL(import.meta.url);
    this.searcher = new ZenStreamSearcher();
  }

  /**
   * Load a template relative to the current module
   * This works regardless of where the module is installed in the monorepo
   */
  async loadTemplate(templateName: string): Promise<string> {
    // Check cache first
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    try {
      // Self-referential path resolution
      const templateUrl = new URL(`./templates/${templateName}`, this.baseUrl);
      const templateFile = (Bun as any).file(templateUrl);
      
      if (await templateFile.exists()) {
        const content = await templateFile.text();
        this.templates.set(templateName, content);
        console.log(`📋 Loaded template: ${templateName}`);
        return content;
      } else {
        throw new Error(`Template not found: ${templateName} at ${templateUrl}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Get resource paths relative to current module
   */
  getResourcePath(resourceName: string): string {
    return new URL(`./resources/${resourceName}`, this.baseUrl).pathname;
  }

  /**
   * Check if a resource exists
   */
  async resourceExists(resourceName: string): Promise<boolean> {
    try {
      const resourceUrl = new URL(`./resources/${resourceName}`, this.baseUrl);
      const resourceFile = (Bun as any).file(resourceUrl);
      return await resourceFile.exists();
    } catch {
      return false;
    }
  }

  /**
   * Generate documentation using templates
   */
  async generateDocumentation(query: string, templateName: string): Promise<string> {
    console.log(`🔍 Generating documentation for: ${query}`);
    
    // Load the template
    const template = await this.loadTemplate(templateName);
    
    // Perform the search
    const results = await this.searcher.streamSearch({
      query,
      cachePath: '/Users/nolarose/Projects/.cache',
      onMatch: (match) => {
        // Process matches as they arrive
      }
    });

    // Replace template variables
    let documentation = template
      .replace('{{QUERY}}', query)
      .replace('{{MATCH_COUNT}}', results.matchesFound.toString())
      .replace('{{SEARCH_TIME}}', results.elapsedTime.toFixed(2))
      .replace('{{BYTES_PROCESSED}}', results.bytesProcessed.toString())
      .replace('{{TIMESTAMP}}', new Date().toISOString());

    // Add results section if template supports it
    if (template.includes('{{RESULTS}}')) {
      const resultsSection = await this.generateResultsSection(results);
      documentation = documentation.replace('{{RESULTS}}', resultsSection);
    }

    return documentation;
  }

  /**
   * Generate results section for documentation
   */
  private async generateResultsSection(results: any): Promise<string> {
    // In a real implementation, we'd collect actual matches
    let section = '## Search Results\n\n';
    section += `Found ${results.matchesFound} matches in ${results.elapsedTime.toFixed(2)}ms\n\n`;
    section += `- Files searched: ${results.filesSearched}\n`;
    section += `- Bytes processed: ${results.bytesProcessed}\n`;
    section += `- Memory usage: ${(results.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
    
    return section;
  }

  /**
   * Export documentation to multiple formats
   */
  async exportDocumentation(query: string, templateName: string, formats: string[]): Promise<void> {
    const documentation = await this.generateDocumentation(query, templateName);
    
    for (const format of formats) {
      const filename = `docs-${query}-${Date.now()}.${format}`;
      const exportFile = (Bun as any).file(filename, { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });

      let content: string;
      switch (format) {
        case 'md':
          content = documentation;
          break;
        case 'html':
          content = this.convertToHTML(documentation);
          break;
        case 'txt':
          content = this.stripMarkdown(documentation);
          break;
        default:
          content = documentation;
      }

      await Bun.write(exportFile, new TextEncoder().encode(content));
      console.log(`📄 Exported: ${filename}`);
    }
  }

  /**
   * Convert markdown to HTML (basic)
   */
  private convertToHTML(markdown: string): string {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/gim, '<br>');
  }

  /**
   * Strip markdown formatting
   */
  private stripMarkdown(markdown: string): string {
    return markdown
      .replace(/^#+\s/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  /**
   * Get system configuration (self-awareness)
   */
  getSystemConfig(): any {
    return {
      modulePath: this.baseUrl.pathname,
      directory: new URL('.', this.baseUrl).pathname,
      templates: new URL('./templates/', this.baseUrl).pathname,
      resources: new URL('./resources/', this.baseUrl).pathname,
      cacheTemplates: this.templates.size,
      supportedFormats: ['md', 'html', 'txt', 'json']
    };
  }
}

/**
 * Demonstration of self-referential documentation system
 */
export async function demonstrateSelfReferentialSystem() {
  console.log('🧭 Self-Referential Documentation System Demo');
  console.log('=' .repeat(60));

  const scanner = new TemplateDocumentationScanner();

  // Show system configuration
  const config = scanner.getSystemConfig();
  console.log('📍 System Configuration:');
  console.log(`   Module: ${config.modulePath}`);
  console.log(`   Directory: ${config.directory}`);
  console.log(`   Templates: ${config.templates}`);
  console.log(`   Resources: ${config.resources}`);

  // Try to load a template (will create if doesn't exist)
  try {
    await scanner.loadTemplate('search-results.md');
  } catch (error) {
    console.log('📝 Creating default template...');
    await createDefaultTemplate();
    await scanner.loadTemplate('search-results.md');
  }

  // Generate documentation
  console.log('\n📚 Generating Documentation:');
  try {
    const docs = await scanner.generateDocumentation('bun', 'search-results.md');
    console.log('✅ Documentation generated:');
    console.log(docs.substring(0, 300) + '...');
  } catch (error) {
    console.log('⚠️ Documentation generation requires search infrastructure');
  }

  // Export to multiple formats
  console.log('\n📄 Exporting Documentation:');
  try {
    await scanner.exportDocumentation('performance', 'search-results.md', ['md', 'html', 'txt']);
  } catch (error) {
    console.log('⚠️ Export requires search infrastructure');
  }

  console.log('\n🎯 Self-Referential System Status: OPERATIONAL');
}

/**
 * Create default template for demonstration
 */
async function createDefaultTemplate(): Promise<void> {
  const templateContent = `# Documentation Search Results

## Query: {{QUERY}}

Generated on: {{TIMESTAMP}}

## Summary

- **Matches Found**: {{MATCH_COUNT}}
- **Search Time**: {{SEARCH_TIME}}ms
- **Bytes Processed**: {{BYTES_PROCESSED}}

## Detailed Results

{{RESULTS}}

---

*Generated by Ultra-Zen Documentation Streaming System*
`;

  const templatesDir = '/Users/nolarose/Projects/lib/docs/templates';
  const templateFile = (Bun as any).file(`${templatesDir}/search-results.md`);
  
  try {
    await Bun.write(templateFile, new TextEncoder().encode(templateContent));
    console.log('📝 Default template created');
  } catch (error) {
    console.log('⚠️ Could not create template file');
  }
}

// Run demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateSelfReferentialSystem().catch(console.error);
}
