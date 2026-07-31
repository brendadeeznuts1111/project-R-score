# Repository rulesets

These JSON files are the reviewed source contract for GitHub repository rules.
They are applied through the GitHub repository-rulesets API and verified against
the live repository after every policy change.

- `main.json` requires a pull request, a linear history, resolved review
  threads, and the harness, type, security, and isolated portal checks.
- `release-tags.json` accepts FactoryWager `v*` version names while preventing
  an existing release tag from being updated or deleted.

No actor has an always-bypass entry. A release tag is created once and pushed by
its exact ref; bulk `git push --tags` is outside the release contract.

GitHub contract:
<https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset>
