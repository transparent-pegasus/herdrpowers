# Decision Maker Pane Brief Template

Use this template whenever `assignments.decision-making` resolves to
`mode: delegate` (plan resolution and disagreement judgment in `/plan` or
`/full_cycle`, preflight conflict rulings, mid-execution plan/conflict rulings,
reviewer disagreement adjudication, `⚠️ Cannot verify` triage, five-round
breaker adjudication, or final whole-branch synthesis decisions). Separate
delegated targets use the Herdr submission below; profile self-target
`delegate`, or a subagent fallback, uses a fresh subagent given this same
contract and no-re-delegation rule. When `decision-making` resolves to `mode: orchestrator`, the active
owner performs `decision-making` directly (or via optional subagent) and applies the same
authority and ledger format.

Delegation to an agent pane goes through a composer, which rejects embedded
newlines — so the instruction you submit is **one line of pointers**, and the
contract below goes in **its own file** (`decision-N-brief.md`, written in the
plan workspace or `<REPORT_DIRECTORY>`).

## 1. The submitted instruction (one line)

```bash
PANE=w2:p19                                    # idle pane of the resolved decision-maker target
INSTRUCTION="Work in /abs/path/to/worktree — confirm you are there before anything else. Read-only decision task: make no edits and do not mutate the working tree, index, HEAD, or branch state. Read /abs/path/to/decision-N-brief.md first; it holds the spec, plan, review/report inputs, and the exact decision questions. Write your rulings to /abs/path/to/decision-N-report.md and reply with your dispositions, ruling summaries, and that path. Execute this request yourself, directly; re-delegating to other panes or orchestrating is prohibited. End your reply with DECIDE_N immediately followed by _<4-hex>."
COMPOSER_SUBMIT="$SKILL_DIR/scripts/composer-submit.sh"   # using-herdr-sibling-panes
bash "$COMPOSER_SUBMIT" "$PANE" "$INSTRUCTION"
herdr pane wait-output "$PANE" --match "DECIDE_N_<4-hex>" --timeout 540000   # one stretch, under the tool timeout: repeat per using-herdr-sibling-panes/references/task-contract.md
```

The marker must not appear verbatim in the instruction — describe it as two
fragments the pane concatenates, and keep the whole marker ≤16 ASCII chars so
terminal wrapping cannot split it.

## 2. The decision-maker contract (write to the brief file)

```markdown
## Decision-Maker Contract

You are the `decision-maker` for this run. Reviewers advise and implementers
execute; your judgment is final within the run's frozen terms. The active owner
is coordinating execution and will record your rulings in the progress ledger
and dispatch any follow-up work.

### Scope and Read-Only Rules

Your decision pass is read-only on this checkout. Do not edit code, plans, or
reports outside your designated output file, and do not mutate the working
tree, the index, HEAD, or branch state in any way. Never execute `git checkout`,
`git restore`, `git stash`, `git clean`, or `git reset`.

Do all of this judgment yourself. Never hand part of it to another pane, and
never open a pane for a second opinion.

A ruling never rewrites the run's frozen terms: never change `.herdrpowers/config.yaml`,
raise the five-round cap, enable or disable a review gate, or widen
`delegation.pane_scope`.

### Authority and Inputs

The user's requirements are the binding authority — the spec/design document,
then any later instruction from the user, a later requirement winning where
two conflict. The plan is their argument, and your judgment settles what
neither answers. Read:

- **Spec / design document:** [SPEC_OR_DESIGN_PATH]
- **Later user requirements, in the order given:** [REQUIREMENTS]
- **Implementation plan:** [PLAN_PATH]
- **Relevant reports / diff package / ledger rulings:** [INPUT_PATHS]
- **Open findings / disagreements / conflict to decide:** [QUESTIONS_OR_FINDINGS]

### What to Decide

Based on the case you were handed:
- **Plan resolution:** accept, modify, or reject each review finding; resolve any
  disagreements between reviewers with reasoning; specify exact plan changes
  to apply or why a finding does not apply.
- **Review finding triage / disagreements:** re-grade severity by user-visible
  effect (not spec silence), resolve disagreements between reviewers, and rule
  on every "Declined to judge" item (stands with reason, or becomes a finding).
- **Mid-execution / preflight / `⚠️ Cannot verify` / breaker adjudication:**
  decide the smallest spec-compliant change, confirm whether a `⚠️` item is a
  real gap, or at the five-round cap decide whether each open finding is
  parked (contestable or non-load-bearing) or requires a load-bearing ruling to
  unblock dependent tasks (stopping only if every path forward is a guess).
- **Final synthesis:** evaluate whole-branch readiness, residual findings, and
  declined-to-judge items before the active owner hands integration options to
  the user.

### Output Format

Write your complete rulings to the output file named in your instruction, in one
final write:

#### Dispositions (for plan or review findings, when applicable)
- **[finding or item]** — ACCEPTED | MODIFIED | REJECTED | PARKED | FINDING
  - **Reasoning:** [grounded in spec/code evidence]
  - **Action / Plan edit (if any):** [exact change for the owner/planner/fixer]

#### Rulings (one per decision, for the ledger)
- **Ruling:** [what was decided] — [why] — [what it costs if wrong]

#### Readiness / Next Action
- **Verdict:** [Proceed | Fix wave required | Revise plan | Stop and ask user (only if every path forward is a guess)]
- **Notes for the owner:** [any cross-task constraint or brief update to carry]

Then reply in the pane with ONLY a concise summary of your verdicts/rulings,
the output file path, and the completion marker.
```

## Placeholders

- **worktree path** — REQUIRED, absolute; the pane does not inherit the orchestrator's cwd
- `[SPEC_OR_DESIGN_PATH]` — spec or design document path (`None` if unreachable)
- `[REQUIREMENTS]` — the user's instructions for this task that the spec does not record, verbatim, in the order given (`None` if there are none)
- `[PLAN_PATH]` — plan file path (`None` in plan-less `/quick` flows)
- `[INPUT_PATHS]` — review reports, implementer reports, diff package path, and relevant `Ruling:` / `minor (deferred)` lines from the ledger
- `[QUESTIONS_OR_FINDINGS]` — exact disagreements, conflicts, `⚠️` items, open findings, or final-synthesis questions to rule on
- **output file + marker** — REQUIRED, unique per decision pass, ≤16 chars, split into fragments in the instruction
