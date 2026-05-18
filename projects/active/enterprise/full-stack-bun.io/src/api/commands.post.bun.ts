/**
 * Commands API Endpoint
 * POST /api/commands - Execute commands through the enhanced registry
 */

import { structuredLog } from "../shared/utils";
import { z } from "zod";
import { inspect } from "bun";
import { EnhancedCommandRegistry } from "../../scripts/enhanced-command-registry";

const commandSchema = z.object({
  command: z.string().min(1).max(100),
  parameters: z.record(z.any()).optional(),
  naturalLanguage: z.boolean().optional()
});

export async function POST(request: Request) {
  const startTime = performance.now();

  try {
    const body = await request.json();
    const { command, parameters = {}, naturalLanguage = false } = commandSchema.parse(body);

    const registry = new EnhancedCommandRegistry();

    let resolvedCommand = command;
    let resolvedParams = parameters;

    // Handle natural language processing if requested
    if (naturalLanguage) {
      resolvedCommand = registry.parseNaturalLanguage(command);
      // Simple parameter extraction for NL commands
      resolvedParams = {};
    }

    // Validate command and parameters
    const commandDef = registry.getCommand(resolvedCommand.split(' ')[0]);
    if (!commandDef) {
      return Response.json({
        error: `Unknown command: ${resolvedCommand}`,
        availableCommands: registry.listCommands().map(cmd => cmd.name)
      }, { status: 400 });
    }

    const validation = registry.validateCommand(resolvedCommand.split(' ')[0], resolvedParams);
    if (!validation.valid) {
      return Response.json({
        error: "Command validation failed",
        details: validation.errors
      }, { status: 400 });
    }

    // Execute command (simplified - would integrate with actual command execution)
    const executionResult = await simulateCommandExecution(resolvedCommand, resolvedParams);

    const responseTime = performance.now() - startTime;

    const response = {
      command: resolvedCommand,
      parameters: resolvedParams,
      result: executionResult,
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        naturalLanguage,
        validation: validation
      }
    };

    structuredLog("Command executed", {
      command: resolvedCommand,
      success: executionResult.success,
      responseTime
    });

    return Response.json(response, {
      headers: { "x-response-time": `${responseTime.toFixed(2)}ms` }
    });

  } catch (error) {
    const responseTime = performance.now() - startTime;

    structuredLog("Command execution failed", { error: inspect(error), responseTime });

    if (error instanceof z.ZodError) {
      return Response.json({
        error: "Invalid request format",
        details: error.errors
      }, {
        status: 400,
        headers: { "x-response-time": `${responseTime.toFixed(2)}ms` }
      });
    }

    return Response.json({
      error: "Command execution failed",
      details: error.message
    }, {
      status: 500,
      headers: { "x-response-time": `${responseTime.toFixed(2)}ms` }
    });
  }
}

async function simulateCommandExecution(command: string, params: any) {
  // Simplified command execution simulation
  // In a real implementation, this would route to the appropriate command handler

  const commandName = command.split(' ')[0];

  switch (commandName) {
    case '/coder':
      return {
        success: true,
        message: `Code generation initiated for: ${params.task || 'task'}`,
        type: 'code_generation',
        estimatedTime: '2-5 minutes'
      };

    case '/deploy':
      return {
        success: true,
        message: `Deployment initiated to ${params.environment || 'environment'}`,
        type: 'deployment',
        pipelineId: `deploy-${Date.now()}`
      };

    case '/test':
      return {
        success: true,
        message: `Test execution started with suite: ${params.suite || 'unit'}`,
        type: 'testing',
        coverage: params.coverage ? 'enabled' : 'disabled'
      };

    case '/reviewer':
      return {
        success: true,
        message: `Code review initiated for ${params.code ? 'provided code' : 'current file'}`,
        type: 'code_review',
        criteria: params.criteria || ['security', 'performance']
      };

    default:
      return {
        success: false,
        message: `Unknown command: ${commandName}`,
        type: 'error'
      };
  }
}
