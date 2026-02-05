/**
 * §Validation:137 - Performance Decorators
 * @pattern Pattern:137
 * @perf <0.05ms indexing
 * @roi ∞
 * @section §Validation
 */

import "reflect-metadata";

export const PERF_METADATA_KEY = Symbol("perf:budget");
export const ROI_METADATA_KEY = Symbol("roi:min");

/**
 * @perfBudget decorator
 */
export function perfBudget(budget: string): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(PERF_METADATA_KEY, budget, target, propertyKey);

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - start;

      const budgetMs = parseBudget(budget);
      if (duration > budgetMs) {
        console.warn(`⚠️ [PERF_VIOLATION] ${this.constructor.name}.${String(propertyKey)} took ${duration.toFixed(3)}ms (Budget: ${budget})`);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * @roiMin decorator
 */
export function roiMin(min: string): MethodDecorator {
  return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(ROI_METADATA_KEY, min, target, propertyKey);
    return descriptor;
  };
}

function parseBudget(budget: string): number {
  const match = budget.match(/<([\d.]+)(ms|μs|s)/);
  if (!match) return 1000;
  
  const value = parseFloat(match[1]!);
  const unit = match[2];

  switch (unit) {
    case 'μs': return value / 1000;
    case 'ms': return value;
    case 's': return value * 1000;
    default: return value;
  }
}
