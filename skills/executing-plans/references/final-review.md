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
(MERGE_BASE = the commit the branch started from, e.g.
`git merge-base <BASE_BRANCH> HEAD`); the file it prints is the review's
diff.

**With a reviewer available:** request the review through
requesting-code-review — it resolves the gate's role and mode, picks the
reset-backed pane(s), and submits its
[review-brief.md](../../requesting-code-review/review-brief.md) with the
package path. In `[PLAN_OR_REQUIREMENTS]`, give the plan and spec paths,
the plan's Review Focus section verbatim if it has one (the input classes
and failure modes the plan's tests do not exercise — the reviewer checks
each deliberately), and a pointer to the ledger's `Ruling:` lines so it can
weigh the calls you made. This is the one fresh session the whole run buys.
Do not skip it, and do not replace it with your own read of the diff.

**When no reviewer can take it** (typically outside herdr: no pane of the
gate's agent types in scope, and no substitute): read review-brief.md and
perform that review yourself against the package, as a separate pass after
the last task's ledger line. Write `Final review: self-review (no reviewer
available)` to the ledger, and say so in your final message: a self-review
by the author is not an independent review, and your human partner decides
whether that is enough before merge.

Sort the findings before you act on any of them. The reviewer's severity
labels are advice; the gate is yours. Its "Declined to judge" list is
yours too: every line there is a ruling you make and ledger, exactly like
a plan conflict — `Final: Ruling: <behavior the reviewer set aside> —
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

Fix the Critical and Important findings yourself — you are the
implementer here — in ONE pass. Each fix is verified by TDD, not by a
second reviewer: write the test that reproduces the finding, watch it
fail, make it pass, then run the whole suite. Record each in the ledger as
`Final: fixed <finding> — <test name> RED→GREEN, suite <N>/<N>`. A fix
without a test that failed first is not verified; a suite that is not
green after the pass means the pass is not over. Do not request a
re-review: it would re-read a diff whose covering tests already answer
"addressed" and whose suite run already answers "broke nothing".

A finding you decide not to fix is a ruling — `Final: Ruling: <finding> —
<why the code stands> — <cost if wrong>` — and reaches your human partner
in the rulings list. There is no second fix pass.

## Finish

Before you delete anything, collect every ledger line containing
`Ruling:` into your final message under "Rulings I made", in the order you
made them, each with what it costs if wrong, and every `minor (deferred)`
line under "Deferred minors". Both lists are exhaustive. Your final
message is the only place the decisions you took on your human partner's
behalf — and the findings you chose not to act on — reach them.

The same message names what inline execution gave up: no per-task review,
the tests written by this session (the pane that implemented them), and
how the final review ran — in a fresh session, as a self-review, or not at
all because the gate is disabled.

When the final review is clean and its fixes are committed, delete this
plan's workspace directory — the git history is the record now. Sibling
directories belong to other plans; leave them alone.

Use finishing-a-development-branch.
