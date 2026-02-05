/**
 * MIME Type Generator for T3-Lattice Full-Stack Features
 * Fetches the latest mime-db and generates a Zig-compatible or JSON mapping.
 */

interface MimeEntry {
  extensions?: string[];
  [key: string]: unknown;
}

type MimeDb = Record<string, MimeEntry>;

async function generateMimeData() {
  console.log("🌐 Fetching latest MIME database...");
  const response = await fetch("https://raw.githubusercontent.com/jshttp/mime-db/master/db.json");
  const json = await response.json() as MimeDb;

  // Add custom Bun/TypeScript extensions
  if (json["application/javascript"]) {
    json["application/javascript"].extensions = json["application/javascript"].extensions || [];
    json["application/javascript"].extensions.push(`ts`, `tsx`, `mts`, `mtsx`, `cts`, `cjs`, `mjs`, `js`);
  }

  // Clean up unnecessary types
  delete json["application/node"];
  delete json["application/deno"];
  delete json["application/wasm"];

  const categories = new Set();
  let zigOutput = "pub const all = struct {\n";
  
  for (let key of Object.keys(json).sort()) {
    const [category] = key.split("/");
    categories.add(category);
    zigOutput += `  pub const @"${key}": MimeType = MimeType{.category = .@"${category}", .value = "${key}"};\n`;
  }

  const withExtensions = [
    ...new Set(
      Object.keys(json)
        .filter(key => !!json[key]?.extensions?.length)
        .flatMap(mime => {
          return [...new Set(json[mime].extensions)].map(ext => {
            return `    .{.@"${ext}", all.@"${mime}"}`;
          });
        })
        .sort(),
    ),
  ];

  zigOutput += "\n";
  zigOutput += `  pub const extensions = ComptimeStringMap(MimeType, .{\n${withExtensions.join(",\n")},\n  });\n};`;

  console.log("✅ MIME data generated successfully.");
  
  // Save as JSON for internal use in T3-Lattice
  await Bun.write(import.meta.dir + "/mime-types.json", JSON.stringify(json, null, 2));
  console.log(`📝 JSON mapping saved to ${import.meta.dir}/mime-types.json`);

  // Log Zig output for reference (as requested in feedback)
  // console.log(zigOutput);
}

generateMimeData().catch(console.error);
