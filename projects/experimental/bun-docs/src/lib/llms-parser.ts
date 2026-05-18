/**
 * Parser for Bun's llms.txt documentation index format.
 *
 * This module is pure and easily testable.
 */

import type { DocPage } from "../types/doc";

// Re-export for convenient importing from the parser module
export type { DocPage } from "../types/doc";

// ============================================
// Bundler Detection
// ============================================

export function isBundlerRelated(
  title: string,
  url: string,
  description: string,
  category?: string,
  subcategory?: string
): boolean {
  const text = `${title} ${description} ${category || ""} ${subcategory || ""}`.toLowerCase();
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("/bundler/")) return true;

  const knownBundlerPages = [
    "bundler",
    "loaders",
    "plugins",
    "minifier",
    "macros",
    "bytecode caching",
    "bytecode",
    "esbuild",
    "single-file executable",
    "fullstack dev server",
    "hot reloading",
    "html & static sites",
    "standalone html",
    "css",
    "hot module replacement",
  ];
  if (knownBundlerPages.some((p) => text.includes(p))) return true;

  const bundlerCategoryTerms = [
    "bundler",
    "loaders",
    "plugins",
    "minifier",
    "macros",
    "executables",
    "bytecode",
    "fullstack",
  ];
  if (bundlerCategoryTerms.some((t) => (category || "").toLowerCase().includes(t))) return true;
  if (bundlerCategoryTerms.some((t) => (subcategory || "").toLowerCase().includes(t))) return true;

  const strongKeywords = [
    "bun build",
    "bun.build",
    "bunbuild",
    "code splitting",
    "tree shaking",
    "dead code elimination",
    "sourcemap",
    "metafile",
    "publicpath",
    "html loader",
    "css loader",
    "bytecode",
    "optimize imports",
  ];
  if (strongKeywords.some((kw) => text.includes(kw))) return true;

  const generalTerms = [
    "bundler",
    "loader",
    "plugin",
    "macro",
    "minify",
    "build",
    "target",
    "format",
    "drop",
    "features",
  ];
  if (generalTerms.some((term) => text.includes(term))) {
    if (text.includes("bun") || text.includes("build") || lowerUrl.includes("build")) {
      return true;
    }
  }

  return false;
}

// ============================================
// Main Parser
// ============================================

/**
 * Parses the official Bun llms.txt markdown format into structured DocPage entries.
 *
 * Expected format:
 *   ## Category
 *   ### Subcategory (optional)
 *   - [Title](https://bun.com/docs/...) : Optional description
 */
export function parseLlmsTxt(markdown: string): DocPage[] {
  const pages: DocPage[] = [];
  let currentMain = "General";
  let currentSub: string | undefined;

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();

    if (trimmed.startsWith("## ") && !trimmed.includes("http")) {
      currentMain = trimmed.replace("## ", "").trim();
      currentSub = undefined;
      continue;
    }

    if (trimmed.startsWith("### ") && !trimmed.includes("http")) {
      currentSub = trimmed.replace("### ", "").trim();
      continue;
    }

    const match = trimmed.match(
      /^- \[(.*?)\]\((https?:\/\/bun\.com\/docs\/[^)]+)\)(?::\s*(.*))?$/
    );

    if (match) {
      const [, title, url, desc] = match;
      const isBundler = isBundlerRelated(title, url, desc || "", currentMain, currentSub);

      pages.push({
        title,
        url,
        category: currentMain,
        subcategory: currentSub,
        description: desc?.trim(),
        isBundlerRelated: isBundler,
      });
    }
  }

  return pages;
}
