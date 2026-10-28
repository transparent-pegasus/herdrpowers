# Delegation Assignments

This reference belongs to `pane-driven-development`. Numbered steps refer to
[SKILL.md](../SKILL.md). Script paths are relative to that skill directory,
not this directory or the target repository.

## Delegation Assignments

Routing is `orchestration`'s job, not this skill's. Resolve the whole
`assignments:` table at the start of execution from the merged configuration it
describes — `<repo-root>/.herdrpowers/config.yaml` first, then the pack's
`orchestration/roles.yaml` for anything the repo file omits. Resolve once, up
front; do not re-read per task.

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

Plan revisions stay with you, the orchestrator (`plan-and-design`).

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
  reviewers become the only independent check on test code its author also
  implemented.
- **`fix-round-test-authoring: {mode: implementer}`** — the fixing pane writes
  or amends the round's covering tests itself, instead of a separate pane
  doing it in §4.

**A review task assigned to a role that binds to a list of agent types runs
once per entry** — see "Roles that bind to a list" in `orchestration`. When the
resolved role lists multiple entries, §3 and §4's re-review each run once per
entry in separate panes: wait for all of them, merge their findings into one open
list (a finding raised by either counts), and deduplicate before delegating the
fix. Degrade per that section when a listed agent type has no pane, and name
the degradation in your report.

The `final-branch-review` gate belongs to the calling workflow, not to this
skill: when it is disabled, skip the Final Review section below.

**Independence is not configurable.** With `task-review` on, the review is always
a reset-backed delegation to the resolved role's agent type(s) — same physical
pane is fine after a reset; do not review inside an unreset implementing
session. And `review-fixes` escalates at rounds 4-5 to a fresh pane regardless
of its mode.

Panes are not reserved per role — pick any idle pane of the matching agent type **within `delegation.pane_scope`** (default `tab`: the orchestrator's own tab only) at delegation time. When no in-scope pane of the right type is idle, wait; do not interrupt a working pane, and do not reach into another tab. When an agent type is exhausted (usage limit, or two markerless delegations on two panes of that type), take its substitute from the resolved `fallbacks:` map and name the fallback in your final report.

**Escalation is a type swap.** Panes have no model dial you control, so "try something stronger" means a different agent type: a fresh pane of another Coder-eligible type, a pane already running a different model (another `agent@model` entry), or the substitute in `fallbacks:`. Use it when a pane reports BLOCKED for lack of reasoning, and at fix-loop rounds 4-5. Name the swap in the ledger line.

**Never delegate two implementation tasks into the same worktree at once.** One writer per working tree; that is the constraint parallelism has to respect, not the pane count.
