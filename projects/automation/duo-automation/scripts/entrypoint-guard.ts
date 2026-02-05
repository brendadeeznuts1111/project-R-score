// scripts/entrypoint-guard.ts

export class EntryPointGuard {
  static async verify(expectedMain?: string): Promise<void> {
    const main = Bun.main;
    const cwd = process.cwd();
    
    console.log(`📁 Main Entry: ${main}`);
    console.log(`📁 Current Dir: ${cwd}`);
    
    // Validate we're running from correct entry point if specified
    if (expectedMain && !main.includes(expectedMain)) {
      throw new Error(`❌ Wrong entry point! Expected ${expectedMain}, got: ${main}`);
    }
    
    // Verify required infrastructure files exist
    const requiredFiles = [
      'bunfig.toml',
      'package.json'
    ];
    
    for (const file of requiredFiles) {
      if (!(await Bun.file(file).exists())) {
        throw new Error(`❌ Missing required project file: ${file}`);
      }
    }
  }
}