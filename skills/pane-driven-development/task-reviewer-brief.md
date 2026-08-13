# Task Reviewer Pane Brief Template

The reviewer reads the task's diff once and returns two verdicts: spec
compliance and code quality.

**Purpose:** verify one task's implementation matches its requirements (nothing
more, nothing less) and is well-built (clean, tested, maintainable).

**Independence:** send this via a **reset-backed submit** to any idle pane of
the resolved role's agent type(s) — including the pane that implemented.
Because the implementing pane wrote its own tests (when `test-authoring` is
`implementer`), the reviewer is the independent check on the tests: review them.

## 1. The submitted instruction (one line)

```bash
PANE=w2:p19                                    # idle pane of the resolved role's agent type(s)
INSTRUCTION="Work in /abs/path/to/worktree — confirm you are there before anything else. Review-only task: make no edits and do not mutate the working tree, index, HEAD, or branch state. Read /abs/path/to/task-N-review-brief.md — it holds your review contract and the paths to the task brief, the implementer's report, and the diff package. Write your review to /abs/path/to/task-N-review.md and reply with the two verdicts and the report path. Execute this request yourself, directly; re-delegating to other panes or orchestrating is prohibited. End your reply with REVIEW_N_OK immediately followed by _<4-hex>."
rtk "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
rtk herdr wait output "$PANE" --match "REVIEW_N_OK_<4-hex>" --timeout 900000
```

## 2. The review contract (write to the review brief file)

```markdown
## Review Contract — Task N

You are reviewing one task's implementation: first whether it matches its
requirements, then whether it is well-built. This is a task-scoped gate, not a
merge review — a broad whole-branch review happens separately after all tasks
are complete.

Your review is read-only on this checkout. Do not mutate the working tree, the
index, HEAD, or branch state in any way. That includes cleaning it up: never
execute `git checkout`, `git restore`, `git stash`, `git clean`, or `git reset`.
Other panes may have edits in flight, and a dirty tree is a finding to report,
not a problem to fix.

### What Was Requested

Read the task brief: [BRIEF_FILE]

Global constraints from the spec/design that bind this task:
[GLOBAL_CONSTRAINTS]

### What the Implementer Claims They Built

Read the implementer's report: [REPORT_FILE]

### Diff Under Review

**Base:** [BASE_SHA]  **Head:** [HEAD_SHA]  **Diff file:** [DIFF_FILE]

Read the diff file once — it contains the commit list, a stat summary, and the
full diff with surrounding context, and it is your view of the change. The
diff's context lines ARE the changed files: do not Read a changed file
separately unless a hunk you must judge is cut off mid-function — and say so in
your report. Do not re-run git commands. If the diff file is missing, fetch the
diff yourself: `git diff --stat [BASE_SHA]..[HEAD_SHA]` and
`git diff [BASE_SHA]..[HEAD_SHA]`.

Do not crawl the broader codebase. Inspect code outside the diff only to
evaluate a concrete risk you can name — one focused check per named risk, and
name both the risk and what you checked in your report. Cross-cutting changes
are legitimate named risks: if the diff changes lock ordering, a function or
API contract, or shared mutable state, checking the call sites is the right
method. If a codegraph plugin/tool is available, use callers/callees and impact
only for those concrete named risks. If unavailable, use `rg` and focused file
reads.

### You Do Not Delegate Onward

Do all of this review yourself. Never hand part of the diff to another pane,
and never open a pane for a second opinion. This process already provides every
review seat the work gets; a reviewer you delegate duplicates one of them at
full cost, and its verdict counts for nothing. If the diff feels too large for
one pass, review it in passes yourself and say so in your report.

### Do Not Trust the Report

Treat the implementer's report as unverified claims about the code. It may be
incomplete, inaccurate, or optimistic. Verify the claims against the diff.
Design rationales in the report are claims too: "left it per YAGNI," "kept it
simple deliberately," or any other justification is the implementer grading
their own work. Judge the code on its merits — a stated rationale never
downgrades a finding's severity.

### Tests

Your instruction says who wrote these tests. Review the test code in the diff
either way — but the evidence you are checking for, and how load-bearing your
audit is, differ:

- **The implementer wrote them** (one report file): you are the only
  independent check on them. RED and GREEN both belong in that report — a
  failing run *before* the implementation with a reason that matches the
  missing behavior, and a passing run after.
- **A separate pane wrote them** (a second report file, named in your
  instruction): the tests were written against the requirements by a pane that
  never saw this code, so RED lives in *that* report and GREEN lives in the
  implementer's report under a merged-test-run heading. Do not report missing
  evidence because one report does not carry both halves — that is the expected
  shape. Do report it if either half is absent, reconstructed, or if the merged
  run is not quoted.

In both cases:

- Does each test assert the **requirement**, or does it assert what the
  implementation happens to do? A test written after the code, to match the
  code, catches nothing.
- Would the test actually fail if the behavior regressed? Tautologies,
  over-mocked paths that never reach the code under test, and assertions on
  call counts instead of outcomes are findings.
- Do the tests cover the edge cases the requirements name?

Do not re-run the suite to confirm the report. Run a focused test only when
reading the code raises a specific doubt no existing run answers — never a
package-wide suite, race detector run, or repeated/high-count loop. If you
cannot run commands in this environment, name the test you would run.

Missing commands, failures, warnings, or other noise in the reported output are
findings — test output should be pristine.

Evidence you cannot see is not evidence that doesn't exist. If the report or
its test evidence looks truncated, or you cannot locate the results it claims,
re-read the file at its stated path — and if it is genuinely missing or
garbled, report that as a gap for the orchestrator. Re-running the suite to
regenerate what you failed to read is not verification; illegibility of the
evidence is not invalidation of it.

### Part 1: Spec Compliance

Compare the diff against What Was Requested:

- **Missing:** requirements skipped, missed, or claimed without implementing
- **Extra:** features that were not requested, over-engineering, unneeded
  "nice to haves"
- **Misunderstood:** right feature built the wrong way, wrong problem solved

If the brief lists several files each with its own change (a batched
delegation), check the diff against that list file by file: every listed file
must have its corresponding hunk. A listed file the diff never touches is a
Missing finding, no matter how clean the rest of the batch looks.

If a requirement cannot be verified from this diff alone (it lives in unchanged
code or spans tasks), report it as a ⚠️ item instead of broadening your search.

### Part 2: Code Quality

**Code quality:** clean separation of concerns? proper error handling? DRY
without premature abstraction? edge cases handled?

**Structure:** does each file have one clear responsibility with a well-defined
interface? are units decomposed so they can be understood and tested
independently? does the implementation follow the file structure from the plan?
did this change create new files that are already large, or significantly grow
existing ones? (Do not flag pre-existing file sizes — focus on what this change
contributed.)

Point at evidence: file:line references for every finding and for any check you
would otherwise answer with a bare "yes."

Your report is the deliverable: begin directly with the spec-compliance
verdict. Every line is a verdict, a finding with file:line, or a check you ran
— no preamble, no process narration, no closing summary.

### Calibration

Categorize issues by actual severity. Not everything is Critical. Important
means this task cannot be trusted until it is fixed: incorrect or fragile
behavior, a missed requirement, a test that cannot fail, or maintainability
damage you would block a merge over — verbatim duplication of a logic block,
swallowed errors, or claimed test coverage without evidence. "Coverage could be
broader" and polish suggestions are Minor.

If the plan or brief explicitly mandates something this rubric calls a defect
(a meaningless test requirement, verbatim duplication of a logic block), that
IS a finding — report it as Important, labeled plan-mandated. The plan's
authorship does not grade its own work; the human decides.

Acknowledge what was done well before listing issues — accurate praise helps
the implementer trust the rest of the feedback.

### Output Format

#### Spec Compliance

- ✅ Spec compliant | ❌ Issues found: [what's missing/extra/misunderstood, with
  file:line references]
- ⚠️ Cannot verify from diff: [requirements you could not verify from the diff
  alone, and what the orchestrator should check — report alongside the ✅/❌
  verdict for everything you could verify]

#### Strengths
[What's well done? Be specific.]

#### Issues

##### Critical (Must Fix)
##### Important (Should Fix)
##### Minor (Nice to Have)

For each issue: file:line, what's wrong, why it matters, how to fix (if not
obvious).

#### Assessment

**Task quality:** [Approved | Needs fixes]

**Reasoning:** [1-2 sentence technical assessment]
```

## Placeholders

- **worktree path** — REQUIRED, absolute
- `[BRIEF_FILE]` — REQUIRED: the same task brief the implementer worked from (`scripts/task-brief PLAN N`)
- `[GLOBAL_CONSTRAINTS]` — binding requirements copied verbatim from the plan's Global Constraints section or the spec: exact values, formats, and stated relationships between components (not process rules — those are in the contract already)
- `[REPORT_FILE]` — REQUIRED: the file the implementer wrote its detailed report to
- `[TEST_REPORT_FILE]` — REQUIRED when a separate pane wrote the tests: its report, carrying the RED evidence. Say in the instruction which pane wrote the tests; omit this path only when the implementer wrote them
- `[BASE_SHA]` / `[HEAD_SHA]` — the recorded task base and the current commit
- `[DIFF_FILE]` — REQUIRED: the path printed by `scripts/review-package PLAN_FILE BASE HEAD` (the package never enters the orchestrator's context)
- **review output file + marker** — REQUIRED

**Reviewer returns:** Spec Compliance verdict (✅/❌/⚠️), Strengths, Issues
(Critical/Important/Minor), Task quality verdict.
