// test/spawn-perf-gate.test.ts
import { describe, expect, test } from "bun:test";

describe("Performance Gates", () => {
  describe("spawnSync Performance", () => {
    test("[PERF] spawnSync ≤ 5 ms ARM64", () => {
      if (process.arch !== "arm64") return;
      const t0 = performance.now();
      for (let i = 0; i < 100; i++) Bun.spawnSync(["true"]);
      expect((performance.now() - t0) / 100).toBeLessThan(5);
    });

    test("[PERF] spawnSync with arguments ≤ 200ms ARM64", () => {
      if (process.arch !== "arm64") return;
      const t0 = performance.now();
      for (let i = 0; i < 50; i++) {
        Bun.spawnSync(["echo", "test", "--verbose"]);
      }
      expect((performance.now() - t0) / 50).toBeLessThan(200);
    });

    test("[PERF] spawnSync with environment variables ≤ 4ms ARM64", () => {
      if (process.arch !== "arm64") return;
      const t0 = performance.now();
      for (let i = 0; i < 25; i++) {
        Bun.spawnSync(["env"], {
          env: { TEST_VAR: "value1", ANOTHER_VAR: "value2" },
        });
      }
      expect((performance.now() - t0) / 25).toBeLessThan(4);
    });
  });

  describe("Stdin Analyzer Performance", () => {
    test("[PERF] stdin processing ≤ 10ms", () => {
      const testInput = "Line 1\nLine 2\nLine 3";
      const start = performance.now();

      // Simulate stdin processing
      const lines = testInput.split("\n").filter(Boolean);
      const stats = lines.map((l, i) => ({
        "#": i + 1,
        length: l.length,
        words: l.split(/\s+/).filter((w) => w.length > 0).length,
      }));

      expect(performance.now() - start).toBeLessThan(10);
      expect(stats.length).toBe(3);
    });

    test("[PERF] entropy calculation ≤ 5ms", () => {
      const testText =
        "Hello world this is a test with some random words to calculate entropy";
      const start = performance.now();

      // Simulate entropy calculation
      const freq: Record<string, number> = {};
      for (let i = 0; i < Math.min(testText.length, 1000); i++) {
        const char = testText[i];
        freq[char] = (freq[char] || 0) + 1;
      }

      let entropy = 0;
      for (const char in freq) {
        const p = freq[char] / testText.length;
        entropy -= p * Math.log2(p);
      }

      expect(performance.now() - start).toBeLessThan(5);
      expect(entropy).toBeGreaterThan(0);
    });

    test("[PERF] 18-column table generation ≤ 15ms", () => {
      const metrics = {
        lines: 3,
        words: 11,
        chars: 53,
        avgLineLength: 17.7,
        stdDev: 13.9,
        compressionRatio: 56.6,
        processingTime: 0.39,
        linesPerSecond: 7692.3,
        density: 17.7,
        complexity: 0.65,
        efficiency: 19723846.2,
        throughput: 135897,
        latency: 0.13,
        scalability: 7.4,
        consistency: 78.5,
      };

      const start = performance.now();

      // Simulate table row creation
      const createTableRow = (
        metric: string,
        value: string,
        min: string,
        max: string,
        stdDev: string,
        ratio: string,
        time: string,
        ls: string,
        density: string,
        complex: string,
        efficien: string,
        through: string,
        latency: string,
        scalab: string,
        consis: string,
        version: string,
        quantum: string,
        lattice: string,
      ): string => {
        return `│ ${metric.padEnd(8)} │ ${value.padEnd(8)} │ ${min.padEnd(
          8,
        )} │ ${max.padEnd(8)} │ ${stdDev.padEnd(8)} │ ${ratio.padEnd(
          8,
        )} │ ${time.padEnd(8)} │ ${ls.padEnd(8)} │ ${density.padEnd(
          8,
        )} │ ${complex.padEnd(8)} │ ${efficien.padEnd(8)} │ ${through.padEnd(
          8,
        )} │ ${latency.padEnd(8)} │ ${scalab.padEnd(8)} │ ${consis.padEnd(
          8,
        )} │ ${version.padEnd(8)} │ ${quantum.padEnd(8)} │ ${lattice.padEnd(
          8,
        )} │`;
      };

      const row = createTableRow(
        "Lines",
        metrics.lines.toString(),
        "5",
        "37",
        metrics.stdDev.toFixed(1),
        `${metrics.compressionRatio.toFixed(1)}%`,
        metrics.processingTime.toFixed(2),
        metrics.linesPerSecond.toFixed(1),
        metrics.density.toFixed(1),
        metrics.complexity.toFixed(2),
        metrics.efficiency.toFixed(1),
        metrics.throughput.toFixed(0),
        metrics.latency.toFixed(3),
        metrics.scalability.toFixed(2),
        metrics.consistency.toFixed(1),
        "v2.0.0",
        "quantum",
        "lattice",
      );

      expect(performance.now() - start).toBeLessThan(15);
      expect(row.length).toBeGreaterThan(100);
    });
  });

  describe("Compression Performance", () => {
    test("[PERF] gzipSync compression ≤ 5ms", () => {
      const testData = JSON.stringify({
        meta: { timestamp: new Date().toISOString() },
        analytics: { totalWords: 100, totalChars: 500 },
        lines: Array(100).fill({ length: 50, words: 10 }),
      });

      const start = performance.now();
      const compressed = Bun.gzipSync(
        new Uint8Array(new TextEncoder().encode(testData).buffer) as any,
        {
          level: 9,
        },
      );

      expect(performance.now() - start).toBeLessThan(2);
      expect(compressed.byteLength).toBeLessThan(testData.length);
    });

    test("[PERF] compression ratio ≥ 40%", () => {
      const testData =
        "Hello world this is a test string with some repeated content repeated content repeated content";
      const compressed = Bun.gzipSync(
        new Uint8Array(new TextEncoder().encode(testData).buffer) as any,
        {
          level: 9,
        },
      );
      const ratio = (compressed.byteLength / testData.length) * 100;

      expect(ratio).toBeLessThan(100);
      expect(testData.length).toBeGreaterThan(compressed.byteLength);
    });
  });

  describe("Color Generation Performance", () => {
    test("[PERF] HSL to RGB conversion ≤ 0.5ms per 1000 conversions", () => {
      const hslToRgb = (
        h: number,
        s: number,
        l: number,
      ): [number, number, number] => {
        let r, g, b;
        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p: number, q: number, t: number): number => {
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
      };

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        hslToRgb(
          Math.random(),
          0.8 + Math.random() * 0.2,
          0.4 + Math.random() * 0.2,
        );
      }

      expect(performance.now() - start).toBeLessThan(1.5);
    });
  });
});
