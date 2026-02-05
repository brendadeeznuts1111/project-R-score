/**
 * Combined script: Populate cache and generate index in one go
 */

import { generateMockGames } from "../packages/data/mock-generator.js";
import { rotationCache } from "../src/utils/rotation-cache.js";
import { getLogger } from "../src/utils/logger.js";
import { writeFileSync } from "fs";
import {
  generateHeatmap,
  generateFingerprint,
} from "../src/utils/heatmap.js";

const logger = getLogger();

async function main(): Promise<void> {
  const count = parseInt(process.argv[2] || "100", 10);
  
  // Step 1: Populate cache
  logger.info("Generating mock games", { count });
  const games = generateMockGames(count);

  let index = 0;
  for (const game of games) {
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const rotationNum = String(index % 1000).padStart(3, "0");
    game.id = `NBA-${date}-${rotationNum}`;
    rotationCache.set(game);
    index++;
  }

  logger.info("Rotation cache populated", {
    cachedGames: rotationCache.size,
    totalGames: games.length,
  });

  // Step 2: Generate index
  const sorted = rotationCache.getAllSorted();
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

  console.log(`✅ Populated cache with ${rotationCache.size} games`);
  console.log(`✅ Generated index with ${indexLines.length} entries`);
  console.log(`   Run 'bun run grid:search "NBA"' to search`);
  console.log(`   Run 'bun run grid:export --format json' to export`);
}

if (import.meta.main) {
  main().catch((error) => {
    logger.error("Failed to populate cache and generate index", error);
    process.exit(1);
  });
}

