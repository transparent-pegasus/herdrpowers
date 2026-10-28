# File Handoffs

This reference belongs to `pane-driven-development`. Numbered steps refer to
[SKILL.md](../SKILL.md). Script paths are relative to that skill directory,
not this directory or the target repository.

## File Handoffs

A pane's terminal is lossy: an agent CLI on the alternate screen drops rows
that `pane read` cannot always recover, and everything you paste into a brief
stays resident in your own context for the rest of the session. Hand
artifacts over as files, in both directions:

- **Requirements file:** `bash scripts/task-brief PLAN_FILE N` writes the task's
  full text into the plan workspace and prints the path. It stays the single
  source of requirements, read by every pane on the task and edited by none —
  role contracts go in their own files beside it (`task-N-implementer.md`,
  `task-N-tests.md`, `task-N-fix-R-tests.md`), each naming this one. Your
  instruction should contain: (1) the absolute worktree path, and the
  requirement to confirm the pane is in it before doing anything else; (2) one
  line on where this task fits in the project; (3) the contract path,
  introduced as "read this first — it is your contract, and it names your
  requirements file"; (4) interfaces and decisions from earlier tasks that the
  requirements cannot know; (5) your resolution of any ambiguity you noticed in
  them; (6) the report-file path and report contract; (7) the split completion
  marker; (8) the no-re-delegation clause.
- **Report files, one per pane:** name each after the requirements file
  (`…/task-N-brief.md` → `…/task-N-report.md` for the implementer,
  `…/task-N-tests-report.md` for a delegated test author). Never share one
  report file between concurrent panes. Each pane writes its full report there
  and replies with only status, commits, a one-line test summary, concerns, and
  the marker.
- **Reviewer inputs:** the task reviewer gets three paths — the requirements
  file, the implementer's report file, and the review package — plus the global
  constraints that bind the task, plus the test author's report file when a
  separate pane wrote the tests.
- Fix rounds append their fix report (with test results) to the implementer's
  report file and reply with a short summary; re-reviews read the updated file.
  A delegated fix-round test author writes its own report, and you fold its
  evidence into the fix report before the re-review.
- Keep the instruction itself on a single line: `composer-submit.sh`
  rejects embedded newlines. Detail belongs in the files it points at.
