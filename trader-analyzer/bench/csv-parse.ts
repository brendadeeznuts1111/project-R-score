// CSV parsing benchmarks - compare csv-parse vs native Bun file reading
import { bench, group, execute } from "./runner";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";

const csvPath = join(import.meta.dir, "..", "bitmex_executions.csv");
const csvContent = readFileSync(csvPath, "utf-8");
const lines = csvContent.split("\n");

group("CSV Parsing", () => {
  bench("csv-parse/sync (full file)", () => {
    parse(csvContent, { columns: true, skip_empty_lines: true, relax_quotes: true });
  });

  bench("csv-parse/sync (minimal opts)", () => {
    parse(csvContent, { columns: true });
  });

  bench("native split + map (no validation)", () => {
    const headers = lines[0].split(",");
    lines.slice(1).filter(l => l.trim()).map(line => {
      const values = line.split(",");
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => obj[h] = values[i] || "");
      return obj;
    });
  });
});

group("File Reading", () => {
  bench("Bun.file().text()", async () => {
    await Bun.file(csvPath).text();
  });

  bench("fs.readFileSync", () => {
    readFileSync(csvPath, "utf-8");
  });
});

group("Full Pipeline: Read + Parse", () => {
  bench("fs.readFileSync + csv-parse", () => {
    const csv = readFileSync(csvPath, "utf-8");
    parse(csv, { columns: true });
  });

  bench("Bun.file + csv-parse", async () => {
    const csv = await Bun.file(csvPath).text();
    parse(csv, { columns: true });
  });

  bench("Bun.file + native split", async () => {
    const csv = await Bun.file(csvPath).text();
    const lines = csv.split("\n");
    const headers = lines[0].split(",");
    lines.slice(1).filter(l => l).map(line => {
      const values = line.split(",");
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => obj[h] = values[i] || "");
      return obj;
    });
  });
});

group("Line counting", () => {
  bench("split('\\n').length", () => {
    csvContent.split("\n").length;
  });

  bench("regex match", () => {
    (csvContent.match(/\n/g) || []).length + 1;
  });
});

await execute();
