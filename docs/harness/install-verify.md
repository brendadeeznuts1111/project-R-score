# install:verify Journey Proof

**Claim**  
Running `bun run install:verify` succeeds, and a headless browser smoke report
shows `#status = verified`.

**Evidence**

- **`tests/journey/install-verify.test.ts`** — runs real install:verify,
  materializes HTML, WebView assertion, failure screenshot.  
  _Ratchet_ → `bun run test:install-verify`

- **`lib/harness/proof.ts` / `PROOF.md`** — claim `install-verify-journey`.  
  _Ratchet_ → proof inventory

**Ratchet**  
`bun run test:install-verify` (CI must pass)

**Fresh-rerun**  
`bun run test:install-verify` — paste output in the PR when touching this
journey ([`FRESH-RERUN.md`](FRESH-RERUN.md)).
