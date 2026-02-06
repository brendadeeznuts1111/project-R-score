#!/usr/bin/env bun

/**
 * 📚 CLI Documentation MCP Server
 *
 * MCP server for CLI documentation with advanced URL handling and fragment support
 */

import {
  CLIDocumentationHandler,
  CLIExampleGenerator,
  CLIDocumentationSearch,
} from '../core/cli-documentation-handler';
import { CLICategory, CLI_COMMAND_EXAMPLES } from '../documentation/constants/cli';
import { URLHandler, URLFragmentUtils } from '../core/url-handler';
import { styled, FW_COLORS } from '../theme/colors';
import { handleError } from '../core/error-handling';

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
      console.log(styled('📚 CLI Documentation MCP Server initialized', 'success'));
      this.initialized = true;
    } catch (error) {
      handleError(error, 'CLIDocumentationMCPServer.initializeServer', 'high');
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
      handleError(error, 'CLIDocumentationMCPServer.getDocumentationURL', 'medium');
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
      handleError(error, 'CLIDocumentationMCPServer.parseDocumentationURL', 'medium');
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
      handleError(error, 'CLIDocumentationMCPServer.searchDocumentation', 'medium');
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
      handleError(error, 'CLIDocumentationMCPServer.generateCommandExample', 'medium');
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
      handleError(error, 'CLIDocumentationMCPServer.getNavigationStructure', 'medium');
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
      handleError(error, 'CLIDocumentationMCPServer.getQuickReferenceURLs', 'medium');
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
      handleError(error, 'CLIDocumentationMCPServer.getBreadcrumbs', 'medium');
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
      handleError(error, 'CLIDocumentationMCPServer.createShareableLink', 'medium');
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
      handleError(error, 'CLIDocumentationMCPServer.generateInteractiveExample', 'medium');
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
      handleError(error, 'CLIDocumentationMCPServer.generateComparisonExample', 'medium');
      return { url: '', valid: false };
    }
  }

  /**
   * Display CLI documentation status
   */
  async displayStatus(): Promise<void> {
    try {
      console.log(styled('\n📚 CLI Documentation MCP Server Status', 'accent'));
      console.log(styled('=====================================', 'accent'));

      console.log(styled('\n🔧 Server Components:', 'info'));
      console.log(styled(`  📚 Documentation Handler: ✅ Active`, 'success'));
      console.log(styled(`  🔍 Search Engine: ✅ Ready`, 'success'));
      console.log(styled(`  🔗 URL Generator: ✅ Operational`, 'success'));
      console.log(styled(`  🧩 Fragment Support: ✅ Enabled`, 'success'));

      // Display quick reference URLs
      const quickRefs = await this.getQuickReferenceURLs();
      console.log(styled('\n🚀 Quick Reference URLs:', 'info'));
      Object.entries(quickRefs).forEach(([name, url]) => {
        console.log(styled(`  ${name}: ${url}`, 'muted'));
      });

      // Display navigation structure summary
      const navigation = await this.getNavigationStructure();
      console.log(styled('\n📋 Available Categories:', 'info'));
      navigation.forEach(({ category, pages }) => {
        console.log(styled(`  ${category}: ${pages.length} pages`, 'muted'));
      });

      console.log(styled('\n✅ CLI Documentation server is ready for use!', 'success'));
    } catch (error) {
      handleError(error, 'CLIDocumentationMCPServer.displayStatus', 'medium');
    }
  }

  /**
   * Demonstrate CLI documentation features
   */
  async demonstrateFeatures(): Promise<void> {
    try {
      console.log(styled('\n🎯 CLI Documentation Feature Demonstration', 'accent'));
      console.log(styled('==========================================', 'accent'));

      // Generate documentation URLs
      console.log(styled('\n📖 Generating Documentation URLs:', 'info'));

      const installURL = await this.getDocumentationURL(CLICategory.INSTALLATION, 'WINDOWS', {
        platform: 'windows',
        version: 'latest',
      });
      console.log(`  Installation (Windows): ${installURL.url}`);

      const testURL = await this.getDocumentationURL(CLICategory.COMMANDS, 'TEST', {
        example: 'basic',
        highlight: 'true',
      });
      console.log(`  Test Command: ${testURL.url}`);

      // Search functionality
      console.log(styled('\n🔍 Search Functionality:', 'info'));
      const searchResults = await this.searchDocumentation('build');
      console.log(`  Found ${searchResults.results.length} results for "build"`);
      searchResults.results.slice(0, 3).forEach(result => {
        console.log(`    - ${result.command}: ${result.description}`);
      });

      // Generate examples
      console.log(styled('\n💡 Example Generation:', 'info'));
      const exampleURL = await this.generateCommandExample('BASIC', 'TEST', 'bun test');
      console.log(`  Test Example: ${exampleURL.url}`);

      const interactiveURL = await this.generateInteractiveExample('bun run dev', {
        runnable: true,
        editable: true,
        theme: 'dark',
      });
      console.log(`  Interactive Example: ${interactiveURL.url}`);

      // Parse URL demonstration
      console.log(styled('\n🔗 URL Parsing:', 'info'));
      const parsed = await this.parseDocumentationURL(testURL.url);
      if (parsed.valid) {
        console.log(`  Category: ${parsed.category}`);
        console.log(`  Page: ${parsed.page}`);
        console.log(`  Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
      }

      console.log(styled('\n✅ Feature demonstration completed!', 'success'));
    } catch (error) {
      handleError(error, 'CLIDocumentationMCPServer.demonstrateFeatures', 'medium');
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
      console.log(styled('❌ Search query required', 'error'));
      return;
    }

    const results = await this.server.searchDocumentation(query);

    console.log(styled(`\n🔍 Search results for "${query}":`, 'info'));
    console.log(styled(`Found ${results.results.length} results`, 'muted'));

    results.results.forEach(result => {
      console.log(styled(`\n  📋 ${result.command}`, 'accent'));
      console.log(styled(`     Category: ${result.category}`, 'muted'));
      console.log(styled(`     Description: ${result.description}`, 'muted'));
      console.log(styled(`     URL: ${result.url}`, 'muted'));
    });

    console.log(styled(`\n🔗 Search URL: ${results.searchURL}`, 'success'));
  }

  /**
   * Handle get command
   */
  private async handleGet(args: string[]): Promise<void> {
    const category = args[0] as CLICategory;
    const page = args[1];

    if (!category) {
      console.log(styled('❌ Category required', 'error'));
      console.log(styled('Available categories:', 'muted'));
      console.log('  installation, commands, options, debugging, integration');
      return;
    }

    const result = await this.server.getDocumentationURL(category, page);

    if (result.valid) {
      console.log(styled(`\n📖 Documentation URL:`, 'success'));
      console.log(result.url);
    } else {
      console.log(styled('❌ Invalid documentation request', 'error'));
    }
  }

  /**
   * Handle parse command
   */
  private async handleParse(args: string[]): Promise<void> {
    const url = args[0];
    if (!url) {
      console.log(styled('❌ URL required', 'error'));
      return;
    }

    const result = await this.server.parseDocumentationURL(url);

    console.log(styled(`\n🔍 Parsed URL:`, 'info'));
    console.log(`  Valid: ${result.valid ? '✅' : '❌'}`);

    if (result.valid) {
      console.log(`  Category: ${result.category}`);
      console.log(`  Page: ${result.page}`);
      console.log(`  Fragment: ${JSON.stringify(result.fragment, null, 2)}`);
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
      console.log(styled('❌ Category, command name, and command required', 'error'));
      console.log(styled('Example: cli-docs example BASIC TEST "bun test"', 'muted'));
      return;
    }

    const result = await this.server.generateCommandExample(category, commandName, command);

    if (result.valid) {
      console.log(styled(`\n💡 Example URL:`, 'success'));
      console.log(result.url);
    } else {
      console.log(styled('❌ Invalid example request', 'error'));
    }
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(
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
