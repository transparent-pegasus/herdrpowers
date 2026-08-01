# Implementer Pane Brief Template

Delegation to an agent pane goes through a composer, which rejects embedded
newlines — so the instruction you submit is **one line of pointers**, and the
contract below goes in **its own file** (`task-N-implementer.md`), pointing at
the requirements file. Never append it to `task-N-brief.md`: a delegated test
author reads that same file, and a requirements file that also carries the
implementer contract tells it to start implementing.

## 1. The submitted instruction (one line)

```bash
PANE=w2:p18                                    # idle pane of the Coder agent type
INSTRUCTION="Work in /abs/path/to/worktree — confirm you are there before anything else. Task N of an approved plan: [one line on where this fits]. Read /abs/path/to/task-N-implementer.md first; it is your contract, and it names the requirements file with the exact values to use verbatim. [Interfaces/decisions from earlier tasks the brief cannot know.] [Your resolution of any ambiguity in the brief.] Write your full report to /abs/path/to/task-N-report.md and reply with status, commits, a one-line test summary, concerns, and the report path. Execute this request yourself, directly; re-delegating to other panes or orchestrating is prohibited. End your reply with TASK_N_OK immediately followed by _<4-hex>."
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"   # using-herdr-sibling-panes
rtk "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
rtk herdr wait output "$PANE" --match "TASK_N_OK_<4-hex>" --timeout 1800000
```

The marker must not appear verbatim in the instruction — describe it as two
fragments the pane concatenates, and keep the whole marker ≤16 ASCII chars so
terminal wrapping cannot split it.

## 2. The implementer contract (its own file)

```markdown
## Implementer Contract

You are implementing Task N of an approved plan. Your requirements are in the
file named in your instruction — read it first, and use its exact values
verbatim. Read it, never edit it: other panes on this task read the same file.

### Discovery

If a codegraph plugin/tool is available, use it to search relevant files and
symbols, then inspect callers, callees, and impact surface for the planned
change. If codegraph is unavailable, use ordinary repo search and file reads.
Do not block on missing codegraph.

### Before You Begin

If you have questions about the requirements or acceptance criteria, the
approach, dependencies or assumptions, or anything unclear above — **stop and
report them now** with status NEEDS_CONTEXT. Raise concerns before starting
work; the orchestrator will answer and re-delegate.

Stay inside the working directory named in your instruction — never edit any
other checkout of this repository. Never execute `git checkout`, `git restore`,
`git stash`, `git clean`, or `git reset`: other panes may have edits in flight,
a dirty tree is not evidence of a problem, and those commands destroy work you
cannot see. If the tree holds changes you did not make, report them and
continue; do not clean them up.

### Your Job

1. Implement exactly what the task specifies, then refactor.
2. Commit your work.
3. Self-review (below).
4. Write the report file and reply with the short status block.

**Who writes this task's tests** — keep the line that matches the resolved
`test-authoring` assignment and delete the other before sending the contract:

- *`mode: delegate`* — A separate pane is writing this task's tests right now,
  from the same requirements file, without seeing your code. Do not write them yourself
  and do not go looking for them. Implement the brief's stated behavior using
  its exact names, signatures, and values: those are the contract both of you
  are working to, and a rename you make locally will read as a failure. If you
  need to deviate from a stated signature, stop and report NEEDS_CONTEXT
  instead.
- *`mode: implementer`* — Write the failing test first (RED) before any
  production code, per the `test-driven-development` skill. You own
  RED-GREEN-REFACTOR for this task; no separate agent writes your tests.

While iterating, run the focused test for what you are changing; run the full
suite once before committing, not after every edit.

**Execute this task yourself.** Do not delegate it onward, do not orchestrate
other panes, and do not open new panes — even for parts that look routine.

### Code Organization

You reason best about code you can hold in context at once, and your edits are
more reliable when files are focused:

- Follow the file structure defined in the plan
- Each file gets one clear responsibility with a well-defined interface
- If a file you are creating grows beyond the plan's intent, stop and report
  DONE_WITH_CONCERNS — do not split files on your own without plan guidance
- If an existing file you are modifying is already large or tangled, work
  carefully and note it as a concern
- In existing codebases, follow established patterns. Improve code you are
  touching the way a good developer would, but do not restructure things
  outside your task.

### When You're in Over Your Head

It is always OK to stop and say "this is too hard for me." Bad work is worse
than no work. You will not be penalized for escalating.

**STOP and escalate when:**
- The task requires architectural decisions with multiple valid approaches
- You need to understand code beyond what was provided and cannot find clarity
- You feel uncertain about whether your approach is correct
- The task involves restructuring existing code in ways the plan did not anticipate
- You have been reading file after file without progress

**How to escalate:** report status BLOCKED or NEEDS_CONTEXT, describe
specifically what you are stuck on, what you tried, and what help you need —
then still end with the completion marker so the orchestrator is not left
waiting on a timeout.

### Before Reporting Back: Self-Review

**Completeness:** did I implement everything in the spec? Miss any
requirement? Leave edge cases unhandled?

**Quality:** is this my best work? Are names accurate (what things do, not how
they work)? Is the code clean and maintainable?

**Discipline:** did I avoid overbuilding (YAGNI)? Build only what was
requested? Follow existing patterns?

**Testing:** if I own the tests, did I write the failing one before the
implementation, and does it assert the requirement rather than the
implementation? If a separate pane owns them, did I implement the brief's
stated interface exactly, so its tests describe what I built? Is the test
output pristine (no stray warnings or noise)?

Fix what you find before reporting.

### After Review Findings

If the task review finds issues, the orchestrator sends the findings back to
this same pane — your context is intact, so pick up where you left off. Fix
them, re-run the verification that covers the amended code, and append a fix
report to your report file: what you changed, the covering tests you ran, the
command, and the output. Reviewers will not re-run tests for you — your report
is the test evidence. Then reply with the same short status contract as your
first report, under a fresh completion marker.

The round's covering tests follow the resolved `fix-round-test-authoring`
assignment: with `mode: delegate` a separate pane writes them from the findings
and you change source only; with `mode: implementer` you write or amend them
yourself under RED-GREEN-REFACTOR. The orchestrator says which in the fix
message.

### Report Format

Write your full report to the report file named in your instruction:

- What you implemented (or attempted, if blocked)
- What you tested and the test results, quoted
- **TDD Evidence** — when you own the tests: RED — the command run, the failing
  output before implementation, and why that failure was expected; GREEN — the
  command run and the passing output after. When a separate pane owns them: the
  interface you implemented, signature by signature, against the brief's stated
  one
- Files changed
- Self-review findings (if any)
- Any issues or concerns

Then reply in the pane with ONLY (under 15 lines — detail lives in the file):

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commits created (short SHA + subject)
- One-line test summary (e.g. "14/14 passing, output pristine")
- Your concerns, if any
- The report file path
- The completion marker

Use DONE_WITH_CONCERNS if you completed the work but have doubts about
correctness. Use BLOCKED if you cannot complete the task. Use NEEDS_CONTEXT if
you need information that was not provided. Never silently produce work you are
unsure about.
```

## Placeholders

- **worktree path** — REQUIRED, absolute; the pane does not inherit the orchestrator's cwd
- **requirements file** — REQUIRED: `scripts/task-brief PLAN_FILE N` prints the path (inside the plan's workspace). Read-only; every pane on this task reads it
- **contract file** — REQUIRED: this contract written to `task-N-implementer.md` beside it, naming the requirements file. Never appended to the requirements file
- **report file** — REQUIRED: name it after the brief (`task-N-brief.md` → `task-N-report.md`)
- **marker** — REQUIRED, unique per delegation, ≤16 chars, split into fragments in the instruction
