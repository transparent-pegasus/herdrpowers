---
change_type: pack-native
pack_version: 1.4.1
previous_pack_version: 1.4.0
date: 2026-07-29
---

# v1.4.1 — Default `final-branch-review` to Reviewer

## Summary

Shipped default for `assignments.final-branch-review` changes from `coder` to `reviewer`, so the whole-branch gate before the integration decision lands on a Reviewer pane by default (still `mode: delegate`, still independently of the implementing pane). Defaults live only in `skills/orchestration/roles.yaml`; workflow and docs tables keep pointing agents at the resolved YAML rather than restating the role.
