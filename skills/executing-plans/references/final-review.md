# Inline Execution: Final Review and Finish

This reference belongs to `executing-plans`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

## Final Review

Skipped when `assignments.final-branch-review` is disabled — inside a
workflow, the gate is the workflow's. Write `Final review: disabled by
configuration` to the ledger, go straight to Finish, and say the branch is
unreviewed.

Run `bash ../pane-driven-development/scripts/review-package PLAN_FILE MERGE_BASE HEAD`
by its absolute path, from the working tree you're executing in (MERGE_BASE = the commit the branch started from, e.g.
`git merge-base <BASE_BRANCH> HEAD`); the file it prints is the review's
diff.

**Resolve the enabled gate first:** read `orchestration`'s
[profiles contract](../../orchestration/references/profiles.md) and use
`requesting-code-review`. Separate delegated targets use reset-backed panes;
selected-profile self-target `delegate` requires a fresh subagent, including
empty reviewers. Other owner-session modes permit self-review and an optional
subagent at the active owner's judgment. No-profile orchestrator-mode review
still requires a fresh subagent. Use its
[review-brief.md](../../requesting-code-review/review-brief.md) with the
package path. In `[PLAN_OR_REQUIREMENTS]`, give the plan and spec paths,
the user's requirements for this task verbatim and in the order given (the
reviewer returns a verdict on each), the plan's Review Focus section verbatim if it has one (the input classes
and failure modes the plan's tests do not exercise — the reviewer checks
each deliberately), and a pointer to the ledger's `Ruling:` lines so it can
weigh the calls you made. Record the actual reviewer and transport; owner-session
self-review is not independent. Missing mandatory subagent capability means
an unavailable gate, never inline substitution or a passed review.

**No reviewer available:** an unavailable reviewer slot (no pane of its
agent type in scope, no substitute) takes `orchestration`'s subagent fallback
while `delegation.subagent_fallback` is true: a fresh subagent of your own
kind gets review-brief.md and the package. When nothing can take the review
(typically outside herdr with the fallback off or no subagent capability),
the gate holds: do not review the package yourself in its place. Write
`Final review: held (no reviewer available)` to the ledger, say so in your
final message, and stop before the integration decision; your human partner
decides how to proceed. With a selected profile, fallback to an owner target
must still obey its mode; `delegate` requires a fresh subagent.

Route finding triage and re-grading through `decision-making`
(`decision-maker`) before acting on any of them. The reviewer's severity
labels are advice; the `decision-maker` sets the gate. The reviewer's
"Declined to judge" list goes through `decision-making` too: every line there
receives a ruling ledgered as `Final: Ruling: <behavior the reviewer set aside> —
<what a reasonable person using this software gets, and why that stands
or why it is now a finding> — <cost if wrong>`. Re-grade first, by effect:
the spec is a vision document, and a finding's grade is what a reasonable
person using this software gets if it ships, not whether the spec names
the input that triggers it — a reviewer who set a finding at Minor
because the spec was silent has graded the spec, not the effect. Then:

- **Critical and Important** enter the fix pass.
- **Minor** goes to the ledger as `Final: minor (deferred): <one-liner>`
  and to your final message under "Deferred minors". Minors never enter
  the fix pass, and never become rulings — a ruling is a decision about a
  conflict, not a note that you declined a polish suggestion.

On eligible inline work routes, fix Critical and Important findings yourself
in ONE pass. Preserve selected-profile `review-fixes` and test-authoring modes:
required delegation uses the resolved worker route, including fresh subagents
for owner-target `delegate`; it cannot be relabeled inline. Each fix is verified by TDD, not by a
second reviewer: write the test that reproduces the finding, watch it
fail, make it pass, then run the whole suite. Record each in the ledger as
`Final: fixed <finding> — <test name> RED→GREEN, suite <N>/<N>`. A fix
without a test that failed first is not verified; a suite that is not
green after the pass means the pass is not over. Do not request a
re-review: it would re-read a diff whose covering tests already answer
"addressed" and whose suite run already answers "broke nothing".

A finding the `decision-maker` decides not to fix is a ruling — `Final: Ruling: <finding> —
<why the code stands> — <cost if wrong>` — and reaches your human partner
in the rulings list. There is no second fix pass.

## Finish

Before you delete anything, collect every ledger line containing
`Ruling:` into your final message under "Rulings made" (naming the
`decision-maker` target and transport), in the order they were made,
each with what it costs if wrong, and every `minor (deferred)`
line under "Deferred minors". Both lists are exhaustive. Your final
message is the only place the decisions made on your human partner's
behalf — and the findings not acted on — reach them.

The same message names what inline execution gave up: no per-task review,
the tests written by this session (the pane that implemented them), and
how the final review ran — in a fresh session, as a self-review, or not at
all because the gate is disabled.

When the final review is clean and its fixes are committed, delete this
plan's workspace directory — the git history is the record now. Sibling
directories belong to other plans; leave them alone.

Use finishing-a-development-branch.
