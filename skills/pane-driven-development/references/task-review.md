# Task Review

This reference belongs to `pane-driven-development`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

### 3. Review the task

Skip this step when `assignments.task-review` is disabled (see Delegation
Assignments) — go straight to §5 with the pane's own report.

Per-task reviews are task-scoped gates. The broad review happens once, at the
final whole-branch review. Never skip the task review, and never accept a
report missing either verdict — spec compliance AND task quality are both
required. A pane's self-review never replaces the task review; both are needed.

- Send the review to a **reset-backed pane** — one per agent type in the resolved
  role, in separate panes when the list has multiple entries, all from the same
  review package. Any idle pane of those types is fine, including the pane that
  implemented; do not apply a prefer-different-type heuristic. Wait for every
  review to return before acting on any of them; merge the findings into one
  open list and deduplicate. Reviews that disagree are yours to adjudicate,
  not to average.
- Hand the reviewer its diff as a file: run this skill's
  `bash scripts/review-package PLAN_FILE BASE HEAD` and pass the reviewer the file
  path it prints (or, without bash: `git log --oneline`, `git diff --stat`,
  and `git diff -U10` for the range, redirected to one uniquely named
  file). The output never enters your own context, and the reviewer sees
  the commit list, stat summary, and full diff with context in one Read
  call. Use the BASE you recorded before delegating the task —
  never `HEAD~1`, which silently truncates multi-commit tasks. Never
  delegate a task review without a diff file.
- **Reviewer inputs:** the task reviewer gets three paths — the requirements
  file `task-N-brief.md`, the implementer's report file, and the review
  package — plus the global constraints that bind the task. When a separate
  pane wrote the tests, add its report file as a fourth path and say so: the
  RED evidence lives there, the GREEN evidence lives in the merged-test-run
  section of the implementer's report, and a reviewer told to expect both in
  one report will otherwise raise missing RED/GREEN as a finding on a
  perfectly healthy task.
- The global-constraints block you hand the reviewer is its attention
  lens. Copy the binding requirements verbatim from the plan's Global
  Constraints section or the spec: exact values, exact formats, and the
  stated relationships between components ("same layout as X", "matches
  Y"). The reviewer's template already carries the process rules (YAGNI,
  verification hygiene, review method) — the constraints block is for what THIS
  project's spec demands.
- A brief describes one task, not the session's history. Do not
  paste accumulated prior-task summaries ("state after Tasks 1-3") into
  later delegations — a real session's dispatch hit 42k chars of which 99%
  was pasted history. A fresh pane needs its task, the interfaces it
  touches, and the global constraints. Nothing else.
- Do not add open-ended directives like "check all uses" or "run race tests
  if useful" without a concrete, task-specific reason
- Do not ask a reviewer to re-run tests the implementer already ran on the
  same code — the implementer's report carries the test evidence
- Do not pre-judge findings for the reviewer — never instruct a reviewer to
  ignore or not flag a specific issue. If you believe a finding would be a
  false positive, let the reviewer raise it and adjudicate it in the review
  loop. If the brief you are writing contains "do not flag," "don't treat X
  as a defect," "at most Minor," or "the plan chose" — stop: you are
  pre-judging, usually to spare yourself a review loop.

If a reviewer reports "⚠️ Cannot verify from diff", read
[references/cannot-verify.md](../references/cannot-verify.md) before marking the
task complete.

Template: [task-reviewer-brief.md](../task-reviewer-brief.md)
