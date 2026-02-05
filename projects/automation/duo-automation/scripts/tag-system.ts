#!/usr/bin/env bun

/**
 * 🏷️ Advanced Tag System Implementation
 * Structured Tag Format: [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*][BUN-NATIVE]
 * 
 * This system provides hierarchical, semantic tagging with rich metadata
 * and cross-reference capabilities for enhanced artifact management.
 */

interface StructuredTag {
  domain: string;
  scope?: string;
  type: string;
  metadata?: Record<string, any>;
  class?: string;
  references?: string[];
  bunNative?: boolean;
  raw: string;
}

interface TagParseResult {
  success: boolean;
  tag?: StructuredTag;
  error?: string;
}

interface TagValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

class AdvancedTagSystem {
  private readonly VALID_DOMAINS = [
    'CORE', 'CLI', 'DOCS', 'SCRIPTS', 'TESTS', 'EXAMPLES', 
    'ECOSYSTEM', 'INFRASTRUCTURE', 'MONITORING', 'SECURITY'
  ];

  private readonly VALID_SCOPES = [
    'SYSTEM', 'USER', 'DEV', 'PROD', 'STAGING', 'LOCAL',
    'GLOBAL', 'PROJECT', 'PACKAGE', 'MODULE', 'COMPONENT'
  ];

  private readonly VALID_TYPES = [
    'TYPESCRIPT', 'JAVASCRIPT', 'JSON', 'YAML', 'MARKDOWN',
    'CONFIG', 'SCRIPT', 'LIBRARY', 'UTILITY', 'SERVICE',
    'INTERFACE', 'CLASS', 'FUNCTION', 'CONSTANT', 'ENUM'
  ];

  private readonly VALID_CLASSES = [
    'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INTERNAL', 'PUBLIC',
    'EXPERIMENTAL', 'STABLE', 'DEPRECATED', 'LEGACY', 'MODERN'
  ];

  /**
   * Parse a structured tag into its components
   */
  parseTag(tagString: string): TagParseResult {
    try {
      const tag: StructuredTag = { raw: tagString };
      
      // Extract BUN-NATIVE flag
      tag.bunNative = tagString.includes('[BUN-NATIVE]');
      tagString = tagString.replace('[BUN-NATIVE]', '');

      // Extract references
      const refMatches = tagString.match(/\[#REF:([^\]]+)\]/g);
      if (refMatches) {
        tag.references = refMatches.map(ref => 
          ref.replace(/\[#REF:([^\]]+)\]/, '$1')
        );
        tagString = tagString.replace(/\[#REF:[^\]]+\]/g, '');
      }

      // Extract class
      const classMatch = tagString.match(/\[([A-Z]+)\]/);
      if (classMatch) {
        tag.class = classMatch[1];
        tagString = tagString.replace(classMatch[0], '');
      }

      // Extract metadata
      const metaMatches = tagString.match(/\[META:([^\]]+)\]/g);
      if (metaMatches) {
        tag.metadata = {};
        metaMatches.forEach(meta => {
          const content = meta.replace(/\[META:([^\]]+)\]/, '$1');
          const [key, value] = content.split('=');
          if (key && value) {
            try {
              tag.metadata![key] = JSON.parse(value);
            } catch {
              tag.metadata![key] = value;
            }
          }
        });
        tagString = tagString.replace(/\[META:[^\]]+\]/g, '');
      }

      // Extract core components
      const coreMatch = tagString.match(/^\[([^\]]+)\]\[([^\]]*)\]\[([^\]]+)\]$/);
      if (coreMatch) {
        tag.domain = coreMatch[1];
        tag.scope = coreMatch[2] || undefined;
        tag.type = coreMatch[3];
      } else {
        return {
          success: false,
          error: 'Invalid tag format. Expected: [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*][BUN-NATIVE]'
        };
      }

      return { success: true, tag };
    } catch (error) {
      return {
        success: false,
        error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate a structured tag
   */
  validateTag(tag: StructuredTag): TagValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate domain
    if (!this.VALID_DOMAINS.includes(tag.domain)) {
      errors.push(`Invalid domain: ${tag.domain}. Valid domains: ${this.VALID_DOMAINS.join(', ')}`);
    }

    // Validate scope (optional)
    if (tag.scope && !this.VALID_SCOPES.includes(tag.scope)) {
      errors.push(`Invalid scope: ${tag.scope}. Valid scopes: ${this.VALID_SCOPES.join(', ')}`);
    }

    // Validate type
    if (!this.VALID_TYPES.includes(tag.type)) {
      errors.push(`Invalid type: ${tag.type}. Valid types: ${this.VALID_TYPES.join(', ')}`);
    }

    // Validate class (optional)
    if (tag.class && !this.VALID_CLASSES.includes(tag.class)) {
      errors.push(`Invalid class: ${tag.class}. Valid classes: ${this.VALID_CLASSES.join(', ')}`);
    }

    // Validate metadata
    if (tag.metadata) {
      Object.entries(tag.metadata).forEach(([key, value]) => {
        if (!/^[a-z_][a-z0-9_]*$/i.test(key)) {
          warnings.push(`Metadata key '${key}' should use snake_case`);
        }
      });
    }

    // Validate references
    if (tag.references) {
      tag.references.forEach(ref => {
        if (!/^[\w\-./]+$/.test(ref)) {
          warnings.push(`Reference '${ref}' contains invalid characters`);
        }
      });
    }

    // Generate suggestions
    if (tag.bunNative && tag.type !== 'TYPESCRIPT' && tag.type !== 'JAVASCRIPT') {
      suggestions.push('BUN-NATIVE flag is typically used with TypeScript/JavaScript files');
    }

    if (!tag.scope && tag.domain === 'CORE') {
      suggestions.push('Consider adding a scope for core components (e.g., [SYSTEM])');
    }

    if (!tag.class && tag.domain === 'CORE') {
      suggestions.push('Consider adding a class for core components (e.g., [CRITICAL])');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Generate a structured tag from components
   */
  generateTag(components: {
    domain: string;
    scope?: string;
    type: string;
    metadata?: Record<string, any>;
    class?: string;
    references?: string[];
    bunNative?: boolean;
  }): string {
    let tag = `[${components.domain}]`;
    
    if (components.scope) {
      tag += `[${components.scope}]`;
    }
    
    tag += `[${components.type}]`;

    if (components.metadata) {
      Object.entries(components.metadata).forEach(([key, value]) => {
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        tag += `[META:${key}=${serializedValue}]`;
      });
    }

    if (components.class) {
      tag += `[${components.class}]`;
    }

    if (components.references) {
      components.references.forEach(ref => {
        tag += `[#REF:${ref}]`;
      });
    }

    if (components.bunNative) {
      tag += '[BUN-NATIVE]';
    }

    return tag;
  }

  /**
   * Search for artifacts by structured tag criteria
   */
  searchByTags(criteria: {
    domain?: string;
    scope?: string;
    type?: string;
    class?: string;
    bunNative?: boolean;
    hasMetadata?: string;
    hasReference?: string;
  }): string[] {
    // This would integrate with the artifact system
    // For now, return mock results
    const mockResults = [
      '[CORE][SYSTEM][TYPESCRIPT][META:version=1.0][CRITICAL][BUN-NATIVE]',
      '[CLI][USER][JAVASCRIPT][HIGH]',
      '[DOCS][GLOBAL][MARKDOWN][#REF:README]',
      '[SCRIPTS][DEV][TYPESCRIPT][META:timeout=5000][MEDIUM]',
      '[SECURITY][PROD][JSON][CRITICAL][#REF:config][#REF:secrets]'
    ];

    return mockResults.filter(tag => {
      const parsed = this.parseTag(tag);
      if (!parsed.success) return false;

      const p = parsed.tag!;

      if (criteria.domain && p.domain !== criteria.domain) return false;
      if (criteria.scope && p.scope !== criteria.scope) return false;
      if (criteria.type && p.type !== criteria.type) return false;
      if (criteria.class && p.class !== criteria.class) return false;
      if (criteria.bunNative !== undefined && p.bunNative !== criteria.bunNative) return false;
      if (criteria.hasMetadata && (!p.metadata || !(criteria.hasMetadata in p.metadata))) return false;
      if (criteria.hasReference && (!p.references || !p.references.includes(criteria.hasReference))) return false;

      return true;
    });
  }

  /**
   * Get tag statistics and analytics
   */
  getTagAnalytics(): {
    totalTags: number;
    domainDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
    classDistribution: Record<string, number>;
    metadataUsage: number;
    referenceUsage: number;
    bunNativeUsage: number;
  } {
    // Mock analytics - would be calculated from actual artifacts
    return {
      totalTags: 150,
      domainDistribution: {
        'CORE': 45,
        'CLI': 30,
        'DOCS': 25,
        'SCRIPTS': 20,
        'SECURITY': 15,
        'TESTS': 15
      },
      typeDistribution: {
        'TYPESCRIPT': 60,
        'JAVASCRIPT': 25,
        'JSON': 20,
        'MARKDOWN': 25,
        'YAML': 10,
        'CONFIG': 10
      },
      classDistribution: {
        'CRITICAL': 20,
        'HIGH': 15,
        'MEDIUM': 10,
        'LOW': 5,
        'INTERNAL': 8,
        'PUBLIC': 12
      },
      metadataUsage: 45,
      referenceUsage: 25,
      bunNativeUsage: 30
    };
  }

  /**
   * Export tag registry for documentation
   */
  exportRegistry(): {
    domains: string[];
    scopes: string[];
    types: string[];
    classes: string[];
    metadataProperties: string[];
    examples: string[];
  } {
    return {
      domains: this.VALID_DOMAINS,
      scopes: this.VALID_SCOPES,
      types: this.VALID_TYPES,
      classes: this.VALID_CLASSES,
      metadataProperties: ['version', 'timeout', 'priority', 'author', 'created', 'modified'],
      examples: [
        '[CORE][SYSTEM][TYPESCRIPT][META:version=1.0][CRITICAL][BUN-NATIVE]',
        '[CLI][USER][JAVASCRIPT][HIGH]',
        '[DOCS][GLOBAL][MARKDOWN][#REF:README]',
        '[SCRIPTS][DEV][TYPESCRIPT][META:timeout=5000][MEDIUM]',
        '[SECURITY][PROD][JSON][CRITICAL][#REF:config][#REF:secrets]'
      ]
    };
  }
}

// CLI implementation
async function main() {
  const args = process.argv.slice(2);
  const tagSystem = new AdvancedTagSystem();

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'parse':
      if (args[1]) {
        const result = tagSystem.parseTag(args[1]);
        if (result.success) {
          console.log('✅ Tag parsed successfully:');
          console.log(JSON.stringify(result.tag, null, 2));
        } else {
          console.log('❌ Parse error:', result.error);
        }
      } else {
        console.log('Usage: tag-system parse "<tag>"');
      }
      break;

    case 'validate':
      if (args[1]) {
        const parseResult = tagSystem.parseTag(args[1]);
        if (parseResult.success) {
          const validation = tagSystem.validateTag(parseResult.tag!);
          console.log(`📊 Validation result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
          
          if (validation.errors.length > 0) {
            console.log('\n❌ Errors:');
            validation.errors.forEach(error => console.log(`  • ${error}`));
          }
          
          if (validation.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            validation.warnings.forEach(warning => console.log(`  • ${warning}`));
          }
          
          if (validation.suggestions.length > 0) {
            console.log('\n💡 Suggestions:');
            validation.suggestions.forEach(suggestion => console.log(`  • ${suggestion}`));
          }
        } else {
          console.log('❌ Parse error:', parseResult.error);
        }
      } else {
        console.log('Usage: tag-system validate "<tag>"');
      }
      break;

    case 'generate':
      if (args[1]) {
        try {
          const components = JSON.parse(args[1]);
          const tag = tagSystem.generateTag(components);
          console.log('🏷️  Generated tag:', tag);
        } catch (error) {
          console.log('❌ Invalid JSON components');
        }
      } else {
        console.log('Usage: tag-system generate \'{"domain":"CORE","type":"TYPESCRIPT"}\'');
      }
      break;

    case 'search':
      const criteria: any = {};
      for (let i = 1; i < args.length; i++) {
        const [key, value] = args[i].split('=');
        if (key && value) {
          if (value === 'true') criteria[key] = true;
          else if (value === 'false') criteria[key] = false;
          else criteria[key] = value;
        }
      }
      
      const results = tagSystem.searchByTags(criteria);
      console.log(`🔍 Found ${results.length} matching tags:`);
      results.forEach((tag, index) => {
        console.log(`${index + 1}. ${tag}`);
      });
      break;

    case 'analytics':
      const analytics = tagSystem.getTagAnalytics();
      console.log('📊 Tag Analytics:');
      console.log('==================');
      console.log(`Total tags: ${analytics.totalTags}`);
      console.log(`Metadata usage: ${analytics.metadataUsage} (${Math.round(analytics.metadataUsage / analytics.totalTags * 100)}%)`);
      console.log(`Reference usage: ${analytics.referenceUsage} (${Math.round(analytics.referenceUsage / analytics.totalTags * 100)}%)`);
      console.log(`Bun-Native usage: ${analytics.bunNativeUsage} (${Math.round(analytics.bunNativeUsage / analytics.totalTags * 100)}%)`);
      
      console.log('\n📁 Domain Distribution:');
      Object.entries(analytics.domainDistribution).forEach(([domain, count]) => {
        console.log(`  ${domain}: ${count}`);
      });
      
      console.log('\n🗂️  Type Distribution:');
      Object.entries(analytics.typeDistribution).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      break;

    case 'registry':
      const registry = tagSystem.exportRegistry();
      console.log('📋 Tag Registry:');
      console.log('================');
      console.log('\n🏷️  Examples:');
      registry.examples.forEach((example, index) => {
        console.log(`${index + 1}. ${example}`);
      });
      break;

    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

function showHelp(): void {
  console.log(`
🏷️  Advanced Tag System CLI

FORMAT: [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*][BUN-NATIVE]

USAGE:
  bun run scripts/tag-system.ts <command> [options]

COMMANDS:
  parse "<tag>"              Parse a structured tag
  validate "<tag>"           Validate a structured tag
  generate <json>            Generate tag from components
  search <criteria>          Search by tag criteria
  analytics                  Show tag analytics
  registry                   Show tag registry
  help                       Show this help

EXAMPLES:
  # Parse a tag
  bun run scripts/tag-system.ts parse "[CORE][SYSTEM][TYPESCRIPT][CRITICAL][BUN-NATIVE]"

  # Validate a tag
  bun run scripts/tag-system.ts validate "[CLI][USER][JAVASCRIPT][HIGH]"

  # Generate a tag
  bun run scripts/tag-system.ts generate '{"domain":"CORE","type":"TYPESCRIPT","class":"CRITICAL","bunNative":true}'

  # Search tags
  bun run scripts/tag-system.ts search domain=CORE bunNative=true

  # Show analytics
  bun run scripts/tag-system.ts analytics

COMPONENTS:
  DOMAIN: ${new AdvancedTagSystem().exportRegistry().domains.join(', ')}
  SCOPE: ${new AdvancedTagSystem().exportRegistry().scopes.join(', ')}
  TYPE: ${new AdvancedTagSystem().exportRegistry().types.join(', ')}
  CLASS: ${new AdvancedTagSystem().exportRegistry().classes.join(', ')}
`);
}

// Auto-run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { AdvancedTagSystem, StructuredTag, TagParseResult, TagValidationResult };
