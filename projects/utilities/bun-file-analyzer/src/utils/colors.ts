export const Palette = {
  frontend: { primary: "#3b82f6", stroke: "#2563eb", gradient: "rgba(59, 130, 246, 0.1)" },
  api: { primary: "#22c55e", stroke: "#16a34a", gradient: "rgba(34, 197, 94, 0.1)" },
  processing: { primary: "#f97316", stroke: "#ea580c", gradient: "rgba(249, 115, 22, 0.1)" },
  storage: { primary: "#a855f7", stroke: "#9333ea", gradient: "rgba(168, 85, 247, 0.1)" },
  security: { primary: "#ef4444", stroke: "#dc2620", gradient: "rgba(239, 68, 68, 0.1)" },
  performance: { primary: "#0ea5e9", stroke: "#0284c7", gradient: "rgba(14, 165, 233, 0.1)" },
  error: { primary: "#f59e0b", stroke: "#d97706", gradient: "rgba(245, 158, 11, 0.1)" },
} as const;

export function createMermaidTheme() {
  return Object.entries(Palette)
    .map(([layer, colors]) => 
      `classDef ${layer} fill:${colors.primary},stroke:${colors.stroke},stroke-width:2px,color:#fff`
    )
    .join("\n");
}

export function createTailwindConfig() {
  return {
    theme: {
      extend: {
        colors: Object.fromEntries(
          Object.entries(Palette).map(([layer, colors]) => [
            layer,
            { 500: colors.primary, 600: colors.stroke, 400: colors.gradient },
          ])
        ),
      },
    },
  };
}
