#!/usr/bin/env bun
/**
 * @fileoverview Initialize Registry Database
 * @description Creates database schema and initializes tables
 */

import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = 'registry.db';
const SCHEMA_PATH = join(import.meta.dir, '..', 'registry.db.schema.sql');

async function initDatabase() {
	console.log('📦 Initializing registry database...');

	const db = new Database(DB_PATH);
	
	// Read and execute schema
	const schema = readFileSync(SCHEMA_PATH, 'utf-8');
	db.exec(schema);

	console.log('✅ Database initialized successfully!');
	console.log(`   Database: ${DB_PATH}`);
	console.log(`   Tables created: packages, package_metadata, package_teams, publications`);

	db.close();
}

if (import.meta.main) {
	initDatabase().catch(console.error);
}
