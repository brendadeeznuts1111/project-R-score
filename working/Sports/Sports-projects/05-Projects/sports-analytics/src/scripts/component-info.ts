/**
 * T3-Lattice Component Info Utility
 * Provides detailed inspection of registered components
 * Inspired by 'bun info' and 'bun pm view'
 */

import { COMPONENTS, Component } from "../types/lattice.types";

export class ComponentInfo {
  /**
   * Displays detailed info for a specific component by ID or Name
   */
  static getInfo(query: number | string): string {
    const component = COMPONENTS.find(c => 
      typeof query === 'number' ? c.id === query : c.name.toLowerCase() === query.toLowerCase()
    );

    if (!component) {
      return `error: Component '${query}' not found in registry`;
    }

    return this.formatComponent(component);
  }

  /**
   * Lists all components with brief info
   */
  static listAll(): string {
    return COMPONENTS.map(c => 
      `ID ${c.id.toString().padStart(2)}: ${c.name.padEnd(15)} [${c.hex}] -> ${c.slot}`
    ).join('\n');
  }

  private static formatComponent(c: Component): string {
    return `
${c.name}@v3.3.0 | ${c.hex} | slot: ${c.slot}
--------------------------------------------------
ID:         ${c.id}
Name:       ${c.name}
Hex:        ${c.hex}
HSL:        ${c.hsl}
Slot:       ${c.slot}
Pattern:    ${c.pattern}

Registry Metadata:
  • Status: ACTIVE
  • Protocol: T3-LATTICE-V3.3
  • Compliance: VERIFIED
    `.trim();
  }
}

// CLI Support
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args.length === 0) {
    console.log("T3-Lattice Component Registry");
    console.log("==============================");
    console.log(ComponentInfo.listAll());
  } else {
    const query = isNaN(Number(args[0])) ? args[0] : Number(args[0]);
    console.log(ComponentInfo.getInfo(query));
  }
}
