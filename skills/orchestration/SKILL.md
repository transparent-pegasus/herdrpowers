---
name: orchestration
description: "Route every task received directly from the user through the pane that received it (the orchestrator) in herdr unless the user explicitly denies orchestration. Does NOT apply to tasks delegated from another pane — execute those yourself, never re-delegate. Routing comes from the repository's .herdrpowers/config.yaml, falling back to the pack's roles.yaml defaults: a role list plus a role and a mode assigned to every delegation task — implementation, tests, fixes, chores, verification, and each review. That resolved YAML is the source of truth for every route; read it rather than assuming a default. Delegation runs through using-herdr-sibling-panes. Every task is reassignable and every review individually togglable; any assignment the repo changed and any disabled review is named in the final report. Roles bind to agent types, not reserved panes — any idle pane of the right type can take any task, a role bound to a list of agent types runs one delegation per entry, and an exhausted agent is replaced by its substitute from the fallbacks map."
---

# Orchestration

## Configuration resolution

Two files answer "who does what, and which reviews run", in this order:

1. **`<repo-root>/.herdrpowers/config.yaml`** — the target repository's own configuration, written by the init workflow. Wins key by key.
2. **[`roles.yaml`](roles.yaml)** — the pack's shipped defaults. Supplies every key the repo file omits.

Read both at the start of every orchestrated task (the repo file may be absent — that is normal, and means defaults apply throughout). They share one schema:

- **`roles:`** — the role list: each role and the agent type(s) it binds to. Any agent type there may be pinned to a model as `agent@model` — `cursor@Muse Spark` is a `cursor` pane whose footer shows `Muse Spark`; see "Model-pinned entries" in `using-herdr-sibling-panes`. Wherever this skill says a role's agent type, a pinned entry means that type on that model. `orchestrator` takes no model: `orchestrator@…` is a configuration error — route the role as `orchestrator` and name the error in the report.
- **`fallbacks:`** — agent → ordered substitutes, for when an agent cannot take work. Keys and substitutes may be pinned too.
- **`delegation:`** — defaults that apply to every task: `pane_scope` (which panes are eligible at all) and `execution` (parallel or serial by default).
- **`assignments:`** — every delegation task, each with the role that performs it.

Merging is per key, not per file: a repo config that sets only `assignments.chores.role` keeps every other assignment, every role binding, and every fallback at its default.

**An `assignments:` key that `roles.yaml` does not define is a stale name, not a silent no-op.** Name it in the final report so the repo can fix it, because the task it was meant to configure is otherwise running on the shipped default — which would turn a review the repo deliberately disabled back on without saying so. One rename has shipped: `plan-double-review` became `plan-review` in v1.10.0. Honor a repo config that still uses the old key as `plan-review`, and tell the user to rename it.

**Customize in the repo file, never in `roles.yaml`.** Plugin installations are read-only, so `roles.yaml` is not editable there at all; on checked-in copies, editing it makes the pack diff-dirty against upstream. The rest of this skill refers to roles and task names, never to tool names.

If the repo has no `.herdrpowers/config.yaml` and the user wants to reassign a task, change a mode, or turn a review off, run the init workflow (`/herdrpowers:init`, or `commands/init.md`) — do not edit `roles.yaml`.

**Never write either file from inside an orchestrated run.** The configuration is input, resolved once before the first delegation. Rewriting it mid-run to route around an unavailable agent or to escape a review gate falsifies the terms the run reported under; unavailability is what `fallbacks:` and honest degradation are for.

## Delegation scope

`delegation.pane_scope` decides which panes are eligible to receive work at all, before any role or assignment is consulted. It is resolved from the merged configuration like everything else, and defaults to `tab`.

| value | eligible panes |
|---|---|
| `tab` | only panes whose `tab_id` matches the orchestrator's — the default |
| `workspace` | any pane in the orchestrator's `workspace_id`, in any tab |
| `session` | every agent pane `herdr pane list` reports |

Delegating outside the orchestrator's tab is off by default because a tab is how a herdr user separates projects: `herdr pane list` reports a per-pane `cwd`, and a pane one tab over is usually sitting in a different repository, in a session its own user is mid-task in. A reset-backed submit would discard that session.

Scope is a filter, not a preference. An out-of-scope pane is not a candidate, not a last resort, and not a fallback target — and it does not count when deciding whether an agent type is available. When no in-scope pane of the needed type exists, that type is unavailable: wait for one to free up, take a substitute from `fallbacks:`, or degrade per the rules below. Widening the scope mid-run is not one of the options; it is a configuration change, and configuration is never written from inside a run.

`using-herdr-sibling-panes` applies the filter — see "Delegation scope" there for the exact `herdr pane list` query.

## Execution strategy

`delegation.execution` sets what `/full_cycle` and `/strict_full_cycle` attempt for the implementation phase: `parallel` (the default) extracts the plan's independent implementation tracks and runs them concurrently per `/execute_parallel`; `serial` runs the plan's tasks one at a time per `/execute`.

It sets what is attempted, not what is forced. A plan whose extraction leaves fewer than two independent tracks, or a session with only one usable pane, runs serially either way — that is degradation, and the final report says so. `/execute` and `/execute_parallel` are explicit choices by the user and ignore this key.

Under `parallel`, plans are written with tracks declared up front (see `writing-plans`), so extraction confirms a partition the plan already states rather than inventing one after the fact.

## Delegation tasks and their assignments

`assignments:` is the routing table. **The resolved YAML is the source of truth for every route and every default** — read it, never recall a default from prose. The tables below name what each task covers; who performs it and where comes from the merged configuration, and the knobs are the same for all of them.

- **`role`** — which role from `roles:` performs the task.
- **`mode`** — where it runs: `delegate` (a fresh idle pane of that role), `orchestrator` (the orchestrator pane itself — a work task runs inline there, a review task runs in a fresh in-process subagent the orchestrator spawns; see "Reviews in `mode: orchestrator`"), or `implementer` (the pane that already owns the task does it).
- **`enabled`** — review tasks only. `false` removes the gate entirely. Work tasks are mandatory: to stop delegating one, set `mode: orchestrator` — never `enabled: false`.

Resolve every task the workflow will touch before its first delegation, not when you reach it.

**Work tasks** — these always happen; the assignment decides who and where:

| Task | Covers |
|---|---|
| `plan-and-design` | Brainstorming, design docs, implementation plans |
| `complex-coding` | Implementation over the "Complex coding boundary" below |
| `simple-coding` | Localized, pattern-following edits under that boundary |
| `chores` | Lookups, file moves, log gathering, mechanical edits, lint/format runs |
| `test-authoring` | A task's tests for the implementation round |
| `fix-round-test-authoring` | The covering tests for one fix round |
| `review-fixes` | Fixing review findings |
| `verification` | Running the repo's baseline and supplemental verification commands |

**Review tasks** — optional gates:

| Task | Runs in | Off means |
|---|---|---|
| `plan-review` | `/plan`, `/full_cycle`, and `brainstorming`'s builder check on a project's full design | The plan goes straight to the user for approval, unreviewed, and a project's full design reaches the user without a builder check |
| `documentation-impact-review` | `/execute`, `/execute_parallel`, `/full_cycle`, `/quick` | No pre-implementation sweep for non-code files |
| `task-review` | `pane-driven-development` | A task completes on the implementing pane's own report |
| `fix-round-re-review` | `pane-driven-development` fix loop | Fixes are taken on the fixing pane's word; the round still counts against the five-round cap |
| `final-branch-review` | `/execute`, `/execute_parallel`, `/full_cycle`, `/quick` | The branch reaches the integration decision unreviewed |

**`/strict_full_cycle` ignores `enabled` and runs every gate in this table**, naming each one it forced on in its report. It is the pack's only override of the resolved configuration, and it touches nothing but `enabled` — never a `role`, a `mode`, or an invariant.

**Every assignment the repo config changed away from `roles.yaml`, every non-default `delegation:` value, and every disabled review, is named in the final report**, next to any role that fell back and any review that degraded for lack of panes. The user configured it; the report says so, every run, so nobody later mistakes an unreviewed branch for a reviewed one, or a self-tested one for independently tested.

### Roles that bind to a list

A role declared with `agents:` (a list) instead of `agent:` runs **one delegation per entry**: the task goes to a separate pane of each listed agent type, and you wait for all of them before acting on any. That is where a *double* review comes from — the role, not the task. A one-entry list is a deliberate single delegation; an empty list is the same as disabling the task.

Three rules bind wherever a list role is used:

- **The delegations come from different agent types — or from one type on different models.** Two slots may share an agent type only when both are `agent@model` entries whose models differ, compared case-insensitively, with neither containing the other: `cursor@Grok 4.7` and `cursor@Muse Spark 1.3` are two reviewers, while `cursor` beside `cursor@Grok 4.7` is the same type twice. Each slot takes its own pane. A configuration or a fallback that would break this is not used there: leave that slot unavailable and run with fewer.
- **Degrade, never block.** An agent type counts as available if any in-scope pane of that type exists, even if it is busy — wait for busy panes, never interrupt them. If only one listed type is available, run that one and state that the others were skipped. If none is available, fall back per "Exhaustion and fallback", and state what independence was lost.
- **Say which it was.** Full set, degraded set, or single — the report names it, every time.

Compare findings across the returned reviews, resolve disagreements, and only then act. Reviewers advise; the orchestrator decides.

### Reviews in `mode: orchestrator`

A **review** task whose resolved mode is `orchestrator` is the pack's one exception to "no in-process subagents": the orchestrator does not run it inline in its own session — it spawns a fresh in-process subagent and gives it the same self-contained review brief a delegated pane would receive (scope, diff or paths, the repository's standards, where to write the report). The subagent's fresh context is what makes the review independent, the same property a reset pane provides.

Rules for it:

- **Never inline.** An orchestrator that reviews its own session's work product is not a review. If no subagent can be spawned, the review has degraded — say so in the report rather than grading your own work.
- **The brief is the same brief.** Self-contained, no reliance on the orchestrator's conversation context; the review reads the code, not the story of how it was written.
- **Work tasks are not affected.** `mode: orchestrator` on a work task means the orchestrator does it inline, as before.
- **The report names it.** A review that ran in a spawned subagent is named as such, next to which panes ran the delegated ones.

A role bound to a list still means one review per entry; with `mode: orchestrator` those become one spawned subagent per entry, and the different-agent-types rule no longer applies because the agent type is the orchestrator's own.

### What no assignment can change

- **Review independence is the reset session, not pane ID.** A `mode: delegate` review may use any idle pane of the resolved role's agent type(s), including the pane that implemented, because submission resets the session. Do not apply a prefer-different-type heuristic. An unreset continuing session must not review its own work product; disabling a review removes it rather than converting one into that kind of self-review, and a review resolved to `mode: orchestrator` gets its fresh context from a spawned subagent rather than running inline. If a config tries to turn a still-on review into an in-session self-review, honor the reset rule, ignore that part of the config, and say so in the report.
- **Reviews from a list role come from different agent types, or from one type on different models.** A config that would put the same type in two slots any other way is overridden the same way.
- **The report names which pane wrote the tests**, whatever `test-authoring` and `fix-round-test-authoring` resolve to. With `mode: delegate` the tests come from a pane that never saw the implementation; with `mode: implementer` they come from the pane whose behavior they cover, and the reviewers auditing that test code are the only remaining check on it. Both are legitimate; a report that does not say which one ran is not.
- **`review-fixes` escalates regardless of mode.** Fix-loop rounds 4-5 go to a fresh pane of an escalated agent type even when the mode is `implementer`, per "Escalation is a type swap".

## Role assignments

Panes are NOT reserved per role. Roles bind to agent types, not to specific panes: at delegation time, pick any idle pane of the matching agent type that is within `delegation.pane_scope`. A pane that just finished a review can take a coder or generalist task next, and vice versa. When no in-scope pane of the right type is idle, wait or run the work in the orchestrator pane — do not interrupt a working pane, and do not reach outside the scope.

For an `agent@model` entry the pane must also show that model in its footer. Routing selects such a pane; it never sends `/model` or otherwise switches a pane's model. The report names the pane id and its model line for every delegation to a pinned entry.

## Orchestrator

Apply this skill only when the task came directly from the user. Whichever pane the user enters the instruction into becomes the orchestrator for that task — do not assume or require a specific tool for it. The orchestrator keeps final synthesis and user communication; delegated agents report back to it.

**No re-delegation.** If your task arrived as a delegated instruction from another pane (not from the user), this skill does not apply: execute the task yourself in your own pane and never delegate it onward, even if it looks routine. Re-delegation creates cascades where multiple panes contend for the same siblings and no one does the work.

Use `using-herdr-sibling-panes` for every delegation. Submit through its bundled `composer-submit.sh` and wait for the delegated result before integrating it. Do not use `pane run` for agent-pane prompts.

## Task routing

Before classifying or routing work, read
[references/routing.md](references/routing.md). Name the delegation task,
then read its resolved assignment; the same routing applies inside workflows.

## Development-cycle routing

Read the [workflow mapping](references/routing.md#development-cycle-routing)
when entering a workflow. Review independence and the configuration above
still bind every delegation.

## Complex coding boundary

Read the [coding boundary](references/routing.md#complex-coding-boundary)
before choosing `complex-coding` or `simple-coding`. The boundary selects a
task name; the resolved assignment selects the role and mode.

## Plan/design review

Runs when the `plan-review` gate is enabled, under "Roles that bind to a list" above — one review per agent type in the resolved role, with that section's different-types, degrade, and say-which-it-was rules.

Draft the plan in the orchestrator pane, then run the reviews through `using-herdr-sibling-panes` (one per agent type in the resolved role, in separate panes when the list has multiple entries), wait for all of them to complete, compare the findings, resolve disagreements, and only then act or report. Reviewers are reviewers, not substitutes for the orchestrator's final judgment.

Two specifics beyond the general rules: each review is a reset-backed delegation (the drafting session's reasoning is not in the reviewer's context), and if no listed agent type is available at all, the orchestrator critically reviews its own plan and states that no independent review happened.

`brainstorming`'s builder check is this gate too, earlier: before the user reads a project's full design, each reader gets `brainstorming/builder-check-brief.md` and lists what it would still need to ask to plan from the document. The same resolution and rules apply, and brainstorming merges the readers' questions into one round for the user. A workflow that writes a full project design and then a plan therefore runs this gate twice; both runs count toward the report. A small change's short design skips the builder check; the plan's review still runs when the workflow includes one.

## Exhaustion and fallback

An agent type is exhausted when `using-herdr-sibling-panes` reports it exhausted — its output says the usage or rate limit is reached, or two delegations to two different idle panes of that type both came back with no marker and no completed work. That skill's "Failure handling" section owns the detection; this skill owns what happens next. An `agent@model` entry is exhausted as written: `cursor@Grok 4.7` exhausted leaves `cursor@Muse Spark 1.3` usable.

1. Look the exhausted agent up in the resolved `fallbacks:` map — the entry as written, then its bare kind — and take the first substitute that has a usable idle pane **within `delegation.pane_scope`**, subject to the two-reviewer rule above.
2. Re-delegate the same self-contained instruction to the substitute. Do not rewrite the task to suit it.
3. If the agent has no `fallbacks:` entry in either file, or every substitute is itself unavailable, degrade: run the work in the orchestrator pane if it is safe to do so, otherwise stop and report.
4. Remember the exhausted agent type for the rest of the task and route around it from then on.

Always state in the final report which role fell back, to which agent, and why.

## Delegation contract

Each delegated instruction must state:

1. The task and relevant context.
2. Whether edits are allowed.
3. The exact files or commands in scope.
4. The expected output and completion signal.
5. That the recipient must execute the task itself and must not re-delegate or orchestrate (e.g. "Execute this request yourself, directly. Re-delegating to other panes or orchestrating is prohibited.").

Use the sibling-pane workflow exactly, including its bundled `composer-submit.sh` helper and settle points. Do not replace it with `pane run` or raw back-to-back key calls, and do not send a redundant follow-up prompt asking a pane to run the task. An orchestrator receives the task when the delegated work finishes.
