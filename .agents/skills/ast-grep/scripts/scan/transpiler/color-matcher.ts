import { color } from "bun";

/** @see https://bun.com/docs/runtime/color */
export const COLOR_DOCS = "https://bun.com/docs/runtime/color";

export type ColorFormat =
  | "css"
  | "ansi"
  | "ansi-16"
  | "ansi-256"
  | "ansi-16m"
  | "number"
  | "hex"
  | "HEX"
  | "rgb"
  | "rgba"
  | "hsl"
  | "{rgb}"
  | "{rgba}"
  | "[rgb]"
  | "[rgba]";

export type RgbaObject = { r: number; g: number; b: number; a: number };
export type RgbObject = { r: number; g: number; b: number };

/** Bun.color wrapper — mirrors SemverMatcher pattern for supply-chain theming. */
export class ColorMatcher {
  static convert(input: unknown, format: ColorFormat): unknown {
    return color(input, format);
  }

  static normalize(input: unknown): string | null {
    const v = color(input, "css");
    return typeof v === "string" ? v : null;
  }

  static toHex(input: unknown, uppercase = false): string | null {
    const v = color(input, uppercase ? "HEX" : "hex");
    return typeof v === "string" ? v : null;
  }

  static toNumber(input: unknown): number | null {
    const v = color(input, "number");
    return typeof v === "number" ? v : null;
  }

  static toRgba(input: unknown): RgbaObject | null {
    const v = color(input, "{rgba}");
    if (!v || typeof v !== "object") return null;
    const o = v as RgbaObject;
    if (typeof o.r !== "number") return null;
    return o;
  }

  static toAnsi(input: unknown, depth: ColorFormat = "ansi"): string {
    const v = color(input, depth);
    return typeof v === "string" ? v : "";
  }

  static isValid(input: unknown): boolean {
    return color(input, "css") !== null;
  }

  /** Persist-friendly 24-bit integer for DB snapshots. */
  static persist(input: unknown): number | null {
    return ColorMatcher.toNumber(input);
  }
}

export const COLOR_OUTPUT_FORMATS: ColorFormat[] = [
  "css",
  "ansi",
  "ansi-16",
  "ansi-256",
  "ansi-16m",
  "number",
  "hex",
  "HEX",
  "rgb",
  "rgba",
  "hsl",
  "{rgb}",
  "{rgba}",
  "[rgb]",
  "[rgba]",
];