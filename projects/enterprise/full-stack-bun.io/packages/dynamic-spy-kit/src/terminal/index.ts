/**
 * @dynamic-spy/kit - Terminal Module
 *
 * ANSI terminal rendering and arb display components
 */

// Low-level ANSI renderer
export {
	// Terminal info
	type TerminalSize,
	getTerminalSize,
	isTTY,

	// Output
	write,
	writeLine,
	flush,

	// Cursor control
	cursor,

	// Screen control
	screen,

	// Text styling
	colorize,
	bgColorize,
	bold,
	dim,
	italic,
	underline,
	blink,
	reverse,
	strike,
	styled,

	// Table rendering
	type TableColumn,
	type TableOptions,
	renderTable,

	// Progress indicators
	progressBar,
	SPINNERS,
	createSpinner,

	// Animation
	type AnimationFrame,
	renderFrame,
	pulse,
	flash,

	// Layout
	divider,
	header,
	sectionBox,

	// Live rendering
	LiveRenderer,
} from './ansi-renderer';

// Arb-specific formatters
export {
	// Types
	type ArbOpportunity,
	type DashboardStats,

	// Formatters
	formatArbCompact,
	formatArbDetailed,
	formatArbTable,
	formatDashboardHeader,

	// Dashboard
	ArbDashboard,

	// Binary integration
	getArbColorFromBinary,
	setArbColorInBinary,
} from './arb-formatter';
