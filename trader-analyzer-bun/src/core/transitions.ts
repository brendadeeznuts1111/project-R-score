/**
 * Odds Transition Manager
 * Smooth view transitions for odds updates using View Transitions API
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ODDS-TRANSITIONS@0.1.0;instance-id=ORCA-TRANSITIONS-001;version=0.1.0}][PROPERTIES:{core={value:"transitions";@root:"ROOT-CORE";@chain:["BP-VIEW-TRANSITIONS","BP-ODDS-UPDATES"];@version:"0.1.0"}}][CLASS:OddsTransitionManager][#REF:v-0.1.0.BP.ODDS.TRANSITIONS.1.0.A.1.1.ORCA.1.1]]
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Odds update data structure
 */
export interface OddsUpdate {
	/** Game identifier */
	gameId: string;
	/** Bookmaker identifier */
	bookmaker: string;
	/** New odds value */
	odds: number;
	/** Movement direction (optional) */
	movement?: "up" | "down" | "sideways";
	/** Previous odds value (optional) */
	previousOdds?: number;
	/** Timestamp of update */
	timestamp?: number;
}

/**
 * View transition options
 */
interface TransitionOptions {
	/** Transition duration in milliseconds */
	duration?: number;
	/** Enable movement indicators */
	showMovement?: boolean;
	/** Post-update delay for visual feedback */
	postUpdateDelay?: number;
}

// ═══════════════════════════════════════════════════════════════
// ODDS TRANSITION MANAGER
// ═══════════════════════════════════════════════════════════════

/**
 * Odds Transition Manager
 *
 * Manages smooth view transitions for odds updates using the View Transitions API.
 * Provides visual feedback for odds changes with movement indicators and animations.
 *
 * @example
 * ```typescript
 * const manager = new OddsTransitionManager();
 * await manager.executeGameUpdate(
 *   'game-123',
 *   [{ gameId: 'game-123', bookmaker: 'circa', odds: -110, movement: 'up' }],
 *   () => { /* update DOM *\/ }
 * );
 * ```
 */
export class OddsTransitionManager {
	private readonly DURATION: number;
	private readonly POST_UPDATE_DELAY: number;
	private readonly SHOW_MOVEMENT: boolean;

	/**
	 * Creates a new Odds Transition Manager
	 *
	 * @param options - Transition configuration options
	 */
	constructor(options: TransitionOptions = {}) {
		this.DURATION = options.duration ?? 300;
		this.POST_UPDATE_DELAY = options.postUpdateDelay ?? 50;
		this.SHOW_MOVEMENT = options.showMovement ?? true;
	}

	/**
	 * Execute game update with smooth view transition
	 *
	 * Checks for View Transitions API support and falls back to immediate update
	 * if not available. Prepares cells, executes transition, and cleans up.
	 *
	 * @param gameId - Game identifier
	 * @param updates - Array of odds updates
	 * @param updateCallback - Callback to execute DOM updates
	 * @returns Promise that resolves when transition completes
	 *
	 * @example
	 * ```typescript
	 * await manager.executeGameUpdate('game-123', updates, () => {
	 *   // Update odds in DOM
	 *   updateOddsInDOM(updates);
	 * });
	 * ```
	 */
	async executeGameUpdate(
		gameId: string,
		updates: OddsUpdate[],
		updateCallback: () => void,
	): Promise<void> {
		// Check for view transitions support
		if (!document.startViewTransition) {
			// Fallback: execute callback immediately
			updateCallback();
			return;
		}

		// Prepare cells with unique view-transition names
		this.prepareCells(gameId, updates);

		// Start view transition
		const transition = document.startViewTransition(async () => {
			updateCallback();
			await this.postUpdateEffects(updates);
		});

		// Wait for transition to complete
		await transition.finished;

		// Cleanup transition state
		this.cleanup(updates);
	}

	/**
	 * Prepare cells for view transition
	 *
	 * Sets unique view-transition names and pre-transition classes
	 * for each cell that will be updated.
	 *
	 * @param gameId - Game identifier
	 * @param updates - Array of odds updates
	 */
	private prepareCells(gameId: string, updates: OddsUpdate[]): void {
		for (const update of updates) {
			const cell = this.getCellElement(gameId, update.bookmaker);
			if (!cell) continue;

			// Set unique name for each cell
			cell.style.viewTransitionName = `odds-${gameId}-${update.bookmaker}`;

			// Add pre-transition classes
			cell.classList.add("odds-updating");

			// Movement direction indicator
			if (this.SHOW_MOVEMENT && update.movement) {
				cell.dataset.movement = update.movement;
			}
		}
	}

	/**
	 * Post-update visual effects
	 *
	 * Adds visual feedback classes after DOM update completes.
	 * Includes a brief delay for better visual perception.
	 *
	 * @param updates - Array of odds updates
	 */
	private async postUpdateEffects(updates: OddsUpdate[]): Promise<void> {
		// Brief delay for visual feedback
		await new Promise((resolve) => setTimeout(resolve, this.POST_UPDATE_DELAY));

		for (const update of updates) {
			const cell = this.getCellElement(update.gameId, update.bookmaker);
			if (cell) {
				cell.classList.add("odds-updated");
			}
		}
	}

	/**
	 * Cleanup transition state
	 *
	 * Removes transition classes and view-transition names,
	 * and clears movement indicators.
	 *
	 * @param updates - Array of odds updates
	 */
	private cleanup(updates: OddsUpdate[]): void {
		for (const update of updates) {
			const cell = this.getCellElement(update.gameId, update.bookmaker);
			if (!cell) continue;

			// Remove transition classes
			cell.classList.remove("odds-updating", "odds-updated");

			// Clear view-transition name
			cell.style.viewTransitionName = "";

			// Remove movement indicator
			if (cell.dataset.movement) {
				delete cell.dataset.movement;
			}
		}
	}

	/**
	 * Get cell element by game ID and bookmaker
	 *
	 * @param gameId - Game identifier
	 * @param bookmaker - Bookmaker identifier
	 * @returns HTMLElement or null if not found
	 */
	private getCellElement(
		gameId: string,
		bookmaker: string,
	): HTMLElement | null {
		return document.getElementById(`cell-${gameId}-${bookmaker}`);
	}

	/**
	 * Check if View Transitions API is supported
	 *
	 * @returns true if supported, false otherwise
	 */
	static isSupported(): boolean {
		return (
			typeof document !== "undefined" &&
			typeof document.startViewTransition === "function"
		);
	}

	/**
	 * Get transition duration
	 *
	 * @returns Duration in milliseconds
	 */
	getDuration(): number {
		return this.DURATION;
	}
}
