/**
 * @dynamic-spy/kit - Colors Module
 *
 * Deep ANSI color system for arb visualization
 */

// Core color types and BRIGHT palette
export {
	// Types
	type ArbColor,
	type ColorStyle,

	// Constants
	ESC,
	RESET,
	STYLE,
	CURSOR,
	SCREEN,

	// Escape sequence builders
	fg256,
	bg256,
	fgRGB,
	bgRGB,

	// Color factory
	toArbColor,

	// Style utilities
	style,
	applyStyle,
	strip,
	width,
	pad,
	truncate,

	// Palettes
	BRIGHT,
	STANDARD,
	GREENS,
	REDS,
	YELLOWS,
	CYANS,
	BLUES,
	MAGENTAS,
	GRAYS,
	PALETTE_256,
	COLORS,
} from './bright-ansi';

// Semantic arb colors
export {
	// Semantic color maps
	EDGE,
	BOOK,
	STATUS,
	ARROWS,
	BOX,
	BLOCKS,

	// Semantic color functions
	edgeColor,
	bookColor,
	latencyColor,
	confidenceColor,
	volumeColor,

	// Formatters
	formatEdge,
	formatMoney,
	formatOdds,
	formatLatency,
	formatStatus,
	formatSteam,
	formatBook,

	// Drawing utilities
	sparkline,
	hline,
	box,
	progressBar,
	movementArrow,

	// Binary protocol
	type ColorFlags,
	encodeColorFlags,
	decodeColorFlags,
	packColorToBytes,
	unpackColorFromBytes,
	ColorDataView,
} from './arb-colors';

// Gradient generators
export type { Gradient, GradientStop, GradientBuilder } from './gradients';

export {
	// Preset gradients
	EDGE_GRADIENT,
	LATENCY_GRADIENT,
	VOLUME_GRADIENT,
	CONFIDENCE_GRADIENT,
	HEAT_GRADIENT,
	AGE_GRADIENT,

	// Gradient functions
	edgeGradient,
	latencyGradient,
	volumeGradient,
	confidenceGradient,
	heatGradient,
	ageGradient,

	// Custom gradient builder
	gradient,
	createGradient,
	interpolateColors,

	// Rendering
	renderGradientBar,
	renderGradientValue,
	renderGradientLegend,
	gradientSparkline,
	gradientBars,

	// Utilities
	lerp,
	clamp,
} from './gradients';
