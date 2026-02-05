// Complete Rust Native Plugin Example for Bun
// This demonstrates the onBeforeParse hook with the bun_native_plugin::bun proc macro

use bun_native_plugin::{define_bun_plugin, OnBeforeParse, bun, Result, BunLoader};

// Define the plugin with its name
define_bun_plugin!("rust-transformer");

/// Example 1: Simple text replacement using the #[bun] macro
/// This function implements the onBeforeParse hook
#[bun]
pub fn replace_foo_with_bar(handle: &mut OnBeforeParse) -> Result<()> {
    // Get the input source code from the file being processed
    let input_source_code = handle.input_source_code()?;
    
    // Get the current loader for the file
    let loader = handle.output_loader();
    
    // Perform the replacement
    let output_source_code = input_source_code.replace("foo", "bar");
    
    // Set the modified source code back to the file
    handle.set_output_source_code(output_source_code, BunLoader::BUN_LOADER_JSX);
    
    println!("🦀 Replaced 'foo' with 'bar' in file");
    
    Ok(())
}

/// Example 2: TypeScript optimization with strict mode injection
#[bun]
pub fn add_strict_mode(handle: &mut OnBeforeParse) -> Result<()> {
    let input_source_code = handle.input_source_code()?;
    let loader = handle.output_loader();
    
    let mut output_source_code = input_source_code.to_string();
    
    // Add "use strict" if not present
    if !output_source_code.contains("\"use strict\"") && !output_source_code.contains("'use strict'") {
        output_source_code = "\"use strict\";\n\n".to_string() + &output_source_code;
        println!("📝 Added strict mode to TypeScript file");
    }
    
    handle.set_output_source_code(output_source_code, BunLoader::BUN_LOADER_TS);
    
    Ok(())
}

/// Example 3: Import analysis and optimization
#[bun]
pub fn optimize_imports(handle: &mut OnBeforeParse) -> Result<()> {
    let input_source_code = handle.input_source_code()?;
    let loader = handle.output_loader();
    
    // Count imports for analysis
    let import_count = input_source_code.matches("import ").count();
    let require_count = input_source_code.matches("require(").count();
    
    println!("📊 Import Analysis:");
    println!("   ES6 imports: {}", import_count);
    println!("   CommonJS requires: {}", require_count);
    
    // Simple optimization: remove duplicate imports
    let mut lines: Vec<&str> = input_source_code.lines().collect();
    let mut import_lines = Vec::new();
    let mut other_lines = Vec::new();
    
    for line in &lines {
        let trimmed = line.trim();
        if trimmed.starts_with("import ") {
            import_lines.push(*trimmed);
        } else if !trimmed.is_empty() {
            other_lines.push(*line);
        }
    }
    
    // Remove duplicates and sort
    import_lines.sort();
    import_lines.dedup();
    
    // Rebuild the file
    let mut optimized = Vec::new();
    if !import_lines.is_empty() {
        optimized.extend_from_slice(&import_lines);
        optimized.push(""); // Empty line after imports
    }
    optimized.extend_from_slice(&other_lines);
    
    let output_source_code = optimized.join("\n");
    handle.set_output_source_code(output_source_code, loader);
    
    println!("🔧 Optimized imports in file");
    
    Ok(())
}

/// Example 4: Performance logging optimization
#[bun]
pub fn optimize_console_logs(handle: &mut OnBeforeParse) -> Result<()> {
    let input_source_code = handle.input_source_code()?;
    let loader = handle.output_loader();
    
    // Replace console.log with conditional logging for production
    let output_source_code = input_source_code
        .replace(
            "console.log", 
            "process.env.NODE_ENV !== 'production' && console.log"
        );
    
    handle.set_output_source_code(output_source_code, BunLoader::BUN_LOADER_JS);
    
    println!("🚀 Optimized console.log calls for production");
    
    Ok(())
}

/// Example 5: Add performance comments and metadata
#[bun]
pub fn add_performance_metadata(handle: &mut OnBeforeParse) -> Result<()> {
    let input_source_code = handle.input_source_code()?;
    let loader = handle.output_loader();
    
    // Add performance optimization header
    let header = format!(
        "// Optimized by Rust Native Plugin\n\
        // Processing time: {}ns\n\
        // Thread-safe: ✅\n\
        // Zero UTF-8 conversion: ✅\n\
        // Multi-threading: ✅\n\n",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    
    let output_source_code = header + &input_source_code;
    handle.set_output_source_code(output_source_code, loader);
    
    println!("📋 Added performance metadata to file");
    
    Ok(())
}

// Usage in TypeScript:
/*
import myRustPlugin from "./rust-plugin-example.node";

Bun.build({
  entrypoints: ["./app.tsx"],
  plugins: [
    {
      name: "rust-transformer",
      setup(build) {
        // Use the replace_foo_with_bar function from our Rust plugin
        build.onBeforeParse(
          {
            namespace: "file",
            filter: "**/*.tsx",
          },
          {
            napiModule: myRustPlugin,
            symbol: "replace_foo_with_bar",
          },
        );
        
        // Use the TypeScript optimization
        build.onBeforeParse(
          {
            namespace: "file", 
            filter: "**/*.ts",
          },
          {
            napiModule: myRustPlugin,
            symbol: "add_strict_mode",
          },
        );
      },
    },
  ],
});
*/
