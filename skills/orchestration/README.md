# orchestration

Agent skill that routes every task received directly from the user through the pane that received it (the orchestrator) inside [herdr](../herdr/). The orchestrator plans and designs itself, sends plans for independent double review, delegates complex coding — plus test authoring and code review — to Coder agents, and everything else to Generalist agents.

## Files

- [`SKILL.md`](SKILL.md) — the skill: configuration resolution, the delegation-task table, orchestrator rules, task routing, the complex-coding boundary, double-review flow, and the delegation contract.
- [`roles.yaml`](roles.yaml) — the pack's **shipped defaults**: the `roles:` list, the `fallbacks:` map of substitutes for exhausted agents, and the `assignments:` table giving every delegation task a role and a mode. Read-only in practice: a target repository customizes all of it in its own `.herdrpowers/config.yaml`, which wins key by key.
- [`agents/openai.yaml`](agents/openai.yaml) — interface metadata for OpenAI-compatible agent runners.

## Key properties

- Only applies to tasks that come directly from the user; delegated tasks are executed in place, never re-delegated.
- Roles bind to agent types, not reserved panes — any idle pane of the right type can take any task.
- An exhausted agent (usage limit, or two failed delegations on two panes) is replaced by its substitute from the `fallbacks:` map, and the fallback is named in the final report.
- Routing is configurable per repository in `.herdrpowers/config.yaml` (written by the init workflow): a `roles:` list plus an `assignments:` table giving every delegation task — implementation, tests, chores, verification, and each review — a role and a mode (`delegate` / `orchestrator` / `implementer`). Reviews also take `enabled`. Any non-default assignment or disabled review is named in every final report. Configuration is input: read once before the first delegation, never written from inside a run.
- All delegation goes through the [`using-herdr-sibling-panes`](../using-herdr-sibling-panes/) skill.
- Review independence comes from the fresh session of each reset-backed delegation: any idle pane of the resolved role's agent type(s) may take the review (including the pane that implemented), and there is no prefer-different-type heuristic.
- Drives the pack's workflow commands (`/herdrpowers:full_cycle`, `plan`, `execute`, `execute_parallel`, `quick`) and the per-task loop in [`pane-driven-development`](../pane-driven-development/).
