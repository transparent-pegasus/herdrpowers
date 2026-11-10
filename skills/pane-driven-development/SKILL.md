---
name: pane-driven-development
description: Use when executing implementation plans with independent tasks and per-task review gates
---

# Pane-Driven Development

**Placeholder resolution:** `<KEY>` placeholders in this file (such as `<BASE_BRANCH>` or `<REPORT_DIRECTORY>`) resolve from the `Herdrpowers Configuration` section of the repository's `CLAUDE.md` / `AGENTS.md`. If that section is missing, initialize it with the pack's init workflow (`/herdrpowers:init` on Claude Code plugin installs; `commands/init.md` otherwise).

## Delegation Model (READ FIRST)

Read `orchestration`, its [profiles contract](../orchestration/references/profiles.md), and `using-herdr-sibling-panes` before routing work. Resolve the selected composition and each task's role, mode, and gate once. Separate delegated targets use reset-backed Herdr panes, including concrete coder targets matching the owner's kind/model. With a selected profile, `delegate` to the active owner requires a fresh in-process subagent for work and reviews alike; other owner-session modes allow inline work and self-review, with a subagent optional at the owner's judgment. Without a profile, retain legacy pane routing and fresh-subagent orchestrator-mode reviews. Workers never re-delegate.

Two boundaries override anything below:

- **Modes and gates stay binding.** Empty profile reviewers select the owner; they do not disable reviews or permit delegated reviews inline. Missing required subagent capability is a reported inability, never a passed gate. Disabled gates stay disabled. Report owner-session self-review as self-review, not independent review.
- **The test writer owns RED-GREEN-REFACTOR.** Resolve `test-authoring` / `fix-round-test-authoring`: a delegated author gets requirements alone in a fresh pane or required profile self-target subagent, never implementation; an implementing session writes its own tests in `implementer` mode. Record the writer, transport, and RED/GREEN evidence.

Execute each task and its tests through their resolved routes, then run enabled task reviews (spec compliance + code quality) and the enabled broad whole-branch review.

**Why panes:** a delegated pane starts from a reset session — it never inherits your context or history, so you construct exactly what it needs. That keeps it focused and preserves your own context for coordination work.

**Core principle:** Resolved task routes + enabled task reviews + enabled broad final review.

**Narration:** between tool calls, narrate at most one short line — the ledger and the report files carry the record.

**Continuous execution:** Do not pause for routine check-ins between tasks. Execute the plan under the frozen routing contract, respecting the general stops and required profile-owner reception question below.

**Rulings, not stalls.** A running plan does not wait on a human. Conflicts,
ambiguities, plan defects, a fix round that ended at the cap — decide them. The
spec is the binding authority, the plan is its argument, and your judgment
settles what neither answers. Record every decision in the ledger as
`Ruling: <what you decided> — <why> — <what it costs if wrong>`, and keep
going. A wrong ruling costs rework your human partner can see and undo; a
session parked on a question costs their whole day and buys nothing.

The four general stops are: an irreversible or destructive
operation; a security-sensitive action; a side effect outside this worktree
that norms say you ask about first (a merge, a push to a shared branch, a
publish); and a plan so broken that every path forward is a guess. For those,
stop and ask. Profile-owner mismatch also requires the unused-versus-relay
answer before handoff or startup; a ruling cannot waive that question.

**A ruling never rewrites the run's terms.** It resolves what the spec and the
plan left open — it does not raise the five-round cap, re-enable a gate the
repository disabled, disable one it enabled, widen `delegation.pane_scope`, or
touch `.herdrpowers/config.yaml`. Those are the user's declaration, resolved
once at start; a "ruling" that changes one is falsifying the run's terms, not
deciding under them.

## When to Use

```dot
digraph when_to_use {
    "Have implementation plan?" [shape=diamond];
    "Tasks mostly independent?" [shape=diamond];
    "Inline eligible under resolved profile/modes?" [shape=diamond];
    "pane-driven-development" [shape=box];
    "executing-plans" [shape=box];
    "Manual execution or brainstorm first" [shape=box];

    "Have implementation plan?" -> "Tasks mostly independent?" [label="yes"];
    "Have implementation plan?" -> "Manual execution or brainstorm first" [label="no"];
    "Tasks mostly independent?" -> "Inline eligible under resolved profile/modes?" [label="yes"];
    "Tasks mostly independent?" -> "Manual execution or brainstorm first" [label="no - tightly coupled"];
    "Inline eligible under resolved profile/modes?" -> "executing-plans" [label="yes - chosen inline or legacy pane shortage"];
    "Inline eligible under resolved profile/modes?" -> "pane-driven-development" [label="no - preserve required delegation"];
}
```

**vs. Executing Plans (inline):**
- Task routes follow assignments and the selected profile instead of an inline execution choice
- Review after each task (spec compliance + code quality) instead of only at the end
- Separate delegated tasks cost a reset session each; profile owner-session modes may reuse context
- Both are driven from this pane, share the same plan workspace and ledger, and never pause between tasks
- Herdr transport requires `HERDR_ENV=1` and matching in-scope live agents — or, with `allow_agent_lifecycle: true`, in-scope shell panes to start them in; profile self-target delegation requires subagent capability instead

## The Process

Read [references/lifecycle.md](references/lifecycle.md) before starting execution
for the lifecycle map. The steps below require their own references at the
point of use; after compaction, read them from disk again.

## Setup

Ensure the work happens in an isolated workspace: use `using-git-worktrees` to
create one or verify the existing one. Never start implementation on
`<BASE_BRANCH>` (or main/master) without your human partner's explicit consent.

Conversation memory does not survive compaction. In real sessions,
orchestrators that lost their place have re-delegated entire completed task
sequences — the single most expensive failure observed. Track progress in
a ledger file, not only in todos.

- Each plan owns a workspace: at skill start, run this skill's
  `bash scripts/pdd-workspace PLAN_FILE` — it prints the plan's git-ignored
  directory (under `<repo-root>/.herdrpowers/pdd/`), home to
  every artifact for THIS plan: ledger, briefs, reports, review packages.
  Another plan's directory is never yours to read or write.
- Check for this plan's ledger at `<workspace>/progress.md`. If it exists,
  read [references/resuming.md](references/resuming.md) before anything else.
  Resume from its recorded task and fix-round state, never from memory.
- Create the ledger with its identity as the first line:
  `# PDD ledger — plan: <plan file path>`.
- The ledger is your recovery map: the commits it names exist in git even
  when your context no longer remembers creating them. After compaction,
  trust the ledger and `git log` over your own recollection.
- `git clean -fdx` will destroy the workspace (it's git-ignored scratch); if
  that happens, recover from `git log`.

Read the plan once, note its context and Global Constraints, and create a
todo per task. If the plan names a Spec, read that too: the spec is the
authority the plan argues from, and conflicts inside the plan resolve
against it. A plan with no reachable spec gets a ledger note saying so —
rulings made without one are provisional.

Before delegating Task 1, read [references/preflight.md](references/preflight.md)
and perform its conflict scan. Write the table and every ruling to the ledger.

## Delegation Assignments

Before execution, read [references/assignments.md](references/assignments.md)
and resolve every assignment once through `orchestration`. It defines how
disabled gates, test ownership, list roles, escalation, and pane scope shape
this loop. Configuration is input, never changed during a run. Read this
reference again after compaction using the run's already resolved assignments.

## The Task Loop

When the plan lists small, independent edits of the same kind, read
[references/batching.md](references/batching.md) before composing a batch.

Everything you paste into a delegation — and everything a pane prints back —
stays resident in your context for the rest of the session and is re-read on
every later turn. Hand artifacts over as files (see File Handoffs).

**While panes work, you work.** Waiting is not a phase — ledger updates,
packaging the next review, and reading reports all happen while children run.
When you are genuinely idle, wait in bounded stretches and reconcile between
them rather than sitting in one open-ended wait; `using-herdr-sibling-panes`
holds the mechanics.

### 1. Delegate the implementer and the test author

Record BASE (`git rev-parse HEAD`) before delegating — the review package,
the test author's worktree, and fix-round diffs all need it.

Run `bash scripts/task-brief PLAN_FILE N` to extract the task's full text into the
plan workspace. Never make a pane read the whole plan file. Exact values
(numbers, magic strings, signatures, test cases) appear only in the brief.

**The requirements file stays requirements — never append a role contract to
it.** Two panes may read it for the same task, and a file carrying both
"implement this" and "write tests only, never production code" hands each of
them the other's instructions. Each contract goes in its own file beside it,
pointing back at the requirements:

| File | Content | Template |
|---|---|---|
| `task-N-brief.md` | The task's requirements. Written once, read by every pane, appended to by none. | `scripts/task-brief` |
| `task-N-implementer.md` | The implementer contract, pointing at the requirements file. | [implementer-brief.md](implementer-brief.md) |
| `task-N-tests.md` | The test author contract, same pointer. Only when `test-authoring` is delegated. | [test-author-brief.md](test-author-brief.md) |

- If an earlier task parked a finding in the area this task touches, carry
  a pointer to that ledger entry in the delegation.
- Record the executor and transport — separate-target fix rounds 1-3 return to that pane; profile self-targets retain their mode.

#### Parallel test authoring

Before delegating a test author, read
[references/test-authoring.md](references/test-authoring.md). It owns the
detached BASE worktree, requirements-only input, separate reports, and the
merge-then-run step that produces GREEN. With `mode: implementer`, the
implementer owns RED-GREEN-REFACTOR instead. Name the test writer in the report.

### 2. Handle the report

Read [references/handling-reports.md](references/handling-reports.md) on every
implementer or test-author report. Resolve both statuses before merging tests
and generating the review package. A missing marker or report requires checking
the transport state; it does not by itself mean completion or failure.

### 3. Review the task

Skip only when `assignments.task-review` is disabled; name that in the report.
Otherwise, read [references/task-review.md](references/task-review.md) before
each task review. Supply the requirements, report files, and the BASE..HEAD
review package. Resolve the review assignment through `orchestration`; each
uses its required transport, and both spec and quality verdicts are required.

### 4. The fix loop

The loop triggers on spec ❌, Critical/Important findings, or a confirmed
⚠️ gap. Read [references/fix-loop.md](references/fix-loop.md) when it triggers
and again **before every round**, even if you read it earlier in this session.
It owns the covering-test handoff, scoped re-review, five-round cap, breaker,
and ledger lines. Five rounds maximum; a ruling cannot raise that cap.

### 5. Complete the task

If any "⚠️ Cannot verify" item remains, read
[references/cannot-verify.md](references/cannot-verify.md) and resolve it before
marking the task complete.

When the review comes back clean — or every open finding is parked with a
ruling at the cap — append the completion line to the ledger in the same
message as your other bookkeeping:

- `Task <N>: complete (commits <base7>..<head7>, review clean)`
- `Task <N>: complete (commits <base7>..<head7>, <K> parked)` after a
  tripped breaker

Then mark the todo complete and move on. Never move to the next task while
the review has open Critical/Important issues that are neither fixed nor
parked-with-ruling at the cap.

## Final Review

When every task is complete, read
[references/final-review.md](references/final-review.md). It covers the
`final-branch-review` gate, its single fix wave, and the finish record.

## Finish

Before finishing or deleting a plan workspace, read the
[finish instructions](references/final-review.md#finish), even when the final
review is disabled. Roll up every `Ruling:`, changed assignment, disabled gate,
and test writer in the final report.

## File Handoffs

Before composing any delegation, read
[references/file-handoffs.md](references/file-handoffs.md). Keep requirements,
role contracts, and concurrent report files separate; submit a one-line
contract pointer with the absolute worktree path and split marker.

## Brief Templates

- [implementer-brief.md](implementer-brief.md) - Implementer pane brief
- [test-author-brief.md](test-author-brief.md) - Test author pane brief, for `test-authoring` / `fix-round-test-authoring` in `mode: delegate`
- [task-reviewer-brief.md](task-reviewer-brief.md) - Task reviewer pane brief (spec compliance + code quality), one per reviewer agent type
- [re-review-brief.md](re-review-brief.md) - Scoped re-review pane brief, one per reviewer agent type per fix round
- Final whole-branch review: use requesting-code-review's [review-brief.md](../requesting-code-review/review-brief.md)

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Close enough on spec compliance" | Reviewer found spec gaps = not done. Fix or hit the cap and adjudicate — those are the only exits. |
| "I'll fix it myself, delegating is overhead" | Follow `review-fixes`: separate targets use workers; profile self-targets retain their mode. Convenience cannot replace mandatory delegation. |
| "One more round will converge" | Past the cap, rounds don't converge — the failure is structural. Adjudicate and route. |
| "The reviewer will just find something new anyway" | Scoped re-reviews verify fixes; they cannot wander. New findings on untouched code go to the ledger, not the loop. |
| "This finding is obviously wrong, I'll drop it" | You adjudicate only at the cap, and every ruling is a ledger entry. Silent discards are forbidden. |
| "The fix was small, skip the re-review" | Unreviewed fixes are how regressions land. Every round ends with a scoped re-review. |
| "Reviews slow the loop down" | The loop without reviews is just unverified churn. Reviews are the loop's brakes and steering. |
| "Ledger bookkeeping is overhead" | The ledger is what survives compaction. Orchestrators without one have re-delegated entire completed task sequences. |
| "The implementing pane is idle — it can review its own work" | Separate delegated reviews require reset, even on the same pane. Profile owner-session reviews may be self-review; delegated self-targets require fresh subagents. |
| "The plan mandates it, so the finding is invalid" | Plan-vs-review conflicts are yours to rule on, with the spec as the binding authority. Record the ruling — a conflict you never ledgered is a decision made in secret. |
| "This call is big enough that I should ask first" | Honor the general stop conditions and mandatory unused-versus-relay question above. Otherwise decide, record the ruling and its cost if wrong, and continue. |
| "A delegated pane spun up its own panes — free extra assurance" | A duplicate seat on the same diff; the task review is the gate. Every brief forbids re-delegation, so a pane that did it is a finding to report, not rigor. |
| "I'll turn the gate off in `.herdrpowers/config.yaml` to get past this loop" | The config is the user's declaration, read once at start. Changing it mid-run to escape a review is falsifying the run's terms. Hit the cap and adjudicate. |
| "Task review is disabled, so the pane can review its own work" | Disabling removes that gate. Every remaining gate keeps its profile/mode requirements. |

## Red Flags

**Never:**
- Start implementation on `<BASE_BRANCH>` without explicit user consent
- Use `pane run` to submit work to an agent pane — use `composer-submit.sh`
- Send a delegation without a completion marker, a report-file path, and the absolute worktree path
- Let a delegated pane re-delegate: every brief carries the no-re-delegation clause
- Run two implementation panes against the same worktree
- Make a pane read the whole plan file (hand it its task brief —
  `scripts/task-brief` — instead)
- Skip scene-setting context (the pane needs to understand where the task fits)
- Ignore a pane's questions (answer before letting it proceed)
- Tell a reviewer what not to flag, or pre-rate a finding's severity in the
  brief ("treat it as Minor at most") — the plan's example code is
  a starting point, not evidence that its weaknesses were chosen
- Delegate a task review or re-review without a diff file — generate it first
  (`bash scripts/review-package PLAN_FILE BASE HEAD`) and name the printed path in
  the brief
- Trust "tests pass" without reading the quoted output in the report file
- Re-delegate a task the progress ledger already marks complete — check
  the ledger (and `git log`) after any compaction or resume
- Read or write another plan's workspace directory
- Write `.herdrpowers/config.yaml` from inside a run — it is the user's input, resolved once at start; changing an assignment or a gate is an init-workflow decision
- Finish a run with a disabled gate, a changed assignment, or a ledgered ruling unnamed in the report

**If a pane fails the task:**
- Diagnose with `using-herdr-sibling-panes`' failure table first
- Then follow the resolved fix route with the new evidence; do not replace required delegation with an inline fix
