---
change_type: pack-native
pack_version: 1.4.4
previous_pack_version: 1.4.3
date: 2026-07-31
---

# v1.4.4 — Reject bare slash tokens before composer submission

## Summary

A bare `/word` anywhere in an instruction opens the composer's slash-command popup during the paste, and the helper's `esc` + `enter` then submits a corrupted or truncated string — observed on cursor-agent as an idle pane with no completion marker and a garbled fragment, sometimes run as a shell command. `composer-submit.sh` now rejects single-segment slash tokens with exit `2` before touching the pane; multi-segment absolute paths (`/abs/path/to/worktree`) are unaffected. The sibling-pane guidance documents the failure mode under "Autocomplete is a lie", in the exit-code list, and in the task contract next to the single-line rule.
