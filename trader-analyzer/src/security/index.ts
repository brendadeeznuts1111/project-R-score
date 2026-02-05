// [security]
// Security testing module - exports all security tools

export {
	analyzeHeaders,
	generateImplementation,
	HeadersAnalyzer,
	optimizeHeaders,
} from "./headers";
export { ApiPentester, quickScan, WebPentester } from "./pentest";
export {
	enforceSRI,
	generateSRI,
	hashFile,
	SRIGenerator,
	verifySRI,
} from "./sri";
export {
	ComplianceLogger,
	type ComplianceLogEntry,
	type DataAccessEntry,
} from "./compliance-logger";
export {
	IncidentResponseOrchestrator,
	type Incident,
	type ThreatAlert,
} from "./incident-response";
export {
	RuntimeSecurityMonitor,
	type ThreatContext,
	type ThreatIndicator,
} from "./runtime-monitor";
export { SecureDeployer } from "./secure-deployer";
export {
	NexusSecurityScanner,
	default as nexusSecurityScanner,
	type AdvisoryCategory,
	type NexusScannerConfig,
	type SecurityAdvisory,
} from "./bun-scanner";
export * from "./types";
export { CorrectedForensicLogger } from "../logging/corrected-forensic-logger";
export {
	ForensicMovementLogger,
	type BookmakerConfig,
	type ForensicLoggerConfig,
	type ForensicDatabase,
} from "../logging/forensic-movement-logger";
export type {
	AuditResult,
	BookmakerEndpointConfig,
	EndpointParameterConfig,
	HttpErrorDetails,
	BookmakerProfile,
} from "../logging/types";
export {
	buildEndpointConfig,
	buildEndpointConfigFromSharpBook,
	getEndpointConfigForLogger,
	loadBookmakerProfile,
	profileBookmakerEndpoint,
	updateBookmakerProfile,
} from "../logging/bookmaker-profile";
export {
	ChunkedEncodingError,
	ChunkedEncodingGuard,
	chunkedEncodingGuard,
	parseChunkedEncoding,
	type ChunkedEncodingResult,
} from "./chunked-encoding-guard";
