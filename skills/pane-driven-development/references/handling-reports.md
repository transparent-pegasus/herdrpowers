# Handling Reports

This reference belongs to `pane-driven-development`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

### 2. Handle the report

Implementer panes report one of four statuses. Handle each appropriately:

**DONE:** Generate the review package (`bash scripts/review-package PLAN_FILE BASE HEAD`, from this skill's directory — it prints the unique file path it wrote; BASE is the commit you recorded before delegating the task — never `HEAD~1`, which silently drops all but the last commit of a multi-commit task), then delegate the task review with the printed path.

**DONE_WITH_CONCERNS:** The pane completed the work but flagged doubts. Read the concerns before proceeding. If they are about correctness or scope, address them before review. If they are observations (e.g., "this file is getting large"), note them and proceed to review.

**NEEDS_CONTEXT:** The pane needs information that was not provided. Provide the missing context and re-delegate.

**BLOCKED:** The pane cannot complete the task. Assess the blocker with
`systematic-debugging` — root cause before fix, in the pane and in the
orchestrator:
1. If it is a context problem, provide more context and re-delegate to the same pane
2. If the task needs more reasoning, escalate the agent type (see Delegation Assignments)
3. If the task is too large, break it into smaller pieces
4. If the plan itself is wrong, rule on the correction, ledger it, and re-delegate with the ruling carried in the brief

**No marker, no report:** that is not a status — it is a failed delegation, unless an agy or grok pane is still running. Diagnose it with `using-herdr-sibling-panes`' "Failure handling" table (crashed / blocked / still running / interrupted / errored / exhausted) before re-delegating anything.

**A delegated test author reports the same four statuses, and they resolve
before the merge step, not after it.** Both panes' statuses gate the task:

- **DONE / DONE_WITH_CONCERNS from both** — proceed to the merge-then-run step
  in §1.
- **NEEDS_CONTEXT from the test author** — it could not pin an assertion from
  the requirements. That is the brief's gap, and it is usually the
  implementer's gap too: answer it, amend `task-N-brief.md`, and re-delegate
  the test author; if the answer changes an interface the implementer is
  already building to, send it the correction as well.
- **BLOCKED from the test author** — the requirement cannot be observed, or the
  repo lacks the harness to observe it. Read [cannot-verify.md](cannot-verify.md)
  and resolve it as a "⚠️ Cannot verify" item: decide whether the requirement is testable
  as written, and either amend the brief or record in the ledger that this
  requirement carries no test and why. Never let a task proceed with the gap
  unrecorded.
- **A test author that reports its tests passing at BASE** — that is the defect
  its contract tells it to report, not a shortcut past RED. Treat it as a
  finding against the test, not against the implementation.

While the test author is still working, do not delegate the review: the review
package must contain the merged tests.

**Never** ignore an escalation or re-delegate the same task unchanged. If the pane said it is stuck, something needs to change.

If the pane asks questions — before starting or mid-task — answer clearly and
completely, provide additional context if needed, and don't rush it into
implementation.
