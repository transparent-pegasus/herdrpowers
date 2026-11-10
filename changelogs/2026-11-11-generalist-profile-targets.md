---
change_type: pack-native
date: 2026-11-11
---

# Generalist profile key; orchestrator alias for coder

Profiles accept `generalist` with the same values as `coder`. Both take a
nested target or bare `orchestrator`; `orchestrator`, null, `[]`, and `none`
bind to the owner; `reviewers: [orchestrator]` selects owner review. Shipped
profiles set `generalist: orchestrator`; solo profiles set `coder: orchestrator`
and `reviewers: [orchestrator]`.
