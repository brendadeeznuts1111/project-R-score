#!/usr/bin/env bun

/**
 * 📚 CLI Documentation Integration Examples
 * 
 * Comprehensive examples demonstrating CLI documentation with URL fragment support
 */

import { 
  CLIDocumentationHandler, 
  CLIExampleGenerator, 
  CLIDocumentationSearch 
} from '../../lib/core/cli-documentation-handler.ts';
import { CLICategory, CLI_COMMAND_EXAMPLES } from '../../lib/docs/constants/cli.ts';
import { cliDocumentationMCPServer } from '../../lib/mcp/cli-documentation-mcp.ts';
import { URLHandler, URLFragmentUtils } from '../../lib/core/url-handler.ts';

/**
 * Example 1: Basic CLI Documentation URL Generation
 */
async function basicDocumentationURLs() {
  console.info('📚 Basic CLI Documentation URL Generation');
  console.info('='.repeat(50));

  // Generate various documentation URLs
  const installURL = CLIDocumentationHandler.generateInstallationURL('windows', {
    platform: 'windows',
    version: 'latest'
  });

  const testURL = CLIDocumentationHandler.generateCommandURL('TEST', {
    example: 'basic',
    highlight: 'true'
  });

  const debugURL = CLIDocumentationHandler.generateDebuggingURL('logging', {
    level: 'verbose',
    format: 'json'
  });

  console.info('🔗 Generated Documentation URLs:');
  console.info(`   Windows Installation: ${installURL}`);
  console.info(`   Test Command: ${testURL}`);
  console.info(`   Debug Logging: ${debugURL}`);

  // Parse generated URLs
  const parsedTest = CLIDocumentationHandler.parseDocumentationURL(testURL);
  console.info('\n🔍 Parsed Test URL:');
  console.info(`   Valid: ${parsedTest.valid}`);
  console.info(`   Category: ${parsedTest.category}`);
  console.info(`   Page: ${parsedTest.page}`);
  console.info(`   Fragment: ${JSON.stringify(parsedTest.fragment, null, 2)}`);
}

/**
 * Example 2: Advanced Fragment Operations
 */
async function advancedFragmentOperations() {
  console.info('\n🧩 Advanced Fragment Operations');
  console.info('='.repeat(50));

  // Create URL with multiple fragment parameters
  let url = CLIDocumentationHandler.generateDocumentationURL(
    CLICategory.COMMANDS,
    'BUILD',
    {
      example: 'production',
      target: 'browser',
      minify: 'true',
      sourcemap: 'external'
    }
  );

  console.info('🔗 Complex Documentation URL:');
  console.info(`   ${url}`);

  // Modify fragment parameters
  url = URLFragmentUtils.setFragmentParam(url, 'minify', 'false');
  url = URLFragmentUtils.setFragmentParam(url, 'splitting', 'true');
  url = URLFragmentUtils.removeFragmentParam(url, 'sourcemap');

  console.info('\n✏️ Modified URL:');
  console.info(`   ${url}`);

  // Extract specific fragment values
  const target = URLFragmentUtils.getFragmentParam(url, 'target');
  const minify = URLFragmentUtils.getFragmentParam(url, 'minify');
  const splitting = URLFragmentUtils.getFragmentParam(url, 'splitting');

  console.info('\n🔍 Fragment Parameters:');
  console.info(`   Target: ${target}`);
  console.info(`   Minify: ${minify}`);
  console.info(`   Splitting: ${splitting}`);
}

/**
 * Example 3: CLI Documentation Search
 */
async function documentationSearch() {
  console.info('\n🔍 CLI Documentation Search');
  console.info('='.repeat(50));

  const searchQueries = ['test', 'build', 'install', 'debug'];

  for (const query of searchQueries) {
    const results = CLIDocumentationSearch.searchCommands(query);
    const searchURL = CLIDocumentationSearch.generateSearchResultsURL(query, results);

    console.info(`\n🔍 Search for "${query}":`);
    console.info(`   Found ${results.length} results`);
    
    results.slice(0, 3).forEach(result => {
      console.info(`     📋 ${result.command} (${result.category})`);
      console.info(`        ${result.description}`);
    });

    console.info(`   🔗 Search URL: ${searchURL}`);
  }
}

/**
 * Example 4: Interactive Examples Generation
 */
async function interactiveExamples() {
  console.info('\n💡 Interactive Examples Generation');
  console.info('='.repeat(50));

  // Generate example with syntax highlighting
  const testExample = CLIExampleGenerator.generateExampleWithHighlighting(
    'BASIC',
    'TEST',
    'bun test --watch'
  );

  const buildExample = CLIExampleGenerator.generateExampleWithHighlighting(
    'ADVANCED',
    'BUILD',
    'bun build ./src/index.ts --outdir ./dist --target browser'
  );

  console.info('🎨 Syntax-Highlighted Examples:');
  console.info(`   Test Example: ${testExample}`);
  console.info(`   Build Example: ${buildExample}`);

  // Generate interactive examples
  const interactiveTest = CLIExampleGenerator.generateInteractiveExample('bun test', {
    runnable: true,
    editable: true,
    theme: 'dark'
  });

  const interactiveDev = CLIExampleGenerator.generateInteractiveExample('bun run dev', {
    runnable: true,
    editable: false,
    theme: 'light'
  });

  console.info('\n🚀 Interactive Examples:');
  console.info(`   Interactive Test: ${interactiveTest}`);
  console.info(`   Interactive Dev: ${interactiveDev}`);

  // Generate comparison examples
  const comparison = CLIExampleGenerator.generateComparisonURL(
    'bun install lodash',
    'npm install lodash',
    {
      category: 'package-management',
      showTiming: 'true'
    }
  );

  console.info('\n⚖️ Comparison Example:');
  console.info(`   Bun vs NPM: ${comparison}`);
}

/**
 * Example 5: Navigation Structure
 */
async function navigationStructure() {
  console.info('\n🧭 Navigation Structure');
  console.info('='.repeat(50));

  const navigation = CLIDocumentationHandler.generateNavigationStructure();

  console.info('📋 CLI Documentation Navigation:');
  navigation.forEach(({ category, title, pages }) => {
    console.info(`\n📂 ${title} (${category}):`);
    pages.slice(0, 5).forEach(page => {
      console.info(`   📄 ${page.name}`);
      console.info(`      ${page.url}`);
      if (page.fragment) {
        console.info(`      Fragment: ${JSON.stringify(page.fragment)}`);
      }
    });
    
    if (pages.length > 5) {
      console.info(`   ... and ${pages.length - 5} more pages`);
    }
  });

  // Generate breadcrumbs
  const testURL = CLIDocumentationHandler.generateDocumentationURL(
    CLICategory.COMMANDS,
    'TEST',
    { example: 'basic' }
  );

  const breadcrumbs = CLIDocumentationHandler.generateBreadcrumbs(testURL);
  console.info('\n🍞 Breadcrumbs for Test Documentation:');
  breadcrumbs.forEach((crumb, index) => {
    const arrow = index < breadcrumbs.length - 1 ? ' > ' : '';
    console.info(`   ${crumb.name}${arrow}`);
  });
}

/**
 * Example 6: Shareable Documentation Links
 */
async function shareableLinks() {
  console.info('\n🔗 Shareable Documentation Links');
  console.info('='.repeat(50));

  // Create shareable links with context
  const quickStartLink = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.INSTALLATION,
    page: 'MAIN',
    section: 'quick-start'
  }, 3600); // 1 hour expiry

  const testingGuideLink = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.COMMANDS,
    page: 'TEST',
    command: 'bun test',
    section: 'examples',
    example: 'basic'
  }, 7200); // 2 hours expiry

  const debuggingSetupLink = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.DEBUGGING,
    page: 'LOGGING',
    section: 'setup'
  }, 1800); // 30 minutes expiry

  console.info('🔗 Generated Shareable Links:');
  console.info(`   Quick Start: ${quickStartLink}`);
  console.info(`   Testing Guide: ${testingGuideLink}`);
  console.info(`   Debugging Setup: ${debuggingSetupLink}`);

  // Parse shareable links
  const parsedQuickStart = CLIDocumentationHandler.parseDocumentationURL(quickStartLink);
  console.info('\n🔍 Parsed Quick Start Link:');
  console.info(`   Valid: ${parsedQuickStart.valid}`);
  console.info(`   Fragment: ${JSON.stringify(parsedQuickStart.fragment, null, 2)}`);
}

/**
 * Example 7: Quick Reference URLs
 */
async function quickReferenceURLs() {
  console.info('\n🚀 Quick Reference URLs');
  console.info('='.repeat(50));

  const quickRefs = CLIDocumentationHandler.generateQuickReferenceURLs();

  console.info('⚡ Quick Reference URLs:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    console.info(`   ${name}: ${url}`);
  });

  // Validate all quick reference URLs
  console.info('\n✅ Validation Results:');
  Object.entries(quickRefs).forEach(([name, url]) => {
    const isValid = CLIDocumentationHandler.validateDocumentationURL(url);
    console.info(`   ${name}: ${isValid ? '✅' : '❌'}`);
  });
}

/**
 * Example 8: MCP Server Integration
 */
async function mcpServerIntegration() {
  console.info('\n🖥️ MCP Server Integration');
  console.info('='.repeat(50));

  // Initialize MCP server
  await cliDocumentationMCPServer.displayStatus();

  // Demonstrate MCP server features
  console.info('\n🎯 MCP Server Features Demonstration:');

  // Get documentation URL via MCP
  const docResult = await cliDocumentationMCPServer.getDocumentationURL(
    CLICategory.COMMANDS,
    'BUILD',
    { example: 'production' }
  );
  console.info(`   📖 Documentation URL: ${docResult.url}`);

  // Search via MCP
  const searchResult = await cliDocumentationMCPServer.searchDocumentation('test');
  console.info(`   🔍 Search Results: Found ${searchResult.results.length} results`);

  // Generate example via MCP
  const exampleResult = await cliDocumentationMCPServer.generateCommandExample(
    'BASIC',
    'TEST',
    'bun test --coverage'
  );
  console.info(`   💡 Example URL: ${exampleResult.url}`);

  // Get navigation via MCP
  const navigation = await cliDocumentationMCPServer.getNavigationStructure();
  console.info(`   🧭 Navigation: ${navigation.length} categories`);

  // Generate breadcrumbs via MCP
  const breadcrumbs = await cliDocumentationMCPServer.getBreadcrumbs(docResult.url);
  console.info(`   🍞 Breadcrumbs: ${breadcrumbs.length} items`);
}

/**
 * Example 9: Real-world Documentation Workflow
 */
async function realWorldWorkflow() {
  console.info('\n🌍 Real-world Documentation Workflow');
  console.info('='.repeat(50));

  // Simulate a developer workflow
  console.info('👨‍💻 Developer Documentation Workflow:');

  // 1. New developer wants to learn testing
  console.info('\n1️⃣ Learning Bun Testing:');
  const testingURL = CLIDocumentationHandler.generateDocumentationURL(
    CLICategory.COMMANDS,
    'TEST',
    {
      level: 'beginner',
      examples: 'true',
      interactive: 'true'
    }
  );
  console.info(`   📖 Start here: ${testingURL}`);

  // 2. Developer needs advanced build options
  console.info('\n2️⃣ Advanced Build Configuration:');
  const buildURL = CLIDocumentationHandler.generateDocumentationURL(
    CLICategory.OPTIONS,
    'CONFIG_FILE',
    {
      section: 'build',
      advanced: 'true',
      examples: 'production'
    }
  );
  console.info(`   ⚙️ Build config: ${buildURL}`);

  // 3. Developer encounters debugging needs
  console.info('\n3️⃣ Debugging Setup:');
  const debugURL = CLIDocumentationHandler.generateDebuggingURL('debugger', {
    ide: 'vscode',
    breakpoints: 'true',
    console: 'integrated'
  });
  console.info(`   🐛 Debug setup: ${debugURL}`);

  // 4. Create shareable learning path
  console.info('\n4️⃣ Shareable Learning Path:');
  const learningPath = CLIDocumentationHandler.createShareableLink({
    category: CLICategory.COMMANDS,
    section: 'learning-path',
    steps: 'test,build,debug',
    level: 'intermediate'
  }, 86400); // 24 hours

  console.info(`   🎓 Learning path: ${learningPath}`);

  // 5. Team member searches for specific topic
  console.info('\n5️⃣ Team Knowledge Search:');
  const searchResults = CLIDocumentationSearch.searchCommands('environment variables');
  console.info(`   🔍 Found ${searchResults.results.length} resources about environment variables`);

  // 6. Generate quick reference for team
  console.info('\n6️⃣ Team Quick Reference:');
  const teamQuickRef = CLIDocumentationHandler.generateQuickReferenceURLs();
  console.info('   📋 Quick reference created for team');
}

/**
 * Example 10: URL Fragment State Management
 */
async function fragmentStateManagement() {
  console.info('\n🧩 URL Fragment State Management');
  console.info('='.repeat(50));

  // Simulate application state management
  class DocumentationAppState {
    private currentState: Record<string, string> = {};

    // Save state to URL fragment
    saveStateToURL(baseURL: string, state: Record<string, string>): string {
      this.currentState = { ...this.currentState, ...state };
      return URLHandler.addFragment(baseURL, URLFragmentUtils.buildFragment(this.currentState));
    }

    // Restore state from URL fragment
    restoreStateFromURL(url: string): Record<string, string> {
      const fragment = URLHandler.getFragment(url);
      this.currentState = URLFragmentUtils.parseFragment(fragment);
      return this.currentState;
    }

    // Update specific state property
    updateState(baseURL: string, key: string, value: string): string {
      this.currentState[key] = value;
      return URLFragmentUtils.setFragmentParam(baseURL, key, value);
    }

    // Clear state
    clearState(baseURL: string): string {
      this.currentState = {};
      return URLHandler.removeFragment(baseURL);
    }
  }

  const appState = new DocumentationAppState();

  // Start with base URL
  let baseURL = 'https://bun.sh/docs/cli';

  // Save initial state
  baseURL = appState.saveStateToURL(baseURL, {
    view: 'commands',
    category: 'testing',
    example: 'basic'
  });

  console.info('🔄 State Management Demo:');
  console.info(`   Initial URL: ${baseURL}`);

  // Update specific property
  baseURL = appState.updateState(baseURL, 'example', 'advanced');
  console.info(`   Updated example: ${baseURL}`);

  // Add more state
  baseURL = appState.updateState(baseURL, 'highlight', 'true');
  console.info(`   Added highlight: ${baseURL}`);

  // Restore state
  const restoredState = appState.restoreStateFromURL(baseURL);
  console.info(`   Restored state: ${JSON.stringify(restoredState, null, 2)}`);

  // Clear state
  baseURL = appState.clearState(baseURL);
  console.info(`   Cleared state: ${baseURL}`);
}

/**
 * Main demonstration function
 */
async function main() {
  console.info('📚 CLI Documentation Integration Examples');
  console.info('='.repeat(70));
  console.info('');

  try {
    await basicDocumentationURLs();
    await advancedFragmentOperations();
    await documentationSearch();
    await interactiveExamples();
    await navigationStructure();
    await shareableLinks();
    await quickReferenceURLs();
    await mcpServerIntegration();
    await realWorldWorkflow();
    await fragmentStateManagement();

    console.info('\n✅ All CLI documentation integration examples completed successfully!');
    console.info('');
    console.info('📋 Key Features Demonstrated:');
    console.info('   • URL generation with fragment support');
    console.info('   • Advanced fragment parameter management');
    console.info('   • CLI documentation search functionality');
    console.info('   • Interactive example generation');
    console.info('   • Navigation structure and breadcrumbs');
    console.info('   • Shareable documentation links');
    console.info('   • MCP server integration');
    console.info('   • Real-world documentation workflows');
    console.info('   • URL fragment state management');

  } catch (error) {
    console.error('❌ Error in CLI documentation examples:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.main) {
  main();
}

export {
  basicDocumentationURLs,
  advancedFragmentOperations,
  documentationSearch,
  interactiveExamples,
  navigationStructure,
  shareableLinks,
  quickReferenceURLs,
  mcpServerIntegration,
  realWorldWorkflow,
  fragmentStateManagement
};
