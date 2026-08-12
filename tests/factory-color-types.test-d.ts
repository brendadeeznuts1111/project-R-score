/**
 * Compile-only Factory color API contracts.
 *
 * `expectTypeOf` is a runtime no-op. TypeScript verifies these assertions with:
 *
 *   bun run check:factory-color:types
 *
 * @see https://bun.com/reference/bun/test/expectTypeOf
 * @see https://bun.com/docs/test/writing-tests#expecttypeof
 */
import { expectTypeOf } from 'bun:test';
import {
  COLOR_FORMATS,
  cachedColor,
  colorCacheStats,
  diagnoseColor,
  diagnoseColorCapabilities,
  generateColorGradient,
  generateColorPalette,
  mixColor,
  parseColor,
  parseColorTones,
  type ColorFormatResult,
  type ParsedColor,
} from '../lib/factory/color-diagnostics.ts';

expectTypeOf(COLOR_FORMATS).items.toBeString();

expectTypeOf(parseColor).returns.toEqualTypeOf<ParsedColor>();
expectTypeOf(cachedColor).returns.toEqualTypeOf<
  string | number | number[] | Record<string, number> | null
>();
expectTypeOf(colorCacheStats).returns.toEqualTypeOf<{
  size: number;
  hits: number;
  misses: number;
}>();

expectTypeOf(diagnoseColor).returns.toEqualTypeOf<{
  input: string;
  parsed: ParsedColor;
  formats: ColorFormatResult[];
  cache: { size: number; hits: number; misses: number };
}>();
expectTypeOf(diagnoseColorCapabilities).returns.items.toMatchObjectType<{
  feature: string;
  input: string;
  format: ColorFormatResult['format'];
  result: string;
  status: ColorFormatResult['status'];
}>();

expectTypeOf(mixColor).returns.toEqualTypeOf<string | null>();
expectTypeOf(parseColorTones).returns.toEqualTypeOf<number[] | null>();
expectTypeOf(generateColorPalette).returns.toEqualTypeOf<Array<{
  step: number;
  amount: number;
  color: string;
}> | null>();
expectTypeOf(generateColorGradient).returns.toEqualTypeOf<Array<{
  step: number;
  position: number;
  color: string | number | number[] | Record<string, number> | null;
  display: string;
}> | null>();

// @ts-expect-error — gradient format must be a Bun-supported ColorOutputFormat
generateColorGradient('#e06c75', '#2ecc71', { format: 'not-a-color-format' });
