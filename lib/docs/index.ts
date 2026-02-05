/**
 * 📚 Documentation Index
 * 
 * Central documentation management for the monorepo
 * 
 * @version 1.0.0
 */

// Re-export documentation patterns
export * from './patterns';

// Documentation utilities
export class DocumentationUtils {
  /**
   * Format documentation URL with proper base
   */
  static formatURL(path: string, base: string = 'https://bun.sh'): string {
    return new URL(path, base).toString();
  }
  
  /**
   * Extract section from URL
   */
  static extractSection(url: string): string | null {
    const match = url.match(/#([^#]+)$/);
    return match ? match[1] : null;
  }
  
  /**
   * Generate documentation tree structure
   */
  static generateTree(docs: Record<string, string>): Record<string, any> {
    const tree: Record<string, any> = {};
    
    Object.entries(docs).forEach(([key, url]) => {
      const parts = key.split('.');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? url : {};
        }
        current = current[part];
      });
    });
    
    return tree;
  }
  
  /**
   * Generate documentation sitemap
   */
  static generateSitemap(docs: Record<string, string>): string {
    const urls = Object.values(docs);
    const base = 'https://bun.sh';
    
    return urls.map(url => 
      `<url><loc>${url}</loc></url>`
    ).join('\n');
  }
  
  /**
   * Check if documentation is outdated
   */
  static isOutdated(lastUpdated: string, maxAge: number = 30): boolean {
    const lastDate = new Date(lastUpdated);
    const now = new Date();
    const daysDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff > maxAge;
  }
}

// Documentation templates
export const DOC_TEMPLATES = {
  // API documentation template
  api: (name: string, description: string, examples: string) => `
# ${name}

${description}

## Examples
${examples}

## See Also
- [API Reference](/api)
- [Runtime Docs](/runtime)
  `,
  
  // Guide documentation template
  guide: (title: string, description: string, steps: string[]) => `
# ${title}

${description}

## Steps
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Related
- [Getting Started](/guides/getting-started)
- [API Reference](/api)
  `,
  
  // Release notes template
  releaseNotes: (version: string, date: string, changes: string[]) => `
# Release Notes v${version}

**Released:** ${date}

## Changes
${changes.map(change => `- ${change}`).join('\n')}

## Upgrade Guide
See [Migration Guide](/guides/migration) for upgrade instructions.
  `
} as const;

export default {
  DOC_PATTERNS,
  DocumentationUtils,
  DOC_TEMPLATES
};
