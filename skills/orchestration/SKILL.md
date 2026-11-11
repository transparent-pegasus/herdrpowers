---
name: orchestration
description: Use when handling a task received directly from the user in Herdr, including repositories with profiles, model/effort constraints, or custom role assignments. Does not apply to delegated workers or an explicit request to execute without orchestration.
---

# Orchestration

## Configuration resolution

**Before resolving ownership, classifying work, or routing any task, read
[references/profiles.md](references/profiles.md).** It owns profile selection,
key-presence precedence, target validation/migration, owner handoff, lifecycle
permission, and the profile-scoped self-target routes. Apply its conditional
rules before the legacy no-profile rules below; no separate config engine is
needed. Resolve once and freeze the run's settings.

The base configuration answers "who does what, and which reviews run":

1. **`<repo-root>/.herdrpowers/config.yaml`** — the target repository's own configuration, written by the init workflow. Wins key by key.
2. **[`roles.yaml`](roles.yaml)** — the pack's shipped defaults. Supplies every key the repo file omits.

Read both at the start of every orchestrated task (the repo file may be absent).
Then overlay only keys present in the selected profile, per the profiles reference.
The base files share this schema:

- **`roles:`** — each role key's binding: one target, `orchestrator`, or a list. Custom keys add roles. New targets use `{kind: {model: <string>, effort: <string>}}`; settings are optional, effort requires model. The bare `orchestrator` alias resolves to the active owner. Legacy bare kinds, `agent:`/`agents:` sub-keys, the old `reviewer` key, and non-fallback `kind@model` remain readable, with a deprecation notice for all but bare kinds; init writes nested targets. Validate and normalize per the profiles reference, not by silently ignoring invalid fields.
- **`fallbacks:`** — agent → ordered substitutes, for when an agent cannot take work. Keys and substitutes may be pinned too.
- **`delegation:`** — defaults that apply to every task: `pane_scope` (which panes are eligible at all) and `execution` (parallel or serial by default).
- **`assignments:`** — every delegation task, each with the role that performs it.
- **`profile`** — optional preset name; its present composition and routing entries override the base configuration.
- **`allow_agent_lifecycle`** — top-level strict boolean, separate from composition/delegation; defaults false. False starts and ends no agent. True lets the active owner start a resolved target that has no live match and end idle agents the task started, only through `agent-lifecycle.sh`, which enforces the value. Read the profiles reference before any startup, exit, or recovery action, including owner handoff and fallback.
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

Tabs usually separate projects; a reset-backed submit in another tab can
discard that project's session. Respect the configured filter even when a
matching agent exists outside it.

An out-of-scope pane is neither a candidate nor a fallback and does not count
toward availability. When no in-scope target exists, wait, use allowed
fallbacks, or report degradation. Never widen scope mid-run.

`using-herdr-sibling-panes` applies the filter — see "Delegation scope" there for the exact `herdr pane list` query.

## Execution strategy

`delegation.execution` sets what `/full_cycle` and `/strict_full_cycle` attempt:
`parallel` extracts independent tracks and runs them per `/execute_parallel`;
`serial` runs tasks per `/execute`. Read the resolved value.

It sets what is attempted, not what is forced. A plan whose extraction leaves fewer than two independent tracks, or a session with only one usable pane, runs serially either way — that is degradation, and the final report says so. `/execute` and `/execute_parallel` are explicit choices by the user and ignore this key.

Under `parallel`, plans are written with tracks declared up front (see `writing-plans`), so extraction confirms a partition the plan already states rather than inventing one after the fact.

## Delegation tasks and their assignments

`assignments:` is the routing table. **The resolved YAML is the source of truth for every route and every default** — read it, never recall a default from prose. The tables below name what each task covers; who performs it and where comes from the merged configuration, and the knobs are the same for all of them.

- **`role`** — which role from `roles:` performs the task.
- **`mode`** — where it runs: `delegate` uses a fresh reset-backed worker of that role; a selected-profile target resolving to the owner requires a fresh in-process subagent, including reviews with empty reviewers. `orchestrator` uses the active owner; profile-selected reviews may run in that session, while no-profile reviews require a fresh subagent (see below). `implementer` continues in the session already owning the task. Read the profile routing table before applying any self-target route.
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

**Every assignment the repo config or profile changed away from `roles.yaml`, every non-default `delegation:` value, and every disabled review, is named in the final report**, next to any role that fell back and any review that degraded for lack of panes. The user configured it; the report says so, every run, so nobody later mistakes an unreviewed branch for a reviewed one, or a self-tested one for independently tested.

### Roles that bind to a list

A role bound to a list runs **one delegation per entry**, and you wait
for all before acting. A one-entry list is a deliberate single delegation.
A config empty role list disables that task unless a profile overrides the
binding. Profile `reviewers: [orchestrator]`/`[]`/null/`none` instead selects the active owner;
an enabled review still runs and `delegate` still requires a fresh subagent.

Three rules bind wherever a list role is used:

- **Separate targets use different agent types, or one type on distinct pinned models.** Compare model strings case-insensitively, with neither containing the other; a bare kind beside that kind on a model is the same type twice. Nested and legacy targets follow the same rule. Different effort on one model does not create a second independent slot. Each slot takes its own pane; leave an invalid/duplicated slot unavailable and report the reduced set.
- **Degrade, never block.** A target counts as available only if an in-scope matching live agent exists, even if busy; wrong model/effort does not count. Wait for busy matches, never interrupt them. With lifecycle true, start a slot that has no live match before counting it missing. Run the available slots and report missing ones. If none can run, follow "Exhaustion and fallback" and the mandatory profile self-target mode, stating any lost independence.
- **Say which it was.** Full set, degraded set, or single — the report names it, every time.

Compare findings across the returned reviews, resolve disagreements, and only then act. Reviewers advise; the orchestrator decides.

### Reviews in `mode: orchestrator`

**With a selected profile**, `mode: orchestrator` permits review in the active
owner's own session, or an optional fresh subagent at its judgment. Name
same-session self-review honestly; it is not independent review. Conversely,
`mode: delegate` resolved to that owner mandates a fresh subagent, including
when the profile has no external reviewers. Follow the profiles reference.

**Without a profile**, a review in `mode: orchestrator` still requires a fresh
in-process subagent. Give it the same self-contained review brief as a reset
pane (scope, diff/paths, standards, report path). Its fresh context provides
independence. The following legacy rules apply only without a profile:

- **Never inline the gate.** If no subagent can be spawned, report the degraded review rather than claiming independent review of your own work.
- **The brief is the same brief.** Self-contained, no reliance on the orchestrator's conversation context; the review reads the code, not the story of how it was written.
- **Work tasks are not affected.** `mode: orchestrator` on a work task means the orchestrator does it inline, as before.
- **The report names it.** A review that ran in a spawned subagent is named as such, next to which panes ran the delegated ones.

Without a profile, a list-role orchestrator-mode review spawns one subagent
per entry; the distinct-types rule does not apply to these owner subagents.

### What no assignment can change

- **Separate delegated review independence comes from reset, not pane ID.** Any idle pane of the resolved target may review after reset, including the implementing pane; do not prefer a different type. Without a profile, continuing sessions must not grade their own work as a gate and orchestrator-mode reviews require fresh subagents. Selected-profile owner-session reviews are the explicit exception in the profiles reference; delegated self-targets still require fresh subagents. Disabling a gate removes it in either path.
- **Separate review slots require different types or distinct pinned models.** Leave duplicate slots unavailable and name that degradation; owner-session modes follow the explicit profile/no-profile rules above.
- **The report names the test writer and transport**, whatever `test-authoring` and `fix-round-test-authoring` resolve to. A delegated author is a fresh worker that never saw implementation (a reset pane or the profile's required self-target subagent). In `implementer` mode the implementing session writes them; enabled reviewers audit that test code. Report whether the review was independent or permitted profile self-review; this mode never revives a disabled gate.
- **Separate-target `review-fixes` escalates.** Fix-loop rounds 4-5 use a fresh escalated type even in `implementer` mode. Profile self-targets keep their resolved mode; no-profile escalation is unchanged.

## Role assignments

Panes are not reserved per role. Pick any idle matching target within scope;
a pane may serve a different role after its prior task finishes. When no
candidate is idle, wait, use allowed fallbacks, or report degradation under
the resolved mode. Do not interrupt working panes or reach outside scope.
Apply lifecycle permission before any recovery/start/exit action: false
starts nothing; true starts a target with no live in-scope match before any
fallback, and ends the task-started agents when the run is done.

Nested model/effort constraints must match live footer evidence before any
key and after reset, per `using-herdr-sibling-panes`. Legacy pins still require
their model. Routing never switches an existing agent's settings. Name the
pane ID and verified footer for every constrained target.

## Orchestrator

Apply this skill only to direct user tasks. Without a profile the reception
pane is the owner. With a profile, follow the profiles reference: a mismatched
reception pane always asks unused versus relay before handoff/startup, and
the verified selected owner receives explicit authority and frozen settings.
The active owner keeps final synthesis and decisions; a relay only relays.

**No re-delegation.** If your task arrived as a delegated instruction from another pane (not from the user), this skill does not apply: execute the task yourself in your own pane and never delegate it onward, even if it looks routine. Re-delegation creates cascades where multiple panes contend for the same siblings and no one does the work.

Use `using-herdr-sibling-panes` for separate-target delegations and its bundled
`composer-submit.sh`; wait for the result before integrating. Profile-selected
self-targets use the in-process route required by their mode. No worker in
either transport may re-delegate. Do not use `pane run` for agent prompts.

## Task routing

Before classifying or routing work, read the profiles reference above and
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

Draft where `plan-and-design` resolves, then route the enabled reviews by
their resolved assignment and profile rules. Wait for all, compare findings,
and resolve disagreements before acting. The active owner decides.

Without a profile, each external review is reset-backed; if none of the listed
types is available, the owner critically reviews the plan and reports no
independent review. With a profile, self-target delegate reviews require fresh
subagents; other owner-session modes permit reported self-review.

`brainstorming`'s builder check is this gate too, earlier: before the user reads a project's full design, each reader gets `brainstorming/builder-check-brief.md` and lists what it would still need to ask to plan from the document. The same resolution and rules apply, and brainstorming merges the readers' questions into one round for the user. A workflow that writes a full project design and then a plan therefore runs this gate twice; both runs count toward the report. A small change's short design skips the builder check; the plan's review still runs when the workflow includes one.

## Exhaustion and fallback

An agent target is exhausted when `using-herdr-sibling-panes` reports a usage
limit, or two delegations to different idle panes of that target return no
marker and no completed work. Its failure handling owns detection. Exhaustion
of one pinned model does not exhaust another model of that kind.

1. Read the fallback rules in the profiles reference. A nested target becomes `kind@model`; consult bare kind only if that exact key is absent. A matched `[]` is authoritative. Take the first usable in-scope substitute, subject to distinct review slots. Substitutes retain string syntax and have no effort constraint; discard the primary effort.
2. Re-delegate the same self-contained instruction to the substitute. Do not rewrite the task to suit it.
3. If no substitute can run, report degradation: without a profile, safe work may run in the owner as before. With a profile, a task resolving back to the owner obeys its mode — `delegate` still requires a fresh subagent. If that route cannot run, report inability rather than disguising inline work as delegation. A usage-limited reviewer follows `reviewer_usage_limit` instead (`using-herdr-sibling-panes` failure handling).
4. Remember the exhausted target, including its pinned model, for the rest of the task; do not mark other models of that kind exhausted.

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

Use the sibling-pane helper and settle points for separate targets; use the
same self-contained brief/no-re-delegation contract for profile self-target
subagents. Do not replace the helper with `pane run` or raw back-to-back keys,
or send a redundant follow-up prompt. Owner handoff is a distinct transfer
contract in the profiles reference, not an ordinary worker delegation.
