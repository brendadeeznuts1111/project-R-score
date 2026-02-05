import { parseCSSImportDependencies } from "./plugins/lightningcss";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const testDir = join(process.cwd(), "test-debug-temp");
const stylesDir = join(testDir, "src", "styles");
mkdirSync(stylesDir, { recursive: true });
writeFileSync(join(stylesDir, "variables.css"), ":root { }");

const cssContent = `@import "variables";
body { }`;
const cssPath = join(testDir, "test.css");
writeFileSync(cssPath, cssContent);

const deps = parseCSSImportDependencies(cssContent, cssPath, [stylesDir]);
console.log("Dependencies:", deps);
