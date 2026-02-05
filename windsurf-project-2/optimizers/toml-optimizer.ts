export interface OptimizeOptions {
  skip?: string[];
  env?: Record<string, string>;
  preserveComments?: boolean;
}

export interface OptimizeResult {
  optimized: string;
  metrics: TransformMetrics[];
  sizeReduction: number;
  compressionRatio: number;
}

export interface TransformMetrics {
  rule: string;
  durationNs: number;
  bytesReduced: number;
}

interface TransformRule {
  name: string;
  transform: (toml: string, env: Record<string, string>) => string | Promise<string>;
}

export class TomlOptimizer {
  private transformations: TransformRule[] = [
    {
      name: 'stripComments',
      transform: (toml: string) => toml.replace(/#.*$/gm, '').trim()
    },
    {
      name: 'inlineEnvVars',
      transform: (toml: string, env: Record<string, string>) =>
        toml.replace(
          /\$\{([A-Z_]+)(?::-([^}]+))?\}/g,
          (_: string, varName: string, defaultVal?: string) =>
            env[varName] ?? defaultVal ?? ''
        )
    },
    {
      name: 'sortKeys',
      transform: (toml: string) => {
        const parsed = parseToml(toml);
        const sorted = this.sortObjectKeys(parsed);
        return stringifyToml(sorted);
      }
    },
    {
      name: 'minify',
      transform: (toml: string) => toml.replace(/\n\s*\n/g, '\n').trim()
    }
  ];

  async optimize(
    toml: string,
    options: OptimizeOptions = {}
  ): Promise<OptimizeResult> {
    let current = toml;
    const metrics: TransformMetrics[] = [];
    const startTotal = performance.now();

    for (const rule of this.transformations) {
      if (options.skip?.includes(rule.name)) continue;

      const start = performance.now();
      const previous = current;

      current = await rule.transform(current, options.env ?? process.env);

      metrics.push({
        rule: rule.name,
        durationNs: Math.round((performance.now() - start) * 1e6),
        bytesReduced: previous.length - current.length
      });
    }

    return {
      optimized: current,
      metrics,
      sizeReduction: toml.length - current.length,
      compressionRatio: current.length / toml.length
    };
  }

  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(this.sortObjectKeys.bind(this));

    const sorted: Record<string, any> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = this.sortObjectKeys(obj[key]);
    }
    return sorted;
  }

  addTransformation(rule: TransformRule): void {
    this.transformations.push(rule);
  }

  removeTransformation(name: string): void {
    this.transformations = this.transformations.filter((r) => r.name !== name);
  }

  getTransformationNames(): string[] {
    return this.transformations.map((r) => r.name);
  }
}

import { parse as parseToml, stringify as stringifyToml } from 'bun:toml';

export { parseToml };

declare const process: {
  env: Record<string, string>;
};
