// lib/polish/index.ts - Main Export
// ═══════════════════════════════════════════════════════════════════════════════
// Production-grade polish features: visual, error handling, onboarding, feedback
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Core Exports
// ─────────────────────────────────────────────────────────────────────────────

export { Runtime, ANSI, colors } from "./core/runtime.ts";
export { Logger, logger } from "./core/logger.ts";
export { storage, createStorage, type StorageAdapter } from "./core/storage.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type {
  RuntimeEnvironment,
  RuntimeCapabilities,
  ErrorSeverity,
  ErrorDefinition,
  ErrorContext,
  RecoveryStrategy,
  SpinnerOptions,
  ProgressBarOptions,
  TerminalAnimationOptions,
  TourStep,
  TourProgress,
  TourConfig,
  SoundType,
  HapticPattern,
  VisualFlashType,
  FeedbackOptions,
  EasterEgg,
  ConfettiOptions,
  TypewriterOptions,
  PolishConfig,
} from "./types.ts";

export { DEFAULT_POLISH_CONFIG } from "./types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Visual Components
// ─────────────────────────────────────────────────────────────────────────────

export {
  LoadingSpinner,
  SPINNER_FRAMES,
  withSpinner,
  runSteps,
  type SpinnerStyle,
  type Step,
} from "./visual/spinner.ts";

export {
  AnimatedProgressBar,
  progressIndicator,
  withProgress,
} from "./visual/progress.ts";

export {
  typeText,
  deleteText,
  typeSequence,
  rainbowText,
  fadeInText,
  pulseText,
  slideInText,
  countdown,
  matrixRain,
} from "./visual/terminal-animation.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Browser Components (React)
// ─────────────────────────────────────────────────────────────────────────────

export { HoverCard, useHoverCard, type HoverCardProps } from "./visual/browser/hover-card.tsx";
export { ToastProvider, useToast, type ToastProviderProps, type ToastData } from "./visual/browser/toast.tsx";
export { Confetti, useConfetti, fireConfetti, type ConfettiProps } from "./visual/browser/confetti.tsx";
export { injectPolishStyles, toastStyles, hoverCardStyles, confettiStyles } from "./visual/browser/styles.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────

export {
  EnhancedErrorHandler,
  errorHandler,
  handleError,
  handleErrorAsync,
  formatUserError,
} from "./error-handling/handler.ts";

export {
  ERROR_CODES,
  getErrorDefinition,
  getErrorByNumericCode,
  isCriticalError,
  isRecoverableError,
  type ErrorCode,
} from "./error-handling/codes.ts";

export {
  registerRecoveryStrategy,
  getRecoveryStrategy,
  attemptRecovery,
  suggestSolutions,
  getQuickActions,
  type RecoveryResult,
  type QuickAction,
} from "./error-handling/recovery.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────────────────────────────────────────

export { BaseTour, TourBuilder, createTour, registerTour, getTourConfig, listTours } from "./onboarding/tour.ts";
export { CLITour, createCLITour, WELCOME_TOUR, showWelcomeTour } from "./onboarding/cli-tour.ts";
export { ProgressTracker, progressTracker } from "./onboarding/progress-tracker.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Feedback
// ─────────────────────────────────────────────────────────────────────────────

export { audioManager, playSound, setAudioEnabled, setAudioVolume } from "./feedback/audio.ts";
export { hapticManager, triggerHaptic, setHapticEnabled, isHapticSupported } from "./feedback/haptic.ts";
export {
  flashCLI,
  flashElement,
  flashScreen,
  pulseElement,
  shakeElement,
  highlightElement,
  flash,
} from "./feedback/visual.ts";
export { FeedbackManager, feedbackManager, feedback, type FeedbackConfig } from "./feedback/manager.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Micro-interactions
// ─────────────────────────────────────────────────────────────────────────────

export {
  MicroInteractions,
  microInteractions,
  registerEasterEgg,
  triggerEasterEgg,
  registerBuiltInEasterEggs,
  InputSequenceTracker,
  celebrateCLI,
  showConfetti,
  showLoadingMessages,
  sparkleText,
  waveText,
  bounceText,
  showFireworks,
} from "./micro-interactions/index.ts";

// ─────────────────────────────────────────────────────────────────────────────
// System Integration
// ─────────────────────────────────────────────────────────────────────────────

export { SystemPolish, systemPolish, polish } from "./system/polish.ts";
export {
  loadConfig,
  saveConfig,
  getConfig,
  updateConfig,
  resetConfig,
  applyPreset,
  CONFIG_PRESETS,
  type ConfigPreset,
} from "./system/config.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────────────────────

export { polish as default } from "./system/polish.ts";
