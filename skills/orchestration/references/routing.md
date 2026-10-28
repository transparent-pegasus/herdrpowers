# Task Routing and Coding Boundary

This reference belongs to `orchestration`. Script paths are relative to the
skill directory (the parent of `references/`), not this directory or the
target repository. Resolve them before invoking a script.

## Task routing

Routing is two steps: name the delegation task, then read its assignment.

1. **Name the task.** Classify the work against the task list in [SKILL.md](../SKILL.md#delegation-tasks-and-their-assignments): design work is `plan-and-design`; coding splits into `complex-coding` and `simple-coding` at the boundary below; lookups, moves, log gathering, and lint/format runs are `chores`; running verification commands is `verification`. When a piece of work spans tasks, use the heavier one (`plan-and-design` > `complex-coding` > `simple-coding` > `chores`).
2. **Read its assignment.** Take `role` and `mode` from `assignments:`. `mode: delegate` → any idle pane of that role's agent type. `mode: orchestrator` → do it here, in this pane, except a review task: spawn a fresh in-process subagent for that, per "Reviews in `mode: orchestrator`". Do not substitute your own judgment for the configured route; a repo that sent `simple-coding` to the Coder role meant it.

Every delegation must satisfy the [delegation contract](../SKILL.md#delegation-contract).

## Development-cycle routing

When this skill drives one of the pack's workflows (`/herdrpowers:execute`, `execute_parallel`, `full_cycle`, `quick`), the same table governs — there is no separate hard-coded mapping. Each kind of work maps to a task name; the resolved assignment says who and where:

* **Implementation tasks** → `complex-coding` / `simple-coding`.
* **Tests** → `test-authoring` for the implementation round, `fix-round-test-authoring` for each fix round. Whichever mode they resolve to, say so in the brief and in the report.
* **Code review** → `task-review` per task, `final-branch-review` at the end.
* **Chores that come up while executing a plan** → `chores`.
* **Plan and design** → `plan-and-design`, gated by `plan-review`.

Read each one's `role` and `mode` from the resolved configuration; the workflow names every assignment its repo config changed in the final report.

**Review independence** comes from a fresh session on each reset-backed delegation, not from a different pane ID or a different tool: every `composer-submit.sh` call resets the target session, so the reviewing agent never sees the implementing session's reasoning. Pick any idle pane of the resolved role's agent type(s) — including the pane that implemented — and do not apply a prefer-different-type heuristic. Unreset continuing sessions must not review their own work product.

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
