---
change_type: pack-native
date: 2026-10-19
---

# Plugin scanner review follow-up

## Summary

- Correct the Codex marketplace entry to load the repository root through a
  local source path.
- Add the catalog's SHA-pinned plugin scanner workflow for pushes and pull
  requests, with a minimum score of 80 and read-only repository permissions.
- Add Dependabot updates for pinned actions, a security reporting policy,
  and exclusions for local artifacts in `.codexignore`.
- Record the original 77/100 scan, exact local reproduction commands, and
  dispositions for all 14 findings in `.github/SCANNER.md`. Retain documented
  findings for the dependency-free package and omitted presentation metadata
  without scanner suppressions or policy overrides.
