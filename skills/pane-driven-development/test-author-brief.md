# Test Author Pane Brief Template

Used when `test-authoring` (implementation round) or `fix-round-test-authoring`
(one fix round) resolves to `mode: delegate`. The pane writes the task's tests
without ever seeing the implementation, in its own worktree off the commit the
implementation does not exist at — which is where its RED evidence comes from.

Delegation to an agent pane goes through a composer, which rejects embedded
newlines — so the instruction you submit is **one line of pointers**, and the
contract below goes in **its own file** — `task-N-tests.md` for the
implementation round, `task-N-fix-R-tests.md` for a fix round — pointing at the
requirements file. Never append it to `task-N-brief.md`: the implementer reads
that file too, and a requirements file that also says "write tests only, never
production code" tells the implementer to stop implementing.

## 1. The submitted instruction (one line)

```bash
PANE=w2:p19                                    # idle pane of the resolved role's agent type
INSTRUCTION="Work in /abs/path/to/tests-task-N-worktree — confirm you are there before anything else. You are writing the tests for Task N of an approved plan: [one line on where this fits]. Read /abs/path/to/task-N-tests.md first; it is your contract, and it names the requirements file with the exact values and signatures to use verbatim. [Interfaces/decisions from earlier tasks the brief cannot know.] Write your full report to /abs/path/to/task-N-tests-report.md and reply with status, the commit, the RED command and its result, concerns, and the report path. Execute this request yourself, directly; re-delegating to other panes or orchestrating is prohibited. End your reply with TESTS_N_OK immediately followed by _<4-hex>."
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"   # using-herdr-sibling-panes
rtk "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
rtk herdr wait output "$PANE" --match "TESTS_N_OK_<4-hex>" --timeout 1800000
```

The marker must not appear verbatim in the instruction — describe it as two
fragments the pane concatenates, and keep the whole marker ≤16 ASCII chars so
terminal wrapping cannot split it. For a fix round, use `FTEST_N_OK` and hand
the pane the open findings instead of the task requirements.

## 2. The test author contract (its own file)

```markdown
## Test Author Contract

You are writing the tests for Task N of an approved plan. Your requirements are
in the file named in your instruction — read it first, and use its exact
values, names, and signatures verbatim. It is the implementer's requirements
too: read it, never edit it.

### Your Worktree Is Deliberately Behind

You are working in a worktree at the commit **before** the implementation. The
code your tests describe does not exist here yet, and you will not be shown it.
That is the point: tests written against an implementation you can read end up
asserting what the code does instead of what the task requires.

Another pane is implementing the same requirements in parallel. Do not look for
its work, do not switch branches, and do not pull.

### Before You Begin

If the requirements do not pin down what you need to assert — an exact value, a
signature, an error type, a boundary — **stop and report now** with status
NEEDS_CONTEXT. Guessing an interface here produces tests that fail on
cosmetics, which costs a fix round to discover. Raise it before writing.

Stay inside the working directory named in your instruction — never edit any
other checkout of this repository, and in particular never the one the
implementer is working in. Never execute `git checkout`, `git restore`,
`git stash`, `git clean`, or `git reset`: they would move your worktree off the
pre-implementation commit that makes RED meaningful, and they destroy sibling
work you cannot see.

### Your Job

1. Write the tests the task's stated behavior requires — see the
   `test-driven-development` skill for what a real assertion looks like.
2. Run `<TARGETED_TEST_COMMAND>`. Expect failure: that run is your RED
   evidence, and you quote it.
3. Commit the tests in this worktree.
4. Self-review (below).
5. Write the report file and reply with the short status block.

**You write tests only.** Never write, stub, or scaffold production code — not
even to make an import resolve. If a test cannot be expressed without the
implementation existing, that is a report, not a workaround.

**Assertions come from the requirements, never from the code.** Every test
should be traceable to a line of the brief. State that mapping in your report.

**A passing test is a defect here.** If something passes in this worktree, the
implementation is absent, so either the test asserts nothing meaningful or it
covers behavior that already existed. Investigate which, and report it — do not
quietly leave it green.

### Fix-Round Variant (replace the two sections above when this is a fix round)

Your worktree is at the head the previous review saw, so **the implementation
is present and it is wrong** — the open findings named in your instruction
describe how. Your requirements are those findings, not the original task text,
though the task's requirements file is still what says what correct looks like.

Your RED is the finding **reproducing**: each new test must fail here, in this
worktree, because the finding is still unfixed — and its failure must match the
finding's description. A test that passes at this commit does not cover the
finding; a test that fails for an unrelated reason does not either. Both are
reports, not results.

You are not shown the fix. Another pane is writing it right now.

Put tests and helpers where this repo already keeps them
(`<TEST_FILE_LOCATIONS>`), and use the repo's existing stack
(`<TEST_FRAMEWORK_AND_COMMANDS>`) — do not introduce a second test framework.
Use fixtures and fakes instead of live network, cloud, container, hardware, or
paid third-party integrations.

**Execute this task yourself.** Do not delegate it onward, do not orchestrate
other panes, and do not open new panes.

### When You're in Over Your Head

It is always OK to stop and say "this is too hard for me." Bad tests are worse
than no tests — they pass, and everyone stops looking. You will not be
penalized for escalating.

**STOP and escalate when:**
- The required behavior cannot be observed from outside the unit under test
- Testing it would need infrastructure the repo does not have
- You cannot tell what the correct output is supposed to be
- The requirement is stated in a way that admits several incompatible readings

**How to escalate:** report status BLOCKED or NEEDS_CONTEXT, describe
specifically what you are stuck on and what you need — then still end with the
completion marker so the orchestrator is not left waiting on a timeout.

### Before Reporting Back: Self-Review

**Coverage:** does every requirement in the brief have a test? Which ones did I
deliberately leave to a later task, and did I say so?

**Honesty:** does each test fail for the *stated* reason, and not because of a
typo, a missing import, or a fixture I got wrong? A test that fails by accident
is not RED evidence.

**Assertion quality:** does each test assert the requirement rather than
restate an implementation I imagined? Would it still fail if the behavior
regressed?

**Noise:** is the test output pristine — no stray warnings, no debug prints?

Fix what you find before reporting.

### Report Format

Write your full report to the report file named in your instruction:

- The tests you wrote, and for each one the requirement line it comes from
- **RED evidence:** the command run, the failing output, and why that failure
  was the expected one
- Anything in the requirements you could not cover, and why
- Files changed and the commit (short SHA + subject)
- Self-review findings (if any)
- Any issues or concerns

Then reply in the pane with ONLY (under 15 lines — detail lives in the file):

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- The commit created (short SHA + subject)
- One-line RED summary (e.g. "6 new tests, 6 failing as expected")
- Your concerns, if any
- The report file path
- The completion marker

Use DONE_WITH_CONCERNS if you wrote the tests but have doubts about whether
they capture the requirement. Never silently produce tests you are unsure
about.
```

## Placeholders

- **worktree path** — REQUIRED, absolute; the test author's own worktree, **detached**, never on a named branch: `git worktree add --detach <plan-workspace>/tests-task-N BASE` (implementation round) or `--detach <plan-workspace>/tests-task-N-fix-R FIX_BASE` (fix round). `-b` would leave a branch behind that `git worktree remove` does not delete, and the next round, the next parallel track at the same number, and the next plan would all collide with it. Remove the worktree once its commit is cherry-picked in
- **requirements file** — REQUIRED: `task-N-brief.md`, the same file the implementer reads (`scripts/task-brief PLAN_FILE N`). Read-only for both panes
- **contract file** — REQUIRED: this contract written to `task-N-tests.md`, or `task-N-fix-R-tests.md` for a fix round. Never appended to the requirements file
- **findings** — fix round only: the open findings this round must cover, in place of the task's requirements
- **report file** — REQUIRED: `task-N-tests-report.md`, or `task-N-fix-R-tests-report.md`. Separate from the implementer's report — the two panes write concurrently
- **marker** — REQUIRED, unique per delegation, ≤16 chars, split into fragments in the instruction
