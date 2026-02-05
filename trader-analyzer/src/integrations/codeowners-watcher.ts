#!/usr/bin/env bun
/**
 * [CODEOWNERS.WATCHER.DAEMON.RG:IMPLEMENTATION] Real-Time CODEOWNERS Synchronization Daemon
 * @fileoverview Watch TEAM.md for changes and automatically regenerate CODEOWNERS
 * @description Uses fs.watch to monitor TEAM.md and trigger CODEOWNERS regeneration
 * @module integrations/codeowners-watcher
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CODEOWNERS-WATCHER@2.0.0;instance-id=CODEOWNERS-WATCHER-001;version=2.0.0}]
 * [PROPERTIES:{integration={value:"codeowners-watcher";@root:"26.10.0.0.0.0.0";@chain:["BP-HUMAN-CAPITAL","BP-CI-CD"];@version:"2.0.0"}}]]
 * [CLASS:CodeownersWatcher][#REF:v-2.0.0.BP.CODEOwners.WATCHER.1.0.A.1.1.INTEGRATION.1.1]]
 *
 * @see {@link .github/TEAM.md} - Team structure source
 * @see {@link scripts/generate-codeowners.ts} - CODEOWNERS generator
 * @see {@link docs/26.0.0.0.0.0.0-CROSS-SUBSYSTEM-INTEGRATION-ORCHESTRATION.md} - Integration documentation
 */

import { $ } from 'bun';
import { execSync } from 'child_process';
import { watch } from 'fs';
import { join } from 'path';

// [CODEOWNERS.WATCHER.CLASS.RG:IMPLEMENTATION] CODEOWNERS Watcher Class
export class CodeownersWatcher {
	private watcher: ReturnType<typeof watch> | null = null;
	private debounceTimer: Timer | null = null;
	private readonly debounceMs = 1000; // 1 second debounce

	// [CODEOWNERS.WATCHER.START.RG:IMPLEMENTATION] Start watching TEAM.md
	start(): void {
		const teamMdPath = join(process.cwd(), '.github', 'TEAM.md');

		console.log(`[CODEOWNERS.WATCHER.RG:START] Starting watcher for ${teamMdPath}`);

		this.watcher = watch(
			teamMdPath,
			{ persistent: true },
			async (eventType, filename) => {
				if (eventType === 'change' && filename) {
					this.debounceRegenerate();
				}
			}
		);

		console.log('[CODEOWNERS.WATCHER.RG:STARTED] Watching TEAM.md for changes...');
	}

	// [CODEOWNERS.WATCHER.DEBOUNCE.RG:IMPLEMENTATION] Debounce regeneration to avoid rapid-fire updates
	private debounceRegenerate(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.regenerateCodeowners();
		}, this.debounceMs);
	}

	// [CODEOWNERS.WATCHER.REGENERATE.RG:IMPLEMENTATION] Regenerate CODEOWNERS file
	private async regenerateCodeowners(): Promise<void> {
		console.log('[CODEOWNERS.WATCHER.RG:EVENT] TEAM.md changed, regenerating CODEOWNERS...');

		try {
			// Regenerate CODEOWNERS
			execSync('bun run codeowners:generate', { 
				stdio: 'inherit',
				cwd: process.cwd(),
			});

			console.log('[CODEOWNERS.WATCHER.RG:SUCCESS] CODEOWNERS regenerated successfully');

			// Validate sync
			try {
				execSync('bun run codeowners:validate', { 
					stdio: 'pipe',
					cwd: process.cwd(),
				});
				console.log('[CODEOWNERS.WATCHER.RG:VALIDATION] CODEOWNERS validation passed');
			} catch (validationError) {
				console.warn('[CODEOWNERS.WATCHER.RG:WARNING] CODEOWNERS validation failed:', validationError);
			}

			// Verify team markers are still valid
			try {
				const result = await $`bun run team:info department:api`.quiet();
				if (result.exitCode === 0) {
					console.log('[CODEOWNERS.WATCHER.RG:VERIFICATION] Team info query successful');
				}
			} catch (verifyError) {
				console.warn('[CODEOWNERS.WATCHER.RG:WARNING] Team info verification failed:', verifyError);
			}
		} catch (error: any) {
			console.error('[CODEOWNERS.WATCHER.RG:ERROR] Sync failed:', error.message);
			
			// Alert team with high priority (if notify script exists)
			try {
				execSync('bun run notify:team --priority high --message "CODEOWNERS sync failed"', {
					stdio: 'pipe',
					cwd: process.cwd(),
				});
			} catch (notifyError) {
				// Notify script might not exist, that's okay
				console.warn('[CODEOWNERS.WATCHER.RG:WARNING] Could not send notification:', notifyError);
			}
		}
	}

	// [CODEOWNERS.WATCHER.STOP.RG:IMPLEMENTATION] Stop watching
	stop(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
			console.log('[CODEOWNERS.WATCHER.RG:STOPPED] Watcher stopped');
		}
	}
}

// [CODEOWNERS.WATCHER.MAIN.RG:IMPLEMENTATION] Main execution
if (import.meta.main) {
	const watcher = new CodeownersWatcher();
	watcher.start();

	// Handle graceful shutdown
	process.on('SIGINT', () => {
		console.log('\n[CODEOWNERS.WATCHER.RG:SHUTDOWN] Received SIGINT, stopping watcher...');
		watcher.stop();
		process.exit(0);
	});

	process.on('SIGTERM', () => {
		console.log('\n[CODEOWNERS.WATCHER.RG:SHUTDOWN] Received SIGTERM, stopping watcher...');
		watcher.stop();
		process.exit(0);
	});

	console.log('[CODEOWNERS.WATCHER.RG:READY] CODEOWNERS watcher daemon running. Press Ctrl+C to stop.');
}
