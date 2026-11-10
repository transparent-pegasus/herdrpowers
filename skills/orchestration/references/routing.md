# Task Routing and Coding Boundary

This reference belongs to `orchestration`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

## Task routing

Before classifying or routing, read [profiles.md](profiles.md) and resolve the
active owner, per-key profile overlay, and separate lifecycle policy.
Freeze them for the run. Routing then names the task and reads its assignment.

1. **Name the task.** Classify the work against the task list in [SKILL.md](../SKILL.md#delegation-tasks-and-their-assignments): design work is `plan-and-design`; coding splits into `complex-coding` and `simple-coding` at the boundary below; lookups, moves, log gathering, and lint/format runs are `chores`; running verification commands is `verification`. When a piece of work spans tasks, use the heavier one (`plan-and-design` > `complex-coding` > `simple-coding` > `chores`).
2. **Read its assignment.** Take `role` and `mode` from resolved `assignments:` after the profile overlay. `delegate` to a separate target uses a matching idle in-scope pane and reset-backed submission. With a selected profile, `delegate` resolved to the active owner requires a fresh in-process subagent, including empty-reviewer reviews; lack of that capability is a reported inability, never inline delegation. `orchestrator` uses the active owner: profile-selected self-review may be same-session or use an optional subagent; no-profile reviews still require a fresh subagent. `implementer` continues in the task's existing session. Follow the profile routing table for self-targets; do not substitute a different route.

Every worker receives the [delegation contract](../SKILL.md#delegation-contract)
and executes without re-delegation. Owner handoff uses the separate contract
in profiles.md: a mismatched reception pane asks unused versus relay even
when a matching owner exists. Lifecycle false prohibits start/exit/restart
during handoff, fallback, and recovery; true still requires verified installed
operations and protects working/unrelated agents.

## Development-cycle routing

When this skill drives one of the pack's workflows (`/herdrpowers:execute`, `execute_parallel`, `full_cycle`, `quick`), the same table governs — there is no separate hard-coded mapping. Each kind of work maps to a task name; the resolved assignment says who and where:

* **Implementation tasks** → `complex-coding` / `simple-coding`.
* **Tests** → `test-authoring` for the implementation round, `fix-round-test-authoring` for each fix round. Whichever mode they resolve to, say so in the brief and in the report.
* **Code review** → `task-review` per task, `final-branch-review` at the end.
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
