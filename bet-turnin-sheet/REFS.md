# Reference Registry

Canonical **Ref IDs** for this project. Cite these in specs, code comments, commits, and PRs.

| Document | Role |
|----------|------|
| **REFS.md** (this file) | Human-readable registry (URLs synced to refs.json) |
| [refs.json](refs.json) | Machine-readable SSOT (validated by audit) |
| [README.md](README.md) | Overview; links here for full registry |
| [OUTLINE.md](OUTLINE.md) | Architecture and phases |
| [spec.html](spec.html) | Interactive v2.6 spec |

## Audit status

> **Canonical data:** [refs.json](refs.json) · **Schema:** [refs.schema.json](refs.schema.json)
> **Run:** `bun run audit:refs --fix` · **CI:** `bun run audit:refs --strict` · **Offline:** `bun run audit:refs:offline` · **Fresh URLs:** `bun run audit:refs --no-cache`
> **Last audit:** 2026-06-28 · **Status:** pass · **Refs:** 36 · [JSON](ref-audit.json) · [Report](ref-audit.md)

| Check | Description |
|-------|-------------|
| Zod schema | refs.json structure validated on every run |
| URL health | Parallel HEAD/GET with retry + 24h cache |
| ID drift | All cited Ref IDs exist; unused refs reported |
| Nav contract | spec.html `data-ref` + `REFS.md#ref-*` in registry nav |
| REFS sync | REFS.md table URLs match refs.json |
| Pairings | All pairing refs resolve |
| Cross-ref matrix | `crossRefMatrix` specs and external refs valid |

## How to cite

Machine-readable registry: [refs.json](refs.json). Edit JSON first; keep REFS.md table URLs in sync.

```typescript
// B03 — Bun.serve webhook
// E02 — Effect Schema validation
// SPEC-04 — command behavior matrix
```

In prose: *Per **B04** and **SPEC-03**, the daily summary cron…*

### Usage in spec.html (DOC-03)

Every **SPEC-01–SPEC-09** section in [spec.html](spec.html) includes:

- An **h2 ref-pill** linking back to this registry (`#ref-spec-XX`)
- A **ref-bar** (section + related API Ref IDs → `REFS.md`)
- **Inline ref-tags** on tables, rules, code blocks, and demo tabs where applicable

Navigate the spec via sticky nav / sidebar **SPEC-XX** labels, or jump from any tag to the canonical entry here.

---

## Prefixes

| Prefix | Range | Meaning |
|--------|-------|---------|
| **B** | B01–B08 | Bun runtime & APIs |
| **E** | E01–E05 | Effect |
| **T** | T01–T05 | grammY / Telegram |
| **S** | S01–S05 | Google Sheets API |
| **SPEC** | SPEC-01–SPEC-09 | Internal [spec.html](spec.html) sections |
| **DOC** | DOC-01–DOC-04 | Project documents |

---

## External references

### Bun (B01–B08)

<a id="bun-b01-b08"></a>

| Ref ID | Topic | Documentation | Project use |
|--------|-------|---------------|-------------|
| [B01](#ref-b01) | Runtime overview | [bun.com/docs](https://bun.com/docs) | TypeScript runtime and tooling |
| [B02](#ref-b02) | TypeScript & types | [Runtime → TypeScript](https://bun.com/docs/runtime/typescript) | `bun-types`, strict typing |
| [B03](#ref-b03) | HTTP server (`Bun.serve`) | [API → HTTP](https://bun.com/docs/api/http) | Telegram webhook endpoint |
| [B04](#ref-b04) | Cron (`Bun.cron`) | [Runtime → Cron](https://bun.com/docs/runtime/cron) | Daily summary, integrity check |
| [B05](#ref-b05) | Environment (`Bun.env`) | [Runtime → Env](https://bun.com/docs/runtime/env) | Bot token, sheet ID, cache TTL |
| [B06](#ref-b06) | File I/O (`Bun.file`) | [API → File I/O](https://bun.com/docs/api/file-io) | Config JSON, service-account file |
| [B07](#ref-b07) | Package manager | [install](https://bun.com/docs/pm/cli/install) | Dependency setup (future) |
| [B08](#ref-b08) | Test runner | [Test runner](https://bun.com/docs/test) | Unit/integration tests (future) |

### Effect (E01–E05)

<a id="effect-e01-e05"></a>

| Ref ID | Topic | Documentation | Project use |
|--------|-------|---------------|-------------|
| [E01](#ref-e01) | Overview | [effect.website/docs](https://effect.website/docs) | Typed services, error handling |
| [E02](#ref-e02) | Schema | [Schema introduction](https://effect.website/docs/schema/introduction/) | Command + config validation |
| [E03](#ref-e03) | Layers & services | [Requirements management](https://effect.website/docs/requirements-management/layers) | `ConfigService`, `SheetApiService` |
| [E04](#ref-e04) | Retry | [Retrying](https://effect.website/docs/error-management/retrying) | Cron failure recovery |
| [E05](#ref-e05) | `Effect.gen` | [Getting started](https://effect.website/docs/getting-started/introduction) | Cron workflows, handlers |

### grammY & Telegram (T01–T05)

<a id="grammy-telegram-t01-t05"></a>

| Ref ID | Topic | Documentation | Project use |
|--------|-------|---------------|-------------|
| [T01](#ref-t01) | grammY guide | [grammy.dev/guide](https://grammy.dev/guide/) | Bot setup, command routing |
| [T02](#ref-t02) | Webhooks | [Deployment — Webhooks](https://grammy.dev/guide/deployment-types.html) | Webhook via B03 |
| [T03](#ref-t03) | Inline keyboards | [Keyboard plugin](https://grammy.dev/plugins/keyboard.html) | Big-ticket Confirm/Cancel |
| [T04](#ref-t04) | Forum topics | [Bot API — forum topics](https://core.telegram.org/bots/api#forum-topic-edited) | `message_thread_id` mapping |
| [T05](#ref-t05) | Bot API | [core.telegram.org/bots/api](https://core.telegram.org/bots/api) | Updates, callbacks |

### Google Sheets (S01–S05)

<a id="google-sheets-s01-s05"></a>

| Ref ID | Topic | Documentation | Project use |
|--------|-------|---------------|-------------|
| [S01](#ref-s01) | Overview | [API concepts](https://developers.google.com/sheets/api/guides/concepts) | Spreadsheet and tab layout |
| [S02](#ref-s02) | Append rows | [Values — append](https://developers.google.com/sheets/api/guides/values#append_values) | BetLog, PaymentLog, AuditLog |
| [S03](#ref-s03) | Read values | [Values — read](https://developers.google.com/sheets/api/guides/values) | Config tab, cron reads |
| [S04](#ref-s04) | Service account | [Authorizing](https://developers.google.com/sheets/api/guides/authorizing#service-account) | Credentials |
| [S05](#ref-s05) | REST append | [values.append](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append) | HTTP API reference |

<!-- external ref anchors -->
<a id="ref-b01"></a><a id="ref-b02"></a><a id="ref-b03"></a><a id="ref-b04"></a><a id="ref-b05"></a><a id="ref-b06"></a><a id="ref-b07"></a><a id="ref-b08"></a>
<a id="ref-e01"></a><a id="ref-e02"></a><a id="ref-e03"></a><a id="ref-e04"></a><a id="ref-e05"></a>
<a id="ref-t01"></a><a id="ref-t02"></a><a id="ref-t03"></a><a id="ref-t04"></a><a id="ref-t05"></a>
<a id="ref-s01"></a><a id="ref-s02"></a><a id="ref-s03"></a><a id="ref-s04"></a><a id="ref-s05"></a>

---

## Internal spec sections (SPEC-01–SPEC-09)

<a id="internal-spec-sections"></a>

Sections in [spec.html](spec.html). Use when citing project requirements (not external APIs).

| Ref ID | Section | spec.html | Related external Ref IDs |
|--------|---------|-----------|--------------------------|
| [SPEC-01](#ref-spec-01) | Changelog | [#changelog](spec.html#changelog) | — |
| [SPEC-02](#ref-spec-02) | Hub & partner config | [#hub-config](spec.html#hub-config) | E02, B05, S03 |
| [SPEC-03](#ref-spec-03) | Scheduled jobs | [#scheduled-jobs](spec.html#scheduled-jobs) | B04, E04, E05 |
| [SPEC-04](#ref-spec-04) | Command matrix | [#command-matrix](spec.html#command-matrix) | T01, T04, T05 |
| [SPEC-05](#ref-spec-05) | Edge cases | [#edge-cases](spec.html#edge-cases) | E02, T03 |
| [SPEC-06](#ref-spec-06) | Sheet contracts | [#sheet-contracts](spec.html#sheet-contracts) | S01, S02, S05 |
| [SPEC-07](#ref-spec-07) | Rules summary | [#rules-summary](spec.html#rules-summary) | T03, T04, B04 |
| [SPEC-08](#ref-spec-08) | Architecture | [#architecture](spec.html#architecture) | B03, B04, T02, E03 |
| [SPEC-09](#ref-spec-09) | Interactive demo | [#mockup](spec.html#mockup) | T03, T04 |

<a id="ref-spec-01"></a><a id="ref-spec-02"></a><a id="ref-spec-03"></a><a id="ref-spec-04"></a><a id="ref-spec-05"></a>
<a id="ref-spec-06"></a><a id="ref-spec-07"></a><a id="ref-spec-08"></a><a id="ref-spec-09"></a>

---

## Project documents (DOC-01–DOC-04)

<a id="project-documents"></a>

| Ref ID | Document | Description |
|--------|----------|-------------|
| [DOC-01](#ref-doc-01) | [README.md](README.md) | Overview and quick reference |
| [DOC-02](#ref-doc-02) | [OUTLINE.md](OUTLINE.md) | Architecture, phases, acceptance criteria |
| [DOC-03](#ref-doc-03) | [spec.html](spec.html) | Full v2.6 spec — every section tagged with SPEC-XX ref-bars |
| [DOC-04](#ref-doc-04) | [REFS.md](REFS.md) | This registry |

<a id="ref-doc-01"></a><a id="ref-doc-02"></a><a id="ref-doc-03"></a><a id="ref-doc-04"></a>

---

## Cross-reference matrix

Quick lookup: spec section → external refs → implementation phase ([OUTLINE](OUTLINE.md#implementation-phases)). Machine-readable copy: [refs.json](refs.json) `crossRefMatrix`.

| SPEC | External Ref IDs | OUTLINE phase |
|------|------------------|---------------|
| SPEC-02 | E02, B05, S03 | Phase 1 |
| SPEC-03 | B04, E04, E05 | Phase 4–5 |
| SPEC-04 | T01, T04, T05 | Phase 2 |
| SPEC-05 | E02, T03 | Phase 2–3 |
| SPEC-06 | S01, S02, S05 | Phase 2 |
| SPEC-07 | T03, T04 | Phase 3 |
| SPEC-08 | B03, T02, E03 | Phase 0–2 |
| SPEC-09 | T03, T04 | Phase 3, 6 |

---

## Key pairings

| Use case | Ref IDs |
|----------|---------|
| Webhook server | B03 + T02 + SPEC-08 |
| Cron daily summary | B04 + E04 + E05 + SPEC-03 |
| Big-ticket confirm | T03 + SPEC-05 + SPEC-07 + SPEC-09 |
| Topic → partner mapping | T04 + SPEC-04 + SPEC-07 |
| Log bet to sheet | E02 + S02 + SPEC-04 + SPEC-06 |
| Live config reload | S03 + E02 + SPEC-02 |
| Parser validation errors | E02 + SPEC-05 |

---

## Index by prefix

| Prefix | IDs |
|--------|-----|
| Bun | B01 · B02 · B03 · B04 · B05 · B06 · B07 · B08 |
| Effect | E01 · E02 · E03 · E04 · E05 |
| grammY/Telegram | T01 · T02 · T03 · T04 · T05 |
| Google Sheets | S01 · S02 · S03 · S04 · S05 |
| Spec sections | SPEC-01 … SPEC-09 |
| Documents | DOC-01 … DOC-04 |
