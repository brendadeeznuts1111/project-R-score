# Automation plans

This directory holds cross-product execution planning only. Runtime automation
belongs to the canonical root modules so proposals cannot fork the platform
contract.

| Owner | Purpose |
|-------|---------|
| [`enterprise-enhancement-plan.md`](enterprise-enhancement-plan.md) | Time-bounded cross-product plan |
| [`../../../lib/automation/`](../../../lib/automation/) | Sandbox WebView executor and reconciled Bun API contract |
| [`../../../lib/provisioning/`](../../../lib/provisioning/) | Queue state machine and automated-test runner |

The former `enhancements-1.0.01` package was removed: it was an unexecuted,
duplicated Bun 1.3 documentation dump with its own registry configuration and
no runtime consumer. Bun API truth stays in `lib/bun-runtime.md`,
`docs/BUN_NATIVE_CAPABILITIES.md`, and `tools/bun-doc-refs.ts`.
