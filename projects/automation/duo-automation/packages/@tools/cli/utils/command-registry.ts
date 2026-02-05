#!/usr/bin/env bun
// packages/cli/utils/command-registry.ts - Central Command Registration and Management

import { CLICommand, CommandRegistry, CommandCategory, CommandContext } from '../types/commands';
import { CLIError, ErrorCode } from '../types/errors';

/**
 * CommandRegistry Manager - Central hub for command registration and execution
 */
export class CommandRegistryManager {
  private registry: CommandRegistry = new Map();
  private commandsByCategory: Map<CommandCategory, CLICommand[]> = new Map();

  constructor() {
    // Initialize category maps
    Object.values(CommandCategory).forEach(category => {
      this.commandsByCategory.set(category, []);
    });
  }

  /**
   * Register a new command
   */
  register(command: CLICommand): void {
    // Validate command
    if (!command.name || !command.description || !command.handler) {
      throw new CLIError(
        ErrorCode.ValidationFailed,
        'Invalid command: name, description, and handler are required',
        undefined,
        ['Ensure command has all required fields']
      );
    }

    // Check if command already exists
    if (this.registry.has(command.name)) {
      throw new CLIError(
        ErrorCode.InvalidOptions,
        `Command '${command.name}' is already registered`,
        undefined,
        ['Use a unique command name', 'Or override using registerForce()']
      );
    }

    // Add to main registry
    this.registry.set(command.name, command);

    // Add to category map
    const categoryCommands = this.commandsByCategory.get(command.category) || [];
    categoryCommands.push(command);
    this.commandsByCategory.set(command.category, categoryCommands);

    // Register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.registry.set(alias, command);
      });
    }
  }

  /**
   * Register a command, overwriting if exists
   */
  registerForce(command: CLICommand): void {
    if (this.registry.has(command.name)) {
      this.unregister(command.name);
    }
    this.register(command);
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): CLICommand | undefined {
    return this.registry.get(name);
  }

  /**
   * List all commands, optionally filtered by category
   */
  listCommands(category?: CommandCategory): CLICommand[] {
    if (category) {
      return this.commandsByCategory.get(category) || [];
    }
    
    // Return unique commands (avoid duplicates from aliases)
    const unique = new Set<string>();
    const result: CLICommand[] = [];
    
    this.registry.forEach((cmd, name) => {
      if (!unique.has(cmd.name)) {
        unique.add(cmd.name);
        result.push(cmd);
      }
    });
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all categories with their command counts
   */
  getCategoryBreakdown(): Map<CommandCategory, number> {
    const breakdown = new Map<CommandCategory, number>();
    
    Object.values(CommandCategory).forEach(category => {
      const count = this.commandsByCategory.get(category)?.length || 0;
      if (count > 0) {
        breakdown.set(category, count);
      }
    });
    
    return breakdown;
  }

  /**
   * Execute a command
   */
  async executeCommand(
    name: string,
    options: any,
    context?: CommandContext
  ): Promise<any> {
    const command = this.getCommand(name);
    
    if (!command) {
      throw new CLIError(
        ErrorCode.CommandNotFound,
        `Command '${name}' not found`,
        undefined,
        [
          'Check command spelling',
          'Run "help" or "--help" for available commands',
          `Available: ${this.listCommands().map(c => c.name).join(', ')}`
        ]
      );
    }

    // Validate options if schema exists
    if (command.options) {
      this.validateOptions(options, command.options);
    }

    // Execute command
    try {
      await command.handler(options, context);
    } catch (error) {
      if (error instanceof CLIError) {
        throw error;
      }
      
      throw new CLIError(
        ErrorCode.InternalError,
        `Command '${name}' failed: ${error instanceof Error ? error.message : String(error)}`,
        { command: name, operation: 'execute', platform: process.platform, timestamp: new Date() },
        ['Check command parameters', 'Review error details', 'Enable debug logging for more info']
      );
    }
  }

  /**
   * Validate command options
   */
  private validateOptions(options: any, schema: any[]): void {
    const requiredFields = schema.filter(opt => opt.required).map(opt => opt.flag);
    
    for (const field of requiredFields) {
      if (!(field in options)) {
        throw new CLIError(
          ErrorCode.InvalidOptions,
          `Missing required option: ${field}`,
          undefined,
          [`Provide option: ${field}`, 'Use --help to see all options']
        );
      }
    }
  }

  /**
   * Unregister a command
   */
  unregister(name: string): boolean {
    const command = this.registry.get(name);
    
    if (!command) {
      return false;
    }

    // Remove main entry
    this.registry.delete(name);

    // Remove aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.registry.delete(alias);
      });
    }

    // Remove from category
    const categoryCommands = this.commandsByCategory.get(command.category) || [];
    const index = categoryCommands.indexOf(command);
    if (index > -1) {
      categoryCommands.splice(index, 1);
    }

    return true;
  }

  /**
   * Clear all registered commands
   */
  clear(): void {
    this.registry.clear();
    this.commandsByCategory.forEach(commands => {
      commands.length = 0;
    });
  }

  /**
   * Get registry size
   */
  size(): number {
    const unique = new Set<string>();
    this.registry.forEach(cmd => {
      unique.add(cmd.name);
    });
    return unique.size;
  }

  /**
   * Generate help text for a command
   */
  generateHelpText(commandName?: string): string {
    if (commandName) {
      const command = this.getCommand(commandName);
      if (!command) {
        return `Command '${commandName}' not found`;
      }
      return this.formatCommandHelp(command);
    }

    // Generate help for all commands
    let help = 'Available Commands:\n\n';
    
    Object.values(CommandCategory).forEach(category => {
      const commands = this.commandsByCategory.get(category);
      if (commands && commands.length > 0) {
        help += `${category.toUpperCase()}:\n`;
        commands.forEach(cmd => {
          help += `  ${cmd.name.padEnd(20)} ${cmd.description}\n`;
          if (cmd.aliases) {
            help += `    Aliases: ${cmd.aliases.join(', ')}\n`;
          }
        });
        help += '\n';
      }
    });

    return help;
  }

  /**
   * Format command help text
   */
  private formatCommandHelp(command: CLICommand): string {
    let help = `${command.name} - ${command.description}\n\n`;

    if (command.aliases && command.aliases.length > 0) {
      help += `Aliases: ${command.aliases.join(', ')}\n`;
    }

    if (command.options && command.options.length > 0) {
      help += '\nOptions:\n';
      command.options.forEach(opt => {
        const required = opt.required ? ' [REQUIRED]' : '';
        help += `  ${opt.flag.padEnd(20)} ${opt.description}${required}\n`;
        if (opt.choices) {
          help += `    Choices: ${opt.choices.join(', ')}\n`;
        }
        if (opt.default !== undefined) {
          help += `    Default: ${opt.default}\n`;
        }
      });
    }

    if (command.examples && command.examples.length > 0) {
      help += '\nExamples:\n';
      command.examples.forEach(example => {
        help += `  $ ${example}\n`;
      });
    }

    return help;
  }
}

/**
 * Global registry instance
 */
let globalRegistry: CommandRegistryManager | null = null;

/**
 * Get or create global registry
 */
export function getGlobalRegistry(): CommandRegistryManager {
  if (!globalRegistry) {
    globalRegistry = new CommandRegistryManager();
  }
  return globalRegistry;
}

/**
 * Reset global registry (for testing)
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}

export default {
  CommandRegistryManager,
  getGlobalRegistry,
  resetGlobalRegistry
};