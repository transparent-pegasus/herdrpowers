# Task Routing and Coding Boundary

This reference belongs to `orchestration`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

## Task routing

Before classifying or routing, read [profiles.md](profiles.md) and resolve the
active owner, per-key profile overlay, and separate lifecycle policy.
Freeze them for the run. Routing then names the task and reads its assignment.

1. **Name the task.** Classify the work against the task list in [SKILL.md](../SKILL.md#delegation-tasks-and-their-assignments): design work is `plan-and-design`; judgment calls — plan resolution and finding disposition, reviewer disagreement adjudication, mid-execution rulings and breaker adjudication, and final synthesis decisions — are `decision-making`; coding splits into `complex-coding` and `simple-coding` at the boundary below; lookups, moves, log gathering, and lint/format runs are `chores`; running verification commands is `verification`. When a piece of work spans tasks, use the heavier one (`plan-and-design` > `decision-making` > `complex-coding` > `simple-coding` > `chores`).
2. **Read its assignment.** Take `role` and `mode` from resolved `assignments:` after the profile overlay. `delegate` to a separate target uses a matching idle in-scope pane and reset-backed submission; when no worker can be found, see "Subagent fallback" below. With a selected profile, `delegate` resolved to the active owner requires a fresh in-process subagent, including empty-reviewer reviews; lack of that capability is a reported inability, never inline delegation. `orchestrator` uses the active owner: profile-selected self-review may be same-session or use an optional subagent; no-profile reviews still require a fresh subagent. `implementer` continues in the task's existing session. Follow the profile routing table for self-targets; do not substitute a different route.

Every worker receives the [delegation contract](../SKILL.md#delegation-contract)
and executes without re-delegation. Owner handoff uses the separate contract
in profiles.md: a mismatched reception pane asks unused versus relay even
when a matching owner exists. Lifecycle false prohibits start/exit/restart
during handoff, fallback, and recovery; true still requires verified installed
operations and protects working/unrelated agents.

## Decision-making routing

Judgment calls never stay hardcoded in the orchestrator pane when `decision-making` routes them elsewhere:

- **With `mode: delegate`** (separate target or profile self-target subagent), the active owner constructs a self-contained, read-only decision brief (see [decision-maker-brief.md](../../pane-driven-development/decision-maker-brief.md)) naming the spec/design doc, plan, relevant reports/diff package/ledger rulings, and the exact disagreement, conflict, or synthesis question, and writes the rulings returned in its report file into the ledger before dispatching follow-up work or edits.
- **With `mode: orchestrator`**, the active owner decides directly (or via an optional subagent when a profile is selected) and records the rulings in the ledger.

The active owner retains orchestration, transport, ledger bookkeeping, worktrees, and mechanical branch integration; the `decision-maker` decides plan resolution, review finding acceptance/disagreements, execution rulings, and final synthesis judgment. User decisions (design/plan approval, phase confirmation, reception `unused` vs `relay`, integration option) remain with the human partner.

## Delegation scope

Tabs usually separate projects; a reset-backed submit in another tab can discard that project's session. Respect the configured `delegation.pane_scope` filter even when a matching agent exists outside it.

An out-of-scope pane is neither a candidate nor a fallback and does not count toward availability. When no in-scope target exists, wait, use allowed fallbacks, take the subagent fallback, or report degradation. Never widen scope mid-run. `using-herdr-sibling-panes` applies the filter — see "Delegation scope" there for the exact `herdr pane list` query.

## Subagent fallback

Applies when the resolved `delegation.subagent_fallback` is `true` and a
separate worker target — a work task's role target, or one slot of a review —
is **unavailable**: no live in-scope agent matches it (a busy match is waited
for, never replaced), lifecycle permission did not start one, and its fallback
lookup left no usable substitute. An explicit empty fallback list rules out
pane substitutes only; set `subagent_fallback: false` to rule out this step.

1. Spawn a **fresh in-process subagent of the active owner's own agent kind** — the owner's native subagent facility, such as Claude Code's agent tool for a Claude owner. It works in the same repository or worktree as the pane would have.
2. Give it the same self-contained brief a pane would get: the delegation contract, edit policy, exact scope, report file, and the no-re-delegation clause. A test author still gets the requirements alone, never the implementation. It never starts, ends, or messages panes.
3. It carries none of the target's kind, model, or effort. The owner may choose a model its runtime offers, but never presents the subagent as the configured target.
4. **Reviews:** one subagent covers all unavailable slots of one review — subagents of one kind add a fresh context, not another model. Its fresh context makes it an independent-context review; report it as a subagent fallback, beside the slots that ran in panes.
5. **Work:** treat its result like any delegated result — a claim to verify, then integrate.

The report names, per delegation, the unavailable target, the subagent
fallback, and the lost constraints. The step does not apply to exhausted
targets (usage limits, two markerless delegations; those keep their fallback
and `reviewer_usage_limit` rules), to owner selection or handoff, or to tasks
whose resolved mode already runs at the owner. If the runtime cannot spawn a
subagent, the target stays unavailable and the usual degradation applies: a
review gate with no reviewer left holds, and the owner's own review never
stands in for it.

## Reviews in `mode: orchestrator`

**With a selected profile**, `mode: orchestrator` permits review in the active
owner's own session, or an optional fresh subagent at its judgment. Name
same-session self-review honestly; it is not independent review. Conversely,
`mode: delegate` resolved to that owner mandates a fresh subagent, including
when the profile has no external reviewers. Follow [profiles.md](profiles.md).

**Without a profile**, a review in `mode: orchestrator` runs in a fresh
in-process subagent with the same self-contained brief a reset pane would get
(scope, diff/paths, standards, report path); it reads the code, not the story
of how it was written. If no subagent can be spawned, report the degraded
review — never call an inline self-review independent. A list role spawns one
subagent per entry; the distinct-types rule does not apply to these owner
subagents. Name a review that ran in a spawned subagent as such, next to the
panes that ran the delegated ones. Work tasks in `mode: orchestrator` still
run inline.

## Builder check

`brainstorming`'s builder check is the `plan-review` gate, earlier: before the user reads a project's full design, each reader gets `brainstorming/builder-check-brief.md` and lists what it would still need to ask to plan from the document. The same resolution and rules apply, and brainstorming merges the readers' questions into one round for the user. A workflow that writes a full project design and then a plan therefore runs this gate twice; both runs count toward the report. A small change's short design skips the builder check; the plan's review still runs when the workflow includes one.

## Development-cycle routing

When this skill drives one of the pack's workflows (`/herdrpowers:execute`, `execute_parallel`, `full_cycle`, `quick`), the same table governs — there is no separate hard-coded mapping. Each kind of work maps to a task name; the resolved assignment says who and where:

* **Implementation tasks** → `complex-coding` / `simple-coding`.
* **Tests** → `test-authoring` for the implementation round, `fix-round-test-authoring` for each fix round. Whichever mode they resolve to, say so in the brief and in the report.
* **Code review** → `task-review` per task, `final-branch-review` at the end.
* **Judgment calls (plan resolution, review finding acceptance and disagreements, mid-execution rulings and breaker adjudication, final synthesis decisions)** → `decision-making`.
* **Chores that come up while executing a plan** → `chores`.
* **Plan and design** → `plan-and-design`, gated by `plan-review`.

Read each one's `role` and `mode` from the resolved configuration; the workflow names every assignment its repo config changed in the final report.

**Separate delegated review independence** comes from the reset session, not
pane identity: any matching idle pane can review after reset, including the
implementing pane. Do not prefer a different type. Without a selected profile,
continuing sessions must not review their own work as a gate. Profile-selected
owner-session self-review is allowed only by the modes in profiles.md and is
reported as self-review, not independent review. `delegate` self-targets still
require fresh subagents; disabled gates remain off.

## Execution strategy

`delegation.execution` sets what `/full_cycle` and `/strict_full_cycle`
attempt: `parallel` extracts independent tracks and runs them per
`/execute_parallel`; `serial` runs tasks per `/execute`. Read the resolved
value.

It sets what is attempted, not what is forced. A plan whose extraction leaves fewer than two independent tracks, or a session with only one usable pane, runs serially either way — that is degradation, and the final report says so. `/execute` and `/execute_parallel` are explicit choices by the user and ignore this key.

Under `parallel`, plans are written with tracks declared up front (see `writing-plans`), so extraction confirms a partition the plan already states rather than inventing one after the fact.

## Exhaustion and fallback

Read before choosing a substitute for an exhausted target. Exhaustion
detection belongs to `using-herdr-sibling-panes` failure handling.

1. Read the fallback rules in the profiles reference. A nested target becomes `kind@model`; consult bare kind only if that exact key is absent. A matched `[]` is authoritative. Take the first usable in-scope substitute, subject to distinct review slots. Substitutes retain string syntax and have no effort constraint; discard the primary effort.
2. Re-delegate the same self-contained instruction to the substitute. Do not rewrite the task to suit it.
3. A usage-limited reviewer with no substitute follows `reviewer_usage_limit` (`using-herdr-sibling-panes` failure handling): `wait` holds the gate until the limit resets; `skip` passes on the remaining reviewers and holds only when none is left. Neither lets the owner's own review stand in.
4. Otherwise, if no substitute can run, report degradation: without a profile, safe work may run in the owner as before. With a profile, a task resolving back to the owner obeys its mode — `delegate` still requires a fresh subagent. If that route cannot run, report inability rather than disguising inline work as delegation. The subagent fallback covers unavailable targets, not exhausted ones.
5. Remember the exhausted target, including its pinned model, for the rest of the task; do not mark other models of that kind exhausted.

## Complex coding boundary

This boundary decides which task name the work gets — `complex-coding` or `simple-coding` — not which role it goes to. The assignment does that.

Coding work is `complex-coding` when ANY of the following holds:

* **Cross-cutting change**: the change spans 3+ files or 2+ modules/layers whose interactions must stay consistent (e.g. API + client + schema).
* **Design freedom**: there is no single obvious implementation — data structures, interfaces, or algorithms must be chosen among meaningful alternatives.
* **Stateful / concurrent logic**: async flows, locking, streaming, retries, caching, or anything where ordering and partial-failure semantics matter.
* **Non-obvious debugging**: the root cause is unknown and must be inferred from behavior; reproducing or bisecting is part of the work.
* **Risky refactor**: behavior must be preserved while structure changes, and existing tests do not fully pin the behavior down.
* **Algorithmic or performance work**: correctness or complexity analysis is required, not just wiring code together.

Coding work is `simple-coding` when ALL of the following hold:

* The change is localized (1–2 files) and the intended edit can be stated precisely up front.
* It follows an existing pattern in the codebase (add a similar handler, field, test case, config entry).
* Failure is cheap and visible — a wrong result is caught immediately by tests, types, lint, or a quick run.

Examples: renaming a symbol, adding a CRUD endpoint that mirrors an existing one, writing tests for pinned-down behavior, bumping a dependency, fixing a lint/type error → `simple-coding`. Introducing a new subsystem, reworking the streaming pipeline, fixing a race condition, changing an interface used across modules → `complex-coding`.

Default when uncertain: `complex-coding`. A repo that assigns both task names to the same role makes this distinction moot — that is a legitimate configuration.
