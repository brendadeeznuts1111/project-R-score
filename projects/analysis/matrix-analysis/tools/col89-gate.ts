#!/usr/bin/env bun
// col89-gate.ts — Universal Col-89 Compliance Gate
// Returns exit code 1 on any Col-89 violation (file agnostic)

export {};

const filePath = process.argv[2] || Bun.main;

try {
	const content = await Bun.file(filePath).text();
	const lines = content.split("\n");

	const violations = lines.filter(
		(line) => Bun.stringWidth(line, { countAnsiEscapeCodes: false }) > 89,
	);

	if (violations.length > 0) {
		console.error(
			`❌ Col-89 violations detected: ${violations.length} lines exceed 89 characters`,
		);
		violations.forEach((line, idx) => {
			const lineNum = lines.indexOf(line) + 1;
			const width = Bun.stringWidth(line, { countAnsiEscapeCodes: false });
			console.error(`  Line ${lineNum}: ${width} chars`);
		});
		process.exit(1);
	}

	console.log(`✅ Col-89 compliant: ${lines.length} lines checked`);
	process.exit(0);
} catch (error: any) {
	console.error(`❌ Error reading file: ${error?.message || error}`);
	process.exit(1);
}
