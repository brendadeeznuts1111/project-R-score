# Claim Discovery Questionnaire

Every new proof claim **must** answer these questions in order.  
Skipping one leaves a visible hole — agents can’t hide from an unanswered question.  
The answers become the claim’s artifacts: `proof.ts` entry, doc bullets, contract test, and fresh‑rerun hook.

---

### 0. Classify the claim and choose the ceremony path

**Is this a new proof type, or a variant of an existing one?**  
Examples: `journey`, `type-check island`, `ratchet-import`, `cron`, etc.  
If novel, name the new archetype and explain why.

**→ Based on classification, pick the ceremony path:**

- **Island / ratchet** (type-check islands, import ratchets, coherence slices) → **Slim path**  
  *Only* `proof.ts` entry, doc index bullets, contract test, config owner. No separate test file or doc brief.
- **Journey** (install‑verify, search‑governance, cron‑os‑persistent) → **Full path**  
  Test file, doc brief, package scripts, CI smoke/workflow integration.
- **Maintenance runbook** (spine tenant continuous maintenance) → **Slim path + runbook**  
  `TenantRunbook` in [`lib/harness/maintenance.ts`](../../lib/harness/maintenance.ts), markdown under `docs/harness/tenants/<tenant>.md`, spine tenant entry, contract `bun run test:tenant-runbooks`. No separate journey test unless the proofId needs one.

**Answer:** …  
**Ceremony path:** slim / full / maintenance-runbook

---

### 1. What is the claim in one sentence?

This becomes the `claim` field in `ProofPath`, the heading in any doc brief, and the test suite name.

**Answer:** …

---

### 2. What exactly is the ratchet command that proves it?

A single shell command that exits 0 on success. No vague descriptions.

**Answer:** `bun run …` or `bun test …` etc.

- For a test, specify the exact test file(s).  
- For a type‑check island, it’s `bun run type-check` (the include glob must be in `tsconfig.check.json`).

---

### 3. What artifacts will be created or modified?

List all file paths, using the ceremony path from Q0.

**Always required (both paths):**
- `lib/harness/proof.ts` — new `ProofPath` entry
- `docs/harness/PROOF.md` — bullet under the appropriate section
- `docs/harness/README.md` — ratchet bullet added
- `tests/harness-fresh-rerun-contract.test.ts` — new contract assertion

**Full path only:**
- `tests/journey/<claim-id>.test.ts` (or `tests/…` specific test file)
- `docs/harness/<claim-id>.md` — terminal‑first brief
- `package.json` — `test:<id>` and `docs:<id>` scripts
- CI workflow or path filter update (see Q8)

**Answer:** … (list each path and the action: create / modify)

---

### 4. What is the fresh‑rerun command?

Must be the exact command that reproduces the evidence from a clean checkout.  
Usually identical to the ratchet command, but must be explicit.  
For islands: often `bun run type-check`. For journeys: the named script (e.g., `bun run test:cron-os`).

**Answer:** `bun run …`

- If it requires environment setup, describe it here and harden it in the implementation.  
- Link to [`FRESH-RERUN.md`](FRESH-RERUN.md) for the PR body requirement.

---

### 5. How will this claim fail?

Define the failure mode. If the test fails, what does it prove? If the claim is violated, what’s the first observable symptom?  
This ensures the claim is falsifiable and the test isn’t tautological.

**Answer:** …

---

### 6. What is the smallest possible implementation that satisfies the claim?

Resist adding features. Describe the minimum code necessary — typically a single test file with one assertion (for journeys) or a tsconfig include + error burn (for islands). The answer becomes the skeleton for the implementation.

**Answer:** … (pseudocode or bullet steps)

---

### 7. Does this claim duplicate or overlap an existing claim?

Search `proof.ts` and existing contracts. If yes, justify the addition or modify the existing claim instead.

**Answer:** … (list existing claim IDs or “none”)

---

### 8. How is this claim enforced in CI?

Many claims are enforced by the existing `test:changed` / harness gates and the contract test, not a dedicated workflow.  
Be precise: which existing job already runs this, or what minimal CI change is needed?

For journeys, `CI_SPINE_SMOKE_TESTS` in `proof.ts` is often the hook. For islands, `type-check` already runs on `tsconfig.check.json` changes.

**Answer:** … (e.g., “covered by `bun run test:changed` because the test file matches the path filter”; or “add a step to `.github/workflows/journey.yml` triggering on `tests/journey/<id>.test.ts`”)

---

### 9. Who is the human owner if the claim breaks?

An owner accountable for fixing it, beyond the agent who wrote it. Encode as a comment in `proof.ts` (`// owner: …`) and, if appropriate, in [`AUTHORITY.md`](AUTHORITY.md). The `ProofPath` type does not include an `owner` field.

**Answer:** …

---

### 10. (Full path only) Doc brief content

Write the entire terminal‑first brief for `docs/harness/<claim-id>.md`.  
Follow the rule: **bold key, plain value, sub‑bullets for ratchet**.

**Answer:** (produce the complete brief — see [`cron.md`](cron.md) for template)

---

### 11. Contract test assertion(s)

Write the exact code to add to `tests/harness-fresh-rerun-contract.test.ts`.  
At minimum, assert that the claim exists and its `freshRerun` equals the command from Q4.  
For type‑check islands, also assert that the `include` glob is present in `tsconfig.check.json` (or the relevant config owner).  
Copy‑paste ready.

**Answer:** (code block)

---

### 12. Proof entry object

Write the exact `ProofPath` object for `lib/harness/proof.ts`:

```ts
export type ProofPath = {
  id: string; // opaque catalog key
  claim: string; // one‑sentence claim (from Q1)
  kinds: ProofKind[]; // unit | boundary | journey | deployed (choose appropriate)
  evidence: string[]; // paths or commands that demonstrate the claim
  freshRerun: string; // exact command (from Q4)
};
```

Include a `// owner: …` comment above or inline.

**Answer:** (copy‑paste ready object)

---

### 13. (Full path only) Package.json scripts

List the new scripts and their commands.

**Answer:**

```json
"test:<id>": "bun test tests/journey/…",
"docs:<id>": "bun run scripts/docs-…"
```

---

### 14. Post‑implementation: attach fresh‑rerun evidence

Before pushing, paste the output of the fresh‑rerun command here.  
This is the non‑lazy gate: the answer box must contain terminal output showing success.  
Mirrors [`FRESH-RERUN.md`](FRESH-RERUN.md) — the output also goes in the PR body.

**Answer:**

```
$ bun run …
… (output showing pass)
```

---

**When all questions are answered, the claim is ready to commit. No additional documentation or ceremony required — the answers are the plan, the design, and the audit trail.**
