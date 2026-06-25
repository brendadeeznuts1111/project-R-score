# Polish System Library

Production-grade polish features for CLI and browser applications. Runtime-adaptive with automatic feature detection.

## Installation

```typescript
import { polish, SystemPolish, Runtime } from "../lib/polish";
```

## Quick Start

```typescript
// Use the singleton for common operations
await polish.withSpinner("Loading data", async () => {
  return await fetchData();
});

// Or create your own instance
const system = new SystemPolish();
const result = await system.withProgress(items, async (item) => {
  await processItem(item);
});
```

---

## Public API

### Core Types

#### Enums & Literal Types

| Type | Definition |
|------|------------|
| `RuntimeEnvironment` | `"bun" \| "node" \| "browser"` |
| `ErrorSeverity` | `"info" \| "warning" \| "error" \| "critical"` |
| `SoundType` | `"success" \| "error" \| "warning" \| "click" \| "complete"` |
| `HapticPattern` | `"light" \| "medium" \| "heavy" \| "success" \| "error"` |

#### Configuration Interfaces

| Interface | Key Properties |
|-----------|----------------|
| `PolishConfig` | `audio`, `haptic`, `visual`, `easterEggs`, `debug` |
| `AudioConfig` | `enabled: boolean`, `volume: number` |
| `HapticConfig` | `enabled: boolean`, `intensity: number` |
| `VisualConfig` | `animations: boolean`, `spinnerStyle`, `progressStyle` |
| `EasterEggConfig` | `enabled: boolean`, `discovered: string[]` |

#### Error Handling

| Interface | Key Properties |
|-----------|----------------|
| `ErrorDefinition` | `code: number`, `message`, `severity`, `recoverable`, `solutions?` |
| `ErrorContext` | `operation: string`, `timestamp: Date`, `metadata?` |
| `RecoveryStrategy` | `name`, `description`, `canRecover()`, `recover()` |

#### Visual Components

| Interface | Key Properties |
|-----------|----------------|
| `SpinnerOptions` | `text?`, `color?`, `frames?`, `interval?` |
| `ProgressBarOptions` | `width?`, `complete?`, `incomplete?`, `showPercentage?`, `showETA?`, `gradient?` |
| `ConfettiOptions` | `particleCount?`, `spread?`, `origin?`, `colors?` |

#### Onboarding & Easter Eggs

| Interface | Key Properties |
|-----------|----------------|
| `TourStep` | `id`, `title`, `content`, `target?`, `action?` |
| `TourProgress` | `currentStep`, `totalSteps`, `completed`, `skipped` |
| `EasterEgg` | `trigger`, `name`, `description?`, `action()`, `discovered?` |

---

### Classes

#### `SystemPolish`

Main integration class combining all polish features.

```typescript
const system = new SystemPolish();

// Properties
system.spinner      // LoadingSpinner instance
system.progress     // AnimatedProgressBar instance
system.errors       // EnhancedErrorHandler instance
system.feedback     // FeedbackManager instance
system.interactions // MicroInteractions instance

// Methods
await system.withSpinner(message, operation);  // Returns result or null
await system.withProgress(items, processor);   // Returns true/false
system.safe(fn, fallback);                     // Sync error handling
await system.safeAsync(fn, fallback);          // Async error handling
```

#### `LoadingSpinner`

Animated CLI spinner with graceful TTY fallback.

```typescript
const spinner = new LoadingSpinner({ text: "Loading...", color: "cyan" });
spinner.start("Processing");
spinner.update("Still working...");
spinner.succeed("Done!");
// or
spinner.fail("Failed");
```

#### `AnimatedProgressBar`

Progress bar with gradient colors and ETA calculation.

```typescript
const bar = new AnimatedProgressBar({ width: 40, showETA: true });
bar.start(100, "Downloading");
bar.update(50);
bar.increment(10);
bar.complete("Download finished");
```

#### `EnhancedErrorHandler`

Error handling that returns fallbacks instead of throwing.

```typescript
const handler = new EnhancedErrorHandler({ silent: false });

// Sync
const result = handler.handle(() => riskyOperation(), defaultValue);

// Async
const data = await handler.handleAsync(() => fetchData(), null);

// Wrap functions
const safeFn = handler.wrap(riskyFn, fallback);
const safeAsyncFn = handler.wrapAsync(riskyAsyncFn, fallback);
```

#### `FeedbackManager`

Multi-modal feedback (audio, haptic, visual).

```typescript
const feedback = new FeedbackManager();
await feedback.init();

feedback.playSound("success");
feedback.triggerHaptic("light");
feedback.flashSuccess();
feedback.flashError();
```

#### `OnboardingTour`

Interactive guided tours for CLI and browser.

```typescript
const tour = new OnboardingTour("welcome-tour");
tour.addStep({ id: "step1", title: "Welcome", content: "Let's get started" });
tour.addStep({ id: "step2", title: "Features", content: "Here are the features" });

await tour.start();
tour.getProgress(); // { currentStep: 0, totalSteps: 2, completed: false, skipped: false }
```

#### `MicroInteractions`

Animations and easter eggs.

```typescript
const micro = new MicroInteractions();
await micro.init();

await micro.typeText("Hello, world!");
await micro.rainbowText("Colorful!");
micro.celebrate("Great job!");
micro.showConfetti();
micro.showFireworks();

// Easter eggs
micro.registerEasterEgg({
  trigger: "secret",
  name: "Secret Feature",
  action: async () => console.log("You found it!"),
});
```

---

### Standalone Functions

#### Visual

```typescript
// Simple progress indicator (returns string)
const bar = progressIndicator(50, 100, 20); // "[██████████░░░░░░░░░░]  50%"

// Async iteration with progress
for await (const item of withProgress(items, "Processing")) {
  await process(item);
}
```

#### Error Handling

```typescript
import {
  formatUserError,
  getErrorDefinition,
  getErrorByNumericCode,
  isCriticalError,
  isRecoverableError,
  suggestSolutions,
} from "../lib/polish";

// Format errors for users
const message = formatUserError(error, "During save");

// Error code lookup
const def = getErrorDefinition("CONFIG_MISSING");     // By name
const def2 = getErrorByNumericCode(1001);             // By code

// Error classification
isCriticalError("DB_CONNECTION_FAILED");  // true
isRecoverableError("NETWORK_TIMEOUT");    // true

// Get recovery suggestions
const solutions = suggestSolutions(error, { operation: "fetch", timestamp: new Date() });
```

#### Configuration

```typescript
import { loadConfig, saveConfig, applyPreset, resetConfig, CONFIG_PRESETS } from "../lib/polish";

const config = await loadConfig();
await saveConfig({ audio: { enabled: false, volume: 0 } });
const preset = applyPreset("minimal");  // "full" | "minimal" | "silent" | "accessible" | "demo"
await resetConfig();
```

#### Easter Eggs

```typescript
import {
  registerEasterEgg,
  triggerEasterEgg,
  checkForEasterEgg,
  registerBuiltInEasterEggs,
  getDiscoveredCount,
  getTotalCount,
  getDiscoveryProgress,
} from "../lib/polish";

registerBuiltInEasterEggs();
registerEasterEgg({ trigger: "custom", name: "Custom Egg", action: async () => {} });

const egg = checkForEasterEgg("custom");
if (egg) await triggerEasterEgg("custom");

console.log(getDiscoveryProgress()); // "2/10"
```

#### Animations

```typescript
import {
  celebrateCLI,
  showLoadingMessages,
  sparkleText,
  waveText,
  bounceText,
  showFireworks,
} from "../lib/polish";

await celebrateCLI("Success!", 2000);
await showLoadingMessages(3, 1500);
await sparkleText("Magical text", 2000);
await waveText("Wave hello", 2);
await bounceText("Bounce!", 3);
await showFireworks(2);
```

---

### Singletons

```typescript
import { polish, microInteractions, Runtime, ANSI, colors } from "../lib/polish";

// Pre-configured SystemPolish instance
await polish.withSpinner("Loading", async () => fetchData());

// Pre-configured MicroInteractions instance
microInteractions.celebrate("Done!");

// Runtime detection
Runtime.isBun;           // true if running in Bun
Runtime.isBrowser;       // true if running in browser
Runtime.supportsTTY;     // true if terminal supports TTY
Runtime.supportsColors;  // true if terminal supports colors

// ANSI escape codes
console.log(ANSI.clearLine + ANSI.cursorUp(1));
console.log(ANSI.hideCursor + "..." + ANSI.showCursor);

// Color functions
console.log(colors.success("Done!"));
console.log(colors.error("Failed"));
console.log(colors.warning("Warning"));
console.log(colors.highlight("Important"));
console.log(colors.dim("Subtle"));
```

---

## Error Codes

| Range | Category | Examples |
|-------|----------|----------|
| 1xxx | Configuration | `CONFIG_MISSING` (1001), `CONFIG_INVALID` (1002) |
| 2xxx | Database | `DB_CONNECTION_FAILED` (2001), `DB_QUERY_FAILED` (2002) |
| 3xxx | Network | `NETWORK_TIMEOUT` (3001), `API_ERROR` (3002) |
| 4xxx | File System | `FILE_NOT_FOUND` (4001), `FILE_PERMISSION_DENIED` (4002) |
| 5xxx | Authentication | `AUTH_REQUIRED` (5001), `AUTH_INVALID` (5002) |

---

## Configuration Presets

| Preset | Description |
|--------|-------------|
| `full` | All features enabled (audio, haptic, animations) |
| `minimal` | Visual only, no audio/haptic |
| `silent` | No audio, no haptic, minimal visual |
| `accessible` | Reduced motion, audio cues enabled |
| `demo` | Debug mode, easter eggs enabled |

---

## Testing

```bash
bun test lib/polish/test/
```

---

## Architecture

```text
lib/polish/
├── index.ts                 # Main exports
├── types.ts                 # TypeScript interfaces
├── core/
│   └── runtime.ts           # Runtime detection, ANSI, colors
├── visual/
│   ├── spinner.ts           # LoadingSpinner
│   └── progress.ts          # AnimatedProgressBar
├── error-handling/
│   ├── handler.ts           # EnhancedErrorHandler
│   ├── codes.ts             # Error code registry
│   └── recovery.ts          # Recovery strategies
├── onboarding/
│   └── tour.ts              # OnboardingTour
├── feedback/
│   └── manager.ts           # FeedbackManager
├── micro-interactions/
│   ├── index.ts             # MicroInteractions class
│   ├── easter-eggs.ts       # Easter egg registry
│   └── animations.ts        # Animation utilities
└── system/
    ├── polish.ts            # SystemPolish integration
    └── config.ts            # Configuration management
```
