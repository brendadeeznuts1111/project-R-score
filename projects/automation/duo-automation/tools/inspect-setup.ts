import { Bun } from 'bun';
import { INSPECT_CUSTOM } from './ecosystem/inspect-custom';

// ============================================
// GLOBAL INSPECTION SETUP
// ============================================

export function setupGlobalInspection() {
  // Override console.log for inspectable objects
  const originalLog = console.log;
  
  console.log = function(...args: any[]) {
    const formattedArgs = args.map(arg => {
      if (arg && typeof arg === 'object' && INSPECT_CUSTOM in arg) {
        return arg[INSPECT_CUSTOM]();
      }
      return arg;
    });
    
    originalLog.apply(console, formattedArgs);
  };
  
  // Also override console.error for inspectable objects
  const originalError = console.error;
  
  console.error = function(...args: any[]) {
    const formattedArgs = args.map(arg => {
      if (arg && typeof arg === 'object' && INSPECT_CUSTOM in arg) {
        return `\x1b[31m${arg[INSPECT_CUSTOM]()}\x1b[0m`;
      }
      return arg;
    });
    
    originalError.apply(console, formattedArgs);
  };
  
  // Also override console.warn for inspectable objects
  const originalWarn = console.warn;
  
  console.warn = function(...args: any[]) {
    const formattedArgs = args.map(arg => {
      if (arg && typeof arg === 'object' && INSPECT_CUSTOM in arg) {
        return `\x1b[33m${arg[INSPECT_CUSTOM]()}\x1b[0m`;
      }
      return arg;
    });
    
    originalWarn.apply(console, formattedArgs);
  };
  
  // Override Bun.inspect
  const originalInspect = Bun.inspect;
  
  (Bun as any).inspect = function(obj: any, options?: any) {
    if (obj && typeof obj === 'object' && INSPECT_CUSTOM in obj) {
      return obj[INSPECT_CUSTOM]();
    }
    return originalInspect(obj, options);
  };
  
  // Add pretty printing for arrays of inspectable objects
  const originalArrayInspect = Array.prototype[Symbol.for('nodejs.util.inspect.custom')] || 
                               Array.prototype.toString;
  
  Array.prototype[Symbol.for('nodejs.util.inspect.custom')] = function() {
    if (this.length > 0 && this.every(item => item && typeof item === 'object' && INSPECT_CUSTOM in item)) {
      return this.map((item, index) => {
        const prefix = `${(index + 1).toString().padStart(2)}.`;
        const inspection = item[INSPECT_CUSTOM]();
        
        // Add prefix to each line of the inspection
        return inspection.split('\n')
          .map((line, i) => i === 0 ? `${prefix} ${line}` : `    ${line}`)
          .join('\n');
      }).join('\n\n');
    }
    return originalArrayInspect.call(this);
  };
  
  console.log('🔍 Custom inspection system activated');
  console.log('   - Enhanced console.log, console.error, console.warn');
  console.log('   - Overridden Bun.inspect');
  console.log('   - Array pretty printing for inspectable objects');
}

// ============================================
// CONDITIONAL SETUP
// ============================================

export function setupInspectionIfEnabled() {
  // Check if inspection is enabled via environment variable
  const enabled = process.env.DUOPLUS_INSPECTION_ENABLED === 'true' || 
                  process.env.NODE_ENV === 'development' ||
                  process.env.DEBUG === 'duoplus';
  
  if (enabled) {
    setupGlobalInspection();
    return true;
  }
  
  return false;
}

// ============================================
// INSPECTION CONFIGURATION
// ============================================

export interface InspectionConfig {
  enableColors?: boolean;
  enableTableFormatting?: boolean;
  maxDepth?: number;
  truncateStrings?: number;
  showTimestamps?: boolean;
}

export const defaultInspectionConfig: InspectionConfig = {
  enableColors: true,
  enableTableFormatting: true,
  maxDepth: 5,
  truncateStrings: 100,
  showTimestamps: false,
};

export function configureInspection(config: Partial<InspectionConfig>) {
  Object.assign(defaultInspectionConfig, config);
  
  if (config.enableColors !== undefined) {
    process.env.FORCE_COLOR = config.enableColors ? '1' : '0';
  }
}

// ============================================
// INSPECTION HELPERS
// ============================================

export function isInspectable(obj: any): boolean {
  return obj && typeof obj === 'object' && INSPECT_CUSTOM in obj;
}

export function inspectIfPossible(obj: any, fallback?: string): string {
  if (isInspectable(obj)) {
    return obj[INSPECT_CUSTOM]();
  }
  
  if (fallback !== undefined) {
    return fallback;
  }
  
  return Bun.inspect(obj);
}

export function logInspectable(...args: any[]) {
  const formattedArgs = args.map(arg => inspectIfPossible(arg));
  console.log(...formattedArgs);
}

export function errorInspectable(...args: any[]) {
  const formattedArgs = args.map(arg => {
    const inspected = inspectIfPossible(arg);
    return `\x1b[31m${inspected}\x1b[0m`;
  });
  console.error(...formattedArgs);
}

export function warnInspectable(...args: any[]) {
  const formattedArgs = args.map(arg => {
    const inspected = inspectIfPossible(arg);
    return `\x1b[33m${inspected}\x1b[0m`;
  });
  console.warn(...formattedArgs);
}

// ============================================
// INSPECTION MIDDLEWARE
// ============================================

export function createInspectionMiddleware() {
  return (req: any, res: any, next: any) => {
    // Add inspection helpers to request object
    req.inspect = (obj: any) => inspectIfPossible(obj);
    req.logInspectable = (...args: any[]) => logInspectable(...args);
    req.errorInspectable = (...args: any[]) => errorInspectable(...args);
    req.warnInspectable = (...args: any[]) => warnInspectable(...args);
    
    next();
  };
}

// ============================================
// DEVELOPMENT HELPERS
// ============================================

export function createInspectableProxy<T extends object>(target: T, name?: string): T {
  return new Proxy(target, {
    get(obj, prop) {
      const value = obj[prop as keyof T];
      
      // If the property is a function, wrap it to log arguments/return values
      if (typeof value === 'function') {
        return function(...args: any[]) {
          const methodName = String(prop);
          console.log(`🔍 Calling ${name || 'Object'}.${methodName}(${args.map(inspectIfPossible).join(', ')})`);
          
          try {
            const result = value.apply(obj, args);
            
            if (result && typeof result === 'object') {
              console.log(`✅ ${name || 'Object'}.${methodName} returned:`);
              console.log(result);
            } else {
              console.log(`✅ ${name || 'Object'}.${methodName} returned: ${inspectIfPossible(result)}`);
            }
            
            return result;
          } catch (error) {
            console.error(`❌ ${name || 'Object'}.${methodName} threw:`, error);
            throw error;
          }
        };
      }
      
      return value;
    }
  });
}

// ============================================
// INSPECTION STATISTICS
// ============================================

export class InspectionStats {
  private static instance: InspectionStats;
  private stats = {
    totalInspections: 0,
    byType: new Map<string, number>(),
    totalTime: 0,
    errors: 0,
  };
  
  static getInstance(): InspectionStats {
    if (!InspectionStats.instance) {
      InspectionStats.instance = new InspectionStats();
    }
    return InspectionStats.instance;
  }
  
  recordInspection(obj: any, duration: number, error?: boolean) {
    this.stats.totalInspections++;
    this.stats.totalTime += duration;
    
    if (error) {
      this.stats.errors++;
    }
    
    const typeName = obj?.constructor?.name || 'Unknown';
    this.stats.byType.set(typeName, (this.stats.byType.get(typeName) || 0) + 1);
  }
  
  getStats() {
    return {
      ...this.stats,
      averageTime: this.stats.totalInspections > 0 ? this.stats.totalTime / this.stats.totalInspections : 0,
      byType: Object.fromEntries(this.stats.byType),
    };
  }
  
  reset() {
    this.stats = {
      totalInspections: 0,
      byType: new Map(),
      totalTime: 0,
      errors: 0,
    };
  }
  
  printStats() {
    const stats = this.getStats();
    console.log('\n📊 INSPECTION STATISTICS');
    console.log('═'.repeat(40));
    console.log(`Total Inspections: ${stats.totalInspections}`);
    console.log(`Average Time: ${stats.averageTime.toFixed(4)}ms`);
    console.log(`Errors: ${stats.errors}`);
    console.log('\nBy Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }
}

// ============================================
// AUTO-SETUP
// ============================================

// Auto-setup if this module is imported in development
if (process.env.NODE_ENV === 'development' || process.env.AUTO_SETUP_INSPECTION === 'true') {
  setupInspectionIfEnabled();
}
