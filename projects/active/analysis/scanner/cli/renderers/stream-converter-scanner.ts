// stream-converter-scanner.ts
// Detects userland stream conversion patterns and recommends native Bun replacements

import {BUN_STREAM_MIGRATION_MATRIX} from './stream-converters-enhanced';
import {BUN_DOC_BASE} from './bun-api-matrix';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface MigrationTelemetry {
	performanceGain: number; // multiplier (e.g. 7.1 = 7.1x faster)
	memoryReduction: number; // bytes saved per operation
	securityImprovement: number; // 0–100 percentage
}

interface MigrationRule {
	id: string;
	pattern: RegExp;
	replacement: string;
	rScore: number;
	confidence: number;
	category: 'StreamConversion';
	telemetry: MigrationTelemetry;
	documentation: string;
}

interface StreamConverterMatch {
	rule: string;
	converter: string;
	position: number;
	line: number;
	column: number;
	context: string;
	rScore: number;
	confidence: number;
}

interface ScanReport {
	file: string;
	matches: StreamConverterMatch[];
	totalOpportunities: number;
	estimatedSpeedup: number;
	estimatedMemorySaved: number;
}

// ═══════════════════════════════════════════════════════════════
// MIGRATION RULES
// ═══════════════════════════════════════════════════════════════

const BUN_STREAM_CONVERTER_RULES: readonly MigrationRule[] = [
	{
		id: 'stream-text-001',
		pattern: /await\s+new\s+Response\s*\(\s*(\w+)\s*\)\.text\s*\(\s*\)/g,
		replacement: 'await Bun.readableStreamToText($1)',
		rScore: 1.0,
		confidence: 0.99,
		category: 'StreamConversion',
		telemetry: {performanceGain: 7.1, memoryReduction: 128, securityImprovement: 100},
		documentation: `${BUN_DOC_BASE}/api/streams#readablestreamtotext`,
	},
	{
		id: 'stream-json-002',
		pattern: /await\s+new\s+Response\s*\(\s*(\w+)\s*\)\.json\s*\(\s*\)/g,
		replacement: 'await Bun.readableStreamToJSON($1)',
		rScore: 1.0,
		confidence: 0.99,
		category: 'StreamConversion',
		telemetry: {performanceGain: 10.2, memoryReduction: 160, securityImprovement: 100},
		documentation: `${BUN_DOC_BASE}/api/streams#readablestreamtojson`,
	},
	{
		id: 'stream-buffer-003',
		pattern: /await\s+new\s+Response\s*\(\s*(\w+)\s*\)\.arrayBuffer\s*\(\s*\)/g,
		replacement: 'await Bun.readableStreamToArrayBuffer($1)',
		rScore: 1.0,
		confidence: 0.98,
		category: 'StreamConversion',
		telemetry: {performanceGain: 8.5, memoryReduction: 192, securityImprovement: 100},
		documentation: `${BUN_DOC_BASE}/api/streams#readablestreamtoarraybuffer`,
	},
	{
		id: 'stream-blob-004',
		pattern: /await\s+new\s+Response\s*\(\s*(\w+)\s*\)\.blob\s*\(\s*\)/g,
		replacement: 'await Bun.readableStreamToBlob($1)',
		rScore: 1.0,
		confidence: 0.98,
		category: 'StreamConversion',
		telemetry: {performanceGain: 6.8, memoryReduction: 256, securityImprovement: 100},
		documentation: `${BUN_DOC_BASE}/api/streams#readablestreamtoblob`,
	},
	{
		id: 'stream-concat-005',
		pattern: /Buffer\.concat\s*\(\s*await\s+(\w+)\.toArray\s*\(\s*\)\s*\)/g,
		replacement: 'await Bun.readableStreamToBytes($1)',
		rScore: 1.0,
		confidence: 0.95,
		category: 'StreamConversion',
		telemetry: {performanceGain: 5.3, memoryReduction: 160, securityImprovement: 100},
		documentation: `${BUN_DOC_BASE}/api/streams#readablestreamtobytes`,
	},
] as const;

// ═══════════════════════════════════════════════════════════════
// DETECTION PATTERNS (broader than migration rules)
// ═══════════════════════════════════════════════════════════════

const BUN_DETECTION_PATTERNS = [
	{regex: /new\s+Response\s*\(/g, type: 'ResponseConstructor', converter: 'readableStreamToText'},
	{regex: /Buffer\.concat\s*\(/g, type: 'BufferConcat', converter: 'readableStreamToBytes'},
	{regex: /new\s+TextDecoder/g, type: 'TextDecoder', converter: 'readableStreamToText'},
	{regex: /JSON\.parse\s*\([^)]*stream/gi, type: 'JSONParse', converter: 'readableStreamToJSON'},
] as const;

// ═══════════════════════════════════════════════════════════════
// SCANNER
// ═══════════════════════════════════════════════════════════════

class StreamConverterScanner {
	scan(code: string): StreamConverterMatch[] {
		const matches: StreamConverterMatch[] = [];

		for (const pattern of BUN_DETECTION_PATTERNS) {
			pattern.regex.lastIndex = 0;
			let match: RegExpExecArray | null;
			while ((match = pattern.regex.exec(code)) !== null) {
				const pos = match.index;
				const {line, column} = this.getPosition(code, pos);
				matches.push({
					rule: pattern.type,
					converter: pattern.converter,
					position: pos,
					line,
					column,
					context: this.getContext(code, pos, 50),
					rScore: this.lookupRScore(pattern.converter),
					confidence: this.lookupConfidence(pattern.type),
				});
			}
		}

		return matches.sort((a, b) => a.position - b.position);
	}

	report(file: string, code: string): ScanReport {
		const matches = this.scan(code);
		let totalSpeedup = 0;
		let totalMemory = 0;
		for (const m of matches) {
			const rule = BUN_STREAM_CONVERTER_RULES.find(r => r.replacement.includes(m.converter));
			if (rule) {
				totalSpeedup += rule.telemetry.performanceGain;
				totalMemory += rule.telemetry.memoryReduction;
			}
		}
		return {
			file,
			matches,
			totalOpportunities: matches.length,
			estimatedSpeedup: matches.length > 0 ? totalSpeedup / matches.length : 0,
			estimatedMemorySaved: totalMemory,
		};
	}

	private getPosition(code: string, offset: number): {line: number; column: number} {
		const before = code.substring(0, offset);
		const lines = before.split('\n');
		return {line: lines.length, column: lines[lines.length - 1].length + 1};
	}

	private getContext(code: string, position: number, chars: number): string {
		const start = Math.max(0, position - chars);
		const end = Math.min(code.length, position + chars);
		return code.substring(start, end);
	}

	private lookupRScore(converter: string): number {
		const entry = BUN_STREAM_MIGRATION_MATRIX.find(e => e.converter === converter);
		return entry?.rScore ?? 0.95;
	}

	private lookupConfidence(type: string): number {
		switch (type) {
			case 'ResponseConstructor':
				return 0.99;
			case 'BufferConcat':
				return 0.95;
			case 'TextDecoder':
				return 0.9;
			case 'JSONParse':
				return 0.85;
			default:
				return 0.8;
		}
	}
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
	StreamConverterScanner,
	BUN_STREAM_CONVERTER_RULES,
	BUN_DETECTION_PATTERNS,
	type MigrationRule,
	type MigrationTelemetry,
	type StreamConverterMatch,
	type ScanReport,
};
