/**
 * Input Validation Module
 * Validation for all payment routing operations
 */

import { 
  PaymentSplitType, 
  PaymentRouteStatus, 
  FallbackTrigger,
  PaymentMethod 
} from '../core/payment-routing';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validator = {
  // String validation
  string(value: unknown, field: string, options?: { min?: number; max?: number; required?: boolean }): string {
    if (value === undefined || value === null) {
      if (options?.required !== false) {
        throw new ValidationError(`${field} is required`, field);
      }
      return '';
    }
    
    const str = String(value).trim();
    
    if (options?.min !== undefined && str.length < options.min) {
      throw new ValidationError(`${field} must be at least ${options.min} characters`, field);
    }
    
    if (options?.max !== undefined && str.length > options.max) {
      throw new ValidationError(`${field} must be at most ${options.max} characters`, field);
    }
    
    return str;
  },

  // Number validation
  number(value: unknown, field: string, options?: { min?: number; max?: number; required?: boolean; integer?: boolean }): number {
    if (value === undefined || value === null) {
      if (options?.required !== false) {
        throw new ValidationError(`${field} is required`, field);
      }
      return 0;
    }
    
    const num = Number(value);
    
    if (!Number.isFinite(num)) {
      throw new ValidationError(`${field} must be a valid number`, field);
    }
    
    if (options?.integer && !Number.isInteger(num)) {
      throw new ValidationError(`${field} must be an integer`, field);
    }
    
    if (options?.min !== undefined && num < options.min) {
      throw new ValidationError(`${field} must be at least ${options.min}`, field);
    }
    
    if (options?.max !== undefined && num > options.max) {
      throw new ValidationError(`${field} must be at most ${options.max}`, field);
    }
    
    return num;
  },

  // Enum validation
  enum<T extends string>(value: unknown, field: string, allowed: T[], required: boolean = true): T | undefined {
    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${field} is required`, field);
      }
      return undefined;
    }
    
    const str = String(value) as T;
    
    if (!allowed.includes(str)) {
      throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`, field);
    }
    
    return str;
  },

  // Array validation
  array<T>(value: unknown, field: string, itemValidator: (item: unknown, index: number) => T, required: boolean = true): T[] {
    if (!Array.isArray(value)) {
      if (required) {
        throw new ValidationError(`${field} must be an array`, field);
      }
      return [];
    }
    
    return value.map((item, index) => {
      try {
        return itemValidator(item, index);
      } catch (err) {
        if (err instanceof ValidationError) {
          throw new ValidationError(`${field}[${index}]: ${err.message}`, `${field}[${index}]`);
        }
        throw err;
      }
    });
  },

  // UUID validation
  uuid(value: unknown, field: string, required: boolean = true): string {
    if (value === undefined || value === null) {
      if (required) {
        throw new ValidationError(`${field} is required`, field);
      }
      return '';
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const str = String(value);
    
    // Also accept our custom IDs like "route_1234567890_abc123"
    const customIdRegex = /^[a-z]+_[0-9]+_[a-z0-9]+$/;
    
    if (!uuidRegex.test(str) && !customIdRegex.test(str)) {
      throw new ValidationError(`${field} must be a valid ID`, field);
    }
    
    return str;
  },

  // Payment route validation
  paymentRoute(body: Record<string, unknown>): {
    name: string;
    barberId: string;
    barberName?: string;
    paymentMethods?: PaymentMethod[];
    priority?: number;
    status?: PaymentRouteStatus;
    maxDailyAmount?: number;
    maxTransactionAmount?: number;
  } {
    return {
      name: this.string(body.name, 'name', { min: 1, max: 100 }),
      barberId: this.string(body.barberId, 'barberId', { min: 1 }),
      barberName: body.barberName ? this.string(body.barberName, 'barberName', { max: 100 }) : undefined,
      paymentMethods: body.paymentMethods 
        ? this.array(body.paymentMethods, 'paymentMethods', (m) => 
            this.enum(m, 'paymentMethod', ['card', 'cash', 'venmo', 'cashapp', 'paypal', 'other'])
          , false)
        : undefined,
      priority: body.priority !== undefined 
        ? this.number(body.priority, 'priority', { integer: true, min: 0 })
        : undefined,
      status: body.status 
        ? this.enum(body.status, 'status', ['active', 'paused', 'disabled'])
        : undefined,
      maxDailyAmount: body.maxDailyAmount !== undefined 
        ? this.number(body.maxDailyAmount, 'maxDailyAmount', { min: 0 })
        : undefined,
      maxTransactionAmount: body.maxTransactionAmount !== undefined 
        ? this.number(body.maxTransactionAmount, 'maxTransactionAmount', { min: 0 })
        : undefined,
    };
  },

  // Fallback plan validation
  fallbackPlan(body: Record<string, unknown>): {
    name: string;
    primaryRouteId: string;
    fallbackRouteIds?: string[];
    trigger?: FallbackTrigger;
    retryCount?: number;
    retryDelayMs?: number;
    notifyOnFallback?: boolean;
    status?: 'active' | 'disabled';
  } {
    return {
      name: this.string(body.name, 'name', { min: 1, max: 100 }),
      primaryRouteId: this.string(body.primaryRouteId, 'primaryRouteId', { min: 1 }),
      fallbackRouteIds: body.fallbackRouteIds 
        ? this.array(body.fallbackRouteIds, 'fallbackRouteIds', (id) => this.string(id, 'routeId', { min: 1 }))
        : undefined,
      trigger: body.trigger 
        ? this.enum(body.trigger, 'trigger', ['primary_unavailable', 'timeout', 'error', 'manual', 'capacity_exceeded'])
        : undefined,
      retryCount: body.retryCount !== undefined 
        ? this.number(body.retryCount, 'retryCount', { integer: true, min: 0, max: 10 })
        : undefined,
      retryDelayMs: body.retryDelayMs !== undefined 
        ? this.number(body.retryDelayMs, 'retryDelayMs', { integer: true, min: 100, max: 60000 })
        : undefined,
      notifyOnFallback: body.notifyOnFallback !== undefined 
        ? Boolean(body.notifyOnFallback) 
        : undefined,
      status: body.status 
        ? this.enum(body.status, 'status', ['active', 'disabled'])
        : undefined,
    };
  },

  // Split recipient validation
  splitRecipient(body: Record<string, unknown>): {
    barberId: string;
    barberName?: string;
    splitType: PaymentSplitType;
    splitValue: number;
    priority?: number;
  } {
    return {
      barberId: this.string(body.barberId, 'barberId', { min: 1 }),
      barberName: body.barberName ? this.string(body.barberName, 'barberName', { max: 100 }) : undefined,
      splitType: this.enum(body.splitType, 'splitType', ['equal', 'percentage', 'fixed', 'custom'])!,
      splitValue: this.number(body.splitValue, 'splitValue', { min: 0 }),
      priority: body.priority !== undefined 
        ? this.number(body.priority, 'priority', { integer: true, min: 0 })
        : undefined,
    };
  },

  // Routing config validation
  routingConfig(body: Record<string, unknown>): {
    enableAutoRouting?: boolean;
    enableFallbacks?: boolean;
    splitThreshold?: number;
    defaultSplitType?: PaymentSplitType;
    maxSplitRecipients?: number;
    routingStrategy?: 'round_robin' | 'priority' | 'load_balance' | 'skill_match';
  } {
    return {
      enableAutoRouting: body.enableAutoRouting !== undefined ? Boolean(body.enableAutoRouting) : undefined,
      enableFallbacks: body.enableFallbacks !== undefined ? Boolean(body.enableFallbacks) : undefined,
      splitThreshold: body.splitThreshold !== undefined 
        ? this.number(body.splitThreshold, 'splitThreshold', { min: 0 })
        : undefined,
      defaultSplitType: body.defaultSplitType 
        ? this.enum(body.defaultSplitType, 'defaultSplitType', ['equal', 'percentage', 'fixed', 'custom'])
        : undefined,
      maxSplitRecipients: body.maxSplitRecipients !== undefined 
        ? this.number(body.maxSplitRecipients, 'maxSplitRecipients', { integer: true, min: 1, max: 20 })
        : undefined,
      routingStrategy: body.routingStrategy 
        ? this.enum(body.routingStrategy, 'routingStrategy', ['round_robin', 'priority', 'load_balance', 'skill_match'])
        : undefined,
    };
  },

  // Reorder validation
  reorder(body: Record<string, unknown>): {
    route_id: string;
    new_priority: number;
  } {
    return {
      route_id: this.string(body.route_id, 'route_id', { min: 1 }),
      new_priority: this.number(body.new_priority, 'new_priority', { integer: true, min: 0 }),
    };
  },
};

export default validator;
