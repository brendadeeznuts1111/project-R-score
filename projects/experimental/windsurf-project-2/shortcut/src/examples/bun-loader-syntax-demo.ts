#!/usr/bin/env bun

/**
 * Bun Loader Syntax Showcase
 * 
 * Demonstrating the exact import patterns from the documentation:
 * - Static imports with type override
 * - Dynamic imports with type override
 * - All supported loader types
 */

console.log('🚀 Bun Loader Syntax Showcase');
console.log('=============================');

// Create sample files for demonstration
async function createSampleFiles() {
  console.log('📁 Creating sample files...');
  
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

  console.log('✅ Sample files created!\n');
}

// Static import demonstration - Note: These work in separate files!
function demonstrateStaticImports() {
  console.log('📋 Static Import Examples:');
  console.log('========================');
  
  console.log('\n📝 Static Import Syntax (works in separate files):');
  console.log('   import my_toml from "./my_file.toml" with { type: "toml" };');
  console.log('   import settings from "./settings.jsonc";');
  console.log('   import customConfig from "./custom.conf" with { type: "toml" };');
  console.log('   import userData from "./data.txt" with { type: "yaml" };');
  
  console.log('\n⚠️  Note: Static imports cannot be used in the same file for demonstration.');
  console.log('   They work perfectly when used in separate TypeScript files.');
  console.log('   See bun-syntax-working-demo.ts for working dynamic import examples.');
}

// Dynamic import demonstration
async function demonstrateDynamicImports() {
  console.log('\n🔄 Dynamic Import Examples:');
  console.log('==========================');
  
  try {
    // 1. Exact dynamic import example from documentation
    console.log('\n1️⃣ TOML Dynamic Import (exact docs example):');
    const { default: my_toml_dynamic } = await import('./my_file.toml', { 
      with: { type: 'toml' } 
    });
    console.log(`   ✅ Dynamic: ${my_toml_dynamic.app.name}`);
    console.log(`   🚀 Port: ${my_toml_dynamic.app.port}`);
    
    // 2. Dynamic YAML import
    console.log('\n2️⃣ YAML Dynamic Import:');
    const { default: yaml_config } = await import('./config.yaml', { 
      with: { type: 'yaml' } 
    });
    console.log(`   ✅ App: ${yaml_config.app.name}`);
    console.log(`   🐛 Debug: ${yaml_config.app.debug}`);
    console.log(`   🌐 Server: ${yaml_config.server.host}:${yaml_config.server.port}`);
    
    // 3. Dynamic JSONC import
    console.log('\n3️⃣ JSONC Dynamic Import:');
    const { default: dynamic_settings } = await import('./settings.jsonc', { 
      with: { type: 'jsonc' } 
    });
    console.log(`   ✅ Language: ${dynamic_settings.language}`);
    console.log(`   📝 Word wrap: ${dynamic_settings.editor.wordWrap}`);
    
    // 4. Conditional dynamic import based on environment
    console.log('\n4️⃣ Conditional Dynamic Import:');
    const env = process.env.NODE_ENV || 'development';
    console.log(`   🌍 Environment: ${env}`);
    
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
    console.log(`   ✅ Loaded config for ${env}: ${config.app.name}`);
    
  } catch (error) {
    console.error('❌ Dynamic import error:', error);
  }
}

// Advanced usage patterns
async function demonstrateAdvancedPatterns() {
  console.log('\n🎯 Advanced Usage Patterns:');
  console.log('==========================');
  
  try {
    // 1. Multiple format support
    console.log('\n1️⃣ Multi-Format Configuration:');
    const formats = ['toml', 'yaml', 'jsonc'] as const;
    
    for (const format of formats) {
      const filename = format === 'toml' ? './my_file.toml' : 
                       format === 'yaml' ? './config.yaml' : './settings.jsonc';
      
      const { default: config } = await import(filename, { 
        with: { type: format } 
      });
      
      const appName = config.app?.name || config.theme || 'Unknown';
      console.log(`   ✅ ${format.toUpperCase()}: ${appName}`);
    }
    
    // 2. Runtime type detection
    console.log('\n2️⃣ Runtime Type Detection:');
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
      console.log(`   ✅ ${file.type}: ${loadTime.toFixed(3)}ms`);
    }
    
    // 3. Plugin-style loader system
    console.log('\n3️⃣ Plugin-Style Loading:');
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
      const config = await plugin.load();
      console.log(`   ✅ ${plugin.name}: ${config.app?.name || 'Loaded'}`);
    }
    
  } catch (error) {
    console.error('❌ Advanced pattern error:', error);
  }
}

// Performance comparison
async function demonstratePerformance() {
  console.log('\n⚡ Performance Comparison:');
  console.log('========================');
  
  const iterations = 1000;
  
  try {
    // Static import performance
    console.log('\n1️⃣ Static Import Performance:');
    const staticStart = Bun.nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      // Static imports are cached, so this is very fast
      // @ts-ignore
      import('./my_file.toml');
    }
    
    const staticEnd = Bun.nanoseconds();
    const staticTime = (staticEnd - staticStart) / 1_000_000;
    
    console.log(`   ✅ ${iterations} static imports: ${staticTime.toFixed(3)}ms`);
    console.log(`   📊 Average: ${(staticTime / iterations).toFixed(6)}ms per import`);
    
    // Dynamic import performance
    console.log('\n2️⃣ Dynamic Import Performance:');
    const dynamicStart = Bun.nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      await import('./my_file.toml', { with: { type: 'toml' } });
    }
    
    const dynamicEnd = Bun.nanoseconds();
    const dynamicTime = (dynamicEnd - dynamicStart) / 1_000_000;
    
    console.log(`   ✅ ${iterations} dynamic imports: ${dynamicTime.toFixed(3)}ms`);
    console.log(`   📊 Average: ${(dynamicTime / iterations).toFixed(6)}ms per import`);
    
    console.log(`   🚀 Speed ratio: ${(dynamicTime / staticTime).toFixed(2)}x`);
    
  } catch (error) {
    console.error('❌ Performance test error:', error);
  }
}

// Main demonstration
async function main() {
  await createSampleFiles();
  
  console.log('🎯 Demonstrating Bun Loader Syntax\n');
  console.log('📝 Documentation Examples:');
  console.log('   import my_toml from "./my_file" with { type: "toml" };');
  console.log('   const { default: my_toml } = await import("./my_file", { with: { type: "toml" } });');
  console.log('');
  
  demonstrateStaticImports();
  await demonstrateDynamicImports();
  await demonstrateAdvancedPatterns();
  await demonstratePerformance();
  
  console.log('\n🎉 Bun Loader Syntax Showcase Complete!');
  console.log('=======================================');
  
  console.log('\n🚀 Key Takeaways:');
  console.log('   ✅ Static and dynamic imports both supported');
  console.log('   ✅ Type override with { type: "loader" } syntax');
  console.log('   ✅ Force any file type to be parsed as any format');
  console.log('   ✅ Zero configuration - works out of the box');
  console.log('   ✅ Native parsers - no npm dependencies needed');
  console.log('   ✅ Runtime + Bundler parity');
  
  console.log('\n🔥 This is the future of JavaScript module loading!');
}

// Cleanup
async function cleanup() {
  console.log('\n🧹 Cleaning up demo files...');
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
  
  console.log('✅ Cleanup completed!');
}

// Run the demo
if (import.meta.main) {
  await main();
  
  // Uncomment to cleanup after demo
  // await cleanup();
}
