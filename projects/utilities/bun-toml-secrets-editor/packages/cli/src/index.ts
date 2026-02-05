import { getLogger } from "@bun-toml/core";

export const runCLI = () => {
	const logger = getLogger();
	logger.info("CLI starting");
};
