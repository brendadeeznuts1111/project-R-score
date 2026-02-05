import { Command } from 'commander';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

export const benchCommand = new Command('bench')
  .description('Windsurf Performance Benchmarks')
  .argument('[test]', 'Specific benchmark to run (string-width, r2, urlpattern, etc.)', 'string-width')
  .action((test) => {
    let scriptName = test;
    if (!scriptName.endsWith('.ts')) {
      if (scriptName === 'string-width') scriptName = 'bench-string-width';
      if (scriptName === 'r2') scriptName = 'bench-r2-real';
      if (scriptName === 'r2-super') scriptName = 'bench-r2-super';
      if (scriptName === 'urlpattern') scriptName = 'bench-urlpattern-super';
    }

    const scriptPath = join(process.cwd(), 'bench', scriptName.endsWith('.ts') ? scriptName : `${scriptName}.ts`);
    
    // Check if file exists
    if (!existsSync(scriptPath)) {
      console.log(`❌ Benchmark file not found: ${scriptPath}`);
      console.log(`Available benchmarks: string-width, r2, r2-super, urlpattern, etc.`);
      process.exit(1);
    }

    console.log(`🚀 Running benchmark: ${test} (${scriptPath})...`);

    const proc = spawn('bun', [scriptPath], { stdio: 'inherit' });
    proc.on('exit', (code) => process.exit(code || 0));
  });
