// commands/docs/wardley.ts
import { generateCytoscapeView } from "../../src/lib/wardley-map.ts";

export const wardleyCommand = {
  name: 'wardley',
  description: 'Open interactive Wardley map of Bun docs and ecosystem',
  options: [
    ['--cytoscape', 'Use Cytoscape interactive view (default)'],
    ['--outdir <dir>', 'Output directory for the HTML file']
  ],

  async action(args: string[] = []) {
    let outputDir = "dist";

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--outdir" && args[i + 1]) {
        outputDir = args[i + 1];
        i++;
      }
    }

    console.info("🗺️  Generating Wardley Map for Bun ecosystem...");

    const htmlPath = await generateCytoscapeView(outputDir);

    console.info(`✅ Wardley Map generated: ${htmlPath}`);

    const { exec } = await import("node:child_process");
    const cmd = process.platform === "darwin" ? "open"
      : process.platform === "win32" ? "start"
      : "xdg-open";

    exec(`${cmd} ${htmlPath}`, (err) => {
      if (err) console.info(`Open it manually: ${htmlPath}`);
    });
  }
};

// Allow direct execution
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  wardleyCommand.action(args);
}
