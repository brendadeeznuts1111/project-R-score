#!/usr/bin/env bun
/**
 * FactoryWager Unicode Table Renderer CLI
 * Renders tables with CJK, emoji, and Unicode support
 */

import { renderUnicodeTable } from "./tabular/unicode-table-v41.ts";

const args = process.argv.slice(2);
const options = {
  inputFile: "",
  ansi: false,
  title: "",
  footer: ""
};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case "--input":
    case "-i":
      options.inputFile = args[++i];
      break;
    case "--ansi":
    case "-a":
      options.ansi = true;
      break;
    case "--title":
    case "-t":
      options.title = args[++i];
      break;
    case "--footer":
    case "-f":
      options.footer = args[++i];
      break;
    case "--help":
    case "-h":
      console.log(`
FactoryWager Unicode Table Renderer

USAGE:
  bun run render-table.ts --input data.json [options]

OPTIONS:
  -i, --input <file>     Input JSON file with table data
  -a, --ansi             Enable ANSI colors (default: false)
  -t, --title <text>     Table title
  -f, --footer <text>    Table footer
  -h, --help             Show this help

EXAMPLES:
  bun run render-table.ts --input data-with-cjk.json --ansi
  bun run render-table.ts -i data.json -t "My Table" -f "End of table"
      `);
      process.exit(0);
    default:
      if (!options.inputFile && !arg.startsWith("-")) {
        options.inputFile = arg;
      }
      break;
  }
}

if (!options.inputFile) {
  console.error("❌ Error: Input file required");
  console.error("Use --help for usage information");
  process.exit(1);
}

try {
  // Read and parse input data
  const data = await Bun.file(options.inputFile).json();
  
  if (!Array.isArray(data)) {
    console.error("❌ Error: Input file must contain an array of objects");
    process.exit(1);
  }
  
  // Set default title if not provided
  if (!options.title) {
    options.title = "🛡️ FactoryWager Unicode Table - CJK Support";
  }
  
  // Set default footer if not provided
  if (!options.footer) {
    options.footer = `Rendered with Bun v${Bun.version} - Unicode Citadel v4.1`;
  }
  
  // Render the table
  const result = renderUnicodeTable(data, {
    title: options.title,
    footer: options.footer
  });
  
  console.log(result);
  
} catch (error) {
  console.error("❌ Error rendering table:", (error as Error).message);
  process.exit(1);
}
