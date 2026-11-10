---
change_type: pack-native
date: 2026-11-11
---

# Allow Generalist targets in profiles

Profile `generalist` now accepts the same nested herdr kind/model/effort target
as other target slots. A profile target or `orchestrator` alias overrides the
repository's `roles.generalist`; literal `none` and an omitted key preserve the
repository binding. The profile reference and init guidance define the rule,
and the profile contract test guards it.
