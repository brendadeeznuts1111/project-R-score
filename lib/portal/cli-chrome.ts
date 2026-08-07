// @see https://bun.com/docs/runtime/color — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/environment-variables#configuring-bun — NO_COLOR / FORCE_COLOR
/**
 * Portal CLI chrome — **compat re-export** of [`lib/console`](../console/README.md).
 *
 * Prefer new code:
 *   `import { tones, frameBlock, kvLines, … } from '../console/index.ts'`
 * or the legacy facade `lib/console-depth.ts`.
 *
 * Implementation SSOT: lib/console/{color,layout,chrome}.ts
 */
export {
  tones as cliTone,
  shouldColor,
  colorize,
  displayWidth,
  padDisplay,
  truncateDisplay,
  truncateWidth,
  padEndWidth,
  fitVisible,
  kvLines,
  columnTable,
  frameBlock,
  msFromNs,
  formatIndexedCards,
  type IndexedCard,
} from '../console/index.ts';
