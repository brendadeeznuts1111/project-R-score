#!/usr/bin/env bun
/**
 * @fileoverview RFC Submission Script
 * @description Submit RFCs and notify Telegram
 * @module scripts/rfc-submit
 * 
 * Usage:
 *   bun run scripts/rfc-submit.ts path/to/rfc.md
 */

import { submitRFC } from '@graph/telegram/rfc';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const rfcPath = process.argv[2];

if (!rfcPath) {
	console.error('Usage: bun run scripts/rfc-submit.ts path/to/rfc.md');
	process.exit(1);
}

async function main() {
	try {
		const rfcContent = await readFile(resolve(rfcPath), 'utf8');

		// Parse RFC metadata
		const metadata = {
			title: rfcContent.match(/title:\s*(.+)/i)?.[1] || '',
			author: rfcContent.match(/author:\s*(.+)/i)?.[1] || '',
			package: rfcContent.match(/package:\s*@graph\/(\w+)/i)?.[0] || '',
			description: rfcContent.match(/description:\s*(.+)/i)?.[1] || '',
		};

		if (!metadata.title || !metadata.author || !metadata.package) {
			console.error('❌ Error: RFC must contain title, author, and package');
			console.error('   Found:', metadata);
			process.exit(1);
		}

		// Extract proposed changes from "Changes Proposed" section
		const changesMatch = rfcContent.match(/```typescript\s*\/\/ After\s*(.+?)```/s);
		const proposedChanges = changesMatch ? { code: changesMatch[1] } : {};

		await submitRFC(metadata.package, {
			title: metadata.title,
			author: metadata.author,
			description: metadata.description,
			proposedChanges: { code: proposedChanges },
		});

		console.log(`✅ RFC submitted for ${metadata.package}`);
		console.log(`📢 Notified Telegram topic`);
	} catch (error) {
		console.error('❌ Failed to submit RFC:', error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
