# Dashboard UI Fragments (Bun.file injection)

Tab content and other large HTML blocks are kept in separate files and injected at runtime to avoid mega-templates and unclosed backtick issues in the main dashboard.

## Pattern

1. **Fragment file**: Plain HTML in `src/ui/<name>.html` (e.g. `fraud.html`).
2. **Placeholder in main template**: In `enhanced-dashboard.ts`, the main `HTML` template contains a placeholder like `{{FRAUD_TAB}}`.
3. **Injection**: `getPageHtml()` loads the fragment with `Bun.file(new URL('./ui/<name>.html', import.meta.url)).text()` and replaces the placeholder. Result is cached for the process (cleared on HMR).

## Files

- **fraud.html** – Fraud Intelligence tab (Collision Alert, Audit Trail, Reference Map).

## Adding a new fragment

1. Create `src/ui/<name>.html` with the HTML fragment.
2. In `enhanced-dashboard.ts`, replace the inline block with `{{PLACEHOLDER_NAME}}`.
3. In `getPageHtml()`, load the file and add a `.replace('{{PLACEHOLDER_NAME}}', fragment)` (after loading the fragment).
