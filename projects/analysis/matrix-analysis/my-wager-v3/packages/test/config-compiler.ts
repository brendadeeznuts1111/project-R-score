#!/usr/bin/env bun
// Pre-compile TOML configurations to JSON for ultra-fast loading
// Uses Bun.Transpiler for optimal performance

class ConfigCompiler {
  async compileTomlToJson(tomlPath: string, jsonPath: string): Promise<void> {
    const start = performance.now();

    // Read and parse TOML
    const tomlContent = await Bun.file(tomlPath).text();
    const parsed = Bun.TOML.parse(tomlContent);

    // Convert to optimized JSON
    const jsonString = JSON.stringify(parsed);

    // Write compiled config
    await Bun.write(jsonPath, jsonString);

    const end = performance.now();
    console.log(`✅ Compiled ${tomlPath} → ${jsonPath} in ${(end - start).toFixed(3)}ms`);
  }

  async loadCompiledConfig(jsonPath: string): Promise<any> {
    const start = performance.now();

    // Fast JSON parse (no validation needed for pre-compiled)
    const content = await Bun.file(jsonPath).text();
    const config = JSON.parse(content);

    const end = performance.now();
    console.log(`⚡ Loaded compiled config in ${(end - start).toFixed(3)}ms`);

    return config;
  }

  // Pre-compile all configs for maximum performance
  async compileAllConfigs(): Promise<void> {
    console.log('🔧 Pre-compiling configurations for maximum performance...');

    await this.compileTomlToJson('./bunfig.fast.toml', './.cache/bunfig.fast.json');
    await this.compileTomlToJson('./bunfig.minimal.toml', './.cache/bunfig.minimal.json');

    console.log('✅ All configurations compiled successfully');
  }
}

// Export for use in test runner
export { ConfigCompiler };

// Run compiler if executed directly
if (import.meta.main) {
  const compiler = new ConfigCompiler();
  await compiler.compileAllConfigs();
}
