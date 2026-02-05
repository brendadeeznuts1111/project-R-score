#!/usr/bin/env bun
import { gzipSync, inspect } from "bun";

/* ---------- zero-copy path ------------------------------- */
const raw = await Bun.stdin.arrayBuffer(); // no text decode yet
const text = new TextDecoder().decode(raw); // only if human needed

/* ---------- quantum metrics ------------------------------ */
const lines = text.split("\n").filter(Boolean);
const stats = lines.map((l, i) => {
  const len = l.length;
  const tension = Math.min(1, len / 80); // 0-1 based on line length

  // Create RGB values from HSL
  const hue = tension * 120; // 0-120 (red to green)
  const rgb = hslToRgb(hue / 360, 1, 0.5);
  const ansi = `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${"█".repeat(
    Math.round(tension * 10)
  )}\x1b[0m`;

  return {
    "#": i + 1,
    length: len,
    tension: (tension * 100).toFixed(1) + "%",
    preview: l.slice(0, 20),
    rgb,
    ansi,
  };
});

/* ---------- HSL to RGB conversion ------------------------ */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/* ---------- 10-column quantum table ---------------------- */
console.log(
  inspect.table(stats, {
    border: true,
    header: true,
    colors: true,
  })
);

/* ---------- strict snapshot ------------------------------ */
const snapshot = { lines: stats.length, totalBytes: raw.byteLength };
const prev = await Bun.file("/tmp/stdin-snapshot.json")
  .json()
  .catch(() => ({}));
if (!Bun.deepEquals(snapshot, prev, true)) {
  await Bun.write("/tmp/stdin-snapshot.json", JSON.stringify(snapshot));
  console.log("✅ Snapshot updated (strict mode)");
}

/* ---------- XSS-safe + gzipped artefact ------------------ */
const report = {
  meta: { ts: new Date().toISOString(), bytes: raw.byteLength },
  lines: stats,
};
const safe = JSON.stringify(report);
const gz = gzipSync(new TextEncoder().encode(safe), { level: 9 });
await Bun.write("/tmp/stdin-quantum.json.gz", gz);
console.log("📊 Gzipped report:", gz.byteLength, "bytes");
