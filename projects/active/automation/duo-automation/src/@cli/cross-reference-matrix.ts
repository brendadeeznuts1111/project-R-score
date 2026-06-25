#!/usr/bin/env bun

/**
 * Cross-Reference Matrix System
 * 
 * Integrates documentation, CLI commands, and system components
 * with bidirectional linking and intelligent navigation.
 */

import { EnhancedScopeMatrix } from '../@core/enhanced-matrix-system.js';

export interface CrossRefEntry {
  id: string;
  type: 'documentation' | 'cli-command' | 'system-component' | 'feature';
  title: string;
  description: string;
  path: string;
  links: string[]; // IDs of related entries
  tags: string[];
  category: string;
}

export interface CrossRefMatrix {
  entries: Map<string, CrossRefEntry>;
  categories: Map<string, string[]>;
  tags: Map<string, string[]>;
}

class CrossReferenceSystem {
  private matrix: CrossRefMatrix;

  constructor() {
    this.matrix = {
      entries: new Map(),
      categories: new Map(),
      tags: new Map()
    };
    this.initializeMatrix();
  }

  private initializeMatrix(): void {
    // Documentation entries
    this.addEntry({
      id: 'docs-inspection-advanced',
      type: 'documentation',
      title: 'Advanced Custom Inspection System',
      description: 'Comprehensive inspection system with real-time monitoring and performance tracking',
      path: './docs/Advanced Custom Inspection System for Du.md',
      links: ['cli-inspect', 'feature-inspection-monitor', 'system-inspection-core'],
      tags: ['inspection', 'monitoring', 'performance', 'v2.0'],
      category: 'Core Features'
    });

    this.addEntry({
      id: 'docs-inspection-enhanced',
      type: 'documentation',
      title: 'Enhanced Inspection System V2',
      description: 'Latest inspection features with enhanced metrics and real-time capabilities',
      path: './docs/ENHANCED_INSPECTION_SYSTEM_V2.md',
      links: ['cli-inspect-enhanced', 'feature-real-time-monitoring'],
      tags: ['inspection', 'v2.0', 'enhanced', 'monitoring'],
      category: 'Core Features'
    });

    this.addEntry({
      id: 'docs-enterprise',
      type: 'documentation',
      title: 'Enterprise Overview',
      description: 'Platform overview, architecture, and enterprise features',
      path: './docs/ENTERPRISE_OVERVIEW.md',
      links: ['cli-matrix', 'system-enterprise-config'],
      tags: ['enterprise', 'architecture', 'overview'],
      category: 'Architecture'
    });

    this.addEntry({
      id: 'docs-url-matrix',
      type: 'documentation',
      title: 'URL Organization Matrix',
      description: 'Complete URL system matrix and organization',
      path: './docs/URL_ORGANIZATION_MATRIX.md',
      links: ['cli-matrix', 'system-url-organization'],
      tags: ['url', 'matrix', 'organization'],
      category: 'Architecture'
    });

    this.addEntry({
      id: 'docs-security',
      type: 'documentation',
      title: 'Security Implementation',
      description: 'Security features, compliance, and hardening',
      path: './docs/PRODUCTION_HARDENED_COMPLETE.md',
      links: ['cli-security', 'system-security-core'],
      tags: ['security', 'compliance', 'production'],
      category: 'Security'
    });

    // CLI Command entries
    this.addEntry({
      id: 'cli-matrix',
      type: 'cli-command',
      title: 'Matrix Command',
      description: 'View and interact with the enhanced scope matrix',
      path: 'factory-wager-enhanced matrix',
      links: ['docs-url-matrix', 'docs-enterprise', 'system-matrix-core'],
      tags: ['cli', 'matrix', 'scope', 'platform'],
      category: 'CLI Commands'
    });

    this.addEntry({
      id: 'cli-inspect',
      type: 'cli-command',
      title: 'Inspect Command',
      description: 'Enhanced inspection with matrix context',
      path: 'factory-wager-enhanced inspect',
      links: ['docs-inspection-advanced', 'system-inspection-core'],
      tags: ['cli', 'inspection', 'security'],
      category: 'CLI Commands'
    });

    this.addEntry({
      id: 'cli-inspect-enhanced',
      type: 'cli-command',
      title: 'Enhanced Inspect Command',
      description: 'Advanced inspection with real-time monitoring',
      path: 'factory-wager-enhanced inspect --enhanced',
      links: ['docs-inspection-enhanced', 'feature-real-time-monitoring'],
      tags: ['cli', 'inspection', 'enhanced', 'monitoring'],
      category: 'CLI Commands'
    });

    this.addEntry({
      id: 'cli-docs',
      type: 'cli-command',
      title: 'Documentation Command',
      description: 'Access cross-referenced documentation',
      path: 'factory-wager-enhanced docs',
      links: ['docs-inspection-advanced', 'docs-enterprise'],
      tags: ['cli', 'documentation', 'help'],
      category: 'CLI Commands'
    });

    this.addEntry({
      id: 'cli-xref',
      type: 'cli-command',
      title: 'Cross-Reference Command',
      description: 'Search across matrix, docs, and inspection',
      path: 'factory-wager-enhanced xref',
      links: ['docs-inspection-advanced', 'system-matrix-core'],
      tags: ['cli', 'search', 'cross-reference'],
      category: 'CLI Commands'
    });

    this.addEntry({
      id: 'cli-security',
      type: 'cli-command',
      title: 'Security Command',
      description: 'Security validation and compliance checks',
      path: 'factory-wager-enhanced security',
      links: ['docs-security', 'system-security-core'],
      tags: ['cli', 'security', 'validation'],
      category: 'CLI Commands'
    });

    // System Component entries
    this.addEntry({
      id: 'system-matrix-core',
      type: 'system-component',
      title: 'Enhanced Matrix System',
      description: 'Core matrix system with scope and platform management',
      path: './src/@core/enhanced-matrix-system.ts',
      links: ['cli-matrix', 'docs-url-matrix'],
      tags: ['system', 'matrix', 'core'],
      category: 'Core Systems'
    });

    this.addEntry({
      id: 'system-inspection-core',
      type: 'system-component',
      title: 'Inspection System Core',
      description: 'Core inspection system with custom formatting',
      path: './ecosystem/inspect-custom.ts',
      links: ['cli-inspect', 'docs-inspection-advanced'],
      tags: ['system', 'inspection', 'core'],
      category: 'Core Systems'
    });

    this.addEntry({
      id: 'system-security-core',
      type: 'system-component',
      title: 'Security Core',
      description: 'Security validation and compliance system',
      path: './src/@core/security/',
      links: ['cli-security', 'docs-security'],
      tags: ['system', 'security', 'core'],
      category: 'Security'
    });

    this.addEntry({
      id: 'system-enterprise-config',
      type: 'system-component',
      title: 'Enterprise Configuration',
      description: 'Enterprise-level configuration and settings',
      path: './config/enterprise/',
      links: ['docs-enterprise', 'cli-matrix'],
      tags: ['system', 'enterprise', 'configuration'],
      category: 'Configuration'
    });

    this.addEntry({
      id: 'system-url-organization',
      type: 'system-component',
      title: 'URL Organization System',
      description: 'URL management and organization system',
      path: './src/utils/url-organization.ts',
      links: ['docs-url-matrix', 'cli-matrix'],
      tags: ['system', 'url', 'organization'],
      category: 'Core Systems'
    });

    // Feature entries
    this.addEntry({
      id: 'feature-inspection-monitor',
      type: 'feature',
      title: 'Inspection Performance Monitor',
      description: 'Real-time performance monitoring for inspection system',
      path: './ecosystem/inspect-custom.ts#InspectionMonitor',
      links: ['docs-inspection-advanced', 'system-inspection-core'],
      tags: ['feature', 'monitoring', 'performance', 'real-time'],
      category: 'Features'
    });

    this.addEntry({
      id: 'feature-real-time-monitoring',
      type: 'feature',
      title: 'Real-time Monitoring',
      description: 'Real-time system monitoring and analytics',
      path: './src/monitoring/',
      links: ['docs-inspection-enhanced', 'system-inspection-core'],
      tags: ['feature', 'monitoring', 'real-time', 'analytics'],
      category: 'Features'
    });

    this.addEntry({
      id: 'feature-bun-pure',
      type: 'feature',
      title: 'Bun-Pure Compliance',
      description: '100% Bun runtime compliance with no external dependencies',
      path: './BUN_PURE_COMPLIANCE.md',
      links: ['system-inspection-core', 'system-matrix-core'],
      tags: ['feature', 'bun', 'compliance', 'performance'],
      category: 'Features'
    });
  }

  private addEntry(entry: CrossRefEntry): void {
    this.matrix.entries.set(entry.id, entry);
    
    // Update categories
    if (!this.matrix.categories.has(entry.category)) {
      this.matrix.categories.set(entry.category, []);
    }
    this.matrix.categories.get(entry.category)!.push(entry.id);
    
    // Update tags
    entry.tags.forEach(tag => {
      if (!this.matrix.tags.has(tag)) {
        this.matrix.tags.set(tag, []);
      }
      this.matrix.tags.get(tag)!.push(entry.id);
    });
  }

  // Search methods
  search(query: string, type?: string): CrossRefEntry[] {
    const results: CrossRefEntry[] = [];
    const lowerQuery = query.toLowerCase();

    for (const entry of this.matrix.entries.values()) {
      if (type && entry.type !== type) continue;
      
      if (
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery) ||
        entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push(entry);
      }
    }

    return results;
  }

  // Get entry by ID
  getEntry(id: string): CrossRefEntry | undefined {
    return this.matrix.entries.get(id);
  }

  // Get related entries
  getRelatedEntries(id: string): CrossRefEntry[] {
    const entry = this.matrix.entries.get(id);
    if (!entry) return [];

    return entry.links
      .map(linkId => this.matrix.entries.get(linkId))
      .filter((entry): entry is CrossRefEntry => entry !== undefined);
  }

  // Get entries by category
  getEntriesByCategory(category: string): CrossRefEntry[] {
    const ids = this.matrix.categories.get(category) || [];
    return ids.map(id => this.matrix.entries.get(id))
      .filter((entry): entry is CrossRefEntry => entry !== undefined);
  }

  // Get entries by tag
  getEntriesByTag(tag: string): CrossRefEntry[] {
    const ids = this.matrix.tags.get(tag) || [];
    return ids.map(id => this.matrix.entries.get(id))
      .filter((entry): entry is CrossRefEntry => entry !== undefined);
  }

  // Generate navigation matrix
  generateNavigationMatrix(): string {
    let output = '# Cross-Reference Navigation Matrix\n\n';
    
    // Group by category
    for (const [category, entryIds] of this.matrix.categories) {
      output += `## ${category}\n\n`;
      
      const entries = entryIds
        .map(id => this.matrix.entries.get(id))
        .filter((entry): entry is CrossRefEntry => entry !== undefined);
      
      entries.forEach(entry => {
        output += `### ${entry.title}\n`;
        output += `- **Type**: ${entry.type}\n`;
        output += `- **Description**: ${entry.description}\n`;
        output += `- **Path**: \`${entry.path}\`\n`;
        output += `- **Tags**: ${entry.tags.join(', ')}\n`;
        
        if (entry.links.length > 0) {
          output += `- **Related**: `;
          output += entry.links.map(linkId => {
            const linkedEntry = this.matrix.entries.get(linkId);
            return linkedEntry ? `[${linkedEntry.title}](#${linkedEntry.title.toLowerCase().replace(/\s+/g, '-')})` : linkId;
          }).join(', ');
          output += '\n';
        }
        
        output += '\n';
      });
    }
    
    return output;
  }

  // Generate CLI help matrix
  generateCLIHelpMatrix(): string {
    let output = '# CLI Command Reference Matrix\n\n';
    
    const cliEntries = this.getEntriesByCategory('CLI Commands');
    
    cliEntries.forEach(entry => {
      output += `## ${entry.title}\n\n`;
      output += `**Command**: \`${entry.path}\`\n\n`;
      output += `**Description**: ${entry.description}\n\n`;
      
      output += `**Related Documentation**:\n`;
      const relatedDocs = entry.links
        .map(linkId => this.matrix.entries.get(linkId))
        .filter((e): e is CrossRefEntry => e !== undefined && e.type === 'documentation');
      
      relatedDocs.forEach(doc => {
        output += `- [${doc.title}](${doc.path})\n`;
      });
      
      output += `\n**Related Features**:\n`;
      const relatedFeatures = entry.links
        .map(linkId => this.matrix.entries.get(linkId))
        .filter((e): e is CrossRefEntry => e !== undefined && e.type === 'feature');
      
      relatedFeatures.forEach(feature => {
        output += `- ${feature.title}: ${feature.description}\n`;
      });
      
      output += '\n---\n\n';
    });
    
    return output;
  }

  // Get matrix statistics
  getStatistics(): { [key: string]: number } {
    const stats: { [key: string]: number } = {
      total: this.matrix.entries.size,
      documentation: 0,
      'cli-command': 0,
      'system-component': 0,
      feature: 0
    };

    for (const entry of this.matrix.entries.values()) {
      stats[entry.type]++;
    }

    stats.categories = this.matrix.categories.size;
    stats.tags = this.matrix.tags.size;

    return stats;
  }
}

// Export singleton instance
export const crossRefSystem = new CrossReferenceSystem();
export { CrossReferenceSystem };
