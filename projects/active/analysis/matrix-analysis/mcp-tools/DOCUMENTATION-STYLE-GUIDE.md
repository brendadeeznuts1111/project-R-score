# Documentation Style Guide

## Core Principles

Write factual, precise technical documentation without hype language or declarative victory statements.

## Markdown Structure Rules

### Headings

- Level 1 only in README front-matter or top-level files
- No trailing punctuation in headings
- Sentence case: "Unicode handling" not "Unicode Handling"
- Exactly one blank line before and after headings

### Code Blocks

- Language tag required: `ts`, `js`, `bash`, `json`, `md`, `toml`
- Prefer fenced blocks over indented
- No trailing blank lines inside fences
- Single trailing newline at end of file

### Lists

- Consistent dash markers for unordered lists
- Ordered lists always start with "1."
- One sentence per list item when possible
- Imperative mood in how-to lists: "Run" instead of "Running"
- Blank lines around lists

### Links

- Descriptive link text: `[Bun Archive docs](https://bun.com/docs/api/archive)`
- Avoid generic text like `[here]`

## Prose Standards

### Banned Phrases

- complete, completed, fully, perfect, perfectly
- locked, sealed, gold, battle-tested
- production-grade, bulletproof, hardened
- zero-trust, omega, quantum, ultimate
- enhanced, improved, advanced, next-level
- state-of-the-art, cutting-edge, robust
- enterprise-grade, ready for production
- fully operational, green across the board
- standing by, glyphs aligned, coherent, locked in

### Preferred Language

- Use factual verbs: supports, handles, returns, throws
- Include version info: "fixed in v1.3.8"
- Provide examples and measurements
- Avoid subjective adjectives: beautiful, excellent, clean

### Technical Precision

- Active voice over passive
- Specific measurements over general claims
- Concrete examples over abstract descriptions
- Error conditions and edge cases

## Example Format

```markdown
## Bun.Archive – tar and tar.gz handling

Create from object:

```ts
const archive = new Bun.Archive({
  "data.json": JSON.stringify({ tier: 1380 }),
  "log.txt": "line1\nline2"
});
```text

Write compressed:

```ts
await Bun.write("data.tar.gz", new Bun.Archive(files, { compress: "gzip" }));
```text

Path security:

- Rejects absolute paths and `../` traversal
- Skips symlinks on Windows
```

## Enforcement Tools

- `./lint-docs.sh` - Run full quality check
- `npx markdownlint --fix` - Auto-fix formatting issues
- Vale - Prose quality and banned phrase detection
