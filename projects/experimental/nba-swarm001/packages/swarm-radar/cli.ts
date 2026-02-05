/**
 * Main entry point for swarm radar CLI
 */

import { SwarmRadar } from "./index.js";
import { loadGamesFromFile } from "../data/loader.js";
import { getLogger } from "../../src/utils/logger.js";
import { parseArgs, getOption } from "../../src/utils/cli-parser.js";
import { loadConfigFromFile } from "../../src/utils/config-loader.js";

const logger = getLogger();

// Parse command line arguments using Bun's built-in util.parseArgs
const { values } = parseArgs({
  options: {
    league: { type: "string" },
    threshold: { type: "string" }, // parseArgs returns strings, we'll parse numbers ourselves
    port: { type: "string" },
  },
  allowPositionals: true,
  strict: false,
});

const league = getOption<string>(values, "league", "NBA");
const thresholdStr = getOption<string>(values, "threshold");
const threshold = thresholdStr ? parseFloat(thresholdStr) : 0.7;
const portStr = getOption<string>(values, "port");
const port = portStr ? parseInt(portStr, 10) : 3333;

// Load config from file and merge with CLI overrides
const config = await loadConfigFromFile(undefined, {
  radar: {
    port,
    league,
  },
  edge: {
    minSimilarityThreshold: threshold,
  },
});

logger.info("Starting Swarm Radar", config);

const radar = new SwarmRadar(config);
radar.start();

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down...");
  radar.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Shutting down...");
  radar.stop();
  process.exit(0);
});

export { radar };

