// infrastructure/v1-3-3/types.d.ts
// Type definitions for v1.3.3 Golden Matrix Components

declare module "bun:bundle" {
  export function feature(name: string): boolean;
}

// Global Bun types (if not available)
declare global {
  interface Bun {
    parseYAML(content: string): any;
    YAML: {
      stringify(obj: any, options?: any): string;
    };
    build(options: any): Promise<any>;
  }

  const Bun: Bun | undefined;
}

// Export empty to make this a module
export {};
