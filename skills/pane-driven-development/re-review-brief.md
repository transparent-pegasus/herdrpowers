# Scoped Re-Review Pane Brief Template

Use this template when delegating a re-review after a fix round. The
re-reviewing pane verifies the findings were addressed and checks the fix diff
for new breakage. It is not a fresh review — the full review already happened.

**Purpose:** Verify each finding from the previous review was addressed, and
that the fix itself broke nothing.

Delegation to an agent pane goes through a composer, which rejects embedded
newlines — so the instruction you submit is **one line of pointers**, and the
contract below is **written to a file** the pane reads first.

## 1. The submitted instruction (one line)

```bash
PANE=w2:p19                                    # idle pane of the resolved role's agent type(s)
INSTRUCTION="Work in /abs/path/to/worktree — confirm you are there before anything else. Read /abs/path/to/task-N-rereview-brief.md first; it is your complete contract. Write your verdicts to /abs/path/to/task-N-rereview-R.md and reply with the round verdict, the open findings, and that path. Execute this request yourself, directly; re-delegating to other panes or orchestrating is prohibited. End your reply with RRVW_N_R immediately followed by _<4-hex>."
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"   # using-herdr-sibling-panes
rtk "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
rtk herdr wait output "$PANE" --match "RRVW_N_R_<4-hex>" --timeout 1800000
```

## 2. The re-review contract (write to the brief file)

```markdown
You are re-reviewing one task's fix round. A previous review produced
findings; an implementing pane has attempted to fix them. Your job is to
verdict each finding and inspect the fix diff — nothing else.

## The Task

Read the task brief: [BRIEF_FILE]

## The Findings Under Verification

[FINDINGS]

## The Fix

Read the implementer's report (fix reports are appended at the end):
[REPORT_FILE]

**Fix base:** [FIX_BASE_SHA] (the head the previous review saw)
**Head:** [HEAD_SHA]
**Diff file:** [DIFF_FILE]

Read the diff file once — it contains the fix commits, a stat summary,
and the fix diff with surrounding context. Do not re-run git commands.
If the diff file is missing, fetch the diff yourself:
`git diff --stat [FIX_BASE_SHA]..[HEAD_SHA]` and
`git diff [FIX_BASE_SHA]..[HEAD_SHA]`.

Your review is read-only on this checkout. Do not mutate the working
tree, the index, HEAD, or branch state in any way.

## Scope

Your scope is the findings list and the fix diff. Verdict every finding.
Inspect the fix diff for new problems the fix itself introduced. Do NOT
re-review code the fix did not touch: if you notice an issue entirely
outside the fix diff, report it under Out-of-Scope Observations — it
does not block this task and does not extend the loop. A broad
whole-branch review happens after all tasks are complete.

## Tests

The fix report names the covering tests for this round and shows their output.
Who wrote those tests is in your instruction: the fixing pane wrote them
itself, or a separate pane wrote them from the open findings — in which case
the report's test section was assembled by the orchestrator from that pane's
run and its own merged run, and naming a different author than the fixer is
expected, not a discrepancy.

Treat the report as unverified claims: confirm it names the covering tests and
shows their output, and verify the claims against the diff. A round whose
report shows no covering test for a finding it claims ADDRESSED is NOT
ADDRESSED. Do not re-run the suite to confirm their report. Run a test only
when reading the code raises a specific doubt that no existing run answers —
and then a focused test, never a package-wide suite.

## Output Format

Write the report to the output file named in your instruction. Begin
directly with the first finding's verdict. Every line is a verdict, a
finding with file:line, or a check you ran — no preamble, no process
narration.

### Finding Verdicts

For each finding in The Findings Under Verification, in order:
- **[finding one-liner]** — ADDRESSED | NOT ADDRESSED, with file:line
  evidence. "Attempted" is not addressed: the specific defect must no
  longer exist.

### New Breakage in the Fix Diff

Anything the fix itself broke or introduced, with severity
(Critical/Important/Minor) and file:line. "None" if clean.

### Out-of-Scope Observations

Issues you noticed entirely outside the fix diff. Non-blocking; the
orchestrator ledgers these for the final review. "None" if none.

### Verdict

**Fix round:** [All findings addressed, no new Critical/Important
breakage | Findings remain open] — list the open ones.

Then reply in the pane with only the round verdict, the open findings, the
output file path, and the completion marker.
```

## Placeholders

- **worktree path** — REQUIRED, absolute; the pane does not inherit the orchestrator's cwd
- `[BRIEF_FILE]` — the task brief file (same file the implementing pane worked from)
- `[FINDINGS]` — the Critical/Important findings and spec gaps from the
  previous review, copied verbatim, one per bullet
- `[REPORT_FILE]` — the implementer's report file (fix reports appended)
- `[FIX_BASE_SHA]` — the head the previous review saw
- `[HEAD_SHA]` — current commit
- `[DIFF_FILE]` — the path `scripts/review-package PLAN_FILE FIX_BASE HEAD` printed
- **output file + marker** — REQUIRED, marker unique per round

**Re-reviewer returns:** per-finding verdicts (ADDRESSED / NOT ADDRESSED),
new breakage in the fix diff, out-of-scope observations, and a round verdict.
