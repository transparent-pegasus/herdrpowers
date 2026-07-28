# Workflows

Workflows tie roles and skills into end-to-end development procedures. They live in `commands/`, the default command directory of the Claude Code, Codex, and Cursor plugin conventions. Each file carries YAML frontmatter `description: ...` so supporting platforms expose it as a slash command.

Every development workflow routes its dispatches through the `orchestration` skill to herdr sibling panes. Outside herdr (`HERDR_ENV` unset, or no idle agent pane) each workflow degrades to inline execution and reports which steps were not delegated.

## Available Workflows

### `/init`

One-time repository initialization, re-runnable to update. Detects the repo's tooling, confirms values with the user, and writes two deliverables:

- the `Herdrpowers Configuration` section into the repo's `CLAUDE.md` / `AGENTS.md` — the section every other workflow and skill uses to resolve `<KEY>` placeholders (`<BASE_BRANCH>`, `<REPORT_DIRECTORY>`, `<PLAN_PATH_PATTERN>`, `<BASELINE_VERIFICATION_COMMAND>`, …);
- `.herdrpowers/config.yaml` — the repo's **role list** plus the **role assigned to every delegation task**: implementation, tests, chores, verification, and each of the five reviews. Every task is reassignable, every mode changeable (`delegate` / `orchestrator` / `implementer`), and every review individually togglable, overriding the pack's shipped `roles.yaml` defaults key by key. Tracked, not scratch.

Pack files themselves are never edited. On Claude Code plugin installs it surfaces as `/herdrpowers:init`. See [Roles](./roles.md) for the schema and the full delegation-task table.

Use when: the pack was just installed (plugin or checked-in copy), or the repo's base branch, report directory, or test/verification commands changed.

### `/full_cycle`

The full development cycle for a new feature or sizeable change, and the pack's default procedure for a task that arrives directly from the user: brainstorm → plan → **independent double review of the plan** → approval → isolate → documentation impact review → pane-delegated implementation with TDD → documentation update → repository verification → final review in a fresh pane → stop and present the integration candidates (merge locally / push and open a PR / push only / keep) for the user to pick.

Use when: starting real feature work.

### `/strict_full_cycle`

`/full_cycle` with every review gate forced on: the resolved configuration's `enabled` key is ignored for review tasks, so a gate the repository turned off runs anyway and is named as forced-on in the final report. Everything else still binds — `role`, `mode`, `roles:`, `fallbacks:`, and every invariant. Strict mode overrides one key, not the routing, and never writes the configuration file.

Use when: the branch must clear every gate the pack defines regardless of how the repository is configured — a release branch, a change on a security or money path, or an unfamiliar repository.

### `/plan`

Brainstorming, plan creation, and the plan's independent double review. Stops after the resolved plan is approved.

Use when: you want the design and the reviewed implementation plan, but intend to execute later (often in a different session with `/execute`).

### `/execute`

Post-plan execution: workspace isolation from `<BASE_BRANCH>`, documentation impact review, pane-delegated implementation with per-task review, documentation update, repository verification, final code review, then stop and present the integration candidates.

Use when: a reviewed plan already exists and you want it carried through to a reviewed, ready-to-integrate branch.

### `/execute_parallel`

Same as `/execute`, but extracts independent implementation tracks first and runs them in parallel worktrees — one pane per worktree — before integrating on a coordination branch. Falls back to `/execute` if fewer than two independent tracks survive the extraction step, or if no sibling panes are available.

Use when: the approved plan has tasks that truly can be implemented in parallel without shared ownership.

### `/quick`

A shortened cycle for small-scoped changes. Keeps brainstorming, workspace isolation off `<BASE_BRANCH>`, documentation impact review, implementation with TDD, documentation update, verification, an independent final review, and the integration handoff. Skips only the separate plan creation and its double review.

Use when: the change is small enough to land without a separate written plan. If scope grows, stop and switch to `/full_cycle`.

## Guarantees

All development workflows share the same guardrails:

- **Safety**: Never write to `<BASE_BRANCH>` without explicit user consent; work happens on a feature branch (and, for most workflows, in a dedicated worktree).
- **Integration is offered, not assumed**: a finished branch ends with the candidates presented — merge locally, push and open a PR, push only, or keep as-is (discarding happens only on an explicit request). The workflow executes the chosen one and cleans up only as far as that choice requires. No workflow merges on its own.
- **Independence**: The pane that writes code never reviews it. A review task assigned to a role that binds to a list of agent types runs once per entry, from types that never saw each other's draft. No configuration relaxes either rule.
- **Quality**: No task is marked complete without RED-GREEN evidence, a named test author, and a task review that returns both spec-compliance and code-quality verdicts.
- **Transparency**: Each step blocks for user confirmation. Agents do not proceed autonomously through the whole cycle.
- **Evidence**: `verification-before-completion` runs before any "done" claim, and a delegated pane's claim is verified against its report file — not taken on trust.
- **Root cause over symptoms**: When tests fail, `systematic-debugging` drives the investigation.
- **Honest degradation**: Any step that could not be delegated, any role that fell back to a substitute agent, and any non-default assignment or disabled review from `.herdrpowers/config.yaml`, is named in the final report.

## Invoking a Workflow

| Platform | How |
|---|---|
| Claude Code | Type the namespaced slash command (`/herdrpowers:full_cycle`, `/herdrpowers:plan`, …) from the plugin, or the bare command from a checked-in copy of `commands/`. |
| Cursor | Native slash commands from the plugin's `commands/`. |
| Codex | Plugin commands surface as skills — invoke them by name, or read `commands/<name>.md` directly. |
| Aider / other tools | No native slash commands — read the workflow file directly (e.g. `commands/full_cycle.md`) and instruct the agent to follow it step-by-step. |

> **See Also**: [Development Cycle Guide](./development_cycle.md) for a detailed walkthrough of each phase, and [Roles](./roles.md) for who does what.
