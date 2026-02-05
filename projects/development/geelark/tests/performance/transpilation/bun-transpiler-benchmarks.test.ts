#!/usr/bin/env bun

/**
 * Bun Transpilation & Module Resolution Benchmarks
 * Performance tests for Bun's transpiler, module resolution, and dependency loading
 *
 * Run with: bun test tests/performance/transpilation/bun-transpiler-benchmarks.test.ts
 */

// @ts-ignore - Bun types are available at runtime
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { PerformanceTracker } from "../../../src/core/benchmark.js";

describe("⚡ Bun Transpilation & Module Resolution Benchmarks", () => {

  beforeEach(() => {
    // Clean environment before each test
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);
  });

  afterEach(() => {
    // Clean environment after each test
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);
  });

  describe("🔧 Bun.Transpiler Performance", () => {

    it("should benchmark TypeScript transpilation", () => {
      const tsCode = `
        interface User {
          id: number;
          name: string;
          email?: string;
        }

        class UserService {
          private users: User[] = [];

          addUser(user: User): void {
            this.users.push(user);
          }

          findUser(id: number): User | undefined {
            return this.users.find(u => u.id === id);
          }

          async saveUser(user: User): Promise<boolean> {
            try {
              // Simulate async operation
              await new Promise(resolve => setTimeout(resolve, 1));
              this.users.push(user);
              return true;
            } catch (error) {
              console.error('Failed to save user:', error);
              return false;
            }
          }
        }

        export { UserService, User };
      `;

      const result = PerformanceTracker.measure(() => {
        // @ts-ignore - Bun.Transpiler is available at runtime
        const transpiler = new Bun.Transpiler({ loader: "ts" });
        return transpiler.transformSync(tsCode);
      }, "TypeScript transpilation");

      expect(typeof result).toBe("string");
      expect(result).toContain("class UserService");
      expect(result).not.toContain("interface User"); // Interfaces should be removed
    });

    it("should benchmark JSX transpilation", () => {
      const jsxCode = `
        import React from 'react';

        interface Props {
          title: string;
          count: number;
        }

        function Component({ title, count }: Props) {
          return (
            <div className="container">
              <h1>{title}</h1>
              <p>Count: {count}</p>
              <button onClick={() => console.log('clicked')}>
                Click me
              </button>
            </div>
          );
        }

        export default Component;
      `;

      const result = PerformanceTracker.measure(() => {
        // @ts-ignore - Bun.Transpiler is available at runtime
        const transpiler = new Bun.Transpiler({ loader: "jsx" });
        return transpiler.transformSync(jsxCode);
      }, "JSX transpilation");

      expect(typeof result).toBe("string");
      expect(result).toContain("React.createElement");
      expect(result).not.toContain("<div"); // JSX should be transformed
    });

    it("should benchmark TSX transpilation", () => {
      const tsxCode = `
        import React, { useState, useEffect } from 'react';

        interface CounterProps {
          initial: number;
        }

        const Counter: React.FC<CounterProps> = ({ initial }) => {
          const [count, setCount] = useState(initial);

          useEffect(() => {
            console.log('Count changed:', count);
          }, [count]);

          const increment = (): void => {
            setCount(prev => prev + 1);
          };

          return (
            <div>
              <h2>Counter: {count}</h2>
              <button onClick={increment}>+</button>
            </div>
          );
        };

        export default Counter;
      `;

      const result = PerformanceTracker.measure(() => {
        // @ts-ignore - Bun.Transpiler is available at runtime
        const transpiler = new Bun.Transpiler({ loader: "tsx" });
        return transpiler.transformSync(tsxCode);
      }, "TSX transpilation");

      expect(typeof result).toBe("string");
      expect(result).toContain("jsxDEV"); // Bun uses jsxDEV for JSX transformation
      expect(result).toContain("useState");
      expect(result).not.toContain("<div"); // JSX should be transformed
    });

    it("should benchmark async transpilation", async () => {
      const complexCode = `
        // Complex TypeScript with decorators and metadata
        @Component({
          selector: 'app-root',
          template: '<div>Hello World</div>'
        })
        class AppComponent {
          @Input() title: string = '';
          @Output() changed = new EventEmitter<string>();

          constructor(private service: DataService) {}

          @HostListener('click')
          onClick() {
            this.changed.emit(this.title);
          }
        }

        // Advanced type definitions
        type ComplexType<T extends Record<string, any>> = {
          [K in keyof T]: T[K] extends Function ? T[K] : T[K] | null;
        };

        // Generic utility functions
        function createProxy<T extends object>(target: T): T {
          return new Proxy(target, {
            get(obj, prop) {
              return obj[prop as keyof T];
            }
          });
        }
      `;

      const result = await PerformanceTracker.measureAsync(async () => {
        // @ts-ignore - Bun.Transpiler is available at runtime
        const transpiler = new Bun.Transpiler({ loader: "ts" });
        return await transpiler.transform(complexCode);
      }, "Async TypeScript transpilation");

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("📦 Module Resolution Performance", () => {

    it("should benchmark import scanning", () => {
      const codeWithImports = `
        import React from 'react';
        import { useState, useEffect } from 'react';
        import type { User, Product } from './types';
        import { ApiService } from './services/api';
        import Utils from './utils';
        const config = require('./config.json');
        import('./styles.css');
        import logo from './logo.png';

        // Dynamic imports
        const loadModule = async () => {
          const { heavyModule } = await import('./heavy-module');
          return heavyModule;
        };

        // Require resolve
        const modulePath = require.resolve('./dependency');
      `;

      const result = PerformanceTracker.measure(() => {
        // @ts-ignore - Bun.Transpiler is available at runtime
        const transpiler = new Bun.Transpiler({ loader: "tsx" });
        return transpiler.scanImports(codeWithImports);
      }, "Import scanning");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(5);

      // Check for different import types
      const importKinds = result.map(imp => imp.kind);
      expect(importKinds).toContain("import-statement");
      expect(importKinds).toContain("require-call");
      expect(importKinds).toContain("dynamic-import");
    });

    it("should benchmark dependency resolution simulation", () => {
      const mockPackageJson = {
        name: "test-package",
        version: "1.0.0",
        dependencies: {
          "react": "^18.0.0",
          "lodash": "^4.17.21",
          "axios": "^1.0.0"
        },
        devDependencies: {
          "@types/react": "^18.0.0",
          "typescript": "^5.0.0"
        }
      };

      const result = PerformanceTracker.measure(() => {
        // Simulate dependency resolution
        const dependencies = Object.keys(mockPackageJson.dependencies || {});
        const devDependencies = Object.keys(mockPackageJson.devDependencies || {});
        const allDeps = [...dependencies, ...devDependencies];

        // Simulate node_modules lookup
        const resolvedDeps = allDeps.map(dep => ({
          name: dep,
          resolved: `node_modules/${dep}/package.json`,
          version: mockPackageJson.dependencies?.[dep] || mockPackageJson.devDependencies?.[dep]
        }));

        return resolvedDeps;
      }, "Dependency resolution");

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("resolved");
      expect(result[0]).toHaveProperty("version");
    });

    it("should benchmark module loading strategies", () => {
      const strategies = {
        esm: "import { module } from 'package';",
        cjs: "const module = require('package');",
        dynamic: "const module = await import('package');",
        requireResolve: "const path = require.resolve('package');"
      };

      const results = PerformanceTracker.measure(() => {
        // Simulate different loading strategies
        const strategyResults = Object.entries(strategies).map(([name, code]) => {
          // @ts-ignore - Bun.Transpiler is available at runtime
          const transpiler = new Bun.Transpiler({ loader: "js" });
          const scanResult = transpiler.scanImports(code);
          return {
            strategy: name,
            code,
            imports: scanResult.length,
            transpileTime: performance.now()
          };
        });

        return strategyResults;
      }, "Module loading strategies");

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toHaveProperty("strategy");
        expect(result).toHaveProperty("imports");
      });
    });
  });

  describe("🔄 Transpilation Optimization", () => {

    it("should benchmark different loader performance", () => {
      const testCode = `
        export function testFunction(x: number, y: string): boolean {
          return x > 0 && y.length > 0;
        }

        export const testConstant = 42;
        export type TestType = { id: number; name: string };
      `;

      const loaders = ["js", "jsx", "ts", "tsx"] as const;
      const results: Record<string, number> = {};

      loaders.forEach(loader => {
        const time = PerformanceTracker.measure(() => {
          // @ts-ignore - Bun.Transpiler is available at runtime
          const transpiler = new Bun.Transpiler({ loader });
          return transpiler.transformSync(testCode);
        }, `${loader} loader`);

        results[loader] = time;
      });

      console.log("📊 Loader performance comparison:");
      Object.entries(results).forEach(([loader, time]) => {
        console.log(`  ${loader}: ${time.toFixed(2)}ms`);
      });

      // All loaders should complete successfully
      Object.values(results).forEach(time => {
        expect(time).toBeGreaterThan(0);
      });
    });

    it("should benchmark transpilation with decorators", () => {
      const decoratorCode = `
        function Component(options: { selector: string }) {
          return function (target: any) {
            target.selector = options.selector;
          };
        }

        function Input() {
          return function (target: any, propertyKey: string) {
            target.inputs = target.inputs || [];
            target.inputs.push(propertyKey);
          };
        }

        @Component({ selector: 'app-user' })
        class UserComponent {
          @Input() username: string = '';
          @Input() email: string = '';

          @Component({ selector: 'nested' })
          nestedComponent?: any;

          validateUser(): boolean {
            return this.username.length > 0 && this.email.includes('@');
          }
        }
      `;

      const result = PerformanceTracker.measure(() => {
        // @ts-ignore - Bun.Transpiler is available at runtime
        const transpiler = new Bun.Transpiler({ loader: "ts" });
        return transpiler.transformSync(decoratorCode);
      }, "Decorator transpilation");

      expect(typeof result).toBe("string");
      expect(result).toContain("__legacyDecorateClassTS"); // Bun uses legacy decorator transform
    });
  });

  describe("📊 Memory Usage During Transpilation", () => {

    it("should analyze memory usage during large transpilation", () => {
      // @ts-ignore - heapStats is available at runtime via bun:jsc
      const heapStats = globalThis.heapStats || (() => {
        return { heapSize: 0, heapCapacity: 0, objectCount: 0 };
      });

      const beforeMemory = heapStats().heapSize;

      const largeCodebase = Array.from({ length: 50 }, (_, fileIndex) => {
        return `
        // File ${fileIndex}
        import { Component } from './base';

        interface Component${fileIndex}Props {
          id: number;
          data: string;
        }

        class Component${fileIndex} extends Component<Component${fileIndex}Props> {
          render() {
            return '<div>Component ' + ${fileIndex} + ': ' + this.props.data + '</div>';
          }

          ${Array.from({ length: 10 }, (_, methodIndex) => {
            return `
          method${methodIndex}(): string {
            return 'method${methodIndex}_result';
          }
          `;
          }).join('\n  ')}
        }

        export default Component${fileIndex};
        `;
      }).join('\n\n');

      // Transpile the large codebase
      // @ts-ignore - Bun.Transpiler is available at runtime
      const transpiler = new Bun.Transpiler({ loader: "tsx" });
      const result = transpiler.transformSync(largeCodebase);

      const afterMemory = heapStats().heapSize;

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(10000);

      if (beforeMemory > 0) {
        console.log(`🧠 Memory usage during transpilation:`);
        console.log(`  Before: ${(beforeMemory / 1024).toFixed(2)}KB`);
        console.log(`  After: ${(afterMemory / 1024).toFixed(2)}KB`);
        console.log(`  Delta: ${((afterMemory - beforeMemory) / 1024).toFixed(2)}KB`);
      }
    });
  });

  describe("🚀 Real-world Scenarios", () => {

    it("should benchmark React component transpilation", () => {
      const reactComponent = `
        import React, { useState, useEffect, useCallback, useMemo } from 'react';
        import type { User, Product } from '../types';
        import { ApiService } from '../services/api';
        import Utils from './utils';

        interface Props {
          user: User;
          products: Product[];
          onUpdate: (user: User) => void;
        }

        const UserProfile: React.FC<Props> = ({ user, products, onUpdate }) => {
          const [loading, setLoading] = useState(false);
          const [error, setError] = useState<string | null>(null);

          const sortedProducts = useMemo(() => {
            return products.sort((a, b) => a.price - b.price);
          }, [products]);

          const handleUpdate = useCallback(async (updates: Partial<User>) => {
            setLoading(true);
            setError(null);

            try {
              const updatedUser = await ApiService.updateUser(user.id, updates);
              onUpdate(updatedUser);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
              setLoading(false);
            }
          }, [user.id, onUpdate]);

          useEffect(() => {
            console.log('UserProfile mounted for user:', user.id);
          }, [user.id]);

          if (loading) return <div>Loading...</div>;
          if (error) return <div>Error: {error}</div>;

          return (
            <div>
              <h1>{user.name}</h1>
              <p>{user.email}</p>
              <div>
                {sortedProducts.map(product => (
                  <div key={product.id}>
                    <h3>{product.name}</h3>
                    <p>$' + '{product.price}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => handleUpdate({ name: 'Updated Name' })}>
                Update Name
              </button>
            </div>
          );
        };

        export default UserProfile;
      `;

      const result = PerformanceTracker.measure(() => {
        // @ts-ignore - Bun.Transpiler is available at runtime
        const transpiler = new Bun.Transpiler({ loader: "tsx" });
        return transpiler.transformSync(reactComponent);
      }, "React component transpilation");

      expect(typeof result).toBe("string");
      expect(result).toContain("jsxDEV"); // Bun uses jsxDEV for JSX transformation
      expect(result).toContain("useState");
      expect(result).toContain("useEffect");
    });

    it("should benchmark API route transpilation", () => {
      const apiRoute = `

        interface RouteParams {
          id: string;
        }

        export async function GET(req: BunRequest<{ params: RouteParams }>): Promise<BunResponse> {
          try {
            const { id } = req.params;

            if (!id || isNaN(Number(id))) {
              return Response.json(
                { error: 'Invalid user ID' } as ApiResponse<null>,
                { status: 400 }
              );
            }

            const user = await DatabaseService.getUserById(Number(id));

            if (!user) {
              return Response.json(
                { error: 'User not found' } as ApiResponse<null>,
                { status: 404 }
              );
            }

            return Response.json(
              { data: user } as ApiResponse<UserData>,
              { status: 200 }
            );
          } catch (error) {
            console.error('GET user error:', error);
            return Response.json(
              { error: 'Internal server error' } as ApiResponse<null>,
              { status: 500 }
            );
          }
        }

        export async function PUT(req: BunRequest<{ params: RouteParams }>): Promise<BunResponse> {
          try {
            const { id } = req.params;
            const body = await req.json() as Partial<UserData>;

            // Validate input
            const validation = ValidationService.validateUserUpdate(body);
            if (!validation.isValid) {
              return Response.json(
                { error: validation.errors } as ApiResponse<null>,
                { status: 400 }
              );
            }

            const updatedUser = await DatabaseService.updateUser(Number(id), body);

            return Response.json(
              { data: updatedUser } as ApiResponse<UserData>,
              { status: 200 }
            );
          } catch (error) {
            console.error('PUT user error:', error);
            return Response.json(
              { error: 'Internal server error' } as ApiResponse<null>,
              { status: 500 }
            );
          }
        }
      `;

      const result = PerformanceTracker.measure(() => {
        // @ts-ignore - Bun.Transpiler is available at runtime
        const transpiler = new Bun.Transpiler({ loader: "ts" });
        return transpiler.transformSync(apiRoute);
      }, "API route transpilation");

      expect(typeof result).toBe("string");
      expect(result).toContain("export async function GET");
      expect(result).toContain("export async function PUT");
    });
  });
});
