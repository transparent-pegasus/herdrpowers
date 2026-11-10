---
change_type: pack-native
date: 2026-11-11
---

# Roles block format (v1.22.0)

Roles take their binding directly under `roles:` in shipped defaults, config,
and profiles: one target, `orchestrator`, or a list. A list still means one
delegation per entry. The `reviewer` role becomes `reviewers`, matching the
profile key; review assignments use `role: reviewers`.

Each shipped role key carries its description as an end-of-line comment, for
reference when defining custom roles. Init writes the same comments.

Profiles put top-level `orchestrator` first, then `roles` (`planning-design`
first, `generalist` last), then override maps such as `assignments`. Profile
`roles` accept custom role keys; unknown top-level keys remain errors. Custom
roles act only through assignments.

Legacy `agent:`/`agents:`/`description:` sub-keys, the `reviewer` key, and
pre-1.22 top-level profile role keys stay readable as migration input. Init
rewrites config in the new form and moves a legacy description into the key
comment; it still never rewrites local profiles.

Update all six presets, the profiles contract, init, docs, and tests.
