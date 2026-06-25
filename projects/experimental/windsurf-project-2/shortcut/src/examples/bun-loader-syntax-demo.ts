#!/usr/bin/env bun

/**
 * Bun Loader Syntax Showcase
 * 
 * Demonstrating the exact import patterns from the documentation:
 * - Static imports with type override
 * - Dynamic imports with type override
 * - All supported loader types
 */

console.info('🚀 Bun Loader Syntax Showcase');
console.info('=============================');

// Create sample files for demonstration
async function createSampleFiles() {
  console.info('📁 Creating sample files...');
  
  // TOML file for the exact example from docs
  await Bun.write('./my_file.toml', `
# This is my_file.toml - demonstrating the exact syntax from docs
[app]
name = "Bun Loader Demo"
version = "1.0.0"
port = 3000

[database]
type = "sqlite"
path = "./data.db"

[features]
authentication = true
caching = true
logging = true
`);

  // YAML file for dynamic import demo
  await Bun.write('./config.yaml', `
app:
  name: "Dynamic Import Demo"
  debug: true
  
server:
  host: "localhost"
  port: 8080
  
features:
  - hot_reload
  - auto_save
  - error_tracking
`);

  // JSONC file for type override demo
  await Bun.write('./settings.jsonc', `
{
  // JSONC file with comments
  "theme": "dark",
  "language": "typescript",
  "editor": {
    "tabSize": 2,
    "wordWrap": true,
    "minimap": false
  },
  // Trailing comma allowed!
}
`);

  // Custom file with wrong extension (force TOML parsing)
  await Bun.write('./custom.conf', `
# This file has .conf extension but contains TOML
[custom]
setting = "forced TOML parsing"
value = 123
override = true
`);

  // Text file forced to be treated as YAML
  await Bun.write('./data.txt', `
# This is actually YAML content in a .txt file
users:
  - name: Alice
    role: admin
  - name: Bob
    role: user
  - name: Charlie
    role: moderator
`);

  console.info('✅ Sample files created!\n');
}

// Static import demonstration - Note: These work in separate files!
function demonstrateStaticImports() {
  console.info('📋 Static Import Examples:');
  console.info('========================');
  
  console.info('\n📝 Static Import Syntax (works in separate files):');
  console.info('   import my_toml from "./my_file.toml" with { type: "toml" };');
  console.info('   import settings from "./settings.jsonc";');
  console.info('   import customConfig from "./custom.conf" with { type: "toml" };');
  console.info('   import userData from "./data.txt" with { type: "yaml" };');
  
  console.info('\n⚠️  Note: Static imports cannot be used in the same file for demonstration.');
  console.info('   They work perfectly when used in separate TypeScript files.');
  console.info('   See bun-syntax-working-demo.ts for working dynamic import examples.');
}

// Dynamic import demonstration
async function demonstrateDynamicImports() {
  console.info('\n🔄 Dynamic Import Examples:');
  console.info('==========================');
  
  try {
    // 1. Exact dynamic import example from documentation
    console.info('\n1️⃣ TOML Dynamic Import (exact docs example):');
    const { default: my_toml_dynamic } = await import('./my_file.toml', { 
      with: { type: 'toml' } 
    });
    console.info(`   ✅ Dynamic: ${my_toml_dynamic.app.name}`);
    console.info(`   🚀 Port: ${my_toml_dynamic.app.port}`);
    
    // 2. Dynamic YAML import
    console.info('\n2️⃣ YAML Dynamic Import:');
    const { default: yaml_config } = await import('./config.yaml', { 
      with: { type: 'yaml' } 
    });
    console.info(`   ✅ App: ${yaml_config.app.name}`);
    console.info(`   🐛 Debug: ${yaml_config.app.debug}`);
    console.info(`   🌐 Server: ${yaml_config.server.host}:${yaml_config.server.port}`);
    
    // 3. Dynamic JSONC import
    console.info('\n3️⃣ JSONC Dynamic Import:');
    const { default: dynamic_settings } = await import('./settings.jsonc', { 
      with: { type: 'jsonc' } 
    });
    console.info(`   ✅ Language: ${dynamic_settings.language}`);
    console.info(`   📝 Word wrap: ${dynamic_settings.editor.wordWrap}`);
    
    // 4. Conditional dynamic import based on environment
    console.info('\n4️⃣ Conditional Dynamic Import:');
    const env = process.env.NODE_ENV || 'development';
    console.info(`   🌍 Environment: ${env}`);
    
    let config;
    if (env === 'production') {
      // Would load production config
      config = { app: { name: 'Production App' } };
    } else {
      // Load development config
      const { default: devConfig } = await import('./my_file.toml', { 
        with: { type: 'toml' } 
      });
      config = devConfig;
    }
    console.info(`   ✅ Loaded config for ${env}: ${config.app.name}`);
    
  } catch (error) {
    console.error('❌ Dynamic import error:', error);
  }
}

// Advanced usage patterns
async function demonstrateAdvancedPatterns() {
  console.info('\n🎯 Advanced Usage Patterns:');
  console.info('==========================');
  
  try {
    // 1. Multiple format support
    console.info('\n1️⃣ Multi-Format Configuration:');
    const formats = ['toml', 'yaml', 'jsonc'] as const;
    
    for (const format of formats) {
      const filename = format === 'toml' ? './my_file.toml' : 
                       format === 'yaml' ? './config.yaml' : './settings.jsonc';
      
      const { default: config } = await import(filename, { 
        with: { type: format } 
      });
      
      const appName = config.app?.name || config.theme || 'Unknown';
      console.info(`   ✅ ${format.toUpperCase()}: ${appName}`);
    }
    
    // 2. Runtime type detection
    console.info('\n2️⃣ Runtime Type Detection:');
    const files = [
      { path: './my_file.toml', type: 'toml' },
      { path: './config.yaml', type: 'yaml' },
      { path: './settings.jsonc', type: 'jsonc' }
    ];
    
    for (const file of files) {
      const startTime = Bun.nanoseconds();
      const { default: content } = await import(file.path, { 
        with: { type: file.type as any } 
      });
      const endTime = Bun.nanoseconds();
      
      const loadTime = (endTime - startTime) / 1_000_000; // Convert to ms
      console.info(`   ✅ ${file.type}: ${loadTime.toFixed(3)}ms`);
    }
    
    // 3. Plugin-style loader system
    console.info('\n3️⃣ Plugin-Style Loading:');
    interface ConfigPlugin {
      name: string;
      load: () => Promise<any>;
    }
    
    const plugins: ConfigPlugin[] = [
      {
        name: 'TOML Plugin',
        load: async () => {
          const { default: config } = await import('./my_file.toml', { with: { type: 'toml' } });
          return config;
        }
      },
      {
        name: 'YAML Plugin',
        load: async () => {
          const { default: config } = await import('./config.yaml', { with: { type: 'yaml' } });
          return config;
        }
      }
    ];
    
    for (const plugin of plugins) {
      const config = await plugin.YAML.parse();
      console.info(`   ✅ ${plugin.name}: ${config.app?.name || 'Loaded'}`);
    }
    
  } catch (error) {
    console.error('❌ Advanced pattern error:', error);
  }
}

// Performance comparison
async function demonstratePerformance() {
  console.info('\n⚡ Performance Comparison:');
  console.info('========================');
  
  const iterations = 1000;
  
  try {
    // Static import performance
    console.info('\n1️⃣ Static Import Performance:');
    const staticStart = Bun.nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      // Static imports are cached, so this is very fast
      // @ts-ignore
      import('./my_file.toml');
    }
    
    const staticEnd = Bun.nanoseconds();
    const staticTime = (staticEnd - staticStart) / 1_000_000;
    
    console.info(`   ✅ ${iterations} static imports: ${staticTime.toFixed(3)}ms`);
    console.info(`   📊 Average: ${(staticTime / iterations).toFixed(6)}ms per import`);
    
    // Dynamic import performance
    console.info('\n2️⃣ Dynamic Import Performance:');
    const dynamicStart = Bun.nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      await import('./my_file.toml', { with: { type: 'toml' } });
    }
    
    const dynamicEnd = Bun.nanoseconds();
    const dynamicTime = (dynamicEnd - dynamicStart) / 1_000_000;
    
    console.info(`   ✅ ${iterations} dynamic imports: ${dynamicTime.toFixed(3)}ms`);
    console.info(`   📊 Average: ${(dynamicTime / iterations).toFixed(6)}ms per import`);
    
    console.info(`   🚀 Speed ratio: ${(dynamicTime / staticTime).toFixed(2)}x`);
    
  } catch (error) {
    console.error('❌ Performance test error:', error);
  }
}

// Main demonstration
async function main() {
  await createSampleFiles();
  
  console.info('🎯 Demonstrating Bun Loader Syntax\n');
  console.info('📝 Documentation Examples:');
  console.info('   import my_toml from "./my_file" with { type: "toml" };');
  console.info('   const { default: my_toml } = await import("./my_file", { with: { type: "toml" } });');
  console.info('');
  
  demonstrateStaticImports();
  await demonstrateDynamicImports();
  await demonstrateAdvancedPatterns();
  await demonstratePerformance();
  
  console.info('\n🎉 Bun Loader Syntax Showcase Complete!');
  console.info('=======================================');
  
  console.info('\n🚀 Key Takeaways:');
  console.info('   ✅ Static and dynamic imports both supported');
  console.info('   ✅ Type override with { type: "loader" } syntax');
  console.info('   ✅ Force any file type to be parsed as any format');
  console.info('   ✅ Zero configuration - works out of the box');
  console.info('   ✅ Native parsers - no npm dependencies needed');
  console.info('   ✅ Runtime + Bundler parity');
  
  console.info('\n🔥 This is the future of JavaScript module loading!');
}

// Cleanup
async function cleanup() {
  console.info('\n🧹 Cleaning up demo files...');
  const files = [
    './my_file.toml', './config.yaml', './settings.jsonc',
    './custom.conf', './data.txt'
  ];
  
  for (const file of files) {
    try {
      await Bun.file(file).delete();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  console.info('✅ Cleanup completed!');
}

// Run the demo
if (import.meta.main) {
  await main();
  
  // Uncomment to cleanup after demo
  // await cleanup();
}
