/**
 * Simple graph building CLI script
 */

import { buildGraph } from "../src/core/edge-builder.js";
import { loadConfigFromFile } from "../src/utils/config-loader.js";
import { generateMockGames } from "../packages/data/mock-generator.js";
import { getLogger } from "../src/utils/logger.js";
import { parseArgs, getOption } from "../src/utils/cli-parser.js";

const logger = getLogger();

const { values } = parseArgs({
  options: {
    games: { type: "string" },
  },
  allowPositionals: true,
  strict: false,
});

const gamesStr = getOption<string>(values, "games");
const count = gamesStr ? parseInt(gamesStr, 10) : 10;
const games = generateMockGames(count);
const config = (await loadConfigFromFile()).edge;

logger.info("Building graph", { gameCount: count });

const graph = buildGraph(games, config);

console.log(JSON.stringify({
  nodes: graph.nodes.size,
  edges: graph.edges.length,
  averageDegree: graph.metadata.averageDegree,
}, null, 2));

