# orchestration

Agent skill for routing direct user tasks inside [herdr](../herdr/). The active
owner resolves repository assignments and an optional composition profile;
delegated workers execute in place without re-delegating. Reports identify
the effective owner, routes, review context, and configuration changes.

## Files

- [`SKILL.md`](SKILL.md) — the skill: configuration resolution, delegation scope, execution strategy, the delegation-task tables, the complex-coding boundary, the review gates, exhaustion/fallback, and the delegation contract.
- [`roles.yaml`](roles.yaml) — the pack's **shipped defaults**: the `roles:` list, the `fallbacks:` map of substitutes for exhausted agents, the `delegation:` block (`pane_scope`, `execution`), and the `assignments:` table giving every delegation task a role and a mode.
- [`references/profiles.md`](references/profiles.md) — required before routing: selection/precedence, nested targets and migration, owner handoff, lifecycle permission, self-target execution, and fallback lookup.
- [`references/routing.md`](references/routing.md) — task classification, workflow mapping, and the coding boundary.
- [`../../.herdrpowers/profiles/`](../../.herdrpowers/profiles/) — six shipped profile templates, included in npm distribution and installed only when missing during init.
- [`agents/openai.yaml`](agents/openai.yaml) — interface metadata for OpenAI-compatible agent runners.

## Configuration

`roles.yaml` is the default layer. Customize a consumer repo through its own
`.herdrpowers/config.yaml`, not the plugin installation. Merge config per key,
then overlay only keys present in the selected local profile
(shipped template is the second lookup). Profile `roles:` entries replace bindings;
fallback/delegation/assignment maps merge per key, including task fields.
Lists replace, including `[]`; empty maps change nothing. Invalid/missing
selections error explicitly. Freeze configuration
before routing; do not rewrite it during a run.

Top-level `profile` selects no composition when absent/null/`none`.
Top-level `allow_agent_lifecycle` is a strict boolean, false by default,
separate from profiles and delegation. Init writes canonical nested role
targets and installs missing templates without overwriting local profiles or
selection. See [`commands/init.md`](../../commands/init.md).

## Key properties

- Only applies to tasks that come directly from the user; a task that arrived as a delegation is executed in place, never re-delegated.
- Delegation stays inside the orchestrator's own tab unless `delegation.pane_scope` widens it — a pane one tab over is usually another repository's, mid-session, and a submit resets that session. An agent type with no in-scope pane is unavailable, not exhausted.
- Roles bind to agent types, not reserved panes — any idle in-scope pane of the right type can take any task.
- A role bound to a list of agent types runs **one delegation per entry**; that, not the task name, is what makes a review a double review.
- Nested targets preserve kind/model/effort strings; effort requires model, and matching uses verified live footer evidence before keys and after reset. Legacy bare kinds/owner aliases remain readable; old non-fallback `kind@model` pins are normalized with deprecation notices.
- A selected owner must match the receiving pane or prompt for unused versus relay, then receive explicit authority and frozen settings. A relay retains no decision authority. Custom planning-design/generalist targets remain intact; their owner aliases follow the selected owner.
- Separate review independence comes from reset. With a selected profile, a delegated owner target requires a fresh subagent, including solo tasks and empty reviewers; other owner-session modes may self-review and report that honestly. Without a profile, the legacy fresh-subagent rule for orchestrator-mode reviews remains.
- Profile empty reviewers choose the owner rather than disable gates; empty coder means no separate coder. Omitted keys preserve roles, including config empty-role task disabling. Explicit profile assignment fields override config values; omitted fields retain them.
- Lifecycle false prohibits start/exit/restart, including handoff and fallback. True lets the active owner start a resolved target that has no live in-scope match — the primary before any substitute — in an available shell pane, and end idle agents the task started with no pending work. `agent-lifecycle.sh` enforces the value, the scope, and the live footer check.
- Every delegation task is reassignable and every review individually togglable. Any assignment the repo changed, any non-default `delegation:` value, and any disabled review is named in the final report; `/strict_full_cycle` is the only thing that overrides `enabled`, and it touches nothing else.
- Fallback lookup uses exact `kind@model` before bare kind only when absent; matched `[]` is authoritative. Substitutes retain string syntax with no effort constraint. Preserve `Calude`; the report names the fallback and lost constraint.
- Drives the pack's workflow commands (`/herdrpowers:full_cycle`, `strict_full_cycle`, `plan`, `execute`, `execute_parallel`, `quick`) and the per-task loop in [`pane-driven-development`](../pane-driven-development/).
