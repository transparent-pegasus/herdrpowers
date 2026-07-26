# orchestration

Agent skill that routes every task received directly from the user through the pane that received it (the orchestrator) inside [herdr](../herdr/). The orchestrator plans and designs itself, sends plans for independent double review, delegates complex coding — plus test authoring and code review — to Coder agents, and everything else to Generalist agents.

## Files

- [`SKILL.md`](SKILL.md) — the skill: configuration resolution, review gates, orchestrator rules, task routing, the complex-coding boundary, double-review flow, and the delegation contract.
- [`roles.yaml`](roles.yaml) — the pack's **shipped defaults** for role-to-agent assignments, the `fallbacks:` map of substitutes for exhausted agents, and the `reviews:` gates. Read-only in practice: a target repository customizes all of it in its own `.herdrpowers/config.yaml`, which wins key by key.
- [`agents/openai.yaml`](agents/openai.yaml) — interface metadata for OpenAI-compatible agent runners.

## Key properties

- Only applies to tasks that come directly from the user; delegated tasks are executed in place, never re-delegated.
- Roles bind to agent types, not reserved panes — any idle pane of the right type can take any task.
- An exhausted agent (usage limit, or two failed delegations on two panes) is replaced by its substitute from the `fallbacks:` map, and the fallback is named in the final report.
- Every assignment and every review gate is configurable per repository in `.herdrpowers/config.yaml` (written by the init workflow). Each gate has two knobs — `enabled` and the `role` that performs it — and a disabled gate is named in every final report. Configuration is input: read once before the first delegation, never written from inside a run.
- All delegation goes through the [`using-herdr-sibling-panes`](../using-herdr-sibling-panes/) skill.
- Review independence comes from the fresh pane context of each delegation: a change is never reviewed by the pane that wrote it, and an idle pane of a different agent type is preferred for review.
- Drives the pack's workflow commands (`/herdrpowers:full_cycle`, `plan`, `execute`, `execute_parallel`, `quick`) and the per-task loop in [`pane-driven-development`](../pane-driven-development/).
