// lib/core/cli-documentation-handler.ts — CLI documentation handler with deep linking

import { CLICategory, CLI_DOCUMENTATION_URLS, CLI_COMMAND_EXAMPLES } from '../docs/constants/cli';
import { URLHandler, URLFragmentUtils, FactoryWagerURLUtils } from './url-handler';
import { handleError } from './error-handling';

/**
 * CLI Documentation URL Generator
 */
export class CLIDocumentationHandler {
  private static readonly BASE_URL = 'https://bun.sh';

  /**
   * Generate CLI documentation URL with navigation fragments
   */
  static generateDocumentationURL(
    category: CLICategory,
    page?: string,
    fragment?: Record<string, string>
  ): string {
    try {
      // Get base documentation path
      const categoryURLs = CLI_DOCUMENTATION_URLS[category];
      if (!categoryURLs) {
        throw new Error(`Unknown CLI category: ${category}`);
      }

      // Determine the specific page
      const pagePath =
        page && categoryURLs[page as keyof typeof categoryURLs]
          ? categoryURLs[page as keyof typeof categoryURLs]
          : categoryURLs.MAIN;

      // Build full URL
      const baseURL = `${this.BASE_URL}${pagePath}`;

      // Add fragment if provided
      return fragment
        ? URLHandler.addFragment(baseURL, URLFragmentUtils.buildFragment(fragment))
        : baseURL;
    } catch (error) {
      handleError(error, 'CLIDocumentationHandler.generateDocumentationURL', 'medium');
      return `${this.BASE_URL}/docs/cli`;
    }
  }

  /**
   * Generate command-specific documentation URL
   */
  static generateCommandURL(command: string, fragment?: Record<string, string>): string {
    return this.generateDocumentationURL(CLICategory.COMMANDS, command.toUpperCase(), fragment);
  }

  /**
   * Generate installation guide URL for specific platform
   */
  static generateInstallationURL(
    platform: 'windows' | 'macos' | 'linux' | 'docker' | 'ci-cd',
    fragment?: Record<string, string>
  ): string {
    return this.generateDocumentationURL(
      CLICategory.INSTALLATION,
      platform.toUpperCase(),
      fragment
    );
  }

  /**
   * Generate debugging documentation URL
   */
  static generateDebuggingURL(
    topic: 'logging' | 'verbose' | 'debugger' | 'inspector' | 'profile' | 'trace',
    fragment?: Record<string, string>
  ): string {
    return this.generateDocumentationURL(CLICategory.DEBUGGING, topic.toUpperCase(), fragment);
  }

  /**
   * Parse CLI documentation URL
   */
  static parseDocumentationURL(url: string): {
    valid: boolean;
    category?: CLICategory;
    page?: string;
    fragment?: Record<string, string>;
  } {
    try {
      const parsed = URLHandler.parse(url);

      // Validate it's a bun.sh URL
      if (parsed.hostname !== 'bun.sh') {
        return { valid: false };
      }

      // Extract path and determine category
      const path = parsed.pathname;
      const fragment = parsed.hasFragment()
        ? URLFragmentUtils.parseFragment(parsed.fragment)
        : undefined;

      // Find matching category and page
      for (const [category, pages] of Object.entries(CLI_DOCUMENTATION_URLS)) {
        for (const [pageName, pagePath] of Object.entries(pages)) {
          if (path.endsWith(pagePath)) {
            return {
              valid: true,
              category: category as CLICategory,
              page: pageName,
              fragment,
            };
          }
        }
      }

      return { valid: false };
    } catch (error) {
      handleError(error, 'CLIDocumentationHandler.parseDocumentationURL', 'medium');
      return { valid: false };
    }
  }

  /**
   * Generate example URL with command highlighting
   */
  static generateExampleURL(
    category: keyof typeof CLI_COMMAND_EXAMPLES,
    command: string,
    fragment?: Record<string, string>
  ): string {
    const exampleFragment = {
      ...fragment,
      example: command,
      category: 'cli-examples',
      highlight: 'true',
    };

    return this.generateDocumentationURL(CLICategory.COMMANDS, undefined, exampleFragment);
  }

  /**
   * Create shareable documentation link with context
   */
  static createShareableLink(
    context: {
      category: CLICategory;
      page?: string;
      command?: string;
      section?: string;
      example?: string;
    },
    expiresIn?: number
  ): string {
    const fragment: Record<string, string> = {
      context: 'cli-docs',
      timestamp: new Date().toISOString(),
    };

    if (context.command) fragment.command = context.command;
    if (context.section) fragment.section = context.section;
    if (context.example) fragment.example = context.example;
    if (expiresIn) fragment.expires = new Date(Date.now() + expiresIn * 1000).toISOString();

    return this.generateDocumentationURL(context.category, context.page, fragment);
  }

  /**
   * Generate navigation structure for CLI docs
   */
  static generateNavigationStructure(): Array<{
    category: CLICategory;
    title: string;
    pages: Array<{ name: string; url: string; fragment?: Record<string, string> }>;
  }> {
    const navigation: Array<{
      category: CLICategory;
      title: string;
      pages: Array<{ name: string; url: string; fragment?: Record<string, string> }>;
    }> = [];

    for (const [category, pages] of Object.entries(CLI_DOCUMENTATION_URLS)) {
      const categoryPages = Object.entries(pages).map(([name, path]) => ({
        name: name.toLowerCase().replace(/_/g, ' '),
        url: `${this.BASE_URL}${path}`,
        fragment: { category, page: name },
      }));

      navigation.push({
        category: category as CLICategory,
        title: category.charAt(0).toUpperCase() + category.slice(1),
        pages: categoryPages,
      });
    }

    return navigation;
  }

  /**
   * Generate search URL for CLI documentation
   */
  static generateSearchURL(
    query: string,
    category?: CLICategory,
    fragment?: Record<string, string>
  ): string {
    const searchFragment = {
      ...fragment,
      search: query,
      type: 'cli-search',
    };

    if (category) {
      searchFragment.category = category;
    }

    return URLHandler.addFragment(
      `${this.BASE_URL}/docs/cli`,
      URLFragmentUtils.buildFragment(searchFragment)
    );
  }

  /**
   * Generate quick reference URLs
   */
  static generateQuickReferenceURLs(): Record<string, string> {
    return {
      installation: this.generateInstallationURL('windows', { quick: 'true' }),
      basicCommands: this.generateDocumentationURL(CLICategory.COMMANDS, 'RUN', { quick: 'true' }),
      testing: this.generateDocumentationURL(CLICategory.COMMANDS, 'TEST', { quick: 'true' }),
      building: this.generateDocumentationURL(CLICategory.COMMANDS, 'BUILD', { quick: 'true' }),
      debugging: this.generateDebuggingURL('logging', { quick: 'true' }),
      configuration: this.generateDocumentationURL(CLICategory.OPTIONS, 'CONFIG_FILE', {
        quick: 'true',
      }),
    };
  }

  /**
   * Validate CLI documentation URL
   */
  static validateDocumentationURL(url: string): boolean {
    try {
      const parsed = this.parseDocumentationURL(url);
      return parsed.valid;
    } catch {
      return false;
    }
  }

  /**
   * Generate breadcrumb navigation
   */
  static generateBreadcrumbs(url: string): Array<{ name: string; url: string }> {
    try {
      const parsed = this.parseDocumentationURL(url);
      if (!parsed.valid) {
        return [{ name: 'CLI Documentation', url: `${this.BASE_URL}/docs/cli` }];
      }

      const breadcrumbs = [{ name: 'CLI Documentation', url: `${this.BASE_URL}/docs/cli` }];

      if (parsed.category) {
        const categoryURL = this.generateDocumentationURL(parsed.category);
        breadcrumbs.push({
          name: parsed.category.charAt(0).toUpperCase() + parsed.category.slice(1),
          url: categoryURL,
        });
      }

      if (parsed.page) {
        const pageURL = this.generateDocumentationURL(parsed.category!, parsed.page);
        breadcrumbs.push({
          name: parsed.page.toLowerCase().replace(/_/g, ' '),
          url: pageURL,
        });
      }

      return breadcrumbs;
    } catch (error) {
      handleError(error, 'CLIDocumentationHandler.generateBreadcrumbs', 'medium');
      return [{ name: 'CLI Documentation', url: `${this.BASE_URL}/docs/cli` }];
    }
  }
}

/**
 * CLI Example Generator
 */
export class CLIExampleGenerator {
  /**
   * Generate example with syntax highlighting fragment
   */
  static generateExampleWithHighlighting(
    category: keyof typeof CLI_COMMAND_EXAMPLES,
    commandName: string,
    command: string
  ): string {
    const fragment = {
      example: command,
      category: 'cli-examples',
      highlight: 'true',
      syntax: 'bash',
      line: '1',
    };

    return CLIDocumentationHandler.generateExampleURL(category, commandName, fragment);
  }

  /**
   * Generate interactive example URL
   */
  static generateInteractiveExampleURL(
    command: string,
    options?: {
      runnable?: boolean;
      editable?: boolean;
      theme?: 'light' | 'dark';
    }
  ): string {
    const fragment = {
      command,
      interactive: 'true',
      ...options,
    };

    return URLHandler.addFragment(
      `${CLIDocumentationHandler['BASE_URL']}/examples/cli`,
      URLFragmentUtils.buildFragment(fragment)
    );
  }

  /**
   * Generate comparison example URL
   */
  static generateComparisonURL(
    bunCommand: string,
    npmCommand: string,
    fragment?: Record<string, string>
  ): string {
    const comparisonFragment = {
      ...fragment,
      bun: bunCommand,
      npm: npmCommand,
      type: 'comparison',
    };

    return URLHandler.addFragment(
      `${CLIDocumentationHandler['BASE_URL']}/docs/comparisons`,
      URLFragmentUtils.buildFragment(comparisonFragment)
    );
  }
}

/**
 * CLI Documentation Search
 */
export class CLIDocumentationSearch {
  /**
   * Search for CLI commands by keyword
   */
  static searchCommands(keyword: string): Array<{
    command: string;
    category: CLICategory;
    url: string;
    description?: string;
  }> {
    const results: Array<{
      command: string;
      category: CLICategory;
      url: string;
      description?: string;
    }> = [];

    const keywordLower = keyword.toLowerCase();

    // Search in command URLs
    for (const [category, pages] of Object.entries(CLI_DOCUMENTATION_URLS)) {
      for (const [pageName, pagePath] of Object.entries(pages)) {
        if (
          pageName.toLowerCase().includes(keywordLower) ||
          pagePath.toLowerCase().includes(keywordLower)
        ) {
          results.push({
            command: pageName,
            category: category as CLICategory,
            url: `${CLIDocumentationHandler['BASE_URL']}${pagePath}`,
            description: `${category} - ${pageName}`,
          });
        }
      }
    }

    // Search in command examples
    for (const [category, commands] of Object.entries(CLI_COMMAND_EXAMPLES)) {
      for (const [name, command] of Object.entries(commands)) {
        if (
          command.toLowerCase().includes(keywordLower) ||
          name.toLowerCase().includes(keywordLower)
        ) {
          results.push({
            command: name,
            category: CLICategory.COMMANDS,
            url: CLIDocumentationHandler.generateExampleURL(
              category as keyof typeof CLI_COMMAND_EXAMPLES,
              name
            ),
            description: `Example: ${command}`,
          });
        }
      }
    }

    return results;
  }

  /**
   * Generate search results URL
   */
  static generateSearchResultsURL(
    query: string,
    results: Array<{ command: string; url: string }>
  ): string {
    const fragment = {
      search: query,
      results: results.map(r => r.command).join(','),
      count: results.length.toString(),
      type: 'search-results',
    };

    return CLIDocumentationHandler.generateSearchURL(query, undefined, fragment);
  }
}

// Export default handler
export default CLIDocumentationHandler;
