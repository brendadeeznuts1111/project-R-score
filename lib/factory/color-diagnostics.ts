// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/color#bundle-time-client-side-color-formatting — Bun.color macro
import { COLOR_OUTPUT_FORMATS, type ColorOutputFormat } from '../constants/color-constants.ts';

export const COLOR_FORMATS = Object.values(COLOR_OUTPUT_FORMATS);

type ColorResult = string | number | number[] | Record<string, number> | null;
type ConcreteRgba = { r: number; g: number; b: number; a: number };

export type ParsedColor =
  | { kind: 'concrete'; rgba: ConcreteRgba }
  | { kind: 'symbolic'; value: string }
  | { kind: 'invalid' };

export interface ColorFormatResult {
  format: ColorOutputFormat;
  value: ColorResult;
  display: string;
  status: 'ok' | 'symbolic' | 'terminal-disabled' | 'unsupported';
}

const CACHE_LIMIT = 256;
const colorCache = new Map<string, ColorResult>();
let cacheHits = 0;
let cacheMisses = 0;

const callBunColor = Bun.color as (
  input: Bun.ColorInput,
  outputFormat: ColorOutputFormat
) => ColorResult;

function inputKey(input: Bun.ColorInput): string {
  if (typeof input === 'string' || typeof input === 'number') return `${typeof input}:${input}`;
  if (input instanceof DataView) {
    const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    return `DataView:[${Array.from(bytes).join(',')}]`;
  }
  if (ArrayBuffer.isView(input)) {
    return `${input.constructor.name}:[${Array.from(input as ArrayLike<number>).join(',')}]`;
  }
  if (Array.isArray(input)) return `array:[${input.join(',')}]`;
  if (typeof input === 'object' && input !== null && 'r' in input) {
    const rgba = input as { r: number; g: number; b: number; a?: number };
    return `object:${rgba.r},${rgba.g},${rgba.b},${rgba.a ?? ''}`;
  }
  return `stringified:${String(input)}`;
}

/** Bounded memoization for repeated native conversions. */
export function cachedColor(input: Bun.ColorInput, format: ColorOutputFormat): ColorResult {
  const key = `${inputKey(input)}|${format}`;
  if (colorCache.has(key)) {
    cacheHits += 1;
    return colorCache.get(key) ?? null;
  }

  cacheMisses += 1;
  const result = callBunColor(input, format);
  if (colorCache.size >= CACHE_LIMIT) {
    const oldest = colorCache.keys().next().value;
    if (oldest !== undefined) colorCache.delete(oldest);
  }
  colorCache.set(key, result);
  return result;
}

export function colorCacheStats(): { size: number; hits: number; misses: number } {
  return { size: colorCache.size, hits: cacheHits, misses: cacheMisses };
}

export function clearColorCache(): void {
  colorCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

function isConcreteRgba(value: ColorResult): value is ConcreteRgba {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return ['r', 'g', 'b', 'a'].every(channel => channel in value && Number.isFinite(value[channel]));
}

/** Bun preserves context-dependent and wide-gamut CSS strings instead of resolving channels. */
export function parseColor(input: Bun.ColorInput): ParsedColor {
  const value = cachedColor(input, COLOR_OUTPUT_FORMATS.RGBA_OBJECT);
  if (value === null) return { kind: 'invalid' };
  if (isConcreteRgba(value)) return { kind: 'concrete', rgba: value };
  return { kind: 'symbolic', value: String(value) };
}

export function displayColorResult(value: ColorResult): string {
  if (value === null) return '(unsupported)';
  if (value === '') return '(terminal-disabled)';
  if (typeof value === 'string') {
    return value.includes('\u001b') ? JSON.stringify(value).slice(1, -1) : value;
  }
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

export function diagnoseColor(input: Bun.ColorInput): {
  input: string;
  parsed: ParsedColor;
  formats: ColorFormatResult[];
  cache: ReturnType<typeof colorCacheStats>;
} {
  const parsed = parseColor(input);
  const formats = COLOR_FORMATS.map(format => {
    const value = cachedColor(input, format);
    const symbolic = typeof value === 'string' && parsed.kind === 'symbolic';
    return {
      format,
      value,
      display: displayColorResult(value),
      status:
        value === null
          ? ('unsupported' as const)
          : value === ''
            ? ('terminal-disabled' as const)
            : symbolic
              ? ('symbolic' as const)
              : ('ok' as const),
    };
  });
  return { input: String(input), parsed, formats, cache: colorCacheStats() };
}

export const COLOR_CAPABILITY_CASES: ReadonlyArray<{
  feature: string;
  input: Bun.ColorInput;
  format: ColorOutputFormat;
}> = [
  { feature: 'space-separated rgb()', input: 'rgb(255 0 0)', format: 'hex' },
  { feature: 'slash alpha', input: 'rgba(255 0 0 / 0.5)', format: 'css' },
  { feature: 'percentage channels', input: 'rgb(100% 0% 0%)', format: 'hex' },
  { feature: 'turn angle', input: 'hsl(0.5turn 100% 50%)', format: 'hex' },
  { feature: 'radian angle', input: 'hsl(3.14159rad 100% 50%)', format: 'hex' },
  { feature: 'gradian angle', input: 'hsl(200grad 100% 50%)', format: 'hex' },
  { feature: 'transparent', input: 'transparent', format: '{rgba}' },
  { feature: 'context keyword', input: 'currentcolor', format: '{rgba}' },
  { feature: 'display-p3 preservation', input: 'color(display-p3 0 1 0)', format: 'hex' },
  { feature: 'rgb clamping', input: 'rgb(300, 0, 0)', format: 'hex' },
  { feature: 'hsl clamping', input: 'hsl(0, 200%, 50%)', format: 'hex' },
  { feature: 'object clamping', input: { r: 999, g: -50, b: 100 }, format: 'hex' },
  { feature: 'invalid input', input: 'definitely-not-a-color', format: 'hex' },
];

export function diagnoseColorCapabilities(): Array<{
  feature: string;
  input: string;
  format: ColorOutputFormat;
  result: string;
  status: ColorFormatResult['status'];
}> {
  return COLOR_CAPABILITY_CASES.map(({ feature, input, format }) => {
    const value = cachedColor(input, format);
    const parsed = parseColor(input);
    return {
      feature,
      input: typeof input === 'object' ? JSON.stringify(input) : String(input),
      format,
      result: displayColorResult(value),
      status:
        value === null
          ? 'unsupported'
          : value === ''
            ? 'terminal-disabled'
            : parsed.kind === 'symbolic'
              ? 'symbolic'
              : 'ok',
    };
  });
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toLinear(channel: number): number {
  const value = clamp01(channel / 255);
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function toSrgb(channel: number): number {
  const value = clamp01(channel);
  return Math.round(
    (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055) * 255
  );
}

/** Mix toward black (negative) or white (positive), in sRGB or linear-light space. */
export function mixColor(
  input: Bun.ColorInput,
  amount: number,
  options: { perceptual?: boolean } = {}
): string | null {
  const parsed = parseColor(input);
  if (parsed.kind !== 'concrete') return null;
  const factor = clamp01(Math.abs(amount));
  const target = amount < 0 ? 0 : 1;
  const channels = [parsed.rgba.r, parsed.rgba.g, parsed.rgba.b].map(channel => {
    const value = options.perceptual ? toLinear(channel) : channel / 255;
    const mixed = value + (target - value) * factor;
    return options.perceptual ? toSrgb(mixed) : Math.round(clamp01(mixed) * 255);
  });
  const mixed = { r: channels[0], g: channels[1], b: channels[2], a: parsed.rgba.a };
  return cachedColor(mixed, parsed.rgba.a < 1 ? 'css' : 'hex') as string | null;
}

export function generateColorPalette(
  input: Bun.ColorInput,
  options: { steps?: number; perceptual?: boolean; amounts?: readonly number[] } = {}
): Array<{ step: number; amount: number; color: string }> | null {
  const stepCount = Math.max(3, Math.floor(options.steps ?? 15));
  const amounts = options.amounts
    ? [...options.amounts]
    : Array.from({ length: stepCount }, (_, step) =>
        Number((-0.84 + (1.68 * step) / (stepCount - 1)).toFixed(3))
      );
  if (parseColor(input).kind !== 'concrete') return null;

  return amounts.map((amount, step) => {
    const color = mixColor(input, amount, options);
    if (color === null) throw new Error('Concrete color unexpectedly failed to format');
    return { step: step + 1, amount, color };
  });
}

/** Parse a comma-separated tone list. Values are mix positions from -1 to 1. */
export function parseColorTones(input: string): number[] | null {
  const parts = input.split(',').map(value => value.trim());
  if (parts.length === 0 || parts.some(value => value.length === 0)) return null;
  const tones = parts.map(Number);
  return tones.every(value => Number.isFinite(value) && value >= -1 && value <= 1) ? tones : null;
}

function rgbToHsl({ r, g, b }: ConcreteRgba): [number, number, number] {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue =
    max === red
      ? ((green - blue) / delta + (green < blue ? 6 : 0)) * 60
      : max === green
        ? ((blue - red) / delta + 2) * 60
        : ((red - green) / delta + 4) * 60;
  return [hue, saturation, lightness];
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = (((hue % 360) + 360) % 360) / 60;
  const secondary = chroma * (1 - Math.abs((sector % 2) - 1));
  const [red, green, blue] =
    sector < 1
      ? [chroma, secondary, 0]
      : sector < 2
        ? [secondary, chroma, 0]
        : sector < 3
          ? [0, chroma, secondary]
          : sector < 4
            ? [0, secondary, chroma]
            : sector < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = lightness - chroma / 2;
  return [red, green, blue].map(channel => Math.round((channel + match) * 255)) as [
    number,
    number,
    number,
  ];
}

export function generateColorGradient(
  start: Bun.ColorInput,
  end: Bun.ColorInput,
  options: { steps?: number; hsl?: boolean; format?: ColorOutputFormat } = {}
): Array<{ step: number; position: number; color: ColorResult; display: string }> | null {
  const startColor = parseColor(start);
  const endColor = parseColor(end);
  if (startColor.kind !== 'concrete' || endColor.kind !== 'concrete') return null;

  const steps = Math.max(2, Math.floor(options.steps ?? 10));
  const format = options.format ?? 'hex';
  const startHsl = rgbToHsl(startColor.rgba);
  const endHsl = rgbToHsl(endColor.rgba);
  if (startHsl[1] === 0) startHsl[0] = endHsl[0];
  if (endHsl[1] === 0) endHsl[0] = startHsl[0];
  const hueDelta = ((endHsl[0] - startHsl[0] + 540) % 360) - 180;

  return Array.from({ length: steps }, (_, index) => {
    const position = index / (steps - 1);
    const channels = options.hsl
      ? hslToRgb(
          startHsl[0] + hueDelta * position,
          startHsl[1] + (endHsl[1] - startHsl[1]) * position,
          startHsl[2] + (endHsl[2] - startHsl[2]) * position
        )
      : ([
          Math.round(startColor.rgba.r + (endColor.rgba.r - startColor.rgba.r) * position),
          Math.round(startColor.rgba.g + (endColor.rgba.g - startColor.rgba.g) * position),
          Math.round(startColor.rgba.b + (endColor.rgba.b - startColor.rgba.b) * position),
        ] as [number, number, number]);
    const color = cachedColor(
      {
        r: channels[0],
        g: channels[1],
        b: channels[2],
        a: startColor.rgba.a + (endColor.rgba.a - startColor.rgba.a) * position,
      },
      format
    );
    return {
      step: index + 1,
      position: Number(position.toFixed(4)),
      color,
      display: displayColorResult(color),
    };
  });
}
