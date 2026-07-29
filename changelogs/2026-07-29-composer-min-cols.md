---
change_type: pack-native
pack_version: 1.4.2
previous_pack_version: 1.4.1
date: 2026-07-29
---

# v1.4.2 — Guard composer submission width

## Summary

Composer submission now treats terminal width as a precondition, temporarily zooming panes below the conservative 40-column default before touching the composer and refusing with a distinct exit `4` if they remain too narrow. The probe fails fast on narrow layouts instead of blaming agent keys, and the sibling-pane guidance documents the measured Cursor/Codex asymmetry, zoom cleanup, width-specific failure handling, and deferred completion-detection alternatives.
