# Operator research model files

Generated from `MODEL_CONTRACT_FILE_REGISTRY`. The registry is the typed source
of truth; this document is its human-readable accountability view.

Scopes are explicit: `self` is owned here, `generated` is a generated
projection, and `shared` claims only the role named in the table.

## Package: factorywager-enterprise

### Owner module: agent-odds-http

| Group   | File                                                                                         | Domain            | Role                                                  | Authority               | Channel | Scope  |
| ------- | -------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------- | ----------------------- | ------- | ------ |
| runtime | [`lib/operator-research/agent-odds-http.ts`](../../lib/operator-research/agent-odds-http.ts) | operator-research | Parse simulator alert rule input at the HTTP boundary | Agent odds HTTP runtime | runtime | shared |

### Owner module: alert-matching

| Group   | File                                                                                         | Domain            | Role                                           | Authority              | Channel | Scope  |
| ------- | -------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------- | ---------------------- | ------- | ------ |
| runtime | [`lib/operator-research/matching/alerts.ts`](../../lib/operator-research/matching/alerts.ts) | operator-research | Own closed alert pattern and delivery matching | Alert matching runtime | runtime | shared |

### Owner module: alert-vocabulary

| Group     | File                                                                                           | Domain            | Role                                                                        | Authority                          | Channel | Scope |
| --------- | ---------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------- | ---------------------------------- | ------- | ----- |
| contracts | [`lib/operator-research/alert-vocabulary.ts`](../../lib/operator-research/alert-vocabulary.ts) | operator-research | Own distinct closed edge, movement, alert, channel, and period vocabularies | Operator research alert vocabulary | runtime | self  |

### Owner module: contract-tests

| Group | File                                                                                   | Domain       | Role                                                            | Authority | Channel | Scope  |
| ----- | -------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- | --------- | ------- | ------ |
| tests | [`tests/agent-odds-http.test.ts`](../../tests/agent-odds-http.test.ts)                 | test-harness | Prove alert vocabularies are parsed at the HTTP boundary        | Bun test  | test    | shared |
| tests | [`tests/edge-engine.test.ts`](../../tests/edge-engine.test.ts)                         | test-harness | Prove edge runtime behavior at its public boundary              | Bun test  | test    | shared |
| tests | [`tests/model-circuit-contracts.test.ts`](../../tests/model-circuit-contracts.test.ts) | test-harness | Prove contract completeness, isolation, and file accountability | Bun test  | test    | self   |

### Owner module: edge-engine

| Group   | File                                                                                 | Domain            | Role                                                              | Authority                 | Channel | Scope  |
| ------- | ------------------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------------- | ------------------------- | ------- | ------ |
| runtime | [`lib/operator-research/edge-engine.ts`](../../lib/operator-research/edge-engine.ts) | operator-research | Project verified circuit inputs into model output and diagnostics | Operator research runtime | runtime | shared |

### Owner module: file-accountability

| Group     | File                                                                                                   | Domain            | Role                                                      | Authority                    | Channel       | Scope     |
| --------- | ------------------------------------------------------------------------------------------------------ | ----------------- | --------------------------------------------------------- | ---------------------------- | ------------- | --------- |
| commands  | [`tools/model-contracts.ts`](../../tools/model-contracts.ts)                                           | operator-research | Check or regenerate the file accountability projection    | Model contract CLI           | tooling       | self      |
| contracts | [`lib/operator-research/model-contract-files.ts`](../../lib/operator-research/model-contract-files.ts) | operator-research | Own typed file metadata and its Markdown projection       | MODEL_CONTRACT_FILE_REGISTRY | runtime       | self      |
| registry  | [`lib/operator-research/files.md`](../../lib/operator-research/files.md)                               | documentation     | Publish the human-readable file accountability projection | MODEL_CONTRACT_FILE_REGISTRY | documentation | generated |

### Owner module: markdown-policy

| Group         | File                                                                       | Domain            | Role                                                             | Authority                       | Channel       | Scope  |
| ------------- | -------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------- | ------------------------------- | ------------- | ------ |
| contracts     | [`lib/markdown/options.ts`](../../lib/markdown/options.ts)                 | operator-research | Own canonical explicit Bun Markdown parser options               | MARKDOWN_PRESET_README          | runtime       | shared |
| documentation | [`docs/BUN_NATIVE_CAPABILITIES.md`](../../docs/BUN_NATIVE_CAPABILITIES.md) | documentation     | Publish the bounded Bun Markdown structural-owner evidence block | Bun native capability inventory | documentation | shared |
| documentation | [`lib/markdown/README.md`](../../lib/markdown/README.md)                   | documentation     | Document the Bun Markdown parser and renderer boundary           | Markdown package guide          | documentation | shared |
| tests         | [`tests/markdown-options.test.ts`](../../tests/markdown-options.test.ts)   | test-harness      | Prove active-runtime Bun Markdown option behavior                | Bun test                        | test          | shared |

### Owner module: model-controls

| Group         | File                                                                                                       | Domain            | Role                                                   | Authority                    | Channel       | Scope |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------ | ---------------------------- | ------------- | ----- |
| configuration | [`config/operator-research/model-harness.toml`](../../config/operator-research/model-harness.toml)         | operator-research | Lock model intake and weight-isolation flags           | Model harness configuration  | configuration | self  |
| documentation | [`docs/harness/tenants/model-circuit-contracts.md`](../../docs/harness/tenants/model-circuit-contracts.md) | documentation     | Explain the model circuit ownership and proof boundary | Harness tenant documentation | documentation | self  |

### Owner module: operator-research

| Group         | File                                                                       | Domain        | Role                                           | Authority                       | Channel       | Scope  |
| ------------- | -------------------------------------------------------------------------- | ------------- | ---------------------------------------------- | ------------------------------- | ------------- | ------ |
| documentation | [`lib/operator-research/README.md`](../../lib/operator-research/README.md) | documentation | Route operators to runtime and contract owners | Operator research package guide | documentation | shared |

### Owner module: package-commands

| Group    | File                                 | Domain                | Role                                            | Authority               | Channel    | Scope  |
| -------- | ------------------------------------ | --------------------- | ----------------------------------------------- | ----------------------- | ---------- | ------ |
| commands | [`package.json`](../../package.json) | repository-governance | Expose model contract check and update commands | Package script registry | repository | shared |

### Owner module: property-contracts

| Group     | File                                                                                         | Domain            | Role                                                           | Authority                | Channel | Scope |
| --------- | -------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------- | ------------------------ | ------- | ----- |
| contracts | [`lib/operator-research/model-contracts.ts`](../../lib/operator-research/model-contracts.ts) | operator-research | Own aggregate-aware property, flag, and weight-input contracts | MODEL_PROPERTY_CONTRACTS | runtime | self  |

### Owner module: repository-policy

| Group  | File                             | Domain                | Role                                                      | Authority                | Channel    | Scope  |
| ------ | -------------------------------- | --------------------- | --------------------------------------------------------- | ------------------------ | ---------- | ------ |
| policy | [`.gitignore`](../../.gitignore) | repository-governance | Expose the model harness configuration to version control | Repository ignore policy | repository | shared |

### Owner module: signal-matching

| Group   | File                                                                                           | Domain            | Role                                    | Authority               | Channel | Scope  |
| ------- | ---------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------- | ----------------------- | ------- | ------ |
| runtime | [`lib/operator-research/matching/signals.ts`](../../lib/operator-research/matching/signals.ts) | operator-research | Own normalized movement signal matching | Signal matching runtime | runtime | shared |

### Owner module: snapshot-harness

| Group     | File                                                                                                                         | Domain       | Role                                                   | Authority                   | Channel  | Scope     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------ | --------------------------- | -------- | --------- |
| registry  | [`lib/portal/bun-test-snapshots.ts`](../../lib/portal/bun-test-snapshots.ts)                                                 | test-harness | Register the model-circuit snapshot suite              | Bun snapshot suite registry | test     | shared    |
| snapshots | [`tests/__snapshots__/model-circuit-contracts.test.ts.snap`](../../tests/__snapshots__/model-circuit-contracts.test.ts.snap) | test-harness | Capture the reviewed model circuit contract projection | Bun test snapshot output    | snapshot | generated |

### Owner module: wiki-navigation

| Group      | File                                   | Domain        | Role                                                     | Authority                | Channel       | Scope  |
| ---------- | -------------------------------------- | ------------- | -------------------------------------------------------- | ------------------------ | ------------- | ------ |
| navigation | [`wiki-index.md`](../../wiki-index.md) | documentation | Link the model circuit tenant from repository navigation | Wiki navigation registry | documentation | shared |
