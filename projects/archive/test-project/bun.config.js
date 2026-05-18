import { plugin } from "bun";

plugin({
  name: "track imports",
  setup(build) {
    const transpiler = new Bun.Transpiler();

    let trackedImports: Record<string, number> = {};

    // Each module that goes through this onLoad callback
    // will record its imports in `trackedImports` 
    build.onLoad({ filter: /\.ts$/ }, async ({ path }) => {
      console.info(`🔍 Scanning imports for: ${path}`);
      
      const contents = await Bun.file(path).arrayBuffer();
      const imports = transpiler.scanImports(contents);

      console.info(`📦 Found ${imports.length} imports in ${path}:`);
      
      for (const i of imports) {
        trackedImports[i.path] = (trackedImports[i.path] || 0) + 1;
        console.info(`   - ${i.path} (${trackedImports[i.path]} times)`);
      }

      // Return undefined to let Bun handle the file normally
      return undefined;
    });

    build.onLoad({ filter: /stats\.json$/ }, async ({ defer }) => {
      console.info(`📊 Generating import stats...`);
      
      // Wait for all files to be loaded, ensuring
      // that every file goes through the above `onLoad()` function
      // and their imports tracked
      await defer();

      console.info(`📋 Final tracked imports:`, trackedImports);

      // Emit JSON containing the stats of each import
      return {
        contents: `export default ${JSON.stringify(trackedImports, null, 2)}`,
        loader: "js",
      };
    }); 
  },
});
