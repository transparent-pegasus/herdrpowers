# Delegation Assignments

This reference belongs to `pane-driven-development`. Numbered steps refer to
[SKILL.md](../SKILL.md). Script paths are relative to that skill directory,
not this directory or the target repository.

## Delegation Assignments

Routing is `orchestration`'s job, not this skill's. Resolve the whole
`assignments:` table at the start of execution from the merged configuration it
describes, including its [profiles contract](../../orchestration/references/profiles.md):
repo config over shipped roles, then only composition keys present in the
selected profile. Freeze effective targets, modes, gates, scope, and lifecycle
policy up front; do not resolve them anew per task.

Seven tasks in that table drive this loop. Read each one's `role` and `mode`
from the resolved configuration — this table only says where each lands:

| Task | Where it lands in this skill |
|---|---|
| `complex-coding` / `simple-coding` | §1, the implementer delegation |
| `test-authoring` | §1, the test-author delegation |
| `task-review` | §3 |
| `review-fixes` | §4's fix delegation |
| `fix-round-test-authoring` | §4's covering tests for the round |
| `fix-round-re-review` | §4's scoped re-review |
| `chores` | Lookups, file moves, log gathering, mechanical edits found mid-plan |

Plan revisions follow `plan-and-design`; the active owner retains decisions.

Four resolved values change the loop's shape:

- **`task-review` disabled** — skip §3 entirely. A task then completes on
  the implementing pane's own report: read it, resolve any concerns, and record
  the completion line. There is no fix loop to enter, because nothing produced
  findings. Name the disabled gate in your final report.
- **`fix-round-re-review` disabled** — a fix round ends when the fix
  report shows the covering tests, the command, and the output. The round still
  counts against the five-round cap, and the breaker still trips at five with
  whatever findings the fixing pane did not claim as fixed. Name the disabled
  gate in your final report.
- **`test-authoring: {mode: implementer}`** — no test-author delegation in §1.
  The implementer's brief carries RED-GREEN-REFACTOR ownership instead, and the
  reviewers audit test code its author also implemented. Report whether their
  review was independent or permitted profile self-review.
- **`fix-round-test-authoring: {mode: implementer}`** — the fixing pane writes
  or amends the round's covering tests itself, instead of a separate pane
  doing it in §4.

**A review task assigned to a role that binds to a list of agent types runs
once per entry** — see "Roles that bind to a list" in `orchestration`. When the
resolved role lists multiple entries, §3 and §4's re-review each run once per
entry through its resolved transport: wait for all of them, merge their findings into one open
list (a finding raised by either counts), and deduplicate before delegating the
fix. Degrade per that section when a listed agent type has no pane, and name
the degradation in your report.

The `final-branch-review` gate belongs to the calling workflow, not to this
skill: when it is disabled, skip the Final Review section below.

**Apply the mode after selecting the effective target.** Separate delegated
reviews use reset-backed panes; the implementing pane is eligible after reset.
With a selected profile, an owner target in `delegate` requires a fresh
subagent, even with empty reviewers. Other owner-session modes permit reported
self-review and an optional subagent. A missing required subagent is an
unavailable gate, not inline success. Without a profile, legacy independence
still binds. Disabled gates stay disabled.

**Profile self-target fixes retain their mode in every round.** `delegate`
requires a fresh subagent; other owner-session modes may fix inline. Separate
targets and the no-profile path retain rounds 4-5 escalation. The cap stays five.

Panes are not reserved per role — pick any idle pane of the matching agent type **within `delegation.pane_scope`** (default `tab`: the orchestrator's own tab only) at delegation time. When no in-scope pane of the right type is idle, wait; do not interrupt a working pane, and do not reach into another tab. When an agent type is exhausted (usage limit, or two markerless delegations on two panes of that type), take its substitute from the resolved `fallbacks:` map and name the fallback in your final report.

**Separate-target escalation selects another live target.** Use another eligible kind, a pane already on a distinct model, or an allowed fallback; never switch an existing agent's model/effort. New targets use nested settings; fallback strings keep their exact spelling and have no effort constraint. Name the swap and any lost constraint in the ledger. Lifecycle false prohibits start/exit/restart even for recovery or escalation. When true, start a resolved target that has no live in-scope match before falling back, and end the agents this run started once they are idle and no longer needed, per the profiles contract.

**Never delegate two implementation tasks into the same worktree at once.** One writer per working tree; that is the constraint parallelism has to respect, not the pane count.
