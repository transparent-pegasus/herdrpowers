---
change_type: pack-native
pack_version: 1.4.3
previous_pack_version: 1.4.2
date: 2026-07-29
---

# v1.4.3 — Session independence, not pane identity

## Summary

Review independence is the reset session from each `composer-submit.sh` delegation, not a ban on reusing the implementing pane. Drop the "prefer a different agent type than the implementer" selection heuristic. Routing follows the resolved assignment only: `agent:` → one idle pane of that type; `agents:` → one delegation per listed type. Busy panes of a needed type still wait (never interrupt). Unreset continuing sessions must not self-review. No `roles.yaml` default or script changes.
