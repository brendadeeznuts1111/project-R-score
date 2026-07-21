// lib/mcp/cli-documentation-mcp.ts — MCP server for CLI documentation with URL handling

import {
  CLIDocumentationHandler,
  CLIExampleGenerator,
  CLIDocumentationSearch,
} from '../core/cli-documentation-handler';
import { CLICategory, CLI_COMMAND_EXAMPLES } from '../docs/constants/cli';
import { URLHandler, URLFragmentUtils } from '../core/url-handler';
import { styled, FW_COLORS } from '../theme/colors';
import { handleErrorFromUnknown } from '../core/error-handling';

/**
 * CLI Documentation MCP Server
 */
export class CLIDocumentationMCPServer {
  private server: any;
  private initialized: boolean = false;

  constructor() {
    this.initializeServer();
  }

  /**
   * Initialize MCP server
   */
  private initializeServer(): void {
    try {
      // This would integrate with your MCP server framework
      console.info(styled('📚 CLI Documentation MCP Server initialized', 'success'));
      this.initialized = true;
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.initializeServer', 'high');
    }
  }

  /**
   * Get CLI documentation URL with navigation
   */
  async getDocumentationURL(
    category: CLICategory,
    page?: string,
    fragment?: Record<string, string>
  ): Promise<{ url: string; valid: boolean }> {
    try {
      this.ensureInitialized();

      const url = CLIDocumentationHandler.generateDocumentationURL(category, page, fragment);
      const valid = CLIDocumentationHandler.validateDocumentationURL(url);

      return { url, valid };
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.getDocumentationURL', 'medium');
      return { url: '', valid: false };
    }
  }

  /**
   * Parse CLI documentation URL
   */
  async parseDocumentationURL(url: string): Promise<{
    valid: boolean;
    category?: CLICategory;
    page?: string;
    fragment?: Record<string, string>;
  }> {
    try {
      this.ensureInitialized();
      return CLIDocumentationHandler.parseDocumentationURL(url);
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.parseDocumentationURL', 'medium');
      return { valid: false };
    }
  }

  /**
   * Search CLI documentation
   */
  async searchDocumentation(query: string): Promise<{
    results: Array<{
      command: string;
      category: CLICategory;
      url: string;
      description?: string;
    }>;
    searchURL: string;
  }> {
    try {
      this.ensureInitialized();

      const results = CLIDocumentationSearch.searchCommands(query);
      const searchURL = CLIDocumentationSearch.generateSearchResultsURL(query, results);

      return { results, searchURL };
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.searchDocumentation', 'medium');
      return { results: [], searchURL: '' };
    }
  }

  /**
   * Generate command example with highlighting
   */
  async generateCommandExample(
    category: keyof typeof CLI_COMMAND_EXAMPLES,
    commandName: string,
    command: string
  ): Promise<{ url: string; valid: boolean }> {
    try {
      this.ensureInitialized();

      const url = CLIExampleGenerator.generateExampleWithHighlighting(
        category,
        commandName,
        command
      );
      const valid = CLIDocumentationHandler.validateDocumentationURL(url);

      return { url, valid };
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.generateCommandExample', 'medium');
      return { url: '', valid: false };
    }
  }

  /**
   * Generate navigation structure
   */
  async getNavigationStructure(): Promise<
    Array<{
      category: CLICategory;
      title: string;
      pages: Array<{ name: string; url: string; fragment?: Record<string, string> }>;
    }>
  > {
    try {
      this.ensureInitialized();
      return CLIDocumentationHandler.generateNavigationStructure();
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.getNavigationStructure', 'medium');
      return [];
    }
  }

  /**
   * Generate quick reference URLs
   */
  async getQuickReferenceURLs(): Promise<Record<string, string>> {
    try {
      this.ensureInitialized();
      return CLIDocumentationHandler.generateQuickReferenceURLs();
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.getQuickReferenceURLs', 'medium');
      return {};
    }
  }

  /**
   * Generate breadcrumb navigation
   */
  async getBreadcrumbs(url: string): Promise<Array<{ name: string; url: string }>> {
    try {
      this.ensureInitialized();
      return CLIDocumentationHandler.generateBreadcrumbs(url);
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.getBreadcrumbs', 'medium');
      return [];
    }
  }

  /**
   * Create shareable documentation link
   */
  async createShareableLink(
    context: {
      category: CLICategory;
      page?: string;
      command?: string;
      section?: string;
      example?: string;
    },
    expiresIn?: number
  ): Promise<{ url: string; valid: boolean }> {
    try {
      this.ensureInitialized();

      const url = CLIDocumentationHandler.createShareableLink(context, expiresIn);
      const valid = CLIDocumentationHandler.validateDocumentationURL(url);

      return { url, valid };
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.createShareableLink', 'medium');
      return { url: '', valid: false };
    }
  }

  /**
   * Generate interactive example URL
   */
  async generateInteractiveExample(
    command: string,
    options?: {
      runnable?: boolean;
      editable?: boolean;
      theme?: 'light' | 'dark';
    }
  ): Promise<{ url: string; valid: boolean }> {
    try {
      this.ensureInitialized();

      const url = CLIExampleGenerator.generateInteractiveExampleURL(command, options);
      const valid = URLHandler.validate(url, {
        allowedHosts: ['bun.sh'],
        requireHTTPS: true,
        allowFragments: true,
      });

      return { url, valid };
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.generateInteractiveExample', 'medium');
      return { url: '', valid: false };
    }
  }

  /**
   * Generate comparison example URL
   */
  async generateComparisonExample(
    bunCommand: string,
    npmCommand: string,
    fragment?: Record<string, string>
  ): Promise<{ url: string; valid: boolean }> {
    try {
      this.ensureInitialized();

      const url = CLIExampleGenerator.generateComparisonURL(bunCommand, npmCommand, fragment);
      const valid = URLHandler.validate(url, {
        allowedHosts: ['bun.sh'],
        requireHTTPS: true,
        allowFragments: true,
      });

      return { url, valid };
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.generateComparisonExample', 'medium');
      return { url: '', valid: false };
    }
  }

  /**
   * Display CLI documentation status
   */
  async displayStatus(): Promise<void> {
    try {
      console.info(styled('\n📚 CLI Documentation MCP Server Status', 'accent'));
      console.info(styled('=====================================', 'accent'));

      console.info(styled('\n🔧 Server Components:', 'info'));
      console.info(styled(`  📚 Documentation Handler: ✅ Active`, 'success'));
      console.info(styled(`  🔍 Search Engine: ✅ Ready`, 'success'));
      console.info(styled(`  🔗 URL Generator: ✅ Operational`, 'success'));
      console.info(styled(`  🧩 Fragment Support: ✅ Enabled`, 'success'));

      // Display quick reference URLs
      const quickRefs = await this.getQuickReferenceURLs();
      console.info(styled('\n🚀 Quick Reference URLs:', 'info'));
      Object.entries(quickRefs).forEach(([name, url]) => {
        console.info(styled(`  ${name}: ${url}`, 'muted'));
      });

      // Display navigation structure summary
      const navigation = await this.getNavigationStructure();
      console.info(styled('\n📋 Available Categories:', 'info'));
      navigation.forEach(({ category, pages }) => {
        console.info(styled(`  ${category}: ${pages.length} pages`, 'muted'));
      });

      console.info(styled('\n✅ CLI Documentation server is ready for use!', 'success'));
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.displayStatus', 'medium');
    }
  }

  /**
   * Demonstrate CLI documentation features
   */
  async demonstrateFeatures(): Promise<void> {
    try {
      console.info(styled('\n🎯 CLI Documentation Feature Demonstration', 'accent'));
      console.info(styled('==========================================', 'accent'));

      // Generate documentation URLs
      console.info(styled('\n📖 Generating Documentation URLs:', 'info'));

      const installURL = await this.getDocumentationURL(CLICategory.INSTALLATION, 'WINDOWS', {
        platform: 'windows',
        version: 'latest',
      });
      console.info(`  Installation (Windows): ${installURL.url}`);

      const testURL = await this.getDocumentationURL(CLICategory.COMMANDS, 'TEST', {
        example: 'basic',
        highlight: 'true',
      });
      console.info(`  Test Command: ${testURL.url}`);

      // Search functionality
      console.info(styled('\n🔍 Search Functionality:', 'info'));
      const searchResults = await this.searchDocumentation('build');
      console.info(`  Found ${searchResults.results.length} results for "build"`);
      searchResults.results.slice(0, 3).forEach(result => {
        console.info(`    - ${result.command}: ${result.description}`);
      });

      // Generate examples
      console.info(styled('\n💡 Example Generation:', 'info'));
      const exampleURL = await this.generateCommandExample('BASIC', 'TEST', 'bun test');
      console.info(`  Test Example: ${exampleURL.url}`);

      const interactiveURL = await this.generateInteractiveExample('bun run dev', {
        runnable: true,
        editable: true,
        theme: 'dark',
      });
      console.info(`  Interactive Example: ${interactiveURL.url}`);

      // Parse URL demonstration
      console.info(styled('\n🔗 URL Parsing:', 'info'));
      const parsed = await this.parseDocumentationURL(testURL.url);
      if (parsed.valid) {
        console.info(`  Category: ${parsed.category}`);
        console.info(`  Page: ${parsed.page}`);
        console.info(`  Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
      }

      console.info(styled('\n✅ Feature demonstration completed!', 'success'));
    } catch (error) {
      handleErrorFromUnknown(error, 'CLIDocumentationMCPServer.demonstrateFeatures', 'medium');
    }
  }

  /**
   * Ensure server is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CLI Documentation MCP Server not initialized');
    }
  }
}

/**
 * CLI Documentation CLI Interface
 */
export class CLIDocumentationCLI {
  private server: CLIDocumentationMCPServer;

  constructor() {
    this.server = new CLIDocumentationMCPServer();
  }

  /**
   * Handle CLI commands
   */
  async handleCommand(args: string[]): Promise<void> {
    const command = args[0];

    switch (command) {
      case 'status':
        await this.server.displayStatus();
        break;

      case 'demo':
        await this.server.demonstrateFeatures();
        break;

      case 'search':
        await this.handleSearch(args.slice(1));
        break;

      case 'get':
        await this.handleGet(args.slice(1));
        break;

      case 'parse':
        await this.handleParse(args.slice(1));
        break;

      case 'example':
        await this.handleExample(args.slice(1));
        break;

      default:
        this.showHelp();
    }
  }

  /**
   * Handle search command
   */
  private async handleSearch(args: string[]): Promise<void> {
    const query = args[0];
    if (!query) {
      console.info(styled('❌ Search query required', 'error'));
      return;
    }

    const results = await this.server.searchDocumentation(query);

    console.info(styled(`\n🔍 Search results for "${query}":`, 'info'));
    console.info(styled(`Found ${results.results.length} results`, 'muted'));

    results.results.forEach(result => {
      console.info(styled(`\n  📋 ${result.command}`, 'accent'));
      console.info(styled(`     Category: ${result.category}`, 'muted'));
      console.info(styled(`     Description: ${result.description}`, 'muted'));
      console.info(styled(`     URL: ${result.url}`, 'muted'));
    });

    console.info(styled(`\n🔗 Search URL: ${results.searchURL}`, 'success'));
  }

  /**
   * Handle get command
   */
  private async handleGet(args: string[]): Promise<void> {
    const category = args[0] as CLICategory;
    const page = args[1];

    if (!category) {
      console.info(styled('❌ Category required', 'error'));
      console.info(styled('Available categories:', 'muted'));
      console.info('  installation, commands, options, debugging, integration');
      return;
    }

    const result = await this.server.getDocumentationURL(category, page);

    if (result.valid) {
      console.info(styled(`\n📖 Documentation URL:`, 'success'));
      console.info(result.url);
    } else {
      console.info(styled('❌ Invalid documentation request', 'error'));
    }
  }

  /**
   * Handle parse command
   */
  private async handleParse(args: string[]): Promise<void> {
    const url = args[0];
    if (!url) {
      console.info(styled('❌ URL required', 'error'));
      return;
    }

    const result = await this.server.parseDocumentationURL(url);

    console.info(styled(`\n🔍 Parsed URL:`, 'info'));
    console.info(`  Valid: ${result.valid ? '✅' : '❌'}`);

    if (result.valid) {
      console.info(`  Category: ${result.category}`);
      console.info(`  Page: ${result.page}`);
      console.info(`  Fragment: ${JSON.stringify(result.fragment, null, 2)}`);
    }
  }

  /**
   * Handle example command
   */
  private async handleExample(args: string[]): Promise<void> {
    const category = args[0] as keyof typeof CLI_COMMAND_EXAMPLES;
    const commandName = args[1];
    const command = args[2];

    if (!category || !commandName || !command) {
      console.info(styled('❌ Category, command name, and command required', 'error'));
      console.info(styled('Example: cli-docs example BASIC TEST "bun test"', 'muted'));
      return;
    }

    const result = await this.server.generateCommandExample(category, commandName, command);

    if (result.valid) {
      console.info(styled(`\n💡 Example URL:`, 'success'));
      console.info(result.url);
    } else {
      console.info(styled('❌ Invalid example request', 'error'));
    }
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.info(
      styled(
        `
📚 CLI Documentation MCP Server CLI

Usage: cli-docs <command> [options]

Commands:
  status                    Display server status
  demo                      Demonstrate features
  search <query>            Search documentation
  get <category> [page]     Get documentation URL
  parse <url>               Parse documentation URL
  example <category> <name> <command>  Generate example URL

Examples:
  cli-docs status
  cli-docs search "build"
  cli-docs get commands TEST
  cli-docs parse "https://bun.sh/docs/cli/test#highlight=true"
  cli-docs example BASIC TEST "bun test"

Categories:
  installation, commands, options, debugging, integration
`,
        'muted'
      )
    );
  }
}

// Export singleton instance
export const cliDocumentationMCPServer = new CLIDocumentationMCPServer();
export const cliDocumentationCLI = new CLIDocumentationCLI();

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  cliDocumentationCLI.handleCommand(args).catch(console.error);
}
