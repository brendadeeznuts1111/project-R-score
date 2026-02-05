/**
 * Integrity manifest generator CLI
 */

import { IntegrityGovernance } from "./integrity.js";
import { getLogger } from "../../src/utils/logger.js";

const logger = getLogger();

async function main() {
  const args = Bun.argv.slice(2);
  
  if (args.includes("--generate")) {
    const governance = new IntegrityGovernance();
    await governance.generateManifest();
  } else {
    logger.info("Usage: bun run governance:integrity:generate");
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Failed to generate integrity manifest", error);
  process.exit(1);
});

