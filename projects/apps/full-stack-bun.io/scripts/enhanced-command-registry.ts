#!/usr/bin/env bun
/**
 * Enhanced Command Registry - Type-safe slash commands with autocompletion
 * CMD.*.SCHEMA - @param schema declarations + NL-mapper + interactive flows
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

interface CommandSchema {
  [paramDeclaration: string]: {
    description: string;
    required: boolean;
    validation?: {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      enum?: string[];
    };
    autocomplete?: string[];
    default?: any;
    type?: string;
    enum?: string[];
  };
}

interface NLMapping {
  [naturalLanguage: string]: string; // Maps natural language to full command
}

interface EnhancedCommandDefinition {
  name: string;
  description: string;
  command: string;
  handler: string;
  schema: CommandSchema;
  nl_mapping: NLMapping;
  examples: string[];
  tags: string[];
  interactive?: boolean;
  requires_confirmation?: boolean;
}

interface AliasDefinition {
  aliases: Record<string, string>;
  metadata: {
    version: string;
    created: string;
    updated: string;
    user: string;
  };
  categories: Record<string, string[]>;
}

class EnhancedCommandRegistry {
  private commandsPath: string;
  private aliasPath: string;
  private commands: Map<string, EnhancedCommandDefinition> = new Map();
  private aliases: AliasDefinition;

  constructor() {
    this.commandsPath = join(process.cwd(), '.cursor', 'commands');
    this.aliasPath = join(process.cwd(), '.cursor', 'alias.json');
    this.loadCommands();
    this.loadAliases();
  }

  // Load enhanced command definitions
  private loadCommands(): void {
    if (!existsSync(this.commandsPath)) {
      console.warn('Commands directory not found:', this.commandsPath);
      return;
    }

    const files = [
      'coder.json', 'reviewer.json', 'installer.json', 'workflow.json',
      'deploy.json', 'test.json', 'security.json', 'lint.json',
      'build.json', 'logs.json', 'metrics.json', 'backup.json'
    ];

    for (const file of files) {
      const filePath = join(this.commandsPath, file);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const command: EnhancedCommandDefinition = JSON.parse(content);
          this.commands.set(command.name, command);
        } catch (error) {
          console.warn(`Failed to load command ${file}:`, error.message);
        }
      }
    }

    console.log(`Loaded ${this.commands.size} enhanced commands`);
  }

  // Load alias definitions
  private loadAliases(): void {
    try {
      if (existsSync(this.aliasPath)) {
        const content = readFileSync(this.aliasPath, 'utf-8');
        this.aliases = JSON.parse(content);
      } else {
        // Create default aliases
        this.aliases = {
          aliases: {},
          metadata: {
            version: '1.0.0',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            user: process.env.USER || 'unknown'
          },
          categories: {}
        };
        this.saveAliases();
      }
    } catch (error) {
      console.warn('Failed to load aliases:', error.message);
      this.aliases = { aliases: {}, metadata: { version: '1.0.0', created: '', updated: '', user: '' }, categories: {} };
    }
  }

  private saveAliases(): void {
    try {
      this.aliases.metadata.updated = new Date().toISOString();
      writeFileSync(this.aliasPath, JSON.stringify(this.aliases, null, 2));
    } catch (error) {
      console.warn('Failed to save aliases:', error.message);
    }
  }

  // Parse natural language to command
  parseNaturalLanguage(input: string): string {
    // Remove common prefixes
    const cleanInput = input.toLowerCase().trim();

    // Check all commands for NL mappings
    for (const command of this.commands.values()) {
      if (command.nl_mapping) {
        for (const [nlPattern, fullCommand] of Object.entries(command.nl_mapping)) {
          if (cleanInput.includes(nlPattern.toLowerCase())) {
            // Replace placeholders with extracted values
            let result = fullCommand;

            // Extract specific values (simple implementation)
            if (cleanInput.includes('deploy') && cleanInput.includes('to prod')) {
              result = result.replace('main-api', this.extractServiceName(cleanInput) || 'main-api');
            }

            return result;
          }
        }
      }
    }

    // Check aliases
    for (const [alias, command] of Object.entries(this.aliases.aliases)) {
      if (cleanInput === alias || cleanInput.startsWith(alias + ' ')) {
        return command + cleanInput.substring(alias.length);
      }
    }

    return input; // Return original if no mapping found
  }

  private extractServiceName(input: string): string | null {
    // Simple service name extraction
    const serviceMatch = input.match(/(?:deploy|service)\s+(\w+)/i);
    return serviceMatch ? serviceMatch[1] : null;
  }

  // Validate command parameters against schema
  validateCommand(commandName: string, params: Record<string, any>): { valid: boolean; errors: string[] } {
    const command = this.commands.get(commandName);
    if (!command) {
      return { valid: false, errors: [`Unknown command: ${commandName}`] };
    }

    const errors: string[] = [];

    // Validate each schema parameter
    for (const [paramDecl, schema] of Object.entries(command.schema)) {
      const paramName = paramDecl.match(/@param\((\w+):/)?.[1];
      if (!paramName) continue;

      const value = params[paramName];

      // Check required parameters
      if (schema.required && (value === undefined || value === null || value === '')) {
        errors.push(`Missing required parameter: ${paramName}`);
        continue;
      }

      // Skip validation for optional parameters that aren't provided
      if (!schema.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      if (schema.validation) {
        const validation = schema.validation;

        if (typeof value === 'string') {
          if (validation.minLength && value.length < validation.minLength) {
            errors.push(`${paramName}: minimum length is ${validation.minLength}`);
          }
          if (validation.maxLength && value.length > validation.maxLength) {
            errors.push(`${paramName}: maximum length is ${validation.maxLength}`);
          }
          if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
            errors.push(`${paramName}: does not match required pattern`);
          }
        }

        if (schema.enum && Array.isArray(schema.enum) && !schema.enum.includes(value)) {
          errors.push(`${paramName}: must be one of ${schema.enum.join(', ')}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Get autocomplete suggestions
  getAutocomplete(commandName: string, paramName: string, partial: string = ''): string[] {
    const command = this.commands.get(commandName);
    if (!command?.schema) return [];

    const paramSchema = Object.values(command.schema).find(schema =>
      schema.autocomplete && Object.keys(command.schema).find(key =>
        key.includes(`(${paramName}:`)
      )
    );

    if (!paramSchema?.autocomplete) return [];

    // Filter by partial input
    return paramSchema.autocomplete.filter(item =>
      item.toLowerCase().includes(partial.toLowerCase())
    );
  }

  // Manage aliases
  setAlias(alias: string, command: string, category?: string): boolean {
    try {
      this.aliases.aliases[alias] = command;

      if (category) {
        if (!this.aliases.categories[category]) {
          this.aliases.categories[category] = [];
        }
        if (!this.aliases.categories[category].includes(alias)) {
          this.aliases.categories[category].push(alias);
        }
      }

      this.saveAliases();
      return true;
    } catch (error) {
      console.error('Failed to set alias:', error);
      return false;
    }
  }

  removeAlias(alias: string): boolean {
    try {
      delete this.aliases.aliases[alias];

      // Remove from categories
      for (const category of Object.keys(this.aliases.categories)) {
        this.aliases.categories[category] = this.aliases.categories[category].filter(a => a !== alias);
      }

      this.saveAliases();
      return true;
    } catch (error) {
      console.error('Failed to remove alias:', error);
      return false;
    }
  }

  getAliases(category?: string): Record<string, string> {
    if (category && this.aliases.categories[category]) {
      const categoryAliases: Record<string, string> = {};
      for (const alias of this.aliases.categories[category]) {
        categoryAliases[alias] = this.aliases.aliases[alias];
      }
      return categoryAliases;
    }

    return this.aliases.aliases;
  }

  // Generate command schema documentation
  generateSchemaDocs(): string {
    let docs = '# Enhanced Command Schema Documentation\n\n';

    docs += 'Type-safe slash commands with autocompletion and natural language mapping.\n\n';

    for (const [name, command] of this.commands) {
      docs += `## \`${command.command}\` - ${command.description}\n\n`;

      if (command.schema && Object.keys(command.schema).length > 0) {
        docs += '### Parameters\n\n';
        docs += '| Parameter | Type | Required | Description | Validation |\n';
        docs += '|-----------|------|----------|-------------|------------|\n';

        for (const [paramDecl, schema] of Object.entries(command.schema)) {
          const paramMatch = paramDecl.match(/@param\((\w+):\s*([^)]+)\)/);
          if (paramMatch) {
            const [, paramName, paramType] = paramMatch;
            const required = schema.required ? '✅' : '❌';
            const validation = schema.validation ? JSON.stringify(schema.validation) : '-';
            docs += `| \`${paramName}\` | ${paramType} | ${required} | ${schema.description} | ${validation} |\n`;
          }
        }
        docs += '\n';
      }

      if (command.nl_mapping && Object.keys(command.nl_mapping).length > 0) {
        docs += '### Natural Language Mappings\n\n';
        for (const [nl, cmd] of Object.entries(command.nl_mapping)) {
          docs += `- "${nl}" → \`${cmd}\`\n`;
        }
        docs += '\n';
      }

      docs += '**Examples:**\n';
      command.examples.forEach(example => {
        docs += `- \`${example}\`\n`;
      });
      docs += '\n';

      docs += '**Tags:** ' + command.tags.join(', ') + '\n\n';
      docs += '---\n\n';
    }

    return docs;
  }

  // Export for Cursor IDE integration
  exportForCursor(): any {
    const exportData = {
      schema: "enhanced-commands-v2.0",
      version: "2.0.0",
      generated: new Date().toISOString(),
      commands: Array.from(this.commands.values()),
      aliases: this.aliases
    };

    return exportData;
  }

  getCommand(name: string): EnhancedCommandDefinition | undefined {
    return this.commands.get(name);
  }

  listCommands(): EnhancedCommandDefinition[] {
    return Array.from(this.commands.values());
  }
}

// CLI interface
async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
Enhanced Command Registry v2.0.0 - Type-safe slash commands

Usage:
  bun run scripts/enhanced-command-registry.ts <command> [options]

Commands:
  list                    List all commands with schemas
  validate <cmd> <params> Validate command parameters
  nl-parse <input>        Parse natural language to command
  autocomplete <cmd> <param> <partial> Get autocomplete suggestions
  alias-set <alias> <command> Set command alias
  alias-remove <alias>    Remove command alias
  alias-list [category]   List aliases by category
  schema-docs             Generate schema documentation
  export                  Export for Cursor IDE

Examples:
  bun run scripts/enhanced-command-registry.ts list
  bun run scripts/enhanced-command-registry.ts validate coder '{"task":"implement auth"}'
  bun run scripts/enhanced-command-registry.ts nl-parse "deploy to prod"
  bun run scripts/enhanced-command-registry.ts autocomplete coder task "implement"
  bun run scripts/enhanced-command-registry.ts alias-set dprod "/deploy main-api --env prod"
  bun run scripts/enhanced-command-registry.ts alias-list deployment
`);
    return;
  }

  const registry = new EnhancedCommandRegistry();

  try {
    switch (command) {
      case 'list':
        const commands = registry.listCommands();
        console.log('Enhanced Commands:');
        commands.forEach(cmd => {
          console.log(`  ${cmd.command} - ${cmd.description}`);
          if (cmd.schema) {
            const params = Object.keys(cmd.schema).length;
            console.log(`    Schema: ${params} parameters`);
          }
          if (cmd.nl_mapping) {
            const mappings = Object.keys(cmd.nl_mapping).length;
            console.log(`    NL Mappings: ${mappings} patterns`);
          }
        });
        break;

      case 'validate':
        const validateCmd = args[0];
        const validateParams = args[1] ? JSON.parse(args[1]) : {};
        const validation = registry.validateCommand(validateCmd, validateParams);
        if (validation.valid) {
          console.log('✅ Command validation passed');
        } else {
          console.log('❌ Validation errors:');
          validation.errors.forEach(error => console.log(`  - ${error}`));
          process.exit(1);
        }
        break;

      case 'nl-parse':
        const nlInput = args.join(' ');
        const parsed = registry.parseNaturalLanguage(nlInput);
        console.log(`Natural Language: "${nlInput}"`);
        console.log(`Parsed Command: ${parsed}`);
        break;

      case 'autocomplete':
        const acCmd = args[0];
        const acParam = args[1];
        const acPartial = args[2] || '';
        const suggestions = registry.getAutocomplete(acCmd, acParam, acPartial);
        console.log(`Autocomplete suggestions for ${acCmd}.${acParam} "${acPartial}":`);
        suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
        break;

      case 'alias-set':
        const alias = args[0];
        const aliasCmd = args.slice(1).join(' ');
        const category = args[2]; // Optional category
        const set = registry.setAlias(alias, aliasCmd, category);
        console.log(set ? `✅ Alias set: ${alias} → ${aliasCmd}` : '❌ Failed to set alias');
        break;

      case 'alias-remove':
        const removeAlias = args[0];
        const removed = registry.removeAlias(removeAlias);
        console.log(removed ? `✅ Alias removed: ${removeAlias}` : '❌ Failed to remove alias');
        break;

      case 'alias-list':
        const aliasCategory = args[0];
        const aliases = registry.getAliases(aliasCategory);
        console.log(`Aliases ${aliasCategory ? `(${aliasCategory})` : ''}:`);
        Object.entries(aliases).forEach(([alias, cmd]) => {
          console.log(`  ${alias} → ${cmd}`);
        });
        break;

      case 'schema-docs':
        console.log(registry.generateSchemaDocs());
        break;

      case 'export':
        const exported = registry.exportForCursor();
        console.log(JSON.stringify(exported, null, 2));
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Enhanced Command Registry error:', error.message);
    process.exit(1);
  }
}

export { EnhancedCommandRegistry };
export type { EnhancedCommandDefinition, CommandSchema, NLMapping };

// Run CLI if called directly
if (import.meta.main) {
  main();
}
