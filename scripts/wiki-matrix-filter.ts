#!/usr/bin/env bun

/**
 * 🎯 FactoryWager Wiki Matrix - Advanced Filter System
 *
 * Supports pattern matching, filtering, and advanced search capabilities
 * using Bun's filter patterns and custom logic.
 */

import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp.ts';
import { styled, FW_COLORS, colorBar } from '../lib/theme/colors.ts';

interface FilterOptions {
  pattern?: string;
  format?: string;
  complexity?: string;
  useCase?: string;
  hasExamples?: boolean;
  hasCustomSections?: boolean;
  integration?: string;
  sortBy?: string;
  limit?: number;
}

interface TemplateInfo {
  name: string;
  description: string;
  baseUrl: string;
  workspace: string;
  format: string;
  useCase: string;
  complexity: string;
  examples: boolean;
  customSections: number;
  integration: string;
}

class WikiMatrixFilter {
  private templates: TemplateInfo[] = [];

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    const wikiTemplates = MCPWikiGenerator.getWikiTemplates();

    this.templates = wikiTemplates.map(template => ({
      name: template.name,
      description: template.description,
      baseUrl: template.baseUrl,
      workspace: template.workspace,
      format: template.format,
      useCase: this.determineUseCase(template.name),
      complexity: this.determineComplexity(template),
      examples: template.includeExamples,
      customSections: template.customSections?.length || 0,
      integration: this.determineIntegration(template.format),
    }));
  }

  private determineUseCase(name: string): string {
    if (name.includes('Confluence')) return 'Enterprise Wiki';
    if (name.includes('Notion')) return 'Team Collaboration';
    if (name.includes('GitHub')) return 'Open Source';
    if (name.includes('Internal')) return 'Company Portal';
    if (name.includes('API')) return 'Developer Docs';
    return 'General Purpose';
  }

  private determineComplexity(template: any): string {
    let score = 0;
    if (template.customSections?.length > 2) score += 2;
    if (template.format === 'json') score += 1;
    if (!template.includeExamples) score += 1;
    if (template.baseUrl.includes('atlassian')) score += 1;

    if (score <= 1) return 'Simple';
    if (score <= 3) return 'Medium';
    return 'Advanced';
  }

  private determineIntegration(format: string): string {
    switch (format) {
      case 'markdown':
        return 'Direct Import';
      case 'html':
        return 'Embed/IFrame';
      case 'json':
        return 'API Integration';
      default:
        return 'Manual';
    }
  }

  // Pattern matching similar to Bun's --filter
  private matchesPattern(text: string, pattern: string): boolean {
    if (!pattern) return true;

    // Support glob patterns
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');

    const regex = new RegExp(regexPattern, 'i');
    return regex.test(text);
  }

  filterTemplates(options: FilterOptions): TemplateInfo[] {
    let filtered = [...this.templates];

    // Pattern matching on name and description
    if (options.pattern) {
      filtered = filtered.filter(
        template =>
          this.matchesPattern(template.name, options.pattern!) ||
          this.matchesPattern(template.description, options.pattern!)
      );
    }

    // Format filter
    if (options.format) {
      filtered = filtered.filter(template => this.matchesPattern(template.format, options.format!));
    }

    // Complexity filter
    if (options.complexity) {
      filtered = filtered.filter(template =>
        this.matchesPattern(template.complexity, options.complexity!)
      );
    }

    // Use case filter
    if (options.useCase) {
      filtered = filtered.filter(template =>
        this.matchesPattern(template.useCase, options.useCase!)
      );
    }

    // Examples filter
    if (options.hasExamples !== undefined) {
      filtered = filtered.filter(template => template.examples === options.hasExamples);
    }

    // Custom sections filter
    if (options.hasCustomSections !== undefined) {
      filtered = filtered.filter(
        template => template.customSections > 0 === options.hasCustomSections
      );
    }

    // Integration filter
    if (options.integration) {
      filtered = filtered.filter(template =>
        this.matchesPattern(template.integration, options.integration!)
      );
    }

    // Sorting
    if (options.sortBy) {
      filtered.sort((a, b) => {
        const aValue = a[options.sortBy as keyof TemplateInfo];
        const bValue = b[options.sortBy as keyof TemplateInfo];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return aValue - bValue;
        }

        return 0;
      });
    }

    // Limit results
    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  displayFilterResults(results: TemplateInfo[], options: FilterOptions): void {
    console.info(styled('\n🔍 Filter Results', 'primary'));
    console.info(colorBar('primary', 50));

    // Show applied filters
    console.info(styled('Applied Filters:', 'info'));
    if (options.pattern) console.info(styled(`  Pattern: ${options.pattern}`, 'muted'));
    if (options.format) console.info(styled(`  Format: ${options.format}`, 'muted'));
    if (options.complexity) console.info(styled(`  Complexity: ${options.complexity}`, 'muted'));
    if (options.useCase) console.info(styled(`  Use Case: ${options.useCase}`, 'muted'));
    if (options.hasExamples !== undefined)
      console.info(styled(`  Has Examples: ${options.hasExamples}`, 'muted'));
    if (options.hasCustomSections !== undefined)
      console.info(styled(`  Has Custom Sections: ${options.hasCustomSections}`, 'muted'));
    if (options.integration) console.info(styled(`  Integration: ${options.integration}`, 'muted'));
    if (options.sortBy) console.info(styled(`  Sorted by: ${options.sortBy}`, 'muted'));
    if (options.limit) console.info(styled(`  Limited to: ${options.limit}`, 'muted'));
    console.info('');

    if (results.length === 0) {
      console.info(styled('No templates match the specified filters.', 'warning'));
      return;
    }

    console.info(styled(`Found ${results.length} matching templates:`, 'success'));
    console.info('');

    // Display results in table format
    this.displayResultsTable(results);
  }

  private displayResultsTable(results: TemplateInfo[]): void {
    const headers = ['Name', 'Format', 'Complexity', 'Use Case', 'Examples', 'Integration'];
    const colWidths = [25, 10, 12, 18, 8, 16];

    const createSeparator = (left: string, middle: string, right: string, cross: string) => {
      let line = left;
      colWidths.forEach((width, i) => {
        line += '─'.repeat(width);
        if (i < colWidths.length - 1) line += cross;
      });
      return line + right;
    };

    const topBorder = createSeparator('┌', '┬', '┐', '┼');
    const headerSeparator = createSeparator('├', '┼', '┤', '┼');
    const bottomBorder = createSeparator('└', '┴', '┘', '┴');

    console.info(styled(topBorder, 'muted'));

    // Header row
    let headerRow = '│';
    headers.forEach((header, i) => {
      const paddedHeader = header.padEnd(colWidths[i]);
      headerRow += ` ${styled(paddedHeader, 'accent')} │`;
    });
    console.info(headerRow);

    console.info(styled(headerSeparator, 'muted'));

    // Data rows
    results.forEach((template, rowIndex) => {
      let dataRow = '│';

      const values = [
        template.name,
        template.format.toUpperCase(),
        template.complexity,
        template.useCase,
        template.examples ? '✅' : '❌',
        template.integration,
      ];

      values.forEach((value, colIndex) => {
        let color = 'muted';
        let displayValue = String(value);

        // Apply color coding
        switch (colIndex) {
          case 0: // Name
            color = 'primary';
            break;
          case 1: // Format
            color = value === 'MARKDOWN' ? 'success' : value === 'HTML' ? 'warning' : 'error';
            break;
          case 2: // Complexity
            color = value === 'Simple' ? 'success' : value === 'Medium' ? 'warning' : 'error';
            break;
          case 3: // Use Case
            color = 'info';
            break;
          case 4: // Examples
            color = value === '✅' ? 'success' : 'error';
            break;
          case 5: // Integration
            color = 'accent';
            break;
        }

        const paddedValue = displayValue.padEnd(colWidths[colIndex]);
        dataRow += ` ${styled(paddedValue, color)} │`;
      });
      console.info(dataRow);

      if (rowIndex < results.length - 1) {
        console.info(styled(createSeparator('├', '┼', '┤', '┼'), 'muted'));
      }
    });

    console.info(styled(bottomBorder, 'muted'));
  }

  // Advanced search with multiple criteria
  advancedSearch(criteria: {
    namePattern?: string;
    descriptionPattern?: string;
    formats?: string[];
    complexities?: string[];
    useCases?: string[];
    mustHaveExamples?: boolean;
    mustHaveCustomSections?: boolean;
    integrations?: string[];
  }): TemplateInfo[] {
    return this.templates.filter(template => {
      // Name pattern
      if (criteria.namePattern && !this.matchesPattern(template.name, criteria.namePattern)) {
        return false;
      }

      // Description pattern
      if (
        criteria.descriptionPattern &&
        !this.matchesPattern(template.description, criteria.descriptionPattern)
      ) {
        return false;
      }

      // Format filter
      if (criteria.formats && criteria.formats.length > 0) {
        if (!criteria.formats.some(format => this.matchesPattern(template.format, format))) {
          return false;
        }
      }

      // Complexity filter
      if (criteria.complexities && criteria.complexities.length > 0) {
        if (
          !criteria.complexities.some(complexity =>
            this.matchesPattern(template.complexity, complexity)
          )
        ) {
          return false;
        }
      }

      // Use case filter
      if (criteria.useCases && criteria.useCases.length > 0) {
        if (!criteria.useCases.some(useCase => this.matchesPattern(template.useCase, useCase))) {
          return false;
        }
      }

      // Examples requirement
      if (criteria.mustHaveExamples && !template.examples) {
        return false;
      }

      // Custom sections requirement
      if (criteria.mustHaveCustomSections && template.customSections === 0) {
        return false;
      }

      // Integration filter
      if (criteria.integrations && criteria.integrations.length > 0) {
        if (
          !criteria.integrations.some(integration =>
            this.matchesPattern(template.integration, integration)
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }

  // Show available filter options
  showFilterHelp(): void {
    console.info(styled('\n🎯 Wiki Matrix Filter Options', 'accent'));
    console.info(styled('=============================', 'accent'));
    console.info('');
    console.info(styled('Pattern Matching (like bun --filter):', 'primary'));
    console.info(styled('  *        - Match any characters', 'info'));
    console.info(styled('  ?        - Match single character', 'info'));
    console.info(styled('  ba*      - Start with "ba"', 'info'));
    console.info(styled('  *ence    - End with "ence"', 'info'));
    console.info(styled('  *nfl*    - Contain "nfl"', 'info'));
    console.info('');
    console.info(styled('Available Filters:', 'primary'));
    console.info(styled('  --pattern              - Pattern match on name/description', 'info'));
    console.info(
      styled('  --format               - Filter by format (markdown, html, json)', 'info')
    );
    console.info(
      styled('  --complexity           - Filter by complexity (Simple, Medium, Advanced)', 'info')
    );
    console.info(styled('  --use-case             - Filter by use case', 'info'));
    console.info(styled('  --has-examples         - Filter by examples (true/false)', 'info'));
    console.info(
      styled('  --has-custom-sections  - Filter by custom sections (true/false)', 'info')
    );
    console.info(styled('  --integration          - Filter by integration type', 'info'));
    console.info(
      styled('  --sort-by              - Sort results (name, format, complexity, useCase)', 'info')
    );
    console.info(styled('  --limit                - Limit number of results', 'info'));
    console.info('');
    console.info(styled('Examples:', 'primary'));
    console.info(styled('  bun run scripts/wiki-matrix-filter.ts --pattern "*nfl*" ', 'muted'));
    console.info(
      styled(
        '  bun run scripts/wiki-matrix-filter.ts --format markdown --has-examples true',
        'muted'
      )
    );
    console.info(
      styled(
        '  bun run scripts/wiki-matrix-filter.ts --complexity "Simple*" --sort-by name',
        'muted'
      )
    );
    console.info(
      styled('  bun run scripts/wiki-matrix-filter.ts --use-case "*Enterprise*" --limit 3', 'muted')
    );
    console.info('');
  }
}

// CLI execution
if (import.meta.main) {
  const filter = new WikiMatrixFilter();
  const args = Bun.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    filter.showFilterHelp();
    process.exit(0);
  }

  // Parse command line arguments
  const options: FilterOptions = {};

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--pattern':
        options.pattern = value;
        break;
      case '--format':
        options.format = value;
        break;
      case '--complexity':
        options.complexity = value;
        break;
      case '--use-case':
        options.useCase = value;
        break;
      case '--has-examples':
        options.hasExamples = value === 'true';
        break;
      case '--has-custom-sections':
        options.hasCustomSections = value === 'true';
        break;
      case '--integration':
        options.integration = value;
        break;
      case '--sort-by':
        options.sortBy = value;
        break;
      case '--limit':
        options.limit = parseInt(value);
        break;
    }
  }

  // Validate input parameters
  if (options.limit && (options.limit < 1 || options.limit > 1000)) {
    console.error(styled('❌ Limit must be between 1 and 1000', 'error'));
    process.exit(1);
  }

  // Validate sortBy parameter
  if (options.sortBy) {
    const validSortFields = ['name', 'format', 'complexity', 'useCase', 'examples', 'integration'];
    if (!validSortFields.includes(options.sortBy)) {
      console.error(styled(`❌ Invalid sort field: ${options.sortBy}`, 'error'));
      console.error(styled(`Valid fields: ${validSortFields.join(', ')}`, 'muted'));
      process.exit(1);
    }
  }

  // Validate boolean parameters
  if (options.hasExamples !== undefined && typeof options.hasExamples !== 'boolean') {
    console.error(styled('❌ has-examples must be true or false', 'error'));
    process.exit(1);
  }

  if (options.hasCustomSections !== undefined && typeof options.hasCustomSections !== 'boolean') {
    console.error(styled('❌ has-custom-sections must be true or false', 'error'));
    process.exit(1);
  }

  // Apply filters and display results
  const results = filter.filterTemplates(options);
  filter.displayFilterResults(results, options);
}
