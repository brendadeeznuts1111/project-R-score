/**
 * Portal markdown pages — raw source + HTML shell.
 * @see https://bun.com/docs/runtime/markdown#bun-markdown-html
 */

const PAGES: Record<string, string> = {
  index: `# Registry\n\nFactoryWager package registry overview.\n`,
  ops: `# Ops\n\nOperations dashboard (tree, plays, rails).\n`,
  toc: `# TOC Ops

Drum / Buffer / Rope partner desk (demo-readonly on Pages).

## Plane

- HTML board: [/portal/toc/](/portal/toc/)
- Artifact: [/registry/toc-ops.json](/registry/toc-ops.json)
- API: \`GET /api/toc\` (POST → 503)
- Eval: operate-lite Hard Gates + T/I/OE baked into the artifact
- Mutations: toc-ops-repo \`ct\` or local bun Soft journal — not on Pages

## Agent brief

Read \`#toc-agent-brief\` on the HTML board, or fetch the JSON artifact.
Theory SSOT: \`toc-ops-repo\` (TOC-REF · ACCOUNTING · SOPs).

## Commands

\`\`\`bash
bun run ops:seed:toc
bun run ops:snapshot --no-routing
\`\`\`

Rebuild an existing fixture with the seed tool force flag.
`,
  catalog: `# Catalog\n\nPlatform + account catalog.\n`,
  dod: `# DOD\n\nVisual-proof submission queue.\n`,
  health: `# Health\n\nService health probe.\n`,
  env: `# Env\n\nEnvironment + secret status (redacted).\n`,
  skills: `# Skills\n\nInstalled Kimi skills registry (name, description, last updated) with downloadable \`.skill\` packages when available.\n`,
  monitoring: `# Monitoring\n\nRegistry + integrity metrics. Regenerate: \`bun run ops:snapshot\` bakes JSON embed into this page.\n`,
  dashboard: `# Dashboard\n\nExecutive proof summary — routing, channel meta, release features.\n`,
  issues: `# GitHub issue taxonomy

Static, credential-free view of repository issue meaning, ownership, and drift health.

- Board: [/portal/issues/](/portal/issues/)
- Registry: [/registry/github-issue-taxonomy.json](/registry/github-issue-taxonomy.json)
- Portal concept: \`portal.github_issue_taxonomy\`
- Producer check: \`bun run github-issue-taxonomy:check\`
`,
};

export function portalMarkdownExists(slug: string): boolean {
  return slug in PAGES;
}

export function portalMarkdownRaw(slug: string): string {
  return PAGES[slug] ?? `# ${slug}\n\n(page not found)\n`;
}

export function renderPortalMarkdownPage(slug: string): string {
  const md = portalMarkdownRaw(slug);
  let bodyHtml: string;
  try {
    bodyHtml = Bun.markdown.html(md);
  } catch {
    bodyHtml = `<pre>${escapeHtml(md)}</pre>`;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(slug)} · FactoryWager</title>
  <link rel="stylesheet" href="/portal/style.css"/>
</head>
<body class="portal-md">
  <nav><a href="/portal/">Portal</a></nav>
  <main>${bodyHtml}</main>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
