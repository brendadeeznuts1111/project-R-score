#!/usr/bin/env bun
/**
 * Dead Code Elimination (DCE) Examples
 *
 * Demonstrates when tree-shaking causes issues and how
 * --ignore-dce-annotations fixes them.
 *
 * Run: bun examples/dce-examples.ts
 */

console.info("╔════════════════════════════════════════════════════════════════╗");
console.info("║  Dead Code Elimination (DCE) Examples                           ║");
console.info("╚════════════════════════════════════════════════════════════════╝\n");

// ============================================================================
// Example 1: Plugin System
// ============================================================================

console.info("=== Example 1: Plugin System (Side Effects) ===\n");

// Simulated global plugin registry
const globalPlugins: Map<string, any> = new Map();

function registerPlugin(name: string, plugin: any) {
  globalPlugins.set(name, plugin);
  console.info(`✅ Plugin registered: ${name}`);
}

// Built-in plugins that self-register
registerPlugin("logger", { name: "logger", version: "1.0.0" });
registerPlugin("auth", { name: "auth", version: "2.0.0" });
registerPlugin("database", { name: "database", version: "1.5.0" });

// Use a plugin
function usePlugin(name: string) {
  const plugin = globalPlugins.get(name);
  if (!plugin) {
    throw new Error(`Plugin not found: ${name}`);
  }
  console.info(`Using plugin: ${plugin.name} v${plugin.version}`);
  return plugin;
}

console.info("Plugins registered:", Array.from(globalPlugins.keys()));
usePlugin("logger");
console.info();

// ============================================================================
// Example 2: Pure vs Impure Functions
// ============================================================================

console.info("=== Example 2: Pure vs Impure Functions ===\n");

// Pure function (can be safely eliminated)
const add = /*#__PURE__*/((a: number, b: number) => {
  return a + b;
});

// Impure function (should NOT be eliminated)
const impureLog = (value: number) => {
  console.info("Value:", value);
  return value;
};

// Marked as pure but actually has side effects (BUG!)
const pureButImpure = /*#__PURE__*/((value: number) => {
  console.info("This should not be eliminated!");
  return value;
});

console.info("Pure function result:", add(1, 2));
console.info("Impure function:");
impureLog(42);
console.info("Marked as pure (but has side effect):");
pureButImpure(100);
console.info();

// ============================================================================
// Example 3: Polyfill Pattern
// ============================================================================

console.info("=== Example 3: Polyfill Pattern ===\n");

// Polyfill module that runs at import time
let polyfillsInstalled = false;

function installPolyfills() {
  if (polyfillsInstalled) {
    return;
  }

  console.info("Installing polyfills...");

  // Simulate polyfill installation
  if (typeof (globalThis as any).CustomEvent === "undefined") {
    (globalThis as any).CustomEvent = class CustomEvent {};
    console.info("  ✅ CustomEvent polyfilled");
  }

  polyfillsInstalled = true;
  console.info("✅ Polyfills installed\n");
}

// Automatically install
installPolyfills();

// ============================================================================
// Example 4: Decorator Registration
// ============================================================================

console.info("=== Example 4: Decorator Registration ===\n");

const decoratorRegistry = new Map<string, any>();

function registerDecorator(name: string, decorator: any) {
  decoratorRegistry.set(name, decorator);
  console.info(`✅ Decorator registered: ${name}`);
}

// Decorators self-register
registerDecorator("Component", {
  name: "Component",
  type: "class",
  fn: (target: any) => {
    console.info(`  Applying Component decorator to ${target.name}`);
  }
});

registerDecorator("Injectable", {
  name: "Injectable",
  type: "property",
  fn: (target: any, key: string) => {
    console.info(`  Applying Injectable decorator to ${key}`);
  }
});

console.info("Available decorators:", Array.from(decoratorRegistry.keys()));
console.info();

// ============================================================================
// Example 5: CSS-in-JS Registration
// ============================================================================

console.info("=== Example 5: CSS-in-JS Registration ===\n");

const injectedStyles = new Set<string>();

function injectCSS(name: string, css: string) {
  injectedStyles.add(name);
  console.info(`✅ CSS injected: ${name} (${css.length} bytes)`);
}

// Styles self-register at module level
injectCSS("primary", ".primary { color: blue; }");
injectCSS("secondary", ".secondary { color: red; }");
injectJS("theme", "document.body.classList.add('theme-dark')");

function injectJS(name: string, code: string) {
  injectedStyles.add(name);
  console.info(`✅ JS injected: ${name} (${code.length} bytes)`);
}

console.info("Injected styles/scripts:", Array.from(injectedStyles).join(", "));
console.info();

// ============================================================================
// Example 6: Dynamic Import Pattern
// ============================================================================

console.info("=== Example 6: Dynamic Import Pattern ===\n");

const loadedModules = new Map<string, any>();

async function loadModule(name: string) {
  if (loadedModules.has(name)) {
    return loadedModules.get(name);
  }

  console.info(`Loading module: ${name}`);

  // Simulate module loading
  const module = {
    name,
    loaded: true,
    exports: {
      default: () => `Module: ${name}`
    }
  };

  loadedModules.set(name, module);
  return module;
}

// Preload critical modules
loadModule("lodash");
loadModule("axios");
loadModule("react");

console.info("Loaded modules:", Array.from(loadedModules.keys()));
console.info();

// ============================================================================
// Example 7: Singleton Initialization
// ============================================================================

console.info("=== Example 7: Singleton Initialization ===\n");

class SingletonManager {
  private static instance: SingletonManager | null = null;
  private initialized = false;

  static getInstance() {
    if (!SingletonManager.instance) {
      SingletonManager.instance = new SingletonManager();
    }
    return SingletonManager.instance;
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    console.info("✅ SingletonManager initialized");
    this.initialized = true;
  }

  getStatus() {
    return this.initialized ? "initialized" : "not initialized";
  }
}

// Auto-initialize at module load
const manager = SingletonManager.getInstance();
manager.initialize();

console.info("Singleton status:", manager.getStatus());
console.info();

// ============================================================================
// Example 8: Configuration Registry
// ============================================================================

console.info("=== Example 8: Configuration Registry ===\n");

const configRegistry = new Map<string, any>();

function registerConfig(key: string, value: any) {
  configRegistry.set(key, value);
  console.info(`✅ Config registered: ${key} = ${JSON.stringify(value)}`);
}

// Default configurations self-register
registerConfig("api.timeout", 5000);
registerConfig("api.retries", 3);
registerConfig("database.poolSize", 10);

function getConfig(key: string) {
  return configRegistry.get(key);
}

console.info("API timeout:", getConfig("api.timeout"));
console.info("Available configs:", Array.from(configRegistry.keys()).join(", "));
console.info();

// ============================================================================
// Build Scenarios
// ============================================================================

console.info("=== Build Scenarios ===\n");

console.info("Scenario 1: Default build (aggressive tree-shaking)");
console.info("  $ bun build src/index.ts");
console.info("  Result: May eliminate plugin registration, polyfills, etc.");
console.info();

console.info("Scenario 2: Safe build (ignore DCE annotations)");
console.info("  $ bun build --ignore-dce-annotations src/index.ts");
console.info("  Result: Keeps all side-effect code");
console.info();

console.info("Scenario 3: Programmatic build");
console.info("  await Bun.build({");
console.info("    entrypoints: ['./src/index.ts'],");
console.info("    ignoreDCEAnnotations: true,");
console.info("    outdir: './dist'");
console.info("  });");
console.info();

// ============================================================================
// Summary
// ============================================================================

console.info("╔════════════════════════════════════════════════════════════════╗");
console.info("║  Key Takeaways                                                        ║");
console.info("╚════════════════════════════════════════════════════════════════╝\n");

console.info("1. ✅ Plugin systems often need --ignore-dce-annotations");
console.info("2. ✅ Polyfills must run even if not directly imported");
console.info("3. ✅ Decorators may self-register at module level");
console.info("4. ✅ CSS-in-JS needs side effects to inject styles");
console.info("5. ✅ Singletons may auto-initialize");
console.info("6. ✅ Dynamic imports need discovery code preserved");
console.info("7. ⚠️  Use flag only as workaround, not default");
console.info("8. ⚠️  Prefer proper 'sideEffects' in package.json");
console.info();

console.info("When to use --ignore-dce-annotations:");
console.info("  • Build fails with missing exports");
console.info("  • Runtime errors due to eliminated code");
console.info("  • Plugin/extension system not working");
console.info("  • Polyfills not loading");
console.info("  • Decorators/CSS not registering");
console.info();

console.info("Alternatives to consider:");
console.info("  • Mark files in package.json 'sideEffects' array");
console.info("  • Use explicit imports for side effects");
console.info("  • Add proper @PURE annotations");
console.info("  • Test without flag and fix root cause");
console.info();

console.info("╔════════════════════════════════════════════════════════════════╗");
console.info("║  ✅ Examples complete!                                           ║");
console.info("╚════════════════════════════════════════════════════════════════╝\n");
