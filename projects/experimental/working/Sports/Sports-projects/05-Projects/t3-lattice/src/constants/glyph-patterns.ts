/**
 * Quantum Glyph Registry
 * Pattern matching for fractal dimension classification
 */

import type { GlyphPattern } from '../types';

export const QUANTUM_GLYPHS: GlyphPattern[] = [
  {
    pattern: "▵⟂⥂",
    name: "STRUCTURAL_DRIFT_SUPPRESSOR",
    unicode: ["U+25B5", "U+27C2", "U+2942"],
    description: "Suppresses noise in FD 1.2-1.9 range (stable trends)",
    fdRange: [1.0, 1.6],
    useCase: "Fade public on spreads"
  },
  {
    pattern: "⥂⟂(▵⟜⟳)",
    name: "DEPENDENCY_COHERENCE_GUARD",
    unicode: ["U+2942", "U+27C2", "U+0028", "U+25B5", "U+27DC", "U+27F3", "U+0029"],
    description: "Guards against injection in FD 1.4-2.0 (mean-reversion)",
    fdRange: [1.4, 2.0],
    useCase: "Under bets on volatile totals"
  },
  {
    pattern: "⟳⟲⟜(▵⊗⥂)",
    name: "PHASE_LOCKED_RESONANCE_LOOP",
    unicode: ["U+27F3", "U+27F2", "U+27DC", "U+0028", "U+25B5", "U+2297", "U+2942", "U+0029"],
    description: "Phase-locks high roughness regimes FD 1.8-2.3",
    fdRange: [1.8, 2.3],
    useCase: "Black swan value plays"
  },
  {
    pattern: "(▵⊗⥂)⟂⟳",
    name: "STRUCTURAL_DYNAMIC_COUPLING_GUARD",
    unicode: ["U+0028", "U+25B5", "U+2297", "U+2942", "U+0029", "U+27C2", "U+27F3"],
    description: "Coupling guard for balanced FD 1.5-2.2",
    fdRange: [1.5, 2.2],
    useCase: "Halves/quarters arbitrage"
  },
  {
    pattern: "⊟",
    name: "QUANTUM_ROLLBACK_TRIGGER",
    unicode: ["U+229F"],
    description: "Emergency halt for FD >2.3 chaotic regimes",
    fdRange: [2.3, 3.0],
    useCase: "Manual review trigger"
  }
];

/**
 * Find matching glyph pattern for given FD value
 */
export function findGlyphForFD(fd: number): GlyphPattern | undefined {
  return QUANTUM_GLYPHS.find(g => fd >= g.fdRange[0] && fd <= g.fdRange[1]);
}

/**
 * Validate glyph pattern against FD value
 */
export function validateGlyph(pattern: string, fd: number): boolean {
  const expected = findGlyphForFD(fd);
  return expected ? pattern === expected.pattern : false;
}

/**
 * Get glyph name by pattern
 */
export function getGlyphName(pattern: string): string {
  const glyph = QUANTUM_GLYPHS.find(g => g.pattern === pattern);
  return glyph?.name || 'UNKNOWN';
}
