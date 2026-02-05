// lib/polish/types.ts - Shared TypeScript interfaces for polish system
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Runtime Types
// ─────────────────────────────────────────────────────────────────────────────

export type RuntimeEnvironment = "bun" | "node" | "browser" | "unknown";

export interface RuntimeCapabilities {
  isBun: boolean;
  isBrowser: boolean;
  isNode: boolean;
  supportsTTY: boolean;
  supportsHaptic: boolean;
  supportsAudio: boolean;
  supportsColors: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling Types
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface ErrorDefinition {
  code: number;
  severity: ErrorSeverity;
  recoverable: boolean;
  message: string;
  solutions?: string[];
}

export interface ErrorContext {
  operation: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  stack?: string;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  canRecover: (error: Error, context: ErrorContext) => boolean;
  recover: (error: Error, context: ErrorContext) => Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SpinnerOptions {
  text?: string;
  color?: string;
  frames?: string[];
  interval?: number;
}

export interface ProgressBarOptions {
  width?: number;
  complete?: string;
  incomplete?: string;
  showPercentage?: boolean;
  showETA?: boolean;
  gradient?: boolean;
}

export interface TerminalAnimationOptions {
  speed?: number;
  cursor?: string;
  showCursor?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for browser, command for CLI
  action?: () => void | Promise<void>;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

export interface TourProgress {
  tourId: string;
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface TourConfig {
  id: string;
  steps: TourStep[];
  persistProgress?: boolean;
  skipable?: boolean;
  onComplete?: () => void | Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback Types
// ─────────────────────────────────────────────────────────────────────────────

export type SoundType = "success" | "error" | "warning" | "click" | "notification";
export type HapticPattern = "light" | "medium" | "heavy" | "double" | "success" | "error";
export type VisualFlashType = "success" | "error" | "warning" | "info";

export interface FeedbackOptions {
  audio?: boolean;
  haptic?: boolean;
  visual?: boolean;
}

export interface AudioConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-interactions Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EasterEgg {
  trigger: string | RegExp;
  name: string;
  action: () => void | Promise<void>;
  discovered?: boolean;
}

export interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  colors?: string[];
  duration?: number;
}

export interface TypewriterOptions {
  speed?: number;
  cursor?: string;
  deleteSpeed?: number;
  pauseAfter?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color Processing Types (Enterprise Integration)
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorInfo {
  r: number;
  g: number;
  b: number;
  a?: number;
  format: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | "named";
  aiConfidence: number; // 0-1, AI confidence score
  processingTime: number; // milliseconds
}

export interface ColorSecurity {
  hmacSha512: string; // Bundle integrity signature
  aesGcmEncrypted: boolean; // Whether sensitive data is encrypted
  securityLevel: "public" | "internal" | "confidential" | "restricted";
}

export interface ColorDeployment {
  platform: "bun" | "cloudflare" | "node" | "browser";
  bundleSize: number; // bytes
  bytecodeOptimized: boolean;
  zeroDiskKV: boolean;
  durableObjects: boolean;
}

export interface ColorArtifact {
  path: string;
  size: number;
  kind: string;
  hash: string | null;
  loader: string;
  colorInfo: ColorInfo;
  security: ColorSecurity;
  deployment: ColorDeployment;
}

export interface ColorBuildConfig {
  color: {
    aiAdaptive: boolean;
    performanceTarget: number; // 8-500x multiplier
    security: {
      enableHmacSha512: boolean;
      enableAesGcm: boolean;
      secretService: string;
      secretName: string;
    };
    deployment: {
      platforms: ("bun" | "cloudflare" | "node" | "browser")[];
      zeroDiskKV: boolean;
      durableObjects: boolean;
    };
    monitoring: {
      enableP99Latency: boolean;
      goldenMatrixTarget: number; // 7.2ms default
      performanceThresholds: {
        warning: number;
        critical: number;
      };
    };
  };
}

export interface ColorBuildResult {
  success: boolean;
  outputs: ColorArtifact[];
  logs: string[];
  metafile: any | null;
  artifacts: ColorArtifact[];
  metrics: {
    totalTime: number;
    averageProcessingTime: number;
    performanceMultiplier: number;
    aiConfidenceDistribution: { min: number; max: number; avg: number };
    p99Latency?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// System Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface PolishConfig {
  enabled: boolean;
  debug?: boolean;
  audio: {
    enabled: boolean;
    volume: number;
  };
  haptic: {
    enabled: boolean;
  };
  visual: {
    animations: boolean;
    colors: boolean;
    spinnerStyle: "dots" | "line" | "arrow" | "bounce";
  };
  onboarding: {
    enabled: boolean;
    showOnFirstRun: boolean;
    persistProgress: boolean;
  };
  easterEggs: {
    enabled: boolean;
  };
  color?: {
    aiAdaptive: boolean;
    performanceTarget: number;
    security: {
      enableHmacSha512: boolean;
      enableAesGcm: boolean;
    };
  };
}

export const DEFAULT_POLISH_CONFIG: PolishConfig = {
  enabled: true,
  debug: false,
  audio: {
    enabled: true,
    volume: 0.5,
  },
  haptic: {
    enabled: true,
  },
  visual: {
    animations: true,
    colors: true,
    spinnerStyle: "dots",
  },
  onboarding: {
    enabled: true,
    showOnFirstRun: true,
    persistProgress: true,
  },
  easterEggs: {
    enabled: true,
  },
};
