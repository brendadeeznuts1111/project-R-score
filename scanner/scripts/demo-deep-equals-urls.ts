#!/usr/bin/env bun
/**
 * Demo: Bun.deepEquals URL comparison scenarios
 *
 * Shows how strict mode affects URL/object comparison.
 * Run: bun scripts/demo-deep-equals-urls.ts
 */

console.log('Bun.deepEquals URL comparison demo\n');
console.log('─'.repeat(70));

const comparisons: Array<{label: string; a: unknown; b: unknown}> = [
	{
		label: 'docs.bun.sh vs bun.com/docs (Host Mismatch)',
		a: 'https://docs.bun.sh',
		b: 'https://bun.com/docs',
	},
	{
		label: 'https:// vs http:// (Protocol Mismatch)',
		a: 'https://bun.com/docs',
		b: 'http://bun.com/docs',
	},
	{
		label: '{ path: "/api" } vs { path: "/api", hash: undefined } (Strict Undefined)',
		a: {path: '/api'},
		b: {path: '/api', hash: undefined},
	},
];

console.log('Comparison\t\t\t\t\tStrict\tResult\tReason');
console.log('─'.repeat(70));

for (const {label, a, b} of comparisons) {
	const loose = Bun.deepEquals(a, b);
	const strict = Bun.deepEquals(a, b, true);
	let reason = '';
	if (!loose) {
		if (typeof a === 'string' && typeof b === 'string') {
			try {
				const uA = new URL(a);
				const uB = new URL(b);
				if (uA.hostname !== uB.hostname) reason = 'Host Mismatch';
				else if (uA.protocol !== uB.protocol) reason = 'Protocol Mismatch';
			} catch {
				reason = 'String Mismatch';
			}
		} else reason = 'Object Mismatch';
	}
	if (!strict && loose) reason = 'Strict Undefined';
	console.log(`${label.slice(0, 45).padEnd(45)}\t${strict}\t${loose}\t${reason || '-'}`);
}

console.log('\n' + '─'.repeat(70));
console.log('Direct Bun.deepEquals results:\n');

for (const {label, a, b} of comparisons) {
	const loose = Bun.deepEquals(a, b);
	const strict = Bun.deepEquals(a, b, true);
	console.log(label);
	console.log(`  Loose (default): ${loose}`);
	console.log(`  Strict (3rd arg true): ${strict}`);
	console.log();
}
