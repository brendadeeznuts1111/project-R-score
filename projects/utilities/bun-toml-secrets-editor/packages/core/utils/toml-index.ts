// utils/toml-index.ts
// Tree-shakable entry point for TOML utilities

// Common utilities
export {
	debounce,
	deepClone,
	fastHash,
	formatBytes,
	generateId,
	getNestedValue,
	isEmpty,
	safeJsonParse,
	safeJsonStringify,
	setNestedValue,
	sortObjectKeys,
	sortObjectKeysShallow,
	throttle,
} from "./common";
export {
	analyzeTOMLConfig,
	getTOMLMetrics,
} from "./toml-analytics";
export {
	createTOMLBackup,
	getTOMLBackupStats,
	listTOMLBackups,
	restoreTOMLBackup,
	TomlBackupRestore,
} from "./toml-backup-restore";
export {
	defaultTOMLCache,
	TomlCache,
} from "./toml-cache";
export {
	decryptTOMLFile,
	decryptTOMLValues,
	encryptTOMLFile,
	encryptTOMLValues,
	TomlEncryption,
} from "./toml-encryption";
export {
	getTOMLWatcherStats,
	stopAllTOMLWatchers,
	TomlHotReload,
	watchTOMLFile,
} from "./toml-hot-reload";
export {
	generateAllTomlTemplates,
	generateTomlTemplate,
	getAvailableTomlSchemas,
	templateGenerator,
} from "./toml-template-generator";
export {
	expandEnvVars,
	loadTomlFile,
	parseTomlFile,
	parseTomlString,
	stringifyToml,
	validateRequiredEnvVars,
} from "./toml-utils";
export {
	createVersionedConfig,
	migrateConfigVersion,
	registerConfigMigration,
} from "./toml-versioning";
