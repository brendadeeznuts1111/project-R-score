export { BaseProvider, safeAsync } from "./base";
export { CCXTProvider } from "./ccxt";
export {
	createDeribitProvider,
	type DeribitConfig,
	type DeribitIndex,
	type DeribitOption,
	type DeribitOptionTicker,
	type DeribitOrderbook,
	DeribitProvider,
	type VolatilityPoint,
} from "./deribit";
export { FileProvider, loadDataFromFiles, loadTradesFromFile } from "./file";

import type { DataProvider, DataSourceConfig, Result } from "../types";
import { err, ok } from "../types";
import { CCXTProvider } from "./ccxt";
import { DeribitProvider } from "./deribit";
import { FileProvider } from "./file";

/**
 * Create a data provider from config
 */
export function createProvider(config: DataSourceConfig): Result<DataProvider> {
	try {
		switch (config.type) {
			case "api":
				if (!config.exchange || !config.apiKey || !config.apiSecret) {
					return err(
						new Error("API provider requires exchange, apiKey, and apiSecret"),
					);
				}
				return ok(
					new CCXTProvider({
						exchange: config.exchange,
						apiKey: config.apiKey,
						apiSecret: config.apiSecret,
						testnet: config.testnet,
					}),
				);

			case "csv":
			case "json":
				if (!config.filePath) {
					return err(new Error("File provider requires filePath"));
				}
				return ok(new FileProvider({ tradesPath: config.filePath }));

			default:
				return err(new Error(`Unknown data source type: ${config.type}`));
		}
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}
