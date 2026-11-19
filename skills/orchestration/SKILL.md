---
name: orchestration
description: Use when handling a task received directly from the user in Herdr, including repositories with profiles, model/effort constraints, or custom role assignments. Does not apply to delegated workers or an explicit request to execute without orchestration.
---

# Orchestration

## Configuration resolution

**Before resolving ownership, classifying work, or routing any task, read
[references/profiles.md](references/profiles.md).** It owns profile selection,
key-presence precedence, target validation/migration, `any` slots and efforts,
owner handoff, lifecycle permission, and the profile-scoped self-target routes.
Apply its conditional rules before the legacy no-profile rules below; no
separate config engine is needed. Resolve once and freeze the run's settings.

The base configuration answers "who does what, and which reviews run":

1. **`<repo-root>/.herdrpowers/config.yaml`** — the target repository's own configuration, written by the init workflow. Wins key by key.
2. **[`roles.yaml`](roles.yaml)** — the pack's shipped defaults. Supplies every key the repo file omits.

Read both at the start of every orchestrated task (the repo file may be absent).
Then overlay only keys present in the selected profile, per the profiles reference.
The base files share this schema:

- **`roles:`** — each role key's binding: one target, `orchestrator`, or a list. Custom keys add roles. New targets use `{kind: {model: <string>, effort: <string>}}`; settings are optional, effort requires model, and effort `any` leaves the effort to the active owner. The bare `orchestrator` alias resolves to the active owner. Legacy forms remain readable, with a deprecation notice for all but bare kinds; init writes nested targets. Validate and normalize per the profiles reference, never by silently ignoring invalid fields.
- **`fallbacks:`** — agent → ordered substitutes, for when an agent cannot take work. Keys and substitutes may be pinned too.
- **`delegation:`** — defaults that apply to every task: `pane_scope` (which panes are eligible at all), `execution` (parallel or serial by default), and `subagent_fallback` (whether an unavailable target's work goes to a fresh subagent of the owner's own kind).
- **`assignments:`** — every delegation task, each with the role that performs it.
- **`profile`** — optional preset name; its present composition and routing entries override the base configuration. The task fills its `any` slots.
- **`allow_agent_lifecycle`** — top-level strict boolean, separate from composition/delegation; defaults false. False starts and ends no agent; true lets the active owner start unmatched targets and end idle task-started agents, only through `agent-lifecycle.sh`, which enforces the value. Read the profiles reference before any startup, exit, or recovery action, including owner handoff and fallback.
- **`reviewer_usage_limit`** — top-level `wait` or `skip`, config-only: how a review gate treats a usage-limited reviewer with no substitute (see below).

Merging is per key, not per file. Lists replace rather than concatenate.
Present profile `roles:` entries replace their bindings. Profile
`fallbacks`, `delegation`, and `assignments` merge per key, including assignment
fields; omitted entries retain config/default values. Resolve modes and gate
enablement after the overlay. Empty profile reviewers select the owner, while
a config empty role list keeps its disabling semantics if no profile overrides it.

Report assignment keys not defined by `roles.yaml`: otherwise their intended
task silently uses a default and can revive a disabled review. Honor legacy
`plan-double-review` as `plan-review` and ask the user to rename the key.

Customize consumer routing in `.herdrpowers/config.yaml`, not the installed
`roles.yaml`; use the init workflow if the repo file is absent. Configuration
and the selected profile are frozen inputs during a run. Never rewrite them
to escape an unavailable agent or a review gate; use allowed fallbacks and
report degradation instead.

## Delegation scope

`delegation.pane_scope` filters eligible panes before selecting a role target
or an owner handoff recipient. Read its resolved value after the profile overlay
and freeze it; never widen it during the run.

| value | eligible panes |
|---|---|
| `tab` | only panes whose `tab_id` matches the orchestrator's |
| `workspace` | any pane in the orchestrator's `workspace_id`, in any tab |
| `session` | every agent pane `herdr pane list` reports |

Read [references/routing.md](references/routing.md#delegation-scope) for scope rationale, out-of-scope rules, and `using-herdr-sibling-panes` for the exact `herdr pane list` query. Out-of-scope panes are never candidates or fallbacks; never widen scope mid-run.

## Execution strategy

`delegation.execution` sets what `/full_cycle` and `/strict_full_cycle` attempt:
`parallel` extracts independent tracks and runs them per `/execute_parallel`;
`serial` runs tasks per `/execute`. It sets what is attempted, not what is
forced; read [references/routing.md](references/routing.md#execution-strategy)
before writing the plan.

## Delegation tasks and their assignments

`assignments:` is the routing table. **The resolved YAML is the source of truth for every route and every default** — read it, never recall a default from prose. The tables below name what each task covers; who performs it and where comes from the merged configuration, and the knobs are the same for all of them.

- **`role`** — which role from `roles:` performs the task.
- **`mode`** — where it runs: `delegate` uses a fresh reset-backed worker of that role; a selected-profile target resolving to the owner requires a fresh in-process subagent, including reviews with empty reviewers. `orchestrator` uses the active owner; profile-selected reviews may run in that session, while no-profile reviews require a fresh subagent (see "Reviews in `mode: orchestrator`"). `implementer` continues in the session already owning the task. Read the profile routing table before applying any self-target route.
- **`enabled`** — review tasks only. `false` removes the gate entirely. Work tasks are mandatory: to stop delegating one, set `mode: orchestrator` — never `enabled: false`.

Resolve every task the workflow will touch before its first delegation, not when you reach it.

**Work tasks** — these always happen; the assignment decides who and where:

| Task | Covers |
|---|---|
| `plan-and-design` | Brainstorming, design docs, implementation plans |
| `decision-making` | Plan resolution, review finding acceptance/disagreements, mid-execution rulings and breaker adjudication, final synthesis decisions |
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

**Every assignment the repo config or profile changed away from `roles.yaml`, every non-default `delegation:` value, and every disabled review, is named in the final report**, next to any role that fell back, any subagent fallback, and any review that degraded for lack of panes. The report says so every run, so nobody mistakes an unreviewed branch for a reviewed one, or a self-tested one for independently tested.

### Roles that bind to a list

A role bound to a list runs **one delegation per entry**, and you wait
for all before acting. A one-entry list is a deliberate single delegation.
A config empty role list disables that task unless a profile overrides the
binding. Profile `reviewers: [orchestrator]`/`[]`/null/`none` instead selects the active owner;
an enabled review still runs and `delegate` still requires a fresh subagent.

Three rules bind wherever a list role is used:

- **Separate targets use different agent types, or one type on distinct pinned models.** Compare model strings case-insensitively, with neither containing the other; a bare kind beside that kind on a model is the same type twice. Nested and legacy targets follow the same rule. Different effort on one model does not create a second independent slot. Each slot takes its own pane; leave an invalid/duplicated slot unavailable and report the reduced set.
- **Degrade, never block — until nothing is left.** A target counts as available only if an in-scope matching live agent exists, even if busy; wrong model/effort does not count. Wait for busy matches, never interrupt them. With lifecycle true, start a slot that has no live match before counting it missing. Unavailable slots take the subagent fallback below; run the available slots and report missing ones, following "Exhaustion and fallback" and the mandatory profile self-target mode. With nothing left to run, the gate holds: integrate nothing that depends on it, report, and resume when a reviewer returns. The owner's own review never stands in for missing reviewers.
- **Say which it was.** Full set, degraded set, subagent fallback, or single — the report names it, every time.

Compare findings across the returned reviews, route disagreements and finding acceptance through `decision-making` (`decision-maker`), and only then act. Reviewers advise; the `decision-maker` decides.

### Reviews in `mode: orchestrator`

With a selected profile, the active owner may review in its own session —
reported as self-review, not independent review — or in an optional fresh
subagent; `mode: delegate` resolved to that owner mandates a fresh subagent.
Without a profile, the review runs in a fresh in-process subagent. Read
[references/routing.md](references/routing.md#reviews-in-mode-orchestrator)
before running one.

### What no assignment can change

- **Separate delegated review independence comes from reset, not pane ID.** Any idle pane of the resolved target may review after reset, including the implementing pane; do not prefer a different type. Without a profile, continuing sessions must not grade their own work as a gate and orchestrator-mode reviews require fresh subagents. Selected-profile owner-session reviews are the explicit exception in the profiles reference; delegated self-targets still require fresh subagents. Disabling a gate removes it in either path.
- **Separate review slots require different types or distinct pinned models.** Leave duplicate slots unavailable and name that degradation; owner-session modes follow the explicit profile/no-profile rules above.
- **The report names the test writer and transport**, whatever `test-authoring` and `fix-round-test-authoring` resolve to. A delegated author is a fresh worker that never saw implementation (a reset pane or the profile's required self-target subagent). In `implementer` mode the implementing session writes them; enabled reviewers audit that test code. Report whether the review was independent or permitted profile self-review; this mode never revives a disabled gate.
- **Separate-target `review-fixes` escalates.** Fix-loop rounds 4-5 use a fresh escalated type even in `implementer` mode. Profile self-targets keep their resolved mode; no-profile escalation is unchanged.

## Role assignments

Panes are not reserved per role: pick any idle matching target within scope,
whatever it did last. Never interrupt working panes or reach outside scope.
Apply lifecycle permission before any recovery/start/exit action: false
starts nothing; true starts a target with no live in-scope match before any
fallback, and ends the task-started agents when the run is done.

Nested model/effort constraints must match live footer evidence before any
key and after reset, per `using-herdr-sibling-panes`. Legacy pins still require
their model. With effort `any`, the active owner picks the effort for each
delegation — among matching panes, or as a launch argument it starts under
lifecycle permission — and reports what it chose. Routing never switches an
existing agent's settings. Name the pane ID and verified footer for every
constrained target.

## Unavailable targets and the subagent fallback

A target with no in-scope live match is **unavailable**, not exhausted. Wait
for a busy match; start one when lifecycle permission is true; then try its
fallbacks. When none of that yields a worker and the resolved
`delegation.subagent_fallback` is `true`, run the delegation in a **fresh
in-process subagent of the active owner's own agent kind**, with the same
self-contained brief and the no-re-delegation clause. Read
[references/routing.md](references/routing.md#subagent-fallback) before the
first one. The subagent carries none of the target's kind, model, or effort:
report it as a subagent fallback with those lost constraints. `false`, or a
runtime that cannot spawn subagents, keeps the degradation in "Exhaustion and
fallback" below.

## Orchestrator

Apply this skill only to direct user tasks. Without a profile the reception
pane is the owner. With a profile, follow the profiles reference: a mismatched
reception pane always asks unused versus relay before handoff/startup, and
the verified selected owner receives explicit authority and frozen settings.
The active owner keeps orchestration and coordination, while judgment calls and final synthesis follow `decision-making` (`decision-maker`); a relay only relays.

**No re-delegation.** If your task arrived as a delegated instruction from another pane (not from the user), this skill does not apply: execute it yourself and never delegate it onward. Re-delegation creates cascades where panes contend for the same siblings and no one does the work.

Use `using-herdr-sibling-panes` for separate-target delegations and its bundled
`composer-submit.sh`; wait for the result before integrating. Profile-selected
self-targets use the in-process route required by their mode. No worker in
either transport may re-delegate. Do not use `pane run` for agent prompts.

## Task routing

Before classifying or routing work, read the profiles reference above and
[references/routing.md](references/routing.md). Name the delegation task,
then read its resolved assignment; the same routing applies inside workflows.
Read its [workflow mapping](references/routing.md#development-cycle-routing)
when entering a workflow.

## Complex coding boundary

Read the [coding boundary](references/routing.md#complex-coding-boundary)
before choosing `complex-coding` or `simple-coding`. The boundary selects a
task name; the resolved assignment selects the role and mode.

## Plan/design review

Runs when the `plan-review` gate is enabled, under "Roles that bind to a list" above.

Draft where `plan-and-design` resolves, then route the enabled reviews by
their resolved assignment and profile rules. Wait for all, compare findings,
and route disagreements and plan resolution through `decision-making`.
Reviewers advise; the `decision-maker` decides.

Without a profile, each external review is reset-backed; unavailable slots take
the subagent fallback, and with no reviewer left the gate holds rather than
passing on the owner's own review. With a profile, self-target delegate reviews
require fresh subagents; other owner-session modes permit reported self-review.

For `brainstorming`'s builder check under `plan-review`, read [references/routing.md](references/routing.md#builder-check).

## Exhaustion and fallback

An agent target is exhausted when `using-herdr-sibling-panes` reports a usage
limit, or two delegations to different idle panes of that target return no
marker and no completed work. Its failure handling owns detection. Exhaustion
of one pinned model does not exhaust another model of that kind. Before
choosing a substitute or degrading, read
[references/routing.md](references/routing.md#exhaustion-and-fallback) for the
steps. A matched `[]` is authoritative, substitutes carry no effort
constraint, a usage-limited reviewer follows `reviewer_usage_limit`, and the
owner's own review never stands in. The subagent fallback covers unavailable
targets, not exhausted ones.

Report which role fell back, to which target, why, and which constraints were
lost. Fallback alone never authorizes startup. With lifecycle true, a target
that is unavailable but not exhausted is started before its substitutes.

## Delegation contract

Each delegated instruction must state:

1. The task and relevant context.
2. Whether edits are allowed.
3. The exact files or commands in scope.
4. The expected output and completion signal.
5. That the recipient must execute the task itself and must not re-delegate or orchestrate (e.g. "Execute this request yourself, directly. Re-delegating to other panes or orchestrating is prohibited.").

A review brief also lists the user's requirements for this task verbatim, in
the order they were given, and asks for a verdict on each — met, partial,
unmet, or superseded by a later requirement — with file and line evidence. A
later requirement wins where two conflict; code findings come after.

Use the sibling-pane helper and settle points for separate targets, and the
same brief and no-re-delegation clause for every subagent. Never replace the
helper with `pane run` or raw keys, or send a redundant follow-up prompt.
Owner handoff is a separate transfer contract in the profiles reference, not
a worker delegation.
