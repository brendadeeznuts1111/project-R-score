# 🦀 Rust Native Plugin with #[bun] Proc Macro

## 📋 Overview

The `#[bun]` proc macro from `bun_native_plugin` is the key to creating high-performance native plugins for Bun's bundler. It transforms regular Rust functions into C ABI functions that can be called from Bun's plugin system.

## 🎯 How #[bun] Works

### **Before the Macro**
```rust
// Regular Rust function
pub fn my_function() -> Result<()> {
    // Rust code here
}
```

### **After the Macro**
```rust
// Transformed into C ABI function for Bun
#[bun]
pub fn my_function(handle: &mut OnBeforeParse) -> Result<()> {
    // Can now be called by Bun's bundler
}
```

## 🔧 Available Hooks with #[bun]

### **onBeforeParse Hook**
The most commonly used hook - runs immediately before a file is parsed.

```rust
use bun_native_plugin::{define_bun_plugin, OnBeforeParse, bun, Result, BunLoader};

define_bun_plugin!("my-plugin");

#[bun]
pub fn transform_file(handle: &mut OnBeforeParse) -> Result<()> {
    // Get the file content
    let input = handle.input_source_code()?;
    
    // Transform the content
    let output = input.replace("old", "new");
    
    // Set the transformed content back
    handle.set_output_source_code(output, BunLoader::BUN_LOADER_TS);
    
    Ok(())
}
```

## 📥 Function Parameters

### **OnBeforeParse Handle**
The `handle` parameter provides access to:

```rust
#[bun]
pub fn example_hook(handle: &mut OnBeforeParse) -> Result<()> {
    // Get input source code
    let input = handle.input_source_code()?;
    
    // Get current file loader
    let loader = handle.output_loader();
    
    // Set transformed source code
    handle.set_output_source_code(transformed_code, loader);
    
    Ok(())
}
```

## 🔄 Return Types

### **Result<()>**
```rust
#[bun]
pub fn success_case() -> Result<()> {
    // Success - continue processing
    Ok(())
}

#[bun]
pub fn error_case() -> Result<()> {
    // Error - stop processing with error
    Err(anyhow::anyhow!("Something went wrong"))
}
```

## 🚀 Practical Examples

### **1. Text Replacement**
```rust
#[bun]
pub fn replace_imports(handle: &mut OnBeforeParse) -> Result<()> {
    let input = handle.input_source_code()?;
    let output = input.replace("from 'old'", "from 'new'");
    handle.set_output_source_code(output, BunLoader::BUN_LOADER_TS);
    Ok(())
}
```

### **2. Code Analysis**
```rust
#[bun]
pub fn analyze_code(handle: &mut OnBeforeParse) -> Result<()> {
    let input = handle.input_source_code()?;
    
    let function_count = input.matches("function ").count();
    let class_count = input.matches("class ").count();
    
    println!("📊 Analysis: {} functions, {} classes", function_count, class_count);
    
    // Don't modify the file, just analyze
    Ok(())
}
```

### **3. Performance Optimization**
```rust
#[bun]
pub fn optimize_performance(handle: &mut OnBeforeParse) -> Result<()> {
    let input = handle.input_source_code()?;
    
    // Add performance optimizations
    let output = input
        .replace("console.log", "/* optimized */ console.log")
        .replace("var ", "const ");
    
    handle.set_output_source_code(output, BunLoader::BUN_LOADER_JS);
    Ok(())
}
```

### **4. Conditional Processing**
```rust
#[bun]
pub fn conditional_transform(handle: &mut OnBeforeParse) -> Result<()> {
    let input = handle.input_source_code()?;
    
    if input.contains("TODO:") {
        let output = format!(
            "// TODO items found: {}\n{}",
            input.matches("TODO:").count(),
            input
        );
        handle.set_output_source_code(output, BunLoader::BUN_LOADER_TS);
    }
    
    Ok(())
}
```

## 🔗 Integration with TypeScript

### **Step 1: Build the Rust Plugin**
```bash
cd rust-plugin
npm run build
```

### **Step 2: Use in TypeScript**
```typescript
import rustPlugin from "./rust-plugin.node";

Bun.build({
  entrypoints: ["./src/app.ts"],
  plugins: [
    {
      name: "rust-plugin",
      setup(build) {
        build.onBeforeParse(
          {
            namespace: "file",
            filter: "**/*.ts",
          },
          {
            napiModule: rustPlugin,
            symbol: "transform_function", // Must match #[bun] function name
          },
        );
      },
    },
  ],
});
```

## ⚡ Performance Benefits

### **Multi-Threading**
- Each `#[bun]` function can run on any available thread
- No JavaScript event loop blocking
- True parallel file processing

### **Zero UTF-8 Conversion**
- Direct UTF-8 string processing
- No UTF-8 → UTF-16 conversion overhead
- Memory-efficient string operations

### **C-Level Performance**
- Compiled to native machine code
- No runtime interpretation overhead
- Optimized by Rust compiler

## 🛠️ Best Practices

### **1. Error Handling**
```rust
#[bun]
pub fn safe_transform(handle: &mut OnBeforeParse) -> Result<()> {
    let input = handle.input_source_code()
        .map_err(|e| anyhow::anyhow!("Failed to get input: {}", e))?;
    
    // Safe processing...
    
    Ok(())
}
```

### **2. Performance Optimization**
```rust
#[bun]
pub fn fast_transform(handle: &mut OnBeforeParse) -> Result<()> {
    let input = handle.input_source_code()?;
    
    // Use efficient string operations
    let output = if input.contains("pattern") {
        input.replace("pattern", "replacement")
    } else {
        input.to_string() // Avoid unnecessary allocation
    };
    
    handle.set_output_source_code(output, BunLoader::BUN_LOADER_TS);
    Ok(())
}
```

### **3. Thread Safety**
```rust
// All #[bun] functions must be thread-safe
// No mutable static variables without synchronization
#[bun]
pub fn thread_safe_transform(handle: &mut OnBeforeParse) -> Result<()> {
    // ✅ Safe: Only use local variables and function parameters
    let input = handle.input_source_code()?;
    
    // ❌ Unsafe: Don't use static mut variables
    // static mut COUNTER: usize = 0;
    // COUNTER += 1;
    
    Ok(())
}
```

## 🎛️ Advanced Features

### **Multiple Hooks**
```rust
define_bun_plugin!("multi-hook-plugin");

#[bun]
pub fn hook1(handle: &mut OnBeforeParse) -> Result<()> {
    // First transformation
    Ok(())
}

#[bun]
pub fn hook2(handle: &mut OnBeforeParse) -> Result<()> {
    // Second transformation
    Ok(())
}
```

### **Shared State**
```rust
use std::sync::Arc;
use parking_lot::Mutex;

// For complex plugins that need shared state
// (Use carefully - must be thread-safe)
```

The `#[bun]` proc macro is the bridge between Rust's performance and Bun's bundler, enabling incredibly fast, thread-safe build transformations!
