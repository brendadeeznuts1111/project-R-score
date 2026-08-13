// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color auto terminal format
import {
  AUTO_TERMINAL_COLOR_FORMAT,
  brandHex,
  brandRgb,
  colors,
  formatTerminal,
  TERMINAL_COLOR_FORMATS,
} from '../src/index.ts';

console.log(`Bun.color terminal mode: ${AUTO_TERMINAL_COLOR_FORMAT}`);
console.log(colors.green('✅ Success'));
console.log(colors.red('❌ Failure'));
console.log(colors.yellow('⚠️ Warning'));
console.log(colors.brand('◆ Brand'));
console.log(formatTerminal('256-color serialization sample', brandHex, '256'));
console.log(
  JSON.stringify({ brandHex, brandRgb, terminalFormats: TERMINAL_COLOR_FORMATS }, null, 2)
);
