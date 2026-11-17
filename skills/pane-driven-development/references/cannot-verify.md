# Cannot-Verify Findings

This reference belongs to `pane-driven-development`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

The task reviewer may report "⚠️ Cannot verify from diff" items — requirements
that live in unchanged code or span tasks. These do not block the rest of the
review, but you must route each one through `decision-making` (`decision-maker`)
before marking the task complete, supplying the plan, spec, and cross-task
ledger context the reviewer lacks. If the `decision-maker` confirms an item is a
real gap, treat it as a failed spec review — it enters the fix loop with the
other findings.
