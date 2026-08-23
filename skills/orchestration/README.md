# orchestration

Agent skill that routes every task received directly from the user through the pane that received it (the orchestrator) inside [herdr](../herdr/). Who performs each kind of work, and where, comes from a routing table rather than from prose: the orchestrator resolves that table, delegates through [`using-herdr-sibling-panes`](../using-herdr-sibling-panes/), and names every non-default assignment it ran under in the final report.

## Files

- [`SKILL.md`](SKILL.md) — the skill: configuration resolution, delegation scope, execution strategy, the delegation-task tables, the complex-coding boundary, the review gates, exhaustion/fallback, and the delegation contract.
- [`roles.yaml`](roles.yaml) — the pack's **shipped defaults**: the `roles:` list, the `fallbacks:` map of substitutes for exhausted agents, the `delegation:` block (`pane_scope`, `execution`), and the `assignments:` table giving every delegation task a role and a mode.
- [`agents/openai.yaml`](agents/openai.yaml) — interface metadata for OpenAI-compatible agent runners.

## Configuration

`roles.yaml` is the default layer, not the customization point: plugin installs are read-only, and editing a checked-in copy makes it diff-dirty against the pack. A target repository overrides any key of it in its own `.herdrpowers/config.yaml` (written by the init workflow), which wins key by key. Configuration is input — resolved once before the first delegation, never written from inside a run.

## Key properties

- Only applies to tasks that come directly from the user; a task that arrived as a delegation is executed in place, never re-delegated.
- Delegation stays inside the orchestrator's own tab unless `delegation.pane_scope` widens it — a pane one tab over is usually another repository's, mid-session, and a submit resets that session. An agent type with no in-scope pane is unavailable, not exhausted.
- Roles bind to agent types, not reserved panes — any idle in-scope pane of the right type can take any task.
- A role bound to a list of agent types runs **one delegation per entry**; that, not the task name, is what makes a review a double review.
- Review independence comes from the reset session, not from a different pane or a different tool. A review whose resolved mode is `orchestrator` runs in a fresh in-process subagent instead of inline — the pack's one exception for review work.
- Every delegation task is reassignable and every review individually togglable. Any assignment the repo changed, any non-default `delegation:` value, and any disabled review is named in the final report; `/strict_full_cycle` is the only thing that overrides `enabled`, and it touches nothing else.
- An exhausted agent (usage limit, or two markerless delegations on two panes) is replaced by its substitute from the `fallbacks:` map, and the fallback is named in the report.
- Drives the pack's workflow commands (`/herdrpowers:full_cycle`, `strict_full_cycle`, `plan`, `execute`, `execute_parallel`, `quick`) and the per-task loop in [`pane-driven-development`](../pane-driven-development/).
