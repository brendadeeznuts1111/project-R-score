#!/usr/bin/env bun
/**
 * @fileoverview 8.2.6.3.0.0.0.0: Binary Manifest CLI Tool
 * @description Command-line tool for binary manifest operations: encode, decode, verify, and diff.
 *              Provides CLI interface for BinaryManifestCodec and ManifestDigest utilities.
 * @module scripts/manifest-binary-tool
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CLI@8.2.6.3.0.0.0.0;instance-id=BINARY-MANIFEST-CLI-001;version=8.2.6.3.0.0.0.0}]
 * [PROPERTIES:{tool={value:"manifest-binary-tool";@root:"ROOT-CLI";@chain:["BP-CLI","BP-POLICY","BP-BINARY"];@version:"8.2.6.3.0.0.0.0"}}]
 * [CLASS:BinaryManifestCLI][#REF:v-8.2.6.3.0.0.0.0.BP.CLI.POLICY.1.0.A.1.1.TOOL.1.1]]
 * 
 * Version: 8.2.6.3.0.0.0.0
 * Ripgrep Pattern: 8\.2\.6\.3\.0\.0\.0\.0|BINARY-MANIFEST-CLI-001|BP-CLI@8\.2\.6\.3\.0\.0\.0\.0
 * 
 * @see 8.2.6.1.0.0.0.0 for ManifestDigest utility
 * @see 8.2.6.2.0.0.0.0 for BinaryManifestCodec utility
 * @see 8.2.0.0.0.0.0 for UIPolicyManager integration
 * 
 * // Ripgrep: 8.2.6.3.0.0.0.0
 * // Ripgrep: BINARY-MANIFEST-CLI-001
 * // Ripgrep: BP-CLI@8.2.6.3.0.0.0.0
 * 
 * Usage:
 *   bun run scripts/manifest-binary-tool.ts --encode --input manifest.yaml --output manifest.bin
 *   bun run scripts/manifest-binary-tool.ts --decode --input manifest.bin --output manifest-decoded.yaml
 *   bun run scripts/manifest-binary-tool.ts --verify --input manifest.yaml --reference manifest.bin
 *   bun run scripts/manifest-binary-tool.ts --diff --input current.yaml --reference previous.yaml
 */

import { BinaryManifestCodec } from '../src/utils/binary-manifest';
import { ManifestDigest } from '../src/utils/manifest-digest';
import { existsSync } from 'fs';

interface BinaryOperation {
	encode: boolean;
	decode: boolean;
	diff: boolean;
	verify: boolean;
	input: string;
	output?: string;
	reference?: string;
}

async function parseArgs(): Promise<BinaryOperation> {
	const args = Bun.argv.slice(2);
	const op: BinaryOperation = {
		encode: false,
		decode: false,
		diff: false,
		verify: false,
		input: "",
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		switch (arg) {
			case "--encode":
			case "-e":
				op.encode = true;
				break;
			case "--decode":
			case "-d":
				op.decode = true;
				break;
			case "--diff":
				op.diff = true;
				break;
			case "--verify":
			case "-v":
				op.verify = true;
				break;
			case "--input":
			case "-i":
				if (nextArg) {
					op.input = nextArg;
					i++;
				}
				break;
			case "--output":
			case "-o":
				if (nextArg) {
					op.output = nextArg;
					i++;
				}
				break;
			case "--reference":
			case "-r":
				if (nextArg) {
					op.reference = nextArg;
					i++;
				}
				break;
			case "--help":
			case "-h":
				printHelp();
				process.exit(0);
		}
	}

	return op;
}

function printHelp() {
	console.log(`
Binary Manifest Tool
===================

Usage: bun run manifest-binary-tool [options]

Options:
  -e, --encode         Encode YAML manifest to binary format
  -d, --decode         Decode binary manifest to YAML
  --diff              Create binary diff between two manifests
  -v, --verify        Verify manifest integrity
  -i, --input <path>  Input file path
  -o, --output <path> Output file path (optional)
  -r, --reference <path> Reference file for diff/verify
  -h, --help          Show this help

Examples:
  # Encode YAML to binary
  bun run manifest-binary-tool --encode --input manifest.yaml --output manifest.bin
  
  # Decode binary to YAML
  bun run manifest-binary-tool --decode --input manifest.bin --output manifest-decoded.yaml
  
  # Verify manifest
  bun run manifest-binary-tool --verify --input manifest.yaml --reference manifest.bin
  
  # Create diff
  bun run manifest-binary-tool --diff --input current.yaml --reference previous.yaml
`);
}

async function encodeManifest(inputPath: string, outputPath?: string) {
	console.log(`🔧 Encoding: ${inputPath}`);

	const content = await Bun.file(inputPath).text();
	const manifest = Bun.YAML.parse(content);

	const binary = BinaryManifestCodec.encode(manifest);
	const digest = ManifestDigest.computeHash(binary);

	console.log(`✅ Encoded to ${binary.byteLength} bytes`);
	console.log(`📊 SHA-256: ${digest.substring(0, 32)}...`);

	if (outputPath) {
		await Bun.write(outputPath, binary);
		console.log(`💾 Saved to: ${outputPath}`);
	}

	return { binary, digest };
}

async function decodeManifest(inputPath: string, outputPath?: string) {
	console.log(`🔧 Decoding: ${inputPath}`);

	const binary = new Uint8Array(await Bun.file(inputPath).arrayBuffer());
	const manifest = BinaryManifestCodec.decode(binary);

	const yaml = Bun.YAML.stringify(manifest);
	const digest = ManifestDigest.computeHash(binary);

	console.log(`✅ Decoded ${binary.byteLength} bytes to YAML`);
	console.log(`📊 SHA-256: ${digest.substring(0, 32)}...`);

	if (outputPath) {
		await Bun.write(outputPath, yaml);
		console.log(`💾 Saved to: ${outputPath}`);
	}

	return { manifest, yaml, digest };
}

async function verifyManifest(inputPath: string, referencePath: string) {
	console.log(`🔍 Verifying: ${inputPath} against ${referencePath}`);

	const inputContent = new Uint8Array(await Bun.file(inputPath).arrayBuffer());
	const refContent = new Uint8Array(await Bun.file(referencePath).arrayBuffer());

	// Determine file types
	const inputIsBinary = inputPath.endsWith('.bin') || !inputPath.endsWith('.yaml') && !inputPath.endsWith('.yml');
	const refIsBinary = referencePath.endsWith('.bin') || !referencePath.endsWith('.yaml') && !referencePath.endsWith('.yml');

	let inputHash: string;
	let refHash: string;

	if (inputIsBinary && refIsBinary) {
		// Both binary - compare directly
		inputHash = ManifestDigest.computeHash(inputContent);
		refHash = ManifestDigest.computeHash(refContent);
	} else if (!inputIsBinary && refIsBinary) {
		// Input is YAML, reference is binary - encode input and compare
		const inputText = new TextDecoder().decode(inputContent);
		const inputManifest = Bun.YAML.parse(inputText);
		const inputBinary = BinaryManifestCodec.encode(inputManifest);
		inputHash = ManifestDigest.computeHash(inputBinary);
		refHash = ManifestDigest.computeHash(refContent);
	} else if (inputIsBinary && !refIsBinary) {
		// Input is binary, reference is YAML - encode reference and compare
		const refText = new TextDecoder().decode(refContent);
		const refManifest = Bun.YAML.parse(refText);
		const refBinary = BinaryManifestCodec.encode(refManifest);
		inputHash = ManifestDigest.computeHash(inputContent);
		refHash = ManifestDigest.computeHash(refBinary);
	} else {
		// Both YAML - compare structural hash (ignores formatting)
		const inputText = new TextDecoder().decode(inputContent);
		const refText = new TextDecoder().decode(refContent);
		const inputManifest = Bun.YAML.parse(inputText);
		const refManifest = Bun.YAML.parse(refText);
		inputHash = ManifestDigest.computeStructuralHash(inputManifest);
		refHash = ManifestDigest.computeStructuralHash(refManifest);
	}

	console.log(`📊 Input hash:  ${inputHash}`);
	console.log(`📊 Reference:   ${refHash}`);

	if (inputHash === refHash) {
		console.log("✅ Manifest integrity verified");
		return true;
	} else {
		console.log("❌ Manifest integrity check failed");

		// Show differences in size
		const inputSize = inputContent.byteLength;
		const refSize = refContent.byteLength;
		console.log(`   Input size: ${inputSize} bytes`);
		console.log(`   Ref size:   ${refSize} bytes`);
		console.log(`   Difference: ${Math.abs(inputSize - refSize)} bytes`);

		return false;
	}
}

async function createDiff(currentPath: string, previousPath: string) {
	console.log(`🔍 Creating diff: ${currentPath} vs ${previousPath}`);

	const current = new Uint8Array(await Bun.file(currentPath).arrayBuffer());
	const previous = new Uint8Array(await Bun.file(previousPath).arrayBuffer());

	const diff = BinaryManifestCodec.createDiff(current, previous);

	console.log(`📊 Diff operation: ${diff.operation}`);
	console.log(`📊 Patch size: ${diff.patch.byteLength} bytes`);
	console.log(`📊 Original size: ${current.byteLength} bytes`);
	console.log(
		`📊 Compression: ${((diff.patch.byteLength / current.byteLength) * 100).toFixed(1)}%`,
	);

	if (diff.operation === "identical") {
		console.log("✅ Manifests are identical");
	}

	return diff;
}

async function main() {
	const operation = await parseArgs();

	if (!operation.input || !existsSync(operation.input)) {
		console.error("❌ Input file not found");
		process.exit(1);
	}

	try {
		if (operation.encode) {
			await encodeManifest(operation.input, operation.output);
		} else if (operation.decode) {
			await decodeManifest(operation.input, operation.output);
		} else if (operation.verify) {
			if (!operation.reference) {
				console.error("❌ Reference file required for verification");
				process.exit(1);
			}
			const success = await verifyManifest(operation.input, operation.reference);
			process.exit(success ? 0 : 1);
		} else if (operation.diff) {
			if (!operation.reference) {
				console.error("❌ Reference file required for diff");
				process.exit(1);
			}
			await createDiff(operation.input, operation.reference);
		} else {
			console.error("❌ No operation specified");
			printHelp();
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Operation failed:", (error as Error).message);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
