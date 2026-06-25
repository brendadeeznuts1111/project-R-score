/**
 * packages/cli/services/command.service.ts
 * Command execution service with validation, error handling, and auditing
 * Orchestrates utility modules for safe command execution
 */

import { CommandRegistryManager, getGlobalRegistry } from '../utils/command-registry';
import { ErrorHandler } from '../utils/error-handler';
import { Logger } from '../utils/logger';
import { Validator } from '../utils/validator';
import type { CLICommand, CommandContext } from '../types/commands';
import { CLIError, ErrorCode } from '../types/errors';

export interface CommandServiceConfig {
  registry?: CommandRegistryManager;
  errorHandler?: ErrorHandler;
  logger?: Logger;
  validator?: Validator;
  validateInputs?: boolean;
  recordAudit?: boolean;
}

/**
 * CommandService - Orchestrates command execution with full middleware pipeline
 * Ensures all commands are validated, executed safely, and properly logged
 */
export class CommandService {
  private registry: CommandRegistryManager;
  private errorHandler: ErrorHandler;
  private logger: Logger;
  private validator: Validator;
  private config: Required<Omit<CommandServiceConfig, 'registry' | 'errorHandler' | 'logger' | 'validator'>> & {
    registry?: CommandRegistryManager;
    errorHandler?: ErrorHandler;
    logger?: Logger;
    validator?: Validator;
  };

  constructor(config: CommandServiceConfig = {}) {
    this.registry = config.registry || getGlobalRegistry();
    this.errorHandler = config.errorHandler || new ErrorHandler();
    this.logger = config.logger || new Logger();
    this.validator = config.validator || new Validator();
    
    this.config = {
      validateInputs: config.validateInputs ?? true,
      recordAudit: config.recordAudit ?? true,
      registry: config.registry,
      errorHandler: config.errorHandler,
      logger: config.logger,
      validator: config.validator
    };

    this.logger.info('CommandService initialized');
  }

  /**
   * Execute a command by name with arguments
   */
  async execute(
    commandName: string,
    args: Record<string, unknown> = {},
    context: Partial<CommandContext> = {}
  ): Promise<unknown> {
    try {
      // Build execution context
      const executionContext: CommandContext = {
        ...context,
        commandName,
        startTime: Date.now(),
        logger: this.logger
      } as CommandContext;

      this.logger.info(`Executing command: ${commandName}`, { args });

      // Validate command exists
      const command = this.registry.getCommand(commandName);
      if (!command) {
        throw new CLIError(
          `Command not found: ${commandName}`,
          ErrorCode.CommandNotFound,
          { commandName }
        );
      }

      // Validate inputs if enabled
      if (this.config.validateInputs) {
        this.validateCommandInputs(command, args);
      }

      // Execute command with error handling
      const result = await this.errorHandler.withRetry(
        () => command.handler(args, executionContext),
        {
          component: 'CommandService',
          operation: `execute::${commandName}`
        }
      );

      // Record completion
      const duration = Date.now() - executionContext.startTime;
      this.logger.info(`Command completed successfully: ${commandName}`, {
        duration: `${duration}ms`
      });

      if (this.config.recordAudit) {
        await this.recordAudit({
          command: commandName,
          status: 'success',
          duration,
          args: this.sanitizeArgsForAudit(args)
        });
      }

      return result;
    } catch (error) {
      const cliError = this.errorHandler.handle(error, {
        component: 'CommandService',
        operation: `execute::${commandName}`
      });

      if (this.config.recordAudit) {
        await this.recordAudit({
          command: commandName,
          status: 'failed',
          error: cliError.message,
          errorCode: cliError.code,
          args: this.sanitizeArgsForAudit(args)
        });
      }

      throw cliError;
    }
  }

  /**
   * List available commands
   */
  listCommands(category?: string): CLICommand[] {
    return this.registry.listCommands(category);
  }

  /**
   * Get command help text
   */
  getHelp(commandName?: string): string {
    if (commandName) {
      const command = this.registry.getCommand(commandName);
      if (!command) {
        return `Command not found: ${commandName}`;
      }
      return this.registry.generateHelpText([command]);
    }
    
    return this.registry.generateHelpText();
  }

  /**
   * Get command metadata
   */
  getCommandMetadata(commandName: string): CLICommand | undefined {
    return this.registry.getCommand(commandName);
  }

  /**
   * Validate command inputs against requirements
   */
  private validateCommandInputs(command: CLICommand, args: Record<string, unknown>): void {
    const errors: string[] = [];

    // Check required parameters
    for (const param of command.metadata.parameters || []) {
      if (param.required && !(param.name in args)) {
        errors.push(`Missing required parameter: ${param.name}`);
      }

      if (param.name in args) {
        // Validate parameter type if specified
        if (param.type && args[param.name]) {
          const actualType = typeof args[param.name];
          if (actualType !== param.type) {
            errors.push(
              `Parameter ${param.name} must be ${param.type} (got ${actualType})`
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      this.validator.throwValidationError(
        `Invalid inputs for command: ${command.name}`,
        errors,
        [`Use 'empire help ${command.name}' for usage details`]
      );
    }
  }

  /**
   * Sanitize arguments for audit logging (remove sensitive data)
   */
  private sanitizeArgsForAudit(args: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'apiSecret'];

    for (const [key, value] of Object.entries(args)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Record command execution to audit log
   */
  private async recordAudit(entry: Record<string, unknown>): Promise<void> {
    try {
      this.logger.info('Audit recorded', entry);
      // In production, send to audit service
    } catch (error) {
      this.logger.error('Failed to record audit', { error });
    }
  }
}

/**
 * Global command service instance
 */
let globalCommandService: CommandService;

export function getGlobalCommandService(): CommandService {
  if (!globalCommandService) {
    globalCommandService = new CommandService();
  }
  return globalCommandService;
}

export function setGlobalCommandService(service: CommandService): void {
  globalCommandService = service;
}

export function resetGlobalCommandService(): void {
  globalCommandService = new CommandService();
}