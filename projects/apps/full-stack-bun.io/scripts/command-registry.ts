#!/usr/bin/env bun
/**
 * Command Registry - Manage Cursor IDE slash commands
 * CMD.REGISTRY - Command discovery and validation
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

interface CommandDefinition {
  name: string;
  description: string;
  command: string;
  handler: string;
  parameters: any[];
  examples: string[];
  tags: string[];
  rules: string;
}

class CommandRegistry {
  private commandsPath: string;

  constructor() {
    this.commandsPath = join(process.cwd(), '.cursor', 'commands');
  }

  // Load all command definitions
  loadCommands(): Map<string, CommandDefinition> {
    const commands = new Map<string, CommandDefinition>();

    if (!existsSync(this.commandsPath)) {
      console.error('Commands directory not found:', this.commandsPath);
      return commands;
    }

    const files = readdirSync(this.commandsPath).filter(f => f.endsWith('.json') && f !== 'index.json');

    for (const file of files) {
      try {
        const filePath = join(this.commandsPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const command: CommandDefinition = JSON.parse(content);

        commands.set(command.name, command);
      } catch (error) {
        console.warn(`Failed to load command ${file}:`, error.message);
      }
    }

    return commands;
  }

  // Validate command definitions
  validateCommands(): { valid: boolean; issues: string[] } {
    const commands = this.loadCommands();
    const issues: string[] = [];

    for (const [name, command] of commands) {
      // Check required fields
      if (!command.name) issues.push(`${name}: missing name`);
      if (!command.description) issues.push(`${name}: missing description`);
      if (!command.command) issues.push(`${name}: missing command`);
      if (!command.handler) issues.push(`${name}: missing handler`);

      // Validate command format
      if (!command.command.startsWith('/')) {
        issues.push(`${name}: command must start with '/'`);
      }

      // Check parameters
      if (!Array.isArray(command.parameters)) {
        issues.push(`${name}: parameters must be an array`);
      } else {
        for (const param of command.parameters) {
          if (!param.name) issues.push(`${name}: parameter missing name`);
          if (!param.type) issues.push(`${name}: parameter ${param.name} missing type`);
        }
      }

      // Check tags
      if (!command.tags || !command.tags.includes('CMD')) {
        issues.push(`${name}: missing CMD tag`);
      }
      if (!command.tags || !command.tags.includes('SPAWN')) {
        issues.push(`${name}: missing SPAWN tag`);
      }

      // Check examples
      if (!Array.isArray(command.examples) || command.examples.length === 0) {
        issues.push(`${name}: must have at least one example`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Generate command help
  generateHelp(): string {
    const commands = this.loadCommands();
    let help = '# Cursor IDE Slash Commands\n\n';

    help += 'Available commands for spawning agents from chat:\n\n';

    for (const [name, command] of commands) {
      help += `## \`${command.command}\` - ${command.description}\n\n`;
      help += `**Handler:** ${command.handler}\n\n`;
      help += `**Tags:** ${command.tags.join(', ')}\n\n`;

      if (command.parameters.length > 0) {
        help += '**Parameters:**\n';
        for (const param of command.parameters) {
          const required = param.required ? ' (required)' : '';
          help += `- \`${param.name}\`: ${param.description}${required}\n`;
        }
        help += '\n';
      }

      help += '**Examples:**\n';
      for (const example of command.examples) {
        help += `- \`${example}\`\n`;
      }
      help += '\n';

      help += '**Rules:** `' + command.rules + '`\n\n';
      help += '---\n\n';
    }

    return help;
  }

  // Export commands for Cursor IDE
  exportForCursor(): any {
    const commands = this.loadCommands();
    const index = {
      schema: "cursor-commands-v1",
      version: "1.3.5",
      generated: new Date().toISOString(),
      commands: Array.from(commands.values()).map(cmd => ({
        id: cmd.name,
        name: cmd.name,
        command: cmd.command,
        description: cmd.description,
        handler: cmd.handler,
        parameters: cmd.parameters,
        examples: cmd.examples,
        tags: cmd.tags,
        rules: cmd.rules
      }))
    };

    return index;
  }

  // Find commands by tag
  findByTag(tag: string): CommandDefinition[] {
    const commands = this.loadCommands();
    return Array.from(commands.values()).filter(cmd =>
      cmd.tags && cmd.tags.includes(tag)
    );
  }

  // Search commands by pattern
  search(pattern: string): CommandDefinition[] {
    const commands = this.loadCommands();
    const regex = new RegExp(pattern, 'i');

    return Array.from(commands.values()).filter(cmd =>
      regex.test(cmd.name) ||
      regex.test(cmd.description) ||
      regex.test(cmd.command) ||
      (cmd.tags && cmd.tags.some(tag => regex.test(tag)))
    );
  }
}

// CLI interface
async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
Command Registry - Cursor IDE Slash Commands v1.3.5

Usage:
  bun run scripts/command-registry.ts <command> [options]

Commands:
  list                    List all available commands
  validate                Validate command definitions
  help                    Generate command help documentation
  export                  Export commands for Cursor IDE
  find-tag <tag>          Find commands by tag
  search <pattern>        Search commands by pattern

Examples:
  bun run scripts/command-registry.ts list
  bun run scripts/command-registry.ts validate
  bun run scripts/command-registry.ts find-tag CMD
  bun run scripts/command-registry.ts search coder
`);
    return;
  }

  const registry = new CommandRegistry();

  try {
    switch (command) {
      case 'list':
        const commands = registry.loadCommands();
        console.log('Available Commands:');
        for (const [name, cmd] of commands) {
          console.log(`  ${cmd.command} - ${cmd.description}`);
        }
        break;

      case 'validate':
        const validation = registry.validateCommands();
        if (validation.valid) {
          console.log('✅ All commands are valid');
        } else {
          console.log('❌ Validation issues:');
          validation.issues.forEach(issue => console.log(`  - ${issue}`));
          process.exit(1);
        }
        break;

      case 'help':
        console.log(registry.generateHelp());
        break;

      case 'export':
        const exported = registry.exportForCursor();
        console.log(JSON.stringify(exported, null, 2));
        break;

      case 'find-tag':
        const tag = args[0];
        if (!tag) {
          console.error('Usage: find-tag <tag>');
          process.exit(1);
        }
        const taggedCommands = registry.findByTag(tag);
        console.log(`Commands with tag '${tag}':`);
        taggedCommands.forEach(cmd => console.log(`  ${cmd.command} - ${cmd.description}`));
        break;

      case 'search':
        const pattern = args[0];
        if (!pattern) {
          console.error('Usage: search <pattern>');
          process.exit(1);
        }
        const searchResults = registry.search(pattern);
        console.log(`Commands matching '${pattern}':`);
        searchResults.forEach(cmd => console.log(`  ${cmd.command} - ${cmd.description}`));
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Command registry error:', error.message);
    process.exit(1);
  }
}

main();
