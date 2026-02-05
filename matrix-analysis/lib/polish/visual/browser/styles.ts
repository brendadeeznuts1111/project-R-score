// lib/polish/visual/browser/styles.ts - CSS-in-JS polish styles
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// CSS Variables (inject into document head)
// ─────────────────────────────────────────────────────────────────────────────

export const POLISH_CSS_VARS = `
:root {
  --polish-success: #10b981;
  --polish-error: #ef4444;
  --polish-warning: #f59e0b;
  --polish-info: #3b82f6;
  --polish-primary: #8b5cf6;

  --polish-bg: #1a1a2e;
  --polish-bg-elevated: #16213e;
  --polish-border: #2a2a4a;
  --polish-text: #e0e0e0;
  --polish-text-muted: #9ca3af;

  --polish-radius: 8px;
  --polish-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --polish-shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.5);

  --polish-transition-fast: 150ms ease;
  --polish-transition: 250ms ease;
  --polish-transition-slow: 400ms ease;
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Keyframe Animations
// ─────────────────────────────────────────────────────────────────────────────

export const POLISH_KEYFRAMES = `
@keyframes polish-fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes polish-fade-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
}

@keyframes polish-slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes polish-slide-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes polish-scale-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes polish-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

@keyframes polish-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes polish-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes polish-confetti-fall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

@keyframes polish-flash-success {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(16, 185, 129, 0.2); }
}

@keyframes polish-flash-error {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(239, 68, 68, 0.2); }
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Component Styles
// ─────────────────────────────────────────────────────────────────────────────

export const toastStyles = {
  container: {
    position: "fixed" as const,
    top: "20px",
    right: "20px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    pointerEvents: "none" as const,
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "var(--polish-radius)",
    background: "var(--polish-bg-elevated)",
    border: "1px solid var(--polish-border)",
    boxShadow: "var(--polish-shadow)",
    color: "var(--polish-text)",
    pointerEvents: "auto" as const,
    animation: "polish-slide-down var(--polish-transition) ease",
  },
  icon: {
    width: "20px",
    height: "20px",
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: 600,
    marginBottom: "2px",
  },
  message: {
    fontSize: "0.875rem",
    color: "var(--polish-text-muted)",
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "var(--polish-text-muted)",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
  },
};

export const hoverCardStyles = {
  card: {
    position: "relative" as const,
    borderRadius: "var(--polish-radius)",
    background: "var(--polish-bg-elevated)",
    border: "1px solid var(--polish-border)",
    overflow: "hidden",
    transition: "transform var(--polish-transition), box-shadow var(--polish-transition)",
    transformStyle: "preserve-3d" as const,
  },
  overlay: {
    position: "absolute" as const,
    inset: 0,
    background: "radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.1) 0%, transparent 50%)",
    pointerEvents: "none" as const,
    opacity: 0,
    transition: "opacity var(--polish-transition)",
  },
};

export const confettiStyles = {
  container: {
    position: "fixed" as const,
    inset: 0,
    pointerEvents: "none" as const,
    zIndex: 10000,
    overflow: "hidden",
  },
  particle: {
    position: "absolute" as const,
    width: "10px",
    height: "10px",
    animation: "polish-confetti-fall 3s linear forwards",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Style Injection
// ─────────────────────────────────────────────────────────────────────────────

let stylesInjected = false;

export function injectPolishStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;

  const styleEl = document.createElement("style");
  styleEl.id = "polish-styles";
  styleEl.textContent = POLISH_CSS_VARS + POLISH_KEYFRAMES;
  document.head.appendChild(styleEl);

  stylesInjected = true;
}
