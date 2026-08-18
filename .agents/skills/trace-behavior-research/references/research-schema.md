# Research report schema

`behavior-research.json` contains:

- `schemaVersion`: integer version of the report contract.
- `source`: `{ root, files, sessions, messages }`; paths are absolute only for
  the explicitly supplied root.
- `clusters`: sorted repeated behaviors. Each item has `label`, `count`,
  `sessions`, `evidenceHash`, and `promotion`.
- `promotion`: `candidate` when the behavior meets the minimum count and session
  spread; otherwise `observe`.

The report never stores message bodies, credentials, URLs with query strings, or
arbitrary trace fields.
