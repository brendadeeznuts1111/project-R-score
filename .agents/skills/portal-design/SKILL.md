---
name: portal-design
description: >-
  Unify FactoryWager portal visual identity and grow shared UI building blocks
  (theme.jsonc, color kernels, ui-html ↔ portal-ui.js, .portal-* primitives).
  Use when editing portal boards, theme/tokens, private CSS prefixes, dual-plane
  tennis vs Pages chrome, or design-doc Flags for portal UI tools.
---

# Portal design (one job)

Unify portal visual identity and grow shared UI building blocks so boards
consume theme tokens + `.portal-*` primitives + `ui-html` / `portal-ui.js`, with
Bun-native performance and fail-closed color proof.

**Not** typed branded IDs (`SessionId`, `/portal/brands/` Bun×brand map) — hand
those to [`branded-ids`](../branded-ids/). “Brand” here means **visual
identity** (theme · kernels · venue marks).

SSOT design doc: [`docs/design/portal-design-agent.md`](../../../docs/design/portal-design-agent.md)  
Foundation: [`docs/portal-foundation.md`](../../../docs/portal-foundation.md)  
Area map: [`lib/portal/README.md`](../../../lib/portal/README.md)

## When to use

- New or edited portal boards among the ~36 `page.*` surfaces
- Theme / token / color-kernel changes
- Private CSS prefixes (`vh-*`, `tf-*`) or dual-class debt
- Missing builders for documented CSS primitives
- CLI chrome inventing padding instead of `cli-chrome`
- Dual-plane work: `tennis.factory-wager.com` (Worker) vs `score…/portal/tennis/` (Pages evidence)

## Template split (do not invent a third)

| Concern | Loader / template |
| ------- | ----------------- |
| Palette + tokens | `theme.jsonc` (Bun **jsonc**) → `theme.ts` → `theme-tokens.css` |
| Page starting point | `_page-template.html` + `portal:chrome:apply` |
| Component blocks | `ui-html.ts` ↔ `portal-ui.js` + `.portal-*` in `style.css` |
| Host inventory | `surfaces.toml` (TOML — **not** palettes) |

No `design.toml` that regenerates pages or colors. No parallel `colorkernal` CLI.

## Loop

1. **Observe** — board/shell/CSS/TS touched; note private prefixes, hex literals, second palettes, missing skeletons/errors.
2. **Classify plane** — theme tokens · kernel alias · component fallback · venue identity · board primitive · chrome shell · CLI twin · DNS host (`surfaces.toml`) · ConceptDomain · typed-brand (handoff).
3. **Owner** — one hop via portal-foundation / `lib/portal` Area map; never invent SSOTs.
4. **Smallest reversible fix** — promote-to-primitive / extend `ui-html`↔`portal-ui.js` / alias into theme-dark / register chrome component.
5. **Bun-native performance** — checklist below.
6. **Fresh rerun** — theme + colors + static (+ Power UI / surfaces when touched); paste Claim/Evidence.
7. **Retain / revise / remove** — no new primitive without CSS + builder + at least one bake/board consumer.

## Bun-native checklist

| Concern | Rule |
| ------- | ---- |
| Color | `Bun.color(…, '{rgba}')` for kernel/component compare (not HEX); claim `color-kernel-theme-aliases` |
| Theme | Edit `theme.jsonc` only; never hand-edit `theme-tokens.css` |
| Width / TTY | `Bun.stringWidth` / `sliceAnsi` / `wrapAnsi` via `cli-chrome` / `console-depth` |
| HTML escape | Prefer `lib/escape-html.ts` (`Bun.escapeHTML`) for bake HTML; keep `ui-html` twin aligned |
| Routing | Module-scope `URLPattern`; prefer `test()` when captures unused |
| CSS | Static-first logical + nesting + `clamp()`; score via `portal:css:score:power` |
| Data | Baked registry + SWR `data.js` — no live vault / health poll in boards |
| Console | `logTable` / `inspectTable` — never raw `console.table` |

## Dual-plane (DNS vs tennis)

- **Pages** (`score` / apex / pages.dev): portal boards + `/registry/*`; `/portal` → Access.
- **Worker** `tennis.factory-wager.com`: live Market Desk; `PARTNER_API_TOKEN` on `/api/v1/*`; **no** Access app.
- **Evidence** `/portal/tennis/`: bakes only; thin `TENNIS_SURFACE_CONCEPTS` — do not mint tennis portal concept ids unless product expands the surface map.
- `FACTORY_WAGER_TOKEN` → registry only; never send to the Worker.

Disambiguate: DNS hostname ≠ ConceptDomain ≠ vocabulary namespace ≠ chrome Domain lane. See `/portal/lanes/` · `docs/DOMAIN_CONCEPT_SHAPE.md`.

## Building-block backlog (priority)

Matrix: [references/building-blocks.md](references/building-blocks.md).

1. Grow `ui-html.ts` ↔ `portal-ui.js` — **shipped:** banner · hero · pill · `portalRowToneClass`; **next:** toolbar · meta-row · card · freshness.
2. Map `semantic-vocabulary` `uiRole` → one render path (chip/pill/gate first).
3. Unification P1/P2: `cx-*` / `brand-*` / `ops-*` / `issue-*` → primitives; limits / partner-history / doctor / vault → `_page-template`.
4. Triage unmapped component `var(--token, fallback)` into `COMPONENT_VAR_TOKEN_MAP`.
5. Venue identity ≠ status tones; telegram/partner-ops extended keys stay non-primary chrome.
6. CLI twin on `frameBlock` / `columnTable` / `formatIndexedCards`.

## Doctor

```bash
bun run portal:theme:check
bun run validate:colors
bun run verify:portal:static
bun run portal:css:score:power
# when surfaces / tennis inventory touched:
bun run surfaces:check
bun run tennis:agent-auth:check
bun run verify:weave -- --subdomains
```

Fresh rerun (color claim): `bun run test:colors`

After `lib/**/*.ts`: `bun x prettier --write <files>` then re-stage.

## Compose with siblings

| Agent | When |
| ----- | ---- |
| public-discovery | Static anti-patterns under `public/` |
| public-audit-gap-close | Close public-plane gap rows |
| branded-ids | Typed domain brands (not visual) |
| web-perf | Core Web Vitals / Lighthouse |

Shared tooling: [references/agent-tooling.md](../references/agent-tooling.md)

## Do not

- Name this skill `brand-*` or conflate with typed branded IDs
- Invent a second palette / `design.toml` color SSOT / parallel `tokens.css`
- Hand-edit `theme-tokens.css` or ship a React kit for portal
- Collapse Worker tennis host into Pages `/portal/tennis/`
- Break `ui-html` ↔ `portal-ui.js` API parity
- Sweep parallel-lane dirty trees
