#!/usr/bin/env bun
// packages/cli/types/commands.ts - Command System Types and Registry

import { ScopeType } from './config';

/**
 * Command Category Enum - Organizes CLI commands by functional area
 */
export enum CommandCategory {
  Infrastructure = 'infrastructure',
  Secrets = 'secrets',
  System = 'system',
  Development = 'development',
  Compliance = 'compliance'
}

/**
 * CommandOption Interface - Defines individual CLI option/flag
 */
export interface CommandOption {
  flag: string; // e.g., '-s, --set <value>'
  description: string; // Help text
  type: 'boolean' | 'string' | 'number' | 'array'; // Value type
  required?: boolean; // Whether option is required
  default?: any; // Default value
  choices?: string[] | number[]; // Allowed values
  validate?: (value: any) => boolean | string; // Custom validation
}

/**
 * CLICommand Interface - Defines a complete CLI command with metadata and handler
 */
export interface CLICommand {
  name: string; // Command name (e.g., 'status', 'secrets')
  description: string; // Brief description
  category: CommandCategory; // Functional category
  aliases?: string[]; // Alternative names
  options?: CommandOption[]; // Available options/flags
  examples?: string[]; // Usage examples
  handler: (options: any, context?: CommandContext) => Promise<void>; // Command implementation
}

/**
 * CommandContext Interface - Runtime context passed to command handlers
 */
export interface CommandContext {
  logger: Logger;
  config: any; // CLIConfig type would be circular, use any
  cache: any; // Cache type would be circular, use any
  platform: PlatformInfo;
  scope: ScopeType;
}

/**
 * Logger Interface - Standardized logging API for commands
 */
export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  table(data: any[], title?: string): void;
}

/**
 * PlatformInfo Interface - Current system platform information
 */
export interface PlatformInfo {
  os: NodeJS.Platform;
  arch: string;
  bunVersion: string;
  nodeVersion: string;
}

/**
 * CommandRegistry Type - Central registry of all commands
 */
export type CommandRegistry = Map<string, CLICommand>;

/**
 * CommandExecutionResult Interface - Result of command execution
 */
export interface CommandExecutionResult {
  success: boolean;
  command: string;
  duration: number; // milliseconds
  output?: any;
  error?: {
    code: string;
    message: string;
  };
}

export default {
  CommandCategory,
  CommandOption,
  CLICommand,
  CommandContext,
  Logger,
  PlatformInfo,
  ScopeType,
  CommandRegistry,
  CommandExecutionResult
};