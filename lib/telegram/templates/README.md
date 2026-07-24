# Telegram message templates

Partner-facing HTML cards + keyboards. Full integration spec: [`docs/harness/tenants/partner-onboarding-package.md`](../../../docs/harness/tenants/partner-onboarding-package.md).

| File | Role |
|------|------|
| `types.ts` | `TemplateId` · `TemplateContext` · `RenderedMessage` |
| `escape.ts` | HTML escape helpers |
| `registry.ts` | Template pack bodies + keyboards |
| `context.ts` | Profile + Soft + phone → `TemplateContext` |
| `render.ts` | `renderForNode` · `resolveTemplateIdForCard` |
| `index.ts` | Public re-exports |

```ts
import { renderForNode } from './render.ts';
const msg = renderForNode(db, 'balances.v1', treeNodeId);
// msg.text (HTML) · msg.keyboard (textKeys) · msg.parseMode === 'HTML'
```

Flow cards and `enqueuePartnerWelcomeEvent` both use this path. Keyboard labels resolve via [`flows/i18n.ts`](../flows/i18n.ts).
