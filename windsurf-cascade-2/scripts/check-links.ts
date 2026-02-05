import { existsSync } from "fs";
import { join, dirname } from "path";
import { readdirSync, readFileSync, statSync } from "fs";

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach(function(file) {
    if (file === "node_modules" || file === ".git") return;
    const fullSourcePath = join(dirPath, file);
    if (statSync(fullSourcePath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullSourcePath, arrayOfFiles);
    } else {
      if (file.endsWith(".md")) {
        arrayOfFiles.push(fullSourcePath);
      }
    }
  });

  return arrayOfFiles;
}

const mdFiles = getAllFiles(".");
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
let brokenLinksCount = 0;

console.log(`Checking ${mdFiles.length} markdown files...`);

mdFiles.forEach((file: string) => {
  const content = readFileSync(file, "utf8");
  const fileDir = dirname(file);
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    const linkText = match[1];
    const linkTarget = match[2];

    if (!linkTarget) continue;

    // Skip external links
    if (linkTarget.startsWith("http") || linkTarget.startsWith("mailto:") || linkTarget.startsWith("#")) {
      continue;
    }

    // Clean up potential anchors in internal links
    const targetPath = linkTarget.split("#")[0];
    if (!targetPath) continue;

    const fullPath = join(fileDir, targetPath);

    if (!existsSync(fullPath)) {
      console.log(`❌ Broken link in ${file}: [${linkText}](${linkTarget}) -> Target not found: ${fullPath}`);
      brokenLinksCount++;
    }
  }
});

if (brokenLinksCount === 0) {
  console.log("✅ No broken internal links found in Markdown files!");
} else {
  console.log(`\nFound ${brokenLinksCount} broken link(s).`);
}
