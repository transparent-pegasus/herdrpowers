---
change_type: pack-native
date: 2026-11-11
---

# Profile overrides and revised presets

Profiles can override `fallbacks`, `delegation`, and `assignments` per key,
including individual assignment fields. Omitted keys keep config/default
values; lists replace, including empty lists. Lifecycle permission remains
config-only. The lifecycle helper accepts the frozen resolved pane scope
through `HERDRPOWERS_PANE_SCOPE`, preserving profile scope overrides while
keeping its permission and scope guards.

Rename `fable-sol-panel.yaml` and `fable-opus-panel.yaml` to
`fable-sol-ultra.yaml` and `fable-opus-ultra.yaml` without changing their
targets. Replace `astra-sol.yaml` and `fable-opus.yaml` with `sol-astra.yaml`
and `opus-fable.yaml`: Sol/Opus owns execution, Astra/Fable handles planning
and one review, all at `max` effort. Both set `coder` and `generalist` to
`orchestrator` and override only `assignments.plan-and-design.mode` to
`delegate`. Every preset keeps `planning-design` first and `generalist` last.

Synchronize workflow/skill instructions, configuration docs, preset names,
and npm package expectations. Add regression coverage for resolved lifecycle
scope, including narrowing, invalid values, and unchanged permission denial.
