---
name: orchestration
description: "Route every task received directly from the user through the pane that received it (the orchestrator) in herdr unless the user explicitly denies orchestration. Does NOT apply to tasks delegated from another pane — execute those yourself, never re-delegate. Role assignments and review gates come from the repository's .herdrpowers/config.yaml, falling back to the pack's roles.yaml defaults: planning/design is done by the orchestrator and double-reviewed by Reviewer agents; complex coding goes to Coder agents; everything else goes to Generalist agents, via using-herdr-sibling-panes. Every review gate is individually togglable, and a disabled gate is named in the final report. Roles bind to agent types, not reserved panes — any idle pane of the right type can take any task, and an exhausted agent is replaced by its substitute from the fallbacks map."
---

# Orchestration

## Configuration resolution

Two files answer "who does what, and which reviews run", in this order:

1. **`<repo-root>/.herdrpowers/config.yaml`** — the target repository's own configuration, written by the init workflow. Wins key by key.
2. **[`roles.yaml`](roles.yaml)** — the pack's shipped defaults. Supplies every key the repo file omits.

Read both at the start of every orchestrated task (the repo file may be absent — that is normal, and means defaults apply throughout). They share one schema: `roles:` (role → agent type), `fallbacks:` (agent → substitutes), `reviews:` (gate → `enabled` + `role`). Merging is per key, not per file: a repo config that sets only `reviews.task-review.enabled` keeps every default role assignment.

**Customize in the repo file, never in `roles.yaml`.** Plugin installations are read-only, so `roles.yaml` is not editable there at all; on checked-in copies, editing it makes the pack diff-dirty against upstream. The rest of this skill refers to roles and gates by name, never to tool names.

If the repo has no `.herdrpowers/config.yaml` and the user wants to change an assignment or turn a review off, run the init workflow (`/herdrpowers:init`, or `commands/init.md`) — do not edit `roles.yaml`.

**Never write either file from inside an orchestrated run.** The configuration is input, resolved once before the first delegation. Rewriting it mid-run to route around an unavailable agent or to escape a review gate falsifies the terms the run reported under; unavailability is what `fallbacks:` and honest degradation are for.

## Review gates

Each entry under `reviews:` has two knobs: `enabled` (does this gate run at all) and `role` (which role performs it). Resolve every gate before the workflow's first delegation, not when you reach it.

| Gate | Runs in | Off means |
|---|---|---|
| `plan-double-review` | `/plan`, `/full_cycle` | The plan goes straight to the user for approval, unreviewed |
| `documentation-impact-review` | `/execute`, `/execute_parallel`, `/full_cycle`, `/quick` | No pre-implementation sweep for non-code files |
| `task-review` | `pane-driven-development` | A task completes on the implementing pane's own report |
| `fix-round-re-review` | `pane-driven-development` fix loop | Fixes are taken on the fixing pane's word; the round still counts against the five-round cap |
| `final-branch-review` | `/execute`, `/execute_parallel`, `/full_cycle`, `/quick` | The branch reaches the integration decision unreviewed |

**A disabled gate is named in the final report**, next to any role that fell back and any review that degraded for lack of panes. The user turned it off; the report says so, every run, so nobody later mistakes an unreviewed branch for a reviewed one.

**Disabling a gate never relaxes independence for the gates that stay on.** A pane never reviews work it wrote, and the two plan reviews still come from two different agent types. If a config asks for something that violates that — the same agent type in both Reviewer slots, or a review routed back to the implementing pane — honor the independence rule, ignore that part of the config, and say so in the report.

## Role assignments

Panes are NOT reserved per role. Roles bind to agent types, not to specific panes: at delegation time, pick any idle pane of the matching agent type. A pane that just finished a review can take a coder or generalist task next, and vice versa. When no pane of the right type is idle, wait or run the work in the orchestrator pane — do not interrupt a working pane.

## Orchestrator

Apply this skill only when the task came directly from the user. Whichever pane the user enters the instruction into becomes the orchestrator for that task — do not assume or require a specific tool for it. The orchestrator keeps final synthesis and user communication; delegated agents report back to it.

**No re-delegation.** If your task arrived as a delegated instruction from another pane (not from the user), this skill does not apply: execute the task yourself in your own pane and never delegate it onward, even if it looks routine. Re-delegation creates cascades where multiple panes contend for the same siblings and no one does the work.

Use `using-herdr-sibling-panes` for every delegation. Submit through its bundled `composer-submit.sh` and wait for the delegated result before integrating it. Do not use `pane run` for agent-pane prompts.

## Task routing

1. **Planning / design**: the orchestrator does the planning and design work itself, then sends the resulting plan for double review to both Reviewer agents with the same self-contained task.
2. **Complex coding**: delegate to a Coder agent. See "Complex coding boundary" below.
3. **Everything else**: delegate to a Generalist agent — simple coding, search, file inspection, tests, lint, formatting, and other mechanical or routine operations.

When categories overlap, use the heavier category (planning/design > complex coding > everything else).

Every delegation must satisfy the "Delegation contract" below.

## Development-cycle routing

When this skill drives one of the pack's workflows (`/herdrpowers:execute`, `execute_parallel`, `full_cycle`, `quick`), the mapping is fixed:

* **Implementation tasks, test authoring, and code review** → Coder. The pane that writes tests owns RED-GREEN-REFACTOR per `test-driven-development`; say so in the brief. There is no separate test-writing or reviewing agent type — a Coder pane does both.
* **Chores that come up while executing a plan** — lookups, file moves, log gathering, mechanical edits, lint/format runs → Generalist.
* **Plan and design** stay with the orchestrator, double-reviewed per "Plan/design double review" below.

**Review independence** comes from a fresh pane context, not from a different tool: every delegation starts by resetting the target session, so a reviewing pane never sees the implementing pane's reasoning. Where an idle pane of a different agent type is available, prefer it for review over the type that implemented the change. Never send a change back for review to the pane that wrote it.

## Complex coding boundary

Coding work is **complex** (→ Coder) when ANY of the following holds:

* **Cross-cutting change**: the change spans 3+ files or 2+ modules/layers whose interactions must stay consistent (e.g. API + client + schema).
* **Design freedom**: there is no single obvious implementation — data structures, interfaces, or algorithms must be chosen among meaningful alternatives.
* **Stateful / concurrent logic**: async flows, locking, streaming, retries, caching, or anything where ordering and partial-failure semantics matter.
* **Non-obvious debugging**: the root cause is unknown and must be inferred from behavior; reproducing or bisecting is part of the work.
* **Risky refactor**: behavior must be preserved while structure changes, and existing tests do not fully pin the behavior down.
* **Algorithmic or performance work**: correctness or complexity analysis is required, not just wiring code together.

Coding work is **simple** (→ Generalist) when ALL of the following hold:

* The change is localized (1–2 files) and the intended edit can be stated precisely up front.
* It follows an existing pattern in the codebase (add a similar handler, field, test case, config entry).
* Failure is cheap and visible — a wrong result is caught immediately by tests, types, lint, or a quick run.

Examples: renaming a symbol, adding a CRUD endpoint that mirrors an existing one, writing tests for pinned-down behavior, bumping a dependency, fixing a lint/type error → Generalist. Introducing a new subsystem, reworking the streaming pipeline, fixing a race condition, changing an interface used across modules → Coder.

Default when uncertain: treat it as complex and send it to the Coder — a misrouted simple task costs little there, while a complex task misrouted to the Generalist produces subtle breakage.

## Plan/design double review

Runs when the `plan-double-review` gate is enabled. One review per agent type listed under the resolved `roles.reviewer.agents` — that list is what makes it a *double* review, so a one-entry list is a deliberate single review, not a degradation, and an empty list is the same as disabling the gate. Either way, say which it was.

Draft the plan in the orchestrator pane, then run both reviews through `using-herdr-sibling-panes` (one to each Reviewer agent, in separate panes), wait for both to complete, compare the findings, resolve disagreements, and only then act or report. Reviewers are reviewers, not substitutes for the orchestrator's final judgment.

Degrade instead of blocking when the full Reviewer set is unavailable. A Reviewer agent counts as available if any pane of that type exists in the session, even if it is currently busy — wait for busy panes, never interrupt them. If only one Reviewer agent type is available, run a single delegated review with it and state in the final report that the second independent review was skipped. If none is available, the orchestrator critically reviews its own plan and states that no independent review happened. Never delegate a review of a plan to the pane that drafted it.

The two reviews must come from two different agent types. If applying a fallback would put the same agent type in both Reviewer slots, do not use it there: leave that slot unavailable and degrade to a single review instead.

## Exhaustion and fallback

An agent type is exhausted when `using-herdr-sibling-panes` reports it exhausted — its output says the usage or rate limit is reached, or two delegations to two different idle panes of that type both came back with no marker and no completed work. That skill's "Failure handling" section owns the detection; this skill owns what happens next.

1. Look the exhausted agent up in the resolved `fallbacks:` map and take the first substitute that has a usable idle pane, subject to the two-reviewer rule above.
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
