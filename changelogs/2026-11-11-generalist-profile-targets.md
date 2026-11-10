---
change_type: pack-native
date: 2026-11-11
---

# Planning-design and generalist profile keys; orchestrator alias for coder

Profiles accept `planning-design` and `generalist` with the same values as
`coder`. All three take a
nested target or bare `orchestrator`; `orchestrator`, null, `[]`, and `none`
bind to the owner; `reviewers: [orchestrator]` selects owner review. Shipped
profiles set `planning-design: orchestrator` and `generalist: orchestrator`; solo profiles set `coder: orchestrator`
and `reviewers: [orchestrator]`.
