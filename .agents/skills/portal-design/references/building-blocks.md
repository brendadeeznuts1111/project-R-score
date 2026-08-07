# Portal building blocks matrix

Companion to [SKILL.md](../SKILL.md). CSS SSOT:
[`public/portal/style.css`](../../../../public/portal/style.css) (Board primitives).
Builders: [`lib/portal/ui-html.ts`](../../../../lib/portal/ui-html.ts) ↔
[`public/portal/components/portal-ui.js`](../../../../public/portal/components/portal-ui.js).

## Dual-API builders (keep aligned)

| Builder | CSS | Role |
| ------- | --- | ---- |
| `escHtml` | — | Escape text |
| `renderToneChip` | `.tone-chip` | Status tone pill |
| `renderPortalChip` | `.portal-chip` | Compact tag / link |
| `renderPortalPill` | `.portal-pill` (+ `--*`) | Soft category pill (`uiRole≈badge`) |
| `renderPortalBanner` | `.portal-banner` | Status strip |
| `renderPortalHero` | `.portal-hero` / `--card` | Title row / raised hero |
| `renderPortalStatGrid` | `.portal-stat` (host wraps `.portal-stat-grid`) | Metric cards |
| `renderPortalTable` / `Rows` | `.portal-table` · `.table-wrap` | Data tables |
| `portalRowToneClass` | `tr.row-ok\|warn\|bad` | Row rail helper |
| `renderPortalPanel` | `.portal-panel` | Section panel |
| `renderPortalError` | `.portal-error` (+ `-code` / `-actions`) | Actionable failure |
| `renderPortalSkeleton` | `.portal-skeleton` | Shimmer placeholders |
| `renderPortalGate` | `.portal-gate` | Bake/audit gate pill |

## CSS ready — next builders

| Primitive | Suggested builder | Notes |
| --------- | ----------------- | ----- |
| `.portal-toolbar` + `.portal-count` + `.portal-clear` | `renderPortalToolbar` | Filter control grid |
| `.portal-meta-row` / `.portal-dot` | `renderPortalMetaRow` | Mono key/value |
| `.portal-card` / `--metric|--panel|--stat` | `renderPortalCard` | Only when interaction-bound |
| `.portal-freshness` / `.portal-baked` / `.portal-source-links` | freshness helpers | Evidence chrome |
| `.portal-actions` | thin wrapper | Prefer existing `.btn` |

## Unification P1 offenders (private forks)

| Board / area | Prefix | Action |
| ------------ | ------ | ------ |
| `concepts/` | `cx-*` | Promote to `.portal-*` + builders |
| `brands/` | `brand-*` | Dual-class then drop private toolbar/stat/pill |
| `ops-*` island in `style.css` | `ops-*` | Fold into primitives where equivalent |
| `issues/` | `issue-*` | Align hero/toolbar |
| vault/failures specialty | `vh-` / `tf-` inline | Prefer `data-tone` / row rails |

Venue `venue-*` stays separate (identity ≠ status tones).

## `PORTAL_UI_ROLES` → builders (follow-up)

| `uiRole` | Builder today |
| -------- | ------------- |
| `chip` | `renderPortalChip` / `renderToneChip` |
| `badge` | `renderPortalPill` / `renderPortalGate` |
| `heading` | `renderPortalHero` title |
| `code` / `link` / `token` | not yet — do not invent a dispatcher until atoms exist |

## Doctor after builder edits

```bash
bun test tests/portal-ui-html.test.ts
bun run verify:portal:static
bun x prettier --write lib/portal/ui-html.ts
```
