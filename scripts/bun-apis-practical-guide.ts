// bun-apis-practical-guide.ts
// Practical implementation guide for Bun APIs in project context

import {
  file,
  write,
  stringWidth,
  stripANSI,
  wrapAnsi,
  color,
  inspect,
  deepEquals,
  openInEditor,
  nanoseconds,
  resolveSync,
  Glob,
  TOML,
} from 'bun';

// ──────────────────────────────────────────────────────────────────────────────
// FILE I/O EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

console.info('📁 File I/O Examples\n');

// 1. Lazy-loaded file handle (zero-copy, fast)
async function demonstrateFileIO() {
  console.info('1. Lazy-loaded file operations:');

  const start = nanoseconds();

  // Bun.file() creates a lazy file handle - doesn't load until accessed
  const configFile = file('./package.json');
  console.info(`   File handle created: ${configFile.name}`);
  console.info(`   File size: ${configFile.size} bytes`);
  console.info(`   Last modified: ${new Date(configFile.lastModified)}`);

  // Actual read happens here (zero-copy if possible)
  const content = await configFile.text();
  const pkg = JSON.parse(content);

  const elapsed = (nanoseconds() - start) / 1e6;
  console.info(`   ✅ Read and parsed in ${elapsed.toFixed(2)}ms`);
  console.info(`   Project: ${pkg.name} v${pkg.version}\n`);

  return { content, pkg };
}

// 2. Fast write with sendfile optimization
async function demonstrateFastWrite() {
  console.info('2. Fast write operations:');

  const start = nanoseconds();

  // Write string content (sendfile optimized)
  const reportContent = `
# Project Report
Generated: ${new Date().toISOString()}
Status: Complete
`;

  await write('project-report.md', reportContent);

  // Write Blob content (binary data)
  const binaryData = new Blob([new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])]);
  await write('binary-data.bin', binaryData);

  const elapsed = (nanoseconds() - start) / 1e6;
  console.info(`   ✅ Wrote 2 files in ${elapsed.toFixed(2)}ms\n`);

  return { reportContent, binaryData };
}

// 3. Streaming write with FileSink
async function demonstrateStreamingWrite() {
  console.info('3. Streaming write operations:');

  const start = nanoseconds();

  // Create a writer for incremental writes
  const logFile = file('application.log');
  const writer = logFile.writer();

  // Write multiple chunks (buffered)
  await writer.write('Application started\n');
  await writer.write(`Process ID: ${process.pid}\n`);
  await writer.write(
    `Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n`
  );

  // Flush and close
  await writer.end();

  const elapsed = (nanoseconds() - start) / 1e6;
  console.info(`   ✅ Streamed log file in ${elapsed.toFixed(2)}ms\n`);
}

// ──────────────────────────────────────────────────────────────────────────────
// STRING / ANSI EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

console.info('📝 String / ANSI Examples\n');

// 4. Terminal-aware string width calculation
function demonstrateStringWidth() {
  console.info('4. String width calculations:');

  const examples = [
    'Simple text',
    'Text with emoji 🚀',
    'Colored \x1b[32mgreen\x1b[0m text',
    'Unicode: café résumé',
    'Complex: 🎨🔧📊',
  ];

  examples.forEach(text => {
    const width = stringWidth(text);
    const plainWidth = text.length;
    const padded = text.padEnd(width + 5);
    console.info(`   "${text}" → width: ${width} (plain: ${plainWidth}) → "${padded}"`);
  });
  console.info();
}

// 5. ANSI code manipulation
function demonstrateANSI() {
  console.info('5. ANSI code operations:');

  const coloredText =
    '\x1b[32m\x1b[1mSuccess\x1b[0m \x1b[31m\x1b[1mError\x1b[0m \x1b[33mWarning\x1b[0m';
  console.info(`   Original: ${coloredText}`);

  const stripped = stripANSI(coloredText);
  console.info(`   Stripped: ${stripped}`);

  // Wrap text preserving ANSI (much faster than npm alternatives)
  const longColoredText =
    '\x1b[32mThis is a very long colored message that needs to be wrapped properly while preserving the ANSI escape codes for terminal display\x1b[0m';
  const wrapped = wrapAnsi(longColoredText, 40);
  console.info(
    `   Wrapped:\n${wrapped
      .split('\n')
      .map(line => `   ${line}`)
      .join('\n')}\n`
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// COLOR EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

console.info('🎨 Color Examples\n');

// 6. Dynamic HSL coloring
function demonstrateColor() {
  console.info('6. HSL color generation:');

  const profiles = [
    { name: 'production', hue: 120 }, // Green
    { name: 'staging', hue: 45 }, // Orange
    { name: 'development', hue: 210 }, // Blue
  ];

  profiles.forEach(profile => {
    const ansi = color(`hsl(${profile.hue}, 100%, 50%)`, 'ansi');
    console.info(`   ${ansi}${profile.name.padEnd(12)}\x1b[0m Profile (HSL: ${profile.hue}°)`);
  });

  // RGB and HEX examples
  const rgbAnsi = color('rgb(255, 99, 71)', 'ansi'); // Tomato
  const hexAnsi = color('#ff6b6b', 'ansi'); // Red

  console.info(`   ${rgbAnsi}RGB Color\x1b[0m`);
  console.info(`   ${hexAnsi}HEX Color\x1b[0m\n`);
}

// 7. Profile-aware status coloring
function createStatusCell(status: 'success' | 'warning' | 'error', profile: string) {
  const colors = {
    production: { success: 120, warning: 45, error: 0 },
    staging: { success: 120, warning: 45, error: 0 },
    development: { success: 120, warning: 45, error: 0 },
  };

  const hue = colors[profile as keyof typeof colors]?.[status] || 0;
  const ansi = color(`hsl(${hue}, 100%, 50%)`, 'ansi');
  const symbols = { success: '✓', warning: '⚠', error: '✗' };

  return `${ansi}${symbols[status]}\x1b[0m`;
}

function demonstrateProfileColoring() {
  console.info('7. Profile-aware status colors:');

  const statuses = ['success', 'warning', 'error'] as const;
  const profiles = ['production', 'staging', 'development'];

  profiles.forEach(profile => {
    const statusLine = statuses.map(status => createStatusCell(status, profile)).join(' ');
    console.info(`   ${profile}: ${statusLine}`);
  });
  console.info();
}

// ──────────────────────────────────────────────────────────────────────────────
// INSPECTION EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

console.info('📊 Inspection Examples\n');

// 8. ASCII table generation
function demonstrateTableInspection() {
  console.info('8. Table inspection:');

  const data = [
    { service: 'API Gateway', status: 'running', uptime: '99.9%', memory: '256MB' },
    { service: 'Database', status: 'running', uptime: '99.5%', memory: '512MB' },
    { service: 'Cache', status: 'warning', uptime: '98.0%', memory: '128MB' },
    { service: 'Queue', status: 'error', uptime: '0%', memory: '64MB' },
  ];

  const columns = ['service', 'status', 'uptime', 'memory'];

  console.info(inspect.table(data, columns, { colors: true }));
  console.info();
}

// 9. Deep equality for regression testing
function demonstrateDeepEquals() {
  console.info('9. Deep equality testing:');

  const baseline = {
    services: ['api', 'database', 'cache'],
    config: { port: 3000, host: 'localhost' },
    metadata: { version: '1.0.0', env: 'production' },
  };

  const current = {
    services: ['api', 'database', 'cache'],
    config: { port: 3000, host: 'localhost' },
    metadata: { version: '1.0.0', env: 'production' },
  };

  const changed = {
    services: ['api', 'database', 'cache', 'queue'],
    config: { port: 3000, host: 'localhost' },
    metadata: { version: '1.0.1', env: 'production' },
  };

  console.info(
    `   Baseline vs Current: ${deepEquals(baseline, current) ? '✅ Equal' : '❌ Different'}`
  );
  console.info(
    `   Baseline vs Changed: ${deepEquals(baseline, changed) ? '✅ Equal' : '❌ Different'}`
  );
  console.info();
}

// ──────────────────────────────────────────────────────────────────────────────
// EDITOR INTEGRATION
// ──────────────────────────────────────────────────────────────────────────────

console.info('🔧 Editor Integration Examples\n');

// 10. Dynamic error navigation
function demonstrateEditorIntegration() {
  console.info('10. Editor integration:');

  try {
    // Simulate an error location
    const errorLine = 42;
    const errorFile = import.meta.url;

    console.info(`   Would open editor at: ${errorFile}:${errorLine}`);
    console.info(`   Editor command: Bun.openInEditor("${errorFile}", { line: ${errorLine} })`);

    // Uncomment to actually open editor:
    // openInEditor(errorFile, { line: errorLine });
  } catch (error) {
    console.info(
      `   Editor integration: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  console.info();
}

// ──────────────────────────────────────────────────────────────────────────────
// TIMING EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

console.info('⏱️ Timing Examples\n');

// 11. High-resolution profiling
async function demonstrateTiming() {
  console.info('11. High-resolution timing:');

  const operations = [];

  // File read timing
  let start = nanoseconds();
  await file('./package.json').text();
  operations.push({ name: 'File read', time: nanoseconds() - start });

  // JSON parse timing
  start = nanoseconds();
  JSON.parse(await file('./package.json').text());
  operations.push({ name: 'JSON parse', time: nanoseconds() - start });

  // String operation timing
  start = nanoseconds();
  'Hello World'.padEnd(20);
  operations.push({ name: 'String pad', time: nanoseconds() - start });

  operations.forEach(op => {
    const ms = op.time / 1e6;
    const μs = op.time / 1e3;
    console.info(`   ${op.name.padEnd(12)}: ${ms.toFixed(3)}ms (${μs.toFixed(0)}μs)`);
  });
  console.info();
}

// ──────────────────────────────────────────────────────────────────────────────
// FILE SYSTEM EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

console.info('📂 File System Examples\n');

// 12. Pattern-based file scanning
async function demonstrateGlob() {
  console.info('12. Glob pattern scanning:');

  const patterns = ['*.json', '*.md', 'lib/**/*.ts', 'projects/*/package.json'];

  for (const pattern of patterns) {
    console.info(`   Pattern: ${pattern}`);
    const glob = new Glob(pattern);
    let count = 0;

    for await (const path of glob.scan('.')) {
      if (count < 3) {
        // Show first 3 results
        console.info(`     Found: ${path}`);
      }
      count++;
    }

    console.info(`     Total: ${count} files\n`);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PARSING EXAMPLES
// ──────────────────────────────────────────────────────────────────────────────

console.info('📄 Parsing Examples\n');

// 13. TOML configuration parsing
async function demonstrateTOML() {
  console.info('13. TOML parsing:');

  // Create a sample TOML config
  const sampleTOML = `
[server]
host = "localhost"
port = 3000
ssl = true

[database]
url = "postgresql://localhost:5432/mydb"
max_connections = 100

[features]
logging = true
metrics = true
debug = false
`;

  try {
    const parsed = TOML.parse(sampleTOML);
    console.info('   Parsed TOML structure:');
    console.info(
      inspect.table(
        [
          { section: 'server', key: 'host', value: parsed.server.host },
          { section: 'server', key: 'port', value: parsed.server.port },
          { section: 'database', key: 'url', value: parsed.database.url },
          { section: 'features', key: 'logging', value: parsed.features.logging },
        ],
        ['section', 'key', 'value']
      )
    );
  } catch (error) {
    console.info(`   TOML parse error: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.info();
}

// ──────────────────────────────────────────────────────────────────────────────
// INTEGRATED EXAMPLE
// ──────────────────────────────────────────────────────────────────────────────

console.info('🔗 Integrated Example\n');

// 14. Complete project status report
async function generateProjectStatusReport() {
  console.info('14. Integrated project status report:');

  const start = nanoseconds();

  // Read package.json
  const pkg = JSON.parse(await file('./package.json').text());

  // Scan for TypeScript files
  const glob = new Glob('**/*.ts');
  let tsFileCount = 0;
  for await (const _ of glob.scan('.')) tsFileCount++;

  // Create status data
  const statusData = [
    {
      metric: 'Project Name',
      value: pkg.name,
      status: 'info',
    },
    {
      metric: 'Version',
      value: `v${pkg.version}`,
      status: 'success',
    },
    {
      metric: 'TypeScript Files',
      value: tsFileCount.toString(),
      status: tsFileCount > 100 ? 'warning' : 'success',
    },
    {
      metric: 'Dependencies',
      value: Object.keys(pkg.dependencies || {}).length.toString(),
      status: 'info',
    },
  ];

  // Generate colored table
  console.info(inspect.table(statusData, ['metric', 'value', 'status'], { colors: true }));

  // Save report to file
  const reportContent = `# Project Status Report\n\nGenerated: ${new Date().toISOString()}\n\n## Metrics\n\n${statusData.map(row => `- **${row.metric}**: ${row.value}`).join('\n')}\n`;
  await write('project-status.md', reportContent);

  const elapsed = (nanoseconds() - start) / 1e6;
  console.info(`   ✅ Report generated in ${elapsed.toFixed(2)}ms`);
  console.info(`   📄 Saved to: project-status.md\n`);
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.info('🚀 Bun APIs Practical Guide\n');
  console.info('='.repeat(50) + '\n');

  try {
    await demonstrateFileIO();
    await demonstrateFastWrite();
    await demonstrateStreamingWrite();

    demonstrateStringWidth();
    demonstrateANSI();

    demonstrateColor();
    demonstrateProfileColoring();

    demonstrateTableInspection();
    demonstrateDeepEquals();

    demonstrateEditorIntegration();
    await demonstrateTiming();

    await demonstrateGlob();
    demonstrateTOML();

    await generateProjectStatusReport();

    console.info('🎉 All demonstrations completed successfully!');
    console.info('\n💡 Key Takeaways:');
    console.info('   • Bun.file() provides zero-copy, lazy-loaded file access');
    console.info('   • Bun.stringWidth() handles emoji and ANSI codes correctly');
    console.info('   • Bun.color() with HSL enables dynamic theming');
    console.info('   • Bun.inspect.table() creates beautiful ASCII tables');
    console.info('   • Bun.Glob() offers fast, async file scanning');
    console.info('   • All operations are highly optimized for performance');
  } catch (error) {
    console.error(
      '❌ Error during demonstration:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
