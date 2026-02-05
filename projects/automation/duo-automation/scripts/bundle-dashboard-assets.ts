// [DUOPLUS][ASSETS][FIX][FEAT][META:{cdn:false}] [BUN:6.1-NATIVE]

const assets: Record<string, string> = {
  tailwindcss: "https://cdn.tailwindcss.com/3.4.0",
  lucide: "https://unpkg.com/lucide@latest/dist/umd/lucide.js"
};

const localFallbacks: Record<string, string> = {
  "https://cdn.tailwindcss.com/3.4.0": "vendor-src/tailwindcss-3.4.0.min.js",
  "https://unpkg.com/lucide@latest/dist/umd/lucide.js": "vendor-src/lucide.umd.v0.423.0.min.js"
};

const minBytes: Record<string, number> = {
  tailwindcss: 50 * 1024,
  lucide: 10 * 1024
};

const dashboards = [
  {
    source: "demos/venmo-family-webui-demo/index.html",
    dest: "dist/venmo-family-webui-demo/index.html"
  },
  {
    source: "demos/@web/duoplus-unified-dashboard.html",
    dest: "dist/unified-dashboard-demo/index.html"
  }
];

await Bun.$`mkdir -p vendor dist`;

for (const [name, url] of Object.entries(assets)) {
  console.log(`Bundling ${name}...`);
  const fallbackPath = localFallbacks[url];
  let content: string | null = null;

  if (fallbackPath) {
    const localFile = Bun.file(fallbackPath);
    if (await localFile.exists()) {
      const size = typeof localFile.size === "number"
        ? localFile.size
        : (await localFile.arrayBuffer()).byteLength;
      const required = minBytes[name] || 0;
      if (size < required) {
        throw new Error(`Fallback asset too small: ${fallbackPath} (${size} bytes)`);
      }
      content = await localFile.text();
    }
  }

  if (!content) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    content = await response.text();
  }

  await Bun.write(`vendor/${name}.js`, content);
  await Bun.write(`vendor/${name}.js.map`, `${content}\n//# sourceMappingURL=${name}.js.map`);
}

for (const entry of dashboards) {
  const sourceFile = Bun.file(entry.source);
  if (!await sourceFile.exists()) {
    throw new Error(`Missing dashboard source: ${entry.source}`);
  }

  const html = await sourceFile.text();
  const fixedHtml = html
    .replace(/https:\/\/cdn\.tailwindcss\.com/g, "/vendor/tailwindcss.js")
    .replace(/https:\/\/unpkg\.com\/lucide@latest/g, "/vendor/lucide.js")
    .replace(/https:\/\/unpkg\.com\/lucide@[^/]+\/dist\/umd\/lucide\.js/g, "/vendor/lucide.js");

  await Bun.$`mkdir -p ${entry.dest.replace(/\/[^/]+$/, "")}`;
  await Bun.write(entry.dest, fixedHtml);
}

// Tag asset bundling
// [DUOPLUS][ASSETS][BUNDLE][FEAT][META:{vendor:true}] [#REF:ASSET-BUNDLE-7A8B][BUN:6.1-NATIVE]
