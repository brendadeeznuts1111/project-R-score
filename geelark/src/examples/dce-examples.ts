#!/usr/bin/env bun
/**
 * Dead Code Elimination (DCE) Examples
 *
 * Demonstrates when tree-shaking causes issues and how
 * --ignore-dce-annotations fixes them.
 *
 * Run: bun examples/dce-examples.ts
 */

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║  Dead Code Elimination (DCE) Examples                           ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

// ============================================================================
// Example 1: Plugin System
// ============================================================================

console.log("=== Example 1: Plugin System (Side Effects) ===\n");

// Simulated global plugin registry
const globalPlugins: Map<string, any> = new Map();

function registerPlugin(name: string, plugin: any) {
  globalPlugins.set(name, plugin);
  console.log(`✅ Plugin registered: ${name}`);
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
  console.log(`Using plugin: ${plugin.name} v${plugin.version}`);
  return plugin;
}

console.log("Plugins registered:", Array.from(globalPlugins.keys()));
usePlugin("logger");
console.log();

// ============================================================================
// Example 2: Pure vs Impure Functions
// ============================================================================

console.log("=== Example 2: Pure vs Impure Functions ===\n");

// Pure function (can be safely eliminated)
const add = /*#__PURE__*/((a: number, b: number) => {
  return a + b;
});

// Impure function (should NOT be eliminated)
const impureLog = (value: number) => {
  console.log("Value:", value);
  return value;
};

// Marked as pure but actually has side effects (BUG!)
const pureButImpure = /*#__PURE__*/((value: number) => {
  console.log("This should not be eliminated!");
  return value;
});

console.log("Pure function result:", add(1, 2));
console.log("Impure function:");
impureLog(42);
console.log("Marked as pure (but has side effect):");
pureButImpure(100);
console.log();

// ============================================================================
// Example 3: Polyfill Pattern
// ============================================================================

console.log("=== Example 3: Polyfill Pattern ===\n");

// Polyfill module that runs at import time
let polyfillsInstalled = false;

function installPolyfills() {
  if (polyfillsInstalled) {
    return;
  }

  console.log("Installing polyfills...");

  // Simulate polyfill installation
  if (typeof (globalThis as any).CustomEvent === "undefined") {
    (globalThis as any).CustomEvent = class CustomEvent {};
    console.log("  ✅ CustomEvent polyfilled");
  }

  polyfillsInstalled = true;
  console.log("✅ Polyfills installed\n");
}

// Automatically install
installPolyfills();

// ============================================================================
// Example 4: Decorator Registration
// ============================================================================

console.log("=== Example 4: Decorator Registration ===\n");

const decoratorRegistry = new Map<string, any>();

function registerDecorator(name: string, decorator: any) {
  decoratorRegistry.set(name, decorator);
  console.log(`✅ Decorator registered: ${name}`);
}

// Decorators self-register
registerDecorator("Component", {
  name: "Component",
  type: "class",
  fn: (target: any) => {
    console.log(`  Applying Component decorator to ${target.name}`);
  }
});

registerDecorator("Injectable", {
  name: "Injectable",
  type: "property",
  fn: (target: any, key: string) => {
    console.log(`  Applying Injectable decorator to ${key}`);
  }
});

console.log("Available decorators:", Array.from(decoratorRegistry.keys()));
console.log();

// ============================================================================
// Example 5: CSS-in-JS Registration
// ============================================================================

console.log("=== Example 5: CSS-in-JS Registration ===\n");

const injectedStyles = new Set<string>();

function injectCSS(name: string, css: string) {
  injectedStyles.add(name);
  console.log(`✅ CSS injected: ${name} (${css.length} bytes)`);
}

// Styles self-register at module level
injectCSS("primary", ".primary { color: blue; }");
injectCSS("secondary", ".secondary { color: red; }");
injectJS("theme", "document.body.classList.add('theme-dark')");

function injectJS(name: string, code: string) {
  injectedStyles.add(name);
  console.log(`✅ JS injected: ${name} (${code.length} bytes)`);
}

console.log("Injected styles/scripts:", Array.from(injectedStyles).join(", "));
console.log();

// ============================================================================
// Example 6: Dynamic Import Pattern
// ============================================================================

console.log("=== Example 6: Dynamic Import Pattern ===\n");

const loadedModules = new Map<string, any>();

async function loadModule(name: string) {
  if (loadedModules.has(name)) {
    return loadedModules.get(name);
  }

  console.log(`Loading module: ${name}`);

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

console.log("Loaded modules:", Array.from(loadedModules.keys()));
console.log();

// ============================================================================
// Example 7: Singleton Initialization
// ============================================================================

console.log("=== Example 7: Singleton Initialization ===\n");

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

    console.log("✅ SingletonManager initialized");
    this.initialized = true;
  }

  getStatus() {
    return this.initialized ? "initialized" : "not initialized";
  }
}

// Auto-initialize at module load
const manager = SingletonManager.getInstance();
manager.initialize();

console.log("Singleton status:", manager.getStatus());
console.log();

// ============================================================================
// Example 8: Configuration Registry
// ============================================================================

console.log("=== Example 8: Configuration Registry ===\n");

const configRegistry = new Map<string, any>();

function registerConfig(key: string, value: any) {
  configRegistry.set(key, value);
  console.log(`✅ Config registered: ${key} = ${JSON.stringify(value)}`);
}

// Default configurations self-register
registerConfig("api.timeout", 5000);
registerConfig("api.retries", 3);
registerConfig("database.poolSize", 10);

function getConfig(key: string) {
  return configRegistry.get(key);
}

console.log("API timeout:", getConfig("api.timeout"));
console.log("Available configs:", Array.from(configRegistry.keys()).join(", "));
console.log();

// ============================================================================
// Build Scenarios
// ============================================================================

console.log("=== Build Scenarios ===\n");

console.log("Scenario 1: Default build (aggressive tree-shaking)");
console.log("  $ bun build src/index.ts");
console.log("  Result: May eliminate plugin registration, polyfills, etc.");
console.log();

console.log("Scenario 2: Safe build (ignore DCE annotations)");
console.log("  $ bun build --ignore-dce-annotations src/index.ts");
console.log("  Result: Keeps all side-effect code");
console.log();

console.log("Scenario 3: Programmatic build");
console.log("  await Bun.build({");
console.log("    entrypoints: ['./src/index.ts'],");
console.log("    ignoreDCEAnnotations: true,");
console.log("    outdir: './dist'");
console.log("  });");
console.log();

// ============================================================================
// Summary
// ============================================================================

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║  Key Takeaways                                                        ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

console.log("1. ✅ Plugin systems often need --ignore-dce-annotations");
console.log("2. ✅ Polyfills must run even if not directly imported");
console.log("3. ✅ Decorators may self-register at module level");
console.log("4. ✅ CSS-in-JS needs side effects to inject styles");
console.log("5. ✅ Singletons may auto-initialize");
console.log("6. ✅ Dynamic imports need discovery code preserved");
console.log("7. ⚠️  Use flag only as workaround, not default");
console.log("8. ⚠️  Prefer proper 'sideEffects' in package.json");
console.log();

console.log("When to use --ignore-dce-annotations:");
console.log("  • Build fails with missing exports");
console.log("  • Runtime errors due to eliminated code");
console.log("  • Plugin/extension system not working");
console.log("  • Polyfills not loading");
console.log("  • Decorators/CSS not registering");
console.log();

console.log("Alternatives to consider:");
console.log("  • Mark files in package.json 'sideEffects' array");
console.log("  • Use explicit imports for side effects");
console.log("  • Add proper @PURE annotations");
console.log("  • Test without flag and fix root cause");
console.log();

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║  ✅ Examples complete!                                           ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");
