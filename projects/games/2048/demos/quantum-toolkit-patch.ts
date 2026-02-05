// quantum-toolkit-patch.ts  (zero-breaking, additive only)
import { color, inspect, stringWidth } from "bun";

/* 1. strict snapshot guard -------------------------------- */
export const eq = (a: any, b: any) => Bun.deepEquals(a, b, true);

/* 2. XSS-safe event stream -------------------------------- */
export const sse = (label: string, obj: any) =>
  `event:${label}\ndata:${Bun.escapeHTML(JSON.stringify(obj))}\n\n`;

/* 3. Unicode pad for 10-col tables ------------------------ */
export const pad = (s: string, w: number) =>
  s + " ".repeat(Math.max(0, w - stringWidth(s)));

/* 4. gzip bundle (level 9) -------------------------------- */
export const gzipBundle = (buf: ArrayBuffer) => Bun.gzipSync(buf, { level: 9 });

/* 5. air-gapped path ↔ URL -------------------------------- */
export const toPath = (url: string) => Bun.fileURLToPath(url);
export const toFileURL = (path: string) => Bun.pathToFileURL(path).href;

/* 6. cached colour kit (tension 0-1) ---------------------- */
const CACHE = new Map<number, Record<string, string>>();
export const colourKit = (t: number) => {
  if (CACHE.has(t)) return CACHE.get(t)!;
  const hsl = `hsl(${t * 120} 100% 50%)`;
  const out = {
    css: color(hsl, "css"),
    ansi: color(hsl, "ansi"),
    hex: color(hsl, "hex"),
    number: color(hsl, "number"),
    rgb: color(hsl, "[rgb]"),
    rgba: color(hsl, "[rgba]"),
  };
  CACHE.set(t, out);
  return out;
};

/* 7. 10-column RGBA lattice demo -------------------------- */
export const rgbaLattice = (base = 1) =>
  inspect.table(
    [1, 2, 3, 4].map((n) => ({
      "#": n,
      ...Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => {
          const t = (base + n + i - 1) / 20;
          return [`Col${i + 1}`, colourKit(t).ansi + "█".repeat(8)];
        })
      ),
    })),
    { border: true, colors: true }
  );

/* 8. one-liner test --------------------------------------- */
if (import.meta.main) {
  console.log(rgbaLattice());
  console.log("Toolkit loaded – zero breaking changes.");
}
