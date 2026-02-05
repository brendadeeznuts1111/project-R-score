/**
 * Populate rotation cache with mock data for testing
 */

import { generateMockGames } from "../packages/data/mock-generator.js";
import { rotationCache } from "../src/utils/rotation-cache.js";
import { getLogger } from "../src/utils/logger.js";

const logger = getLogger();

async function populateCache(count: number = 100): Promise<void> {
  logger.info("Generating mock games", { count });
  
  const games = generateMockGames(count);
  
  // Add rotation numbers to game IDs for better testing
  let index = 0;
  for (const game of games) {
    // Format: NBA-YYYYMMDD-XXX
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
}

async function main(): Promise<void> {
  const count = parseInt(process.argv[2] || "100", 10);
  await populateCache(count);
  
  console.log(`✅ Populated rotation cache with ${rotationCache.size} games`);
  console.log(`   Run 'bun run grid:index' to generate index`);
  console.log(`   Run 'bun run grid:export --format json' to export data`);
}

if (import.meta.main) {
  main().catch((error) => {
    logger.error("Failed to populate cache", error);
    process.exit(1);
  });
}

