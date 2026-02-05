// Enhanced error types with automatic documentation search integration
import { smartErrorHandler } from './error-handler';

export class OddsProtocolError extends Error {
  public readonly code: string;
  public readonly category: string;
  public readonly searchable: boolean;
  public readonly documentation?: string;
  public readonly suggestions: string[];

  constructor(
    message: string,
    code: string,
    category: 'network' | 'validation' | 'business' | 'system' | 'integration',
    options: {
      searchable?: boolean;
      documentation?: string;
      suggestions?: string[];
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'OddsProtocolError';
    this.code = code;
    this.category = category;
    this.searchable = options.searchable ?? true;
    this.documentation = options.documentation;
    this.suggestions = options.suggestions || [];
    
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Handle error with automatic documentation search
   */
  async handleWithContext(context: {
    sessionId?: string;
    requestId?: string;
    package?: string;
    function?: string;
    line?: number;
    column?: number;
  }) {
    return await smartErrorHandler.handleError(this, {
      timestamp: Date.now(),
      ...context
    });
  }
}

export class NetworkError extends OddsProtocolError {
  constructor(message: string, code: string, suggestions?: string[]) {
    super(message, code, 'network', {
      suggestions: [
        'Check network connectivity',
        'Verify server is running',
        'Check firewall settings',
        'Try again later',
        ...(suggestions || [])
      ],
      documentation: 'https://bun.sh/docs/api/http'
    });
  }
}

export class ValidationError extends OddsProtocolError {
  constructor(message: string, field?: string, value?: any) {
    super(message, 'VALIDATION_ERROR', 'validation', {
      suggestions: [
        'Check input data format',
        'Verify required fields are present',
        'Validate data types',
        field ? `Check field: ${field}` : undefined,
        value ? `Invalid value: ${JSON.stringify(value)}` : undefined
      ].filter(Boolean) as string[],
      documentation: 'https://bun.sh/docs/validators'
    });
  }
}

export class BusinessLogicError extends OddsProtocolError {
  constructor(message: string, code: string, context?: string) {
    super(message, code, 'business', {
      suggestions: [
        'Check business rules',
        'Verify data consistency',
        'Review operation parameters',
        context ? `Context: ${context}` : undefined
      ].filter(Boolean) as string[]
    });
  }
}

export class SystemError extends OddsProtocolError {
  constructor(message: string, code: string, component?: string) {
    super(message, code, 'system', {
      suggestions: [
        'Check system resources',
        'Verify file permissions',
        'Check disk space',
        'Review system logs',
        component ? `Component: ${component}` : undefined
      ].filter(Boolean) as string[],
      documentation: 'https://bun.sh/docs/debug'
    });
  }
}

export class IntegrationError extends OddsProtocolError {
  constructor(message: string, service: string, suggestions?: string[]) {
    super(message, 'INTEGRATION_ERROR', 'integration', {
      suggestions: [
        `Check ${service} service status`,
        'Verify API credentials',
        'Check rate limits',
        'Review integration configuration',
        ...(suggestions || [])
      ],
      documentation: `https://bun.sh/docs/integrations/${service.toLowerCase()}`
    });
  }
}

// Specific error types for common scenarios

export class WebSocketError extends NetworkError {
  constructor(message: string, code: string) {
    super(message, code, [
      'Check WebSocket server is running',
      'Verify WebSocket URL is correct',
      'Check firewall allows WebSocket connections',
      'Review WebSocket subprotocol configuration'
    ]);
  }
}

export class DatabaseError extends SystemError {
  constructor(message: string, code: string) {
    super(message, code, 'database');
  }
}

export class ConfigurationError extends SystemError {
  constructor(message: string, configKey?: string) {
    super(message, 'CONFIG_ERROR', 'configuration');
    this.suggestions = [
      'Check configuration file syntax',
      'Verify environment variables are set',
      'Review default values',
      ...(configKey ? [`Check configuration key: ${configKey}`] : [])
    ];
  }
}

export class PackageError extends IntegrationError {
  constructor(message: string, packageName: string) {
    super(message, 'PACKAGE_ERROR', packageName, [
      `Run "bun install" to install ${packageName}`,
      `Check if ${packageName} is compatible with Bun`,
      'Verify package version constraints',
      'Review package.json dependencies'
    ]);
  }
}

// Error factory functions
export const createError = {
  network: (message: string, code: string) => new NetworkError(message, code),
  validation: (message: string, field?: string, value?: any) => new ValidationError(message, field, value),
  business: (message: string, code: string, context?: string) => new BusinessLogicError(message, code, context),
  system: (message: string, code: string, component?: string) => new SystemError(message, code, component),
  integration: (message: string, service: string, suggestions?: string[]) => new IntegrationError(message, service, suggestions),
  websocket: (message: string, code: string) => new WebSocketError(message, code),
  database: (message: string, code: string) => new DatabaseError(message, code),
  configuration: (message: string, configKey?: string) => new ConfigurationError(message, configKey),
  package: (message: string, packageName: string) => new PackageError(message, packageName)
};
