# Peer Enterprise Operations

Peer Enterprise Operations is a Bun + TypeScript application for running a Peer.xyz offramp team with stronger separation between:

- internal app authentication
- wallet-owned Peer execution
- member-owned payout identities
- optional extension-based onramp flows

The repo now presents two enterprise surfaces:

- `/index.html`: operations app for readiness, deposit creation, tracked deposit management, compliance monitoring, and secondary Peer tooling
- `/`: management portal for approvals, member administration, invites, audit records, funds tracking, and compliance review

## Architecture

### Frontend structure

- `/Users/nolarose/Projects/peer/src/services`
  - typed API client, runtime wallet/extension integration, realtime poller, local enterprise state
- `/Users/nolarose/Projects/peer/src/types`
  - shared TypeScript types and zod schemas for API responses and enterprise UI state
- `/Users/nolarose/Projects/peer/src/components`
  - reusable summary, badge, audit, and rendering helpers
- `/Users/nolarose/Projects/peer/src/utils`
  - DOM helpers, formatters, RBAC, validators, and deposit filtering/pagination
- `/Users/nolarose/Projects/peer/src/client.ts`
  - operations entrypoint
- `/Users/nolarose/Projects/peer/src/portal.ts`
  - management portal entrypoint
- `/Users/nolarose/Projects/peer/public/index.html`
  - enterprise operations shell
- `/Users/nolarose/Projects/peer/public/portal.html`
  - enterprise portal shell
- `/Users/nolarose/Projects/peer/public/styles.css`
  - shared design system and responsive layout

### Backend shape

`/Users/nolarose/Projects/peer/src/server.ts` remains a lightweight Bun server with SQLite-backed persistence and a separate browser build step. It exposes:

- auth/session endpoints
- org and team summaries
- member, invite, approval, and funds mutation endpoints
- Peer execution-context and deposit-preview endpoints
- Peer doc and currency metadata endpoints

### Runtime validation

All primary API responses consumed by the frontend are validated with zod schemas in `/Users/nolarose/Projects/peer/src/types/schemas.ts`.

## Product model

This repo does not model one shared Peer team account.

Instead:

1. Teammates sign into this app individually.
2. A payout owner maintains their own payout identifiers.
3. An authorized operator selects the payout owner.
4. The connected wallet owns any deposit created through the app.
5. The Peer extension remains an optional buyer-side surface.

Supported payout identity normalization:

- `venmo` -> `venmoUsername`
- `cashapp` -> `cashtag`
- `paypal` -> `paypalEmail`

## Enterprise features in this build

- strict typed API layer with retries and runtime validation
- role-based UI access for `Operator`, `Admin`, `Compliance`, and `Viewer`
- filterable, exportable audit trail
- tracked deposit management with filters, bulk actions, and pagination
- local realtime poller abstraction ready to replace with sockets later
- compliance dashboard with seeded cases and reports
- settings surface for notifications, Telegram, API keys, divisions, and feature flags
- command palette and keyboard shortcuts in the operations app
- summary-first drawer experience for member records

## Peer SDK coverage

The app is wired around `@zkp2p/sdk` and supports:

- wallet connection through `Zkp2pClient` / `OfframpClient`
- payment catalog loading through `getPaymentMethodsCatalog()`
- extension state and optional onramp launching through `createPeerExtensionSdk()`
- deposit preview from the local server contract
- graceful runtime handling for `registerPayeeDetails()` and `createDeposit()` when available in the connected runtime

The app stays defensive because this repo is still a local demo environment, not a production custody or auth stack.

## Configuration

Runtime browser config lives in `/Users/nolarose/Projects/peer/src/config.ts`.

Supported fields:

- `apiBaseUrl`
- `chainId`
- `catalogEnv`
- `pollingIntervalMs`
- `slowPollingIntervalMs`
- `enableMockRealtime`
- `enableComplianceDashboard`
- `defaultRole`

You can override these at runtime with `window.__PEER_CONFIG__`.

## Development

Install and run:

```bash
bun install
bun run build
bun dev
```

Then open:

- [http://localhost:3000/](http://localhost:3000/)
- [http://localhost:3000/index.html](http://localhost:3000/index.html)

## Verification

Static verification:

```bash
bun run build
bun test
bun run typecheck
```

Browser validation should include:

- sign-in and sign-out on both surfaces
- payout-owner selection and execution-context rendering
- deposit preview generation
- deposit table filtering, pagination, and bulk actions
- approval actions and member drawer interactions
- responsive layout checks on narrow viewports

## Contribution guidelines

- keep runtime validation in sync with any API change
- prefer adding reusable renderers/helpers before expanding entrypoint complexity
- keep Peer ownership boundaries explicit in copy and code
- avoid introducing framework-heavy client dependencies
- do not replace member-owned payout identifiers with vague “connected accounts” language
- keep auditability, safety, and role gating ahead of convenience

## Remaining production TODOs

- replace local username/password auth with a real identity provider and managed session infrastructure
- wire websocket or event-stream transport for true realtime status updates
- add full end-to-end browser automation for wallet-enabled environments
- add secure API key storage and rotation backend
- wire production custody, chain monitoring, and alert delivery systems
