/**
 * 🌐 FactoryWager MCP Wiki Generator Integration
 * 
 * Integrates the existing wiki generator with the MCP ecosystem
 * for automated documentation generation and management.
 */

import { WikiURLGenerator } from '../wiki-generator.ts';
import { r2MCPIntegration } from './r2-integration.ts';
import { masterTokenManager } from '../security/master-token.ts';
import { styled, FW_COLORS } from '../theme/colors.ts';

export interface WikiGenerationRequest {
  format: 'markdown' | 'html' | 'json' | 'all';
  baseUrl?: string;
  workspace?: string;
  includeExamples?: boolean;
  includeValidation?: boolean;
  context?: string;
  authToken?: string;
}

export interface WikiGenerationResult {
  success: boolean;
  files: {
    markdown?: string;
    html?: string;
    json?: string;
  };
  metadata: {
    total: number;
    categories: number;
    generated: string;
    baseUrl: string;
    workspace: string;
  };
  r2Stored?: {
    key: string;
    url: string;
  };
  error?: string;
}

export interface WikiTemplate {
  name: string;
  description: string;
  baseUrl: string;
  workspace: string;
  format: string;
  includeExamples: boolean;
  customSections?: string[];
}

export class MCPWikiGenerator {
  private static readonly WIKI_R2_PREFIX = 'mcp/wiki/';

  /**
   * Generate wiki content with MCP integration
   */
  static async generateWiki(request: WikiGenerationRequest): Promise<WikiGenerationResult> {
    try {
      // Authenticate request if token provided
      if (request.authToken) {
        const auth = await masterTokenManager.validateToken(request.authToken);
        if (!auth.valid) {
          return {
            success: false,
            files: {},
            metadata: { total: 0, categories: 0, generated: '', baseUrl: '', workspace: '' },
            error: 'Authentication failed'
          };
        }
      }

      console.log(styled('🌐 Generating MCP Wiki Content...', 'primary'));

      // Generate wiki using existing generator
      const wikiConfig = {
        baseUrl: request.baseUrl || 'https://wiki.company.com',
        workspace: request.workspace || 'bun-utilities',
        format: request.format as 'markdown' | 'html' | 'json',
        includeExamples: request.includeExamples ?? true,
        includeValidation: request.includeValidation ?? true
      };

      const wikiResult = WikiURLGenerator.generateWikiURLs(wikiConfig);

      // Generate content for each format
      const files: WikiGenerationResult['files'] = {};

      if (request.format === 'all' || request.format === 'markdown') {
        files.markdown = WikiURLGenerator.generateMarkdownWiki(wikiConfig);
      }

      if (request.format === 'all' || request.format === 'html') {
        files.html = WikiURLGenerator.generateHTMLWiki(wikiConfig);
      }

      if (request.format === 'all' || request.format === 'json') {
        files.json = WikiURLGenerator.generateJSONWiki(wikiConfig);
      }

      const result: WikiGenerationResult = {
        success: true,
        files,
        metadata: {
          total: wikiResult.total,
          categories: wikiResult.categories,
          generated: new Date().toISOString(),
          baseUrl: wikiConfig.baseUrl,
          workspace: wikiConfig.workspace
        }
      };

      // Store in R2 if available
      try {
        const r2Key = `${MCPWikiGenerator.WIKI_R2_PREFIX}wiki-${Date.now()}-${wikiConfig.workspace}`;
        const r2Stored = await r2MCPIntegration.storeDiagnosis({
          id: r2Key,
          timestamp: new Date().toISOString(),
          error: {
            name: 'WikiGeneration',
            message: `Generated ${request.format} wiki for ${wikiConfig.workspace}`
          },
          fix: JSON.stringify(result, null, 2),
          relatedAudits: [],
          relatedDocs: [],
          confidence: 1.0,
          context: request.context || 'wiki-generation',
          metadata: {
            wikiGeneration: true,
            format: request.format,
            workspace: wikiConfig.workspace,
            totalUtilities: wikiResult.total
          }
        });

        result.r2Stored = {
          key: r2Key,
          url: await r2MCPIntegration.getSignedURL(r2Key, 3600)
        };

        console.log(styled('📦 Wiki content stored in R2', 'success'));
      } catch (r2Error) {
        console.log(styled('⚠️ R2 storage not available, using local only', 'warning'));
      }

      console.log(styled(`✅ Wiki generated: ${wikiResult.total} utilities in ${wikiResult.categories} categories`, 'success'));
      return result;

    } catch (error) {
      console.error(styled(`❌ Wiki generation failed: ${error.message}`, 'error'));
      return {
        success: false,
        files: {},
        metadata: { total: 0, categories: 0, generated: '', baseUrl: '', workspace: '' },
        error: error.message
      };
    }
  }

  /**
   * Get available wiki templates
   */
  static getWikiTemplates(): WikiTemplate[] {
    return [
      {
        name: 'Confluence Integration',
        description: 'Markdown format optimized for Confluence import',
        baseUrl: 'https://yourcompany.atlassian.net/wiki',
        workspace: 'engineering/bun-utilities',
        format: 'markdown',
        includeExamples: true,
        customSections: ['## Integration Notes', '## API Examples']
      },
      {
        name: 'Notion API',
        description: 'JSON format for Notion API integration',
        baseUrl: 'https://notion.so/yourworkspace',
        workspace: 'development/bun-docs',
        format: 'json',
        includeExamples: true,
        customSections: ['## Usage Guidelines', '## Best Practices']
      },
      {
        name: 'GitHub Wiki',
        description: 'Markdown format for GitHub Wiki',
        baseUrl: 'https://github.com/yourorg/repo/wiki',
        workspace: 'utilities',
        format: 'markdown',
        includeExamples: true,
        customSections: ['## Contributing', '## Changelog']
      },
      {
        name: 'Internal Portal',
        description: 'HTML format for internal documentation portal',
        baseUrl: 'https://docs.yourcompany.com',
        workspace: 'bun',
        format: 'html',
        includeExamples: true,
        customSections: ['## Related Documentation', '## Support']
      },
      {
        name: 'API Documentation',
        description: 'JSON format for API documentation systems',
        baseUrl: 'https://api-docs.company.com',
        workspace: 'api/bun-utilities',
        format: 'json',
        includeExamples: false,
        customSections: ['## API Endpoints', '## Schema Definitions']
      }
    ];
  }

  /**
   * Generate wiki from template
   */
  static async generateFromTemplate(
    templateName: string,
    customizations?: Partial<WikiGenerationRequest>
  ): Promise<WikiGenerationResult> {
    const templates = MCPWikiGenerator.getWikiTemplates();
    const template = templates.find(t => t.name === templateName);

    if (!template) {
      return {
        success: false,
        files: {},
        metadata: { total: 0, categories: 0, generated: '', baseUrl: '', workspace: '' },
        error: `Template '${templateName}' not found`
      };
    }

    const request: WikiGenerationRequest = {
      format: template.format as 'markdown' | 'html' | 'json' | 'all',
      baseUrl: template.baseUrl,
      workspace: template.workspace,
      includeExamples: template.includeExamples,
      includeValidation: true,
      context: `template-${templateName.toLowerCase().replace(/\s+/g, '-')}`,
      ...customizations
    };

    return MCPWikiGenerator.generateWiki(request);
  }

  /**
   * Get wiki generation history from R2
   */
  static async getWikiHistory(limit: number = 10): Promise<Array<{
    id: string;
    timestamp: string;
    workspace: string;
    format: string;
    totalUtilities: number;
  }>> {
    try {
      // Search for wiki generation entries in R2
      const wikiEntries = await r2MCPIntegration.searchSimilarErrors(
        'WikiGeneration',
        'wiki-generation',
        limit
      );

      return wikiEntries.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        workspace: entry.metadata?.workspace || 'unknown',
        format: entry.metadata?.format || 'unknown',
        totalUtilities: entry.metadata?.totalUtilities || 0
      }));

    } catch (error) {
      console.log(styled('⚠️ Could not retrieve wiki history from R2', 'warning'));
      return [];
    }
  }

  /**
   * Generate wiki with FactoryWager enhancements
   */
  static async generateFactoryWagerWiki(
    context: string,
    enhancements?: {
      includeSecurityNotes?: boolean;
      includePerformanceTips?: boolean;
      includeFactoryWagerPatterns?: boolean;
    }
  ): Promise<WikiGenerationResult> {
    const request: WikiGenerationRequest = {
      format: 'all',
      baseUrl: 'https://wiki.factorywager.com',
      workspace: `mcp/${context}`,
      includeExamples: true,
      includeValidation: true,
      context: `factorywager-${context}`
    };

    const result = await MCPWikiGenerator.generateWiki(request);

    // Add FactoryWager enhancements to generated content
    if (result.success && enhancements) {
      Object.entries(result.files).forEach(([format, content]) => {
        if (enhancements.includeSecurityNotes && content) {
          result.files[format] = MCPWikiGenerator.addSecurityNotes(content, format);
        }
        if (enhancements.includePerformanceTips && content) {
          result.files[format] = MCPWikiGenerator.addPerformanceTips(content, format);
        }
        if (enhancements.includeFactoryWagerPatterns && content) {
          result.files[format] = MCPWikiGenerator.addFactoryWagerPatterns(content, format);
        }
      });
    }

    return result;
  }

  /**
   * Add security notes to wiki content
   */
  private static addSecurityNotes(content: string, format: string): string {
    const securitySection = format === 'json' ? 
      '"security_notes": "Always validate inputs and use secure defaults"' :
      '\n\n## 🔐 Security Notes\n\n• Always validate user inputs\n• Use secure authentication mechanisms\n• Implement proper error handling\n• Audit sensitive operations\n';

    return content + securitySection;
  }

  /**
   * Add performance tips to wiki content
   */
  private static addPerformanceTips(content: string, format: string): string {
    const performanceSection = format === 'json' ?
      '"performance_tips": "Monitor performance metrics and optimize bottlenecks"' :
      '\n\n## ⚡ Performance Tips\n\n• Monitor response times\n• Use caching for frequently accessed data\n• Optimize database queries\n• Implement proper error handling\n';

    return content + performanceSection;
  }

  /**
   * Add FactoryWager patterns to wiki content
   */
  private static addFactoryWagerPatterns(content: string, format: string): string {
    const patternsSection = format === 'json' ?
      '"factorywager_patterns": "Apply proven FactoryWager resolution patterns"' :
      '\n\n## 🏛️ FactoryWager Patterns\n\n• Apply proven patterns from audit history\n• Use standardized error handling\n• Follow naming conventions\n• Implement proper logging\n';

    return content + patternsSection;
  }

  /**
   * Schedule automatic wiki generation
   */
  static scheduleWikiGeneration(
    schedule: 'hourly' | 'daily' | 'weekly',
    template: string,
    customizations?: Partial<WikiGenerationRequest>
  ): void {
    const intervals = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000
    };

    const interval = setInterval(async () => {
      console.log(styled(`🔄 Scheduled wiki generation (${schedule})`, 'info'));
      const result = await MCPWikiGenerator.generateFromTemplate(template, customizations);
      
      if (result.success) {
        console.log(styled(`✅ Scheduled wiki generated: ${result.metadata.total} utilities`, 'success'));
      } else {
        console.error(styled(`❌ Scheduled wiki generation failed: ${result.error}`, 'error'));
      }
    }, intervals[schedule]);

    console.log(styled(`⏰ Wiki generation scheduled: ${schedule}`, 'success'));
    console.log(styled(`   Template: ${template}`, 'info'));
    console.log(styled(`   Interval: ${intervals[schedule] / 1000}s`, 'muted'));
  }
}

// CLI interface for wiki generation
if (import.meta.main) {
  const command = Bun.argv[2];
  const args = Bun.argv.slice(3);

  async function runWikiCLI() {
    try {
      switch (command) {
        case 'generate':
          const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] as 'markdown' | 'html' | 'json' | 'all' || 'markdown';
          const baseUrl = args.find(arg => arg.startsWith('--base-url='))?.split('=')[1];
          const workspace = args.find(arg => arg.startsWith('--workspace='))?.split('=')[1];
          
          const result = await MCPWikiGenerator.generateWiki({
            format,
            baseUrl,
            workspace,
            context: 'cli-generation'
          });

          if (result.success) {
            console.log(styled('✅ Wiki generated successfully!', 'success'));
            console.log(styled(`📊 Total utilities: ${result.metadata.total}`, 'info'));
            console.log(styled(`📂 Categories: ${result.metadata.categories}`, 'info'));
            console.log(styled(`🌐 Base URL: ${result.metadata.baseUrl}`, 'muted'));
            console.log(styled(`📁 Workspace: ${result.metadata.workspace}`, 'muted'));
            
            if (result.r2Stored) {
              console.log(styled(`📦 Stored in R2: ${result.r2Stored.key}`, 'success'));
            }
          } else {
            console.error(styled(`❌ Generation failed: ${result.error}`, 'error'));
          }
          break;

        case 'templates':
          const templates = MCPWikiGenerator.getWikiTemplates();
          console.log(styled('📋 Available Wiki Templates:', 'primary'));
          templates.forEach((template, index) => {
            console.log(styled(`\n${index + 1}. ${template.name}`, 'accent'));
            console.log(styled(`   ${template.description}`, 'muted'));
            console.log(styled(`   Format: ${template.format} | Workspace: ${template.workspace}`, 'info'));
          });
          break;

        case 'template':
          const templateName = args[0];
          if (!templateName) {
            console.error('❌ Template name required');
            process.exit(1);
          }

          const templateResult = await MCPWikiGenerator.generateFromTemplate(templateName);
          if (templateResult.success) {
            console.log(styled(`✅ Wiki generated from template: ${templateName}`, 'success'));
            console.log(styled(`📊 Total utilities: ${templateResult.metadata.total}`, 'info'));
          } else {
            console.error(styled(`❌ Template generation failed: ${templateResult.error}`, 'error'));
          }
          break;

        case 'history':
          const limit = parseInt(args[0]) || 10;
          const history = await MCPWikiGenerator.getWikiHistory(limit);
          
          if (history.length === 0) {
            console.log(styled('📭 No wiki generation history found', 'muted'));
          } else {
            console.log(styled(`📋 Wiki Generation History (Last ${limit}):`, 'primary'));
            history.forEach((entry, index) => {
              console.log(styled(`\n${index + 1}. ${entry.id}`, 'accent'));
              console.log(styled(`   Time: ${new Date(entry.timestamp).toLocaleString()}`, 'muted'));
              console.log(styled(`   Workspace: ${entry.workspace}`, 'info'));
              console.log(styled(`   Format: ${entry.format}`, 'info'));
              console.log(styled(`   Utilities: ${entry.totalUtilities}`, 'primary'));
            });
          }
          break;

        case 'factorywager':
          const context = args[0] || 'default';
          const fwResult = await MCPWikiGenerator.generateFactoryWagerWiki(context, {
            includeSecurityNotes: true,
            includePerformanceTips: true,
            includeFactoryWagerPatterns: true
          });

          if (fwResult.success) {
            console.log(styled(`✅ FactoryWager wiki generated for context: ${context}`, 'success'));
            console.log(styled(`📊 Total utilities: ${fwResult.metadata.total}`, 'info'));
            console.log(styled('🔐 Security notes added', 'success'));
            console.log(styled('⚡ Performance tips added', 'success'));
            console.log(styled('🏛️ FactoryWager patterns added', 'success'));
          } else {
            console.error(styled(`❌ FactoryWager wiki generation failed: ${fwResult.error}`, 'error'));
          }
          break;

        default:
          console.log(styled('🌐 FactoryWager MCP Wiki Generator', 'accent'));
          console.log(styled('==================================', 'accent'));
          console.log('');
          console.log(styled('Commands:', 'primary'));
          console.log(styled('  generate [--format=markdown|html|json|all] [--base-url=URL] [--workspace=NAME]', 'info'));
          console.log(styled('  templates                    - List available templates', 'info'));
          console.log(styled('  template <name>             - Generate from template', 'info'));
          console.log(styled('  history [limit]              - Show generation history', 'info'));
          console.log(styled('  factorywager [context]       - Generate with FactoryWager enhancements', 'info'));
          console.log('');
          console.log(styled('Examples:', 'primary'));
          console.log(styled('  bun run lib/mcp/wiki-generator-mcp.ts generate --format=all', 'muted'));
          console.log(styled('  bun run lib/mcp/wiki-generator-mcp.ts template "Confluence Integration"', 'muted'));
          console.log(styled('  bun run lib/mcp/wiki-generator-mcp.ts factorywager security', 'muted'));
      }
    } catch (error) {
      console.error(styled(`❌ CLI error: ${error.message}`, 'error'));
      process.exit(1);
    }
  }

  runWikiCLI();
}
