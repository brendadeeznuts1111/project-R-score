/**
 * @fileoverview RFC Management with Telegram Integration
 * @description Submit and manage RFCs with Telegram notifications
 * @module @graph/telegram/rfc
 */

import { Database } from 'bun:sqlite';
import { notifyTopic } from './notifications';
import { getTopicInfo, type PackageName } from './topics';

/**
 * Submit RFC and notify Telegram
 */
export async function submitRFC(
	packageName: string,
	rfc: {
		title: string;
		author: string;
		description: string;
		proposedChanges?: Record<string, any>;
	}
): Promise<number> {
	// Save RFC to registry
	const db = new Database('registry.db');
	
	// Ensure RFCs table exists
	db.exec(`
		CREATE TABLE IF NOT EXISTS rfcs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			package_name TEXT NOT NULL,
			title TEXT NOT NULL,
			author TEXT NOT NULL,
			description TEXT NOT NULL,
			status TEXT DEFAULT 'draft',
			submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			reviewed_by TEXT,
			reviewed_at DATETIME
		);
	`);

	const result = db
		.prepare(
			`
		INSERT INTO rfcs (package_name, title, author, description, status, submitted_at)
		VALUES (?, ?, ?, ?, 'draft', datetime('now'))
	`
		)
		.run(packageName, rfc.title, rfc.author, rfc.description);

	const rfcId = result.lastInsertRowid as number;

	// Notify Telegram RFC topic
	const { notifyRFCSubmitted } = await import('./notifications');
	await notifyRFCSubmitted(packageName, rfc);

	return rfcId;
}

/**
 * Get RFCs for a package
 */
export function getRFCs(packageName: string): Array<{
	id: number;
	title: string;
	author: string;
	status: 'draft' | 'review' | 'approved' | 'rejected' | 'implemented';
	submitted_at: string;
}> {
	const db = new Database('registry.db');
	
	// Ensure table exists
	db.exec(`
		CREATE TABLE IF NOT EXISTS rfcs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			package_name TEXT NOT NULL,
			title TEXT NOT NULL,
			author TEXT NOT NULL,
			description TEXT NOT NULL,
			status TEXT DEFAULT 'draft',
			submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			reviewed_by TEXT,
			reviewed_at DATETIME
		);
	`);

	return db
		.prepare(
			`
		SELECT id, title, author, status, submitted_at 
		FROM rfcs 
		WHERE package_name = ?
		ORDER BY submitted_at DESC
	`
		)
		.all(packageName) as Array<{
		id: number;
		title: string;
		author: string;
		status: string;
		submitted_at: string;
	}>;
}

/**
 * Update RFC status and notify
 */
export async function updateRFCStatus(
	rfcId: number,
	status: 'review' | 'approved' | 'rejected' | 'implemented',
	reviewer: string
): Promise<void> {
	const db = new Database('registry.db');
	const rfc = db.prepare('SELECT * FROM rfcs WHERE id = ?').get(rfcId) as any;

	if (!rfc) throw new Error('RFC not found');

	// Update status
	db.prepare(
		'UPDATE rfcs SET status = ?, reviewed_by = ?, reviewed_at = datetime("now") WHERE id = ?'
	).run(status, reviewer, rfcId);

	// Notify based on status
	const topicInfo = getTopicInfo(rfc.package_name as PackageName);
	if (!topicInfo) return;

	const statusEmoji = {
		review: '📋',
		approved: '✅',
		rejected: '❌',
		implemented: '🚀',
	};

	const message =
		`${statusEmoji[status]} **RFC ${status.toUpperCase()}**\n\n` +
		`📦 **Package:** ${rfc.package_name}\n` +
		`📄 **Title:** ${rfc.title}\n` +
		`👤 **Reviewer:** ${reviewer}\n\n` +
		`[View RFC](https://registry.internal.yourcompany.com/rfcs/${rfcId})`;

	await notifyTopic(topicInfo.topicId, message);
}

/**
 * Get RFC by ID
 */
export function getRFC(rfcId: number): {
	id: number;
	package_name: string;
	title: string;
	author: string;
	description: string;
	status: string;
	submitted_at: string;
	reviewed_by?: string;
	reviewed_at?: string;
} | null {
	const db = new Database('registry.db');
	const rfc = db.prepare('SELECT * FROM rfcs WHERE id = ?').get(rfcId) as any;
	return rfc || null;
}
