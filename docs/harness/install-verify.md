# install:verify Journey Proof

**Claim**  
Running `bun run install:verify` succeeds, and a headless browser smoke report shows `#status = verified`.

**Evidence**

- **`tests/journey/install-verify.test.ts`** — runs real install:verify, materializes HTML, WebView assertion.  
  *Ratchet* → `bun run test:install-verify`

- **`lib/harness/proof.ts` / `PROOF.md`** — claim `install-verify-journey`.  
  *Ratchet* → proof inventory

**Ratchet**  
`bun run test:install-verify` (CI must pass)
