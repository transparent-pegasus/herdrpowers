# Final Review and Finish

This reference belongs to `pane-driven-development`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

## Final Review

Skipped when the calling workflow's `assignments.final-branch-review` gate is
disabled; go straight to Finish and say the branch is unreviewed.

The final whole-branch review gets a package too: run
`bash scripts/review-package PLAN_FILE MERGE_BASE HEAD` (MERGE_BASE = the commit the
branch started from, e.g. `git merge-base <BASE_BRANCH> HEAD`) and include the
printed path in the final review brief, so the final reviewer reads
one file instead of re-deriving the branch diff with git commands. Delegate it
to any idle pane of the resolved role's agent type(s) via a reset-backed submit —
using `requesting-code-review`'s
[review-brief.md](../../requesting-code-review/review-brief.md). Point it at
the ledger's deferred-minor and parked lines so it can triage which must be
fixed before merge.

Rule on every line of the review's "Declined to judge" list as you would a
plan conflict — `Final: Ruling: <behavior the reviewer set aside> — <why it
stands, or why it is now a finding> — <cost if wrong>` — so nothing the
reviewer set aside is dropped silently. One that becomes a finding joins the
fix wave below.

If the final whole-branch review returns findings, delegate ONE fix pane
with the complete findings list — not one pane per finding.
Per-finding fixers each rebuild context and re-run suites; a real
session's final-review fix wave cost more than all its tasks combined.
Then run exactly one scoped re-review of the fix wave
(`bash scripts/review-package PLAN_FILE FIX_BASE HEAD`,
[re-review-brief.md](../re-review-brief.md)).
Adjudicate any residual findings as in the task loop's breaker: park with
rulings, or rule on the load-bearing ones and ledger what you decided. Only
the four stop-classes named at the top of this skill stop you here. There is
no second fix wave — residual load-bearing findings surface to your human
partner when finishing-a-development-branch presents the options.

## Finish

Before you delete anything, collect every ledger line containing `Ruling:` —
preflight rulings, parked findings, breaker adjudications, all of them — into
your final report under "Rulings I made", in the order you made them, each
with what it costs if wrong. The list is exhaustive: if the ledger holds a
ruling, the list holds it. That list is the only place the decisions you took
on your human partner's behalf reach them — they read it and rework whatever
you got wrong. A ruling that dies with the workspace was a decision made in
secret. It goes in the same report that names every assignment the repository
changed and every disabled gate.

When the final whole-branch review is clean and its fixes are merged,
delete this plan's workspace (`rm -rf <workspace>`) — the git history is
the record now. Sibling directories belong to other plans; leave them
alone.

Use `finishing-a-development-branch`.
