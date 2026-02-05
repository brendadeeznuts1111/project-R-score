#!/usr/bin/env bun
// Input validation utilities for MCP Server
// [TENSION-VALIDATION-001]

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class InputValidator {
  static validateNodeId(nodeId: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (nodeId === undefined || nodeId === null) {
      return { isValid: true, errors: [] }; // Optional field
    }

    if (typeof nodeId !== 'string') {
      errors.push({
        field: 'nodeId',
        message: 'nodeId must be a string',
        code: 'INVALID_TYPE'
      });
    } else if (nodeId.length === 0) {
      errors.push({
        field: 'nodeId',
        message: 'nodeId cannot be empty',
        code: 'EMPTY_VALUE'
      });
    } else if (nodeId.length > 255) {
      errors.push({
        field: 'nodeId',
        message: 'nodeId cannot exceed 255 characters',
        code: 'VALUE_TOO_LONG'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateDepth(depth: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (depth === undefined || depth === null) {
      return { isValid: true, errors: [] }; // Optional field
    }

    if (typeof depth !== 'number') {
      errors.push({
        field: 'depth',
        message: 'depth must be a number',
        code: 'INVALID_TYPE'
      });
    } else if (!Number.isInteger(depth)) {
      errors.push({
        field: 'depth',
        message: 'depth must be an integer',
        code: 'INVALID_INTEGER'
      });
    } else if (depth < 1 || depth > 10) {
      errors.push({
        field: 'depth',
        message: 'depth must be between 1 and 10',
        code: 'OUT_OF_RANGE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateTimeHorizon(hours: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (hours === undefined || hours === null) {
      return { isValid: true, errors: [] }; // Optional field
    }

    if (typeof hours !== 'number') {
      errors.push({
        field: 'timeHorizon',
        message: 'timeHorizon must be a number',
        code: 'INVALID_TYPE'
      });
    } else if (!Number.isInteger(hours)) {
      errors.push({
        field: 'timeHorizon',
        message: 'timeHorizon must be an integer',
        code: 'INVALID_INTEGER'
      });
    } else if (hours < 1 || hours > 168) { // Max 1 week
      errors.push({
        field: 'timeHorizon',
        message: 'timeHorizon must be between 1 and 168 hours',
        code: 'OUT_OF_RANGE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateSourceNodes(sourceNodes: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (sourceNodes === undefined || sourceNodes === null) {
      errors.push({
        field: 'sourceNodes',
        message: 'sourceNodes is required',
        code: 'REQUIRED_FIELD'
      });
      return { isValid: false, errors };
    }

    // Allow both string and array of strings
    if (typeof sourceNodes !== 'string' && !Array.isArray(sourceNodes)) {
      errors.push({
        field: 'sourceNodes',
        message: 'sourceNodes must be a string or array of strings',
        code: 'INVALID_TYPE'
      });
    } else if (Array.isArray(sourceNodes)) {
      if (sourceNodes.length === 0) {
        errors.push({
          field: 'sourceNodes',
          message: 'sourceNodes array cannot be empty',
          code: 'EMPTY_ARRAY'
        });
      } else if (sourceNodes.length > 50) {
        errors.push({
          field: 'sourceNodes',
          message: 'sourceNodes array cannot exceed 50 items',
          code: 'ARRAY_TOO_LARGE'
        });
      } else {
        sourceNodes.forEach((node, index) => {
          if (typeof node !== 'string') {
            errors.push({
              field: `sourceNodes[${index}]`,
              message: 'All sourceNodes must be strings',
              code: 'INVALID_ARRAY_ITEM'
            });
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateTimeRange(timeRange: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (timeRange === undefined || timeRange === null) {
      return { isValid: true, errors: [] }; // Optional field
    }

    if (typeof timeRange !== 'object' || Array.isArray(timeRange)) {
      errors.push({
        field: 'timeRange',
        message: 'timeRange must be an object',
        code: 'INVALID_TYPE'
      });
      return { isValid: false, errors };
    }

    if (timeRange.start) {
      const startDate = new Date(timeRange.start);
      if (isNaN(startDate.getTime())) {
        errors.push({
          field: 'timeRange.start',
          message: 'timeRange.start must be a valid date',
          code: 'INVALID_DATE'
        });
      }
    }

    if (timeRange.end) {
      const endDate = new Date(timeRange.end);
      if (isNaN(endDate.getTime())) {
        errors.push({
          field: 'timeRange.end',
          message: 'timeRange.end must be a valid date',
          code: 'INVALID_DATE'
        });
      }
    }

    if (timeRange.start && timeRange.end) {
      const startDate = new Date(timeRange.start);
      const endDate = new Date(timeRange.end);
      
      if (startDate >= endDate) {
        errors.push({
          field: 'timeRange',
          message: 'timeRange.start must be before timeRange.end',
          code: 'INVALID_RANGE'
        });
      }

      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year
      if (endDate.getTime() - startDate.getTime() > maxRange) {
        errors.push({
          field: 'timeRange',
          message: 'timeRange cannot exceed 1 year',
          code: 'RANGE_TOO_LARGE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateMetrics(metrics: any): ValidationResult {
    const errors: ValidationError[] = [];
    const validMetrics = ['tension', 'volatility', 'predictions', 'anomalies', 'risk'];

    if (metrics === undefined || metrics === null) {
      return { isValid: true, errors: [] }; // Optional field
    }

    if (!Array.isArray(metrics)) {
      errors.push({
        field: 'metrics',
        message: 'metrics must be an array',
        code: 'INVALID_TYPE'
      });
      return { isValid: false, errors };
    }

    if (metrics.length === 0) {
      errors.push({
        field: 'metrics',
        message: 'metrics array cannot be empty',
        code: 'EMPTY_ARRAY'
      });
    } else if (metrics.length > 10) {
      errors.push({
        field: 'metrics',
        message: 'metrics array cannot exceed 10 items',
        code: 'ARRAY_TOO_LARGE'
      });
    } else {
      metrics.forEach((metric, index) => {
        if (typeof metric !== 'string') {
          errors.push({
            field: `metrics[${index}]`,
            message: 'All metrics must be strings',
            code: 'INVALID_ARRAY_ITEM'
          });
        } else if (!validMetrics.includes(metric)) {
          errors.push({
            field: `metrics[${index}]`,
            message: `Invalid metric: ${metric}. Valid metrics: ${validMetrics.join(', ')}`,
            code: 'INVALID_VALUE'
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateSeverity(severity: any): ValidationResult {
    const errors: ValidationError[] = [];
    const validSeverities = ['low', 'medium', 'high', 'critical'];

    if (severity === undefined || severity === null) {
      return { isValid: true, errors: [] }; // Optional field
    }

    if (typeof severity !== 'string') {
      errors.push({
        field: 'severity',
        message: 'severity must be a string',
        code: 'INVALID_TYPE'
      });
    } else if (!validSeverities.includes(severity.toLowerCase())) {
      errors.push({
        field: 'severity',
        message: `Invalid severity: ${severity}. Valid severities: ${validSeverities.join(', ')}`,
        code: 'INVALID_VALUE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateLimit(limit: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (limit === undefined || limit === null) {
      return { isValid: true, errors: [] }; // Optional field
    }

    if (typeof limit !== 'number') {
      errors.push({
        field: 'limit',
        message: 'limit must be a number',
        code: 'INVALID_TYPE'
      });
    } else if (!Number.isInteger(limit)) {
      errors.push({
        field: 'limit',
        message: 'limit must be an integer',
        code: 'INVALID_INTEGER'
      });
    } else if (limit < 1 || limit > 1000) {
      errors.push({
        field: 'limit',
        message: 'limit must be between 1 and 1000',
        code: 'OUT_OF_RANGE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateConfig(config: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (config === undefined || config === null) {
      return { isValid: true, errors: [] }; // Optional field
    }

    if (typeof config !== 'object' || Array.isArray(config)) {
      errors.push({
        field: 'config',
        message: 'config must be an object',
        code: 'INVALID_TYPE'
      });
      return { isValid: false, errors };
    }

    // Validate decayRate
    if (config.decayRate !== undefined) {
      if (typeof config.decayRate !== 'number') {
        errors.push({
          field: 'config.decayRate',
          message: 'decayRate must be a number',
          code: 'INVALID_TYPE'
        });
      } else if (config.decayRate < 0 || config.decayRate > 1) {
        errors.push({
          field: 'config.decayRate',
          message: 'decayRate must be between 0 and 1',
          code: 'OUT_OF_RANGE'
        });
      }
    }

    // Validate inertiaFactor
    if (config.inertiaFactor !== undefined) {
      if (typeof config.inertiaFactor !== 'number') {
        errors.push({
          field: 'config.inertiaFactor',
          message: 'inertiaFactor must be a number',
          code: 'INVALID_TYPE'
        });
      } else if (config.inertiaFactor < 0 || config.inertiaFactor > 2) {
        errors.push({
          field: 'config.inertiaFactor',
          message: 'inertiaFactor must be between 0 and 2',
          code: 'OUT_OF_RANGE'
        });
      }
    }

    // Validate maxIterations
    if (config.maxIterations !== undefined) {
      if (typeof config.maxIterations !== 'number') {
        errors.push({
          field: 'config.maxIterations',
          message: 'maxIterations must be a number',
          code: 'INVALID_TYPE'
        });
      } else if (!Number.isInteger(config.maxIterations)) {
        errors.push({
          field: 'config.maxIterations',
          message: 'maxIterations must be an integer',
          code: 'INVALID_INTEGER'
        });
      } else if (config.maxIterations < 1 || config.maxIterations > 1000) {
        errors.push({
          field: 'config.maxIterations',
          message: 'maxIterations must be between 1 and 1000',
          code: 'OUT_OF_RANGE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate entire request payload
  static validateRequest(toolName: string, args: any): ValidationResult {
    const allErrors: ValidationError[] = [];

    switch (toolName) {
      case 'analyze_tension':
        allErrors.push(...this.validateNodeId(args.nodeId).errors);
        allErrors.push(...this.validateDepth(args.depth).errors);
        break;

      case 'propagate_tension':
        allErrors.push(...this.validateSourceNodes(args.sourceNodes).errors);
        allErrors.push(...this.validateConfig(args.config).errors);
        break;

      case 'assess_risk':
        allErrors.push(...this.validateNodeId(args.nodeId).errors);
        allErrors.push(...this.validateTimeHorizon(args.timeHorizon).errors);
        break;

      case 'query_history':
        allErrors.push(...this.validateTimeRange(args.timeRange).errors);
        allErrors.push(...this.validateNodeId(args.nodeId).errors);
        allErrors.push(...this.validateMetrics(args.metrics).errors);
        break;

      case 'get_errors':
        allErrors.push(...this.validateSeverity(args.severity).errors);
        allErrors.push(...this.validateTimeHorizon(args.timeRange).errors);
        allErrors.push(...this.validateLimit(args.limit).errors);
        break;

      case 'get_system_status':
        // No validation needed for includeDetails (boolean)
        break;

      default:
        allErrors.push({
          field: 'tool',
          message: `Unknown tool: ${toolName}`,
          code: 'UNKNOWN_TOOL'
        });
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }
}
