---
change_type: pack-native
date: 2026-11-12
---

# Reviewer usage-limit policy and reset-crash guard (v1.23.0)

Top-level `reviewer_usage_limit` (`wait` or `skip`) sits after
`allow_agent_lifecycle` and is config-only. It applies when a usage or rate
limit stops a reviewer and no fallback substitute can take its review. `wait`
holds the gate until the limit resets, then finishes that review. `skip`
passes the gate on the remaining reviewers and reports the skipped one; with
none left, it holds the gate like `wait`. The owner's own review never stands
in. Failure handling records how CLIs treat a limited request: Claude Code
keeps and resumes it, Codex 0.167.1 drops it with its reset time.

`composer-submit.sh` now checks that the agent it verified idle still holds
the pane's foreground after the session reset and before every Enter. If the
agent has left, the helper discards the shell line and exits `2`; no
instruction is submitted. Muse Code 1.4.15 can exit about two seconds after
`/clear` on a session that did substantial work (`source session … is still
live; teardown must precede construct`). The helper used to type the next
instruction into the shell left behind. Muse resets are now watched for five
seconds.

Update the shipped defaults, the profiles contract, init, docs, and the
composer-submit tests.
