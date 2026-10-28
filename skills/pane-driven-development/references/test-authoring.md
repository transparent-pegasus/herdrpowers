# Independent Test Authoring

This reference belongs to `pane-driven-development`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

#### Parallel test authoring

When `test-authoring` resolves to `mode: delegate`, the task's tests come from
a pane that never sees the implementation. Delegate it per
`task-N-tests.md`, from the same requirements file, at the same time as the
implementer.

- **Its own worktree, detached at BASE.** One writer per working tree still
  binds, so the test author does not share the task worktree:
  `git worktree add --detach <plan-workspace>/tests-task-N BASE`. Detached, not
  `-b`: a named branch outlives `git worktree remove`, and a fixed name would
  then collide with the next fix round, a parallel track at the same task
  number, and the next plan. Starting at BASE is also where its RED comes
  from — the implementation does not exist there, so the new tests fail for
  the stated reason with no stashing or checkout games.
- **Its scope is `<TEST_FILE_LOCATIONS>` only.** It writes tests, runs
  `<TARGETED_TEST_COMMAND>`, quotes the failing output as RED evidence, and
  commits in its own worktree. It never writes production code, and it is
  never shown the implementation. Its report goes to
  `task-N-tests-report.md` — a separate file from the implementer's, because
  the two panes write concurrently.
- **The brief must pin the interface.** Both panes work from the same text, so
  exact names, signatures, and values have to be in it; if they are not, the
  tests fail on cosmetics rather than behavior. Pin them before delegating —
  and if the task genuinely cannot pin its interface up front, delegate the
  test author *after* the implementer reports, handing it the resulting
  interface, never the diff. Same requirements, same detached worktree at
  BASE, same RED; only the timing changes.
- **Merge, then run — this step produces the task's GREEN evidence.** When both
  panes report DONE, cherry-pick the test commit (the SHA the test author
  reported) into the task worktree and run `<TARGETED_TEST_COMMAND>` yourself.
  Append the result to the implementer's report file under a `Merged test run`
  heading — the command, its output, and the test author's pane and commit —
  so the report the reviewers read carries RED (from the test author) and GREEN
  (from this run) even though no single pane produced both. A task whose merged
  run fails has findings, not GREEN: they enter §4's fix loop like any other.
  Remove the test worktree once the commit is in
  (`git worktree remove <path>`).
- A cherry-pick conflict means both panes edited the same test file. Resolve it
  in favor of the test author's assertions, or re-delegate serialized as above.

When `test-authoring` resolves to `mode: implementer`, skip all of this: the
implementer's contract carries RED-GREEN-REFACTOR and its report carries both
RED and GREEN. Either way, your final report names which pane wrote the tests.
