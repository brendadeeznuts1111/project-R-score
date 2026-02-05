/**
 * Grid index CLI - Generate and search rotation grid index
 */

import { parseArgs, getOption } from "../src/utils/cli-parser.js";
import { rotationCache } from "../src/utils/rotation-cache.js";
import {
  generateHeatmap,
  generateFingerprint,
  extractRotationNumber,
} from "../src/utils/heatmap.js";
import { writeFileSync } from "fs";
import { getLogger } from "../src/utils/logger.js";

const logger = getLogger();

async function generateIndex(): Promise<void> {
  const sorted = rotationCache.getAllSorted();
  
  if (sorted.length === 0) {
    console.warn("⚠️  Rotation cache is empty. Run 'bun run grid:populate' first.");
    logger.warn("Rotation cache is empty", { cacheSize: rotationCache.size });
    return;
  }
  
  const indexLines: string[] = [];

  for (const { game, rotationNumber } of sorted) {
    const heat = generateHeatmap(game.vector);
    const fp = generateFingerprint(game.vector);
    const line = `${game.id}\t${rotationNumber}\t${heat}\t${fp}`;
    indexLines.push(line);
  }

  const indexContent = indexLines.join("\n");
  writeFileSync(".rotgrid.index", indexContent, "utf-8");

  logger.info("Grid index generated", {
    entries: indexLines.length,
    file: ".rotgrid.index",
  });
  
  console.log(`✅ Generated index with ${indexLines.length} entries`);
}

async function searchIndex(pattern: string): Promise<void> {
  const { readFileSync } = await import("fs");
  
  try {
    const indexContent = readFileSync(".rotgrid.index", "utf-8");
    const lines = indexContent.split("\n").filter(line => line.trim());

    const matches = lines.filter((line) => line.includes(pattern));

    if (matches.length === 0) {
      console.log(`No matches found for "${pattern}"`);
      return;
    }

    console.log(`Found ${matches.length} matches:`);
    matches.forEach((match) => {
      const [rot, rotNum, heat, fp] = match.split("\t");
      console.log(`  ${rot} | ROT:${rotNum} | ${heat} | FP:${fp}`);
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error("Grid index not found. Run 'bun run grid:index' first.");
    } else {
      throw error;
    }
  }
}

async function exportGrid(format: "png" | "json" | "csv"): Promise<void> {
  const sorted = rotationCache.getAllSorted();

  // If cache is empty, try to read from index file
  let dataToExport: Array<{
    rot: string;
    rotationNumber: number;
    heat: string;
    fp: string;
  }> = [];

  if (sorted.length === 0) {
    try {
      const { readFileSync } = await import("fs");
      const indexContent = readFileSync(".rotgrid.index", "utf-8");
      const lines = indexContent.split("\n").filter((line) => line.trim());

      dataToExport = lines.map((line) => {
        const [rot, rotNum, heat, fp] = line.split("\t");
        return {
          rot: rot || "",
          rotationNumber: parseInt(rotNum || "0", 10),
          heat: heat || "",
          fp: fp || "",
        };
      });

      if (dataToExport.length === 0) {
        console.warn(
          "⚠️  Rotation cache is empty and index file is empty. Run 'bun run grid:populate' first."
        );
        logger.warn("Rotation cache and index file are empty", {
          cacheSize: rotationCache.size,
        });
        return;
      }

      console.log(
        `📖 Reading from index file (${dataToExport.length} entries)`
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn(
          "⚠️  Rotation cache is empty and index file not found. Run 'bun run grid:setup' first."
        );
        logger.warn("Rotation cache and index file not found", {
          cacheSize: rotationCache.size,
        });
        return;
      }
      throw error;
    }
  } else {
    // Use cache data
    dataToExport = sorted.map(({ game, rotationNumber }) => ({
      rot: game.id,
      rotationNumber,
      heat: generateHeatmap(game.vector),
      fp: generateFingerprint(game.vector),
    }));
  }

  if (format === "json") {
    writeFileSync("grid-export.json", JSON.stringify(dataToExport, null, 2));
    logger.info("Grid exported as JSON", { count: dataToExport.length });
    console.log(
      `✅ Exported ${dataToExport.length} entries to grid-export.json`
    );
  } else if (format === "csv") {
    const csvLines = ["rot,rotationNumber,heat,fp"];
    csvLines.push(
      ...dataToExport.map(
        ({ rot, rotationNumber, heat, fp }) =>
          `${rot},${rotationNumber},${heat},${fp}`
      )
    );
    writeFileSync("grid-export.csv", csvLines.join("\n"));
    logger.info("Grid exported as CSV", { count: csvLines.length - 1 });
    console.log(
      `✅ Exported ${csvLines.length - 1} entries to grid-export.csv`
    );
  } else {
    logger.warn("PNG export not yet implemented");
    console.warn("⚠️  PNG export not yet implemented");
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      generate: { type: "boolean" },
      search: { type: "string" },
      export: { type: "boolean" },
      format: { type: "string" },
    },
  });

  if (values.generate) {
    await generateIndex();
  } else if (values.search) {
    await searchIndex(values.search as string);
  } else if (values.export) {
    const format = (values.format as "png" | "json" | "csv") || "json";
    await exportGrid(format);
  } else {
    console.log("Rotation Grid Index CLI");
    console.log("");
    console.log("Usage:");
    console.log("  bun run scripts/grid-index.ts --generate");
    console.log("  bun run scripts/grid-index.ts --search <pattern>");
    console.log(
      "  bun run scripts/grid-index.ts --export [--format json|csv|png]"
    );
    console.log("");
    console.log("Examples:");
    console.log('  bun run grid:index');
    console.log('  bun run grid:search "NBA-20251103"');
    console.log('  bun run grid:export --format json');
  }
}

if (import.meta.main) {
  main().catch((error) => {
    logger.error("Grid index CLI error", error);
    process.exit(1);
  });
}

