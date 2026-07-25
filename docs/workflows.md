# Workflows

Workflows tie roles and skills into end-to-end development procedures. They live in `commands/`, the default command directory of the Claude Code, Codex, and Cursor plugin conventions. Each file carries YAML frontmatter `description: ...` so supporting platforms expose it as a slash command.

Every development workflow routes its dispatches through the `orchestration` skill to herdr sibling panes. Outside herdr (`HERDR_ENV` unset, or no idle agent pane) each workflow degrades to inline execution and reports which steps were not delegated.

## Available Workflows

### `/init`

One-time repository initialization. Detects the repo's tooling, confirms values with the user, and writes the `Herdrpowers Configuration` section into the repo's `CLAUDE.md` / `AGENTS.md` — the section every other workflow and skill uses to resolve `<KEY>` placeholders (`<BASE_BRANCH>`, `<REPORT_DIRECTORY>`, `<PLAN_PATH_PATTERN>`, `<BASELINE_VERIFICATION_COMMAND>`, …). Pack files themselves are never edited. On Claude Code plugin installs it surfaces as `/herdrpowers:init`.

Use when: the pack was just installed (plugin or checked-in copy), or the repo's base branch, report directory, or test/verification commands changed.

### `/full_cycle`

The full development cycle for a new feature or sizeable change, and the pack's default procedure for a task that arrives directly from the user: brainstorm → plan → **independent double review of the plan** → approval → isolate → documentation impact review → pane-delegated implementation with TDD → documentation update → repository verification → final review in a fresh pane → stop and present the integration candidates (merge locally / push and open a PR / keep / discard) for the user to pick.

Use when: starting real feature work.

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

A shortened cycle for small-scoped changes. Keeps brainstorming, documentation impact review, implementation with TDD, documentation update, verification, and an independent final review. Skips separate plan creation and double review, workspace isolation, and integration/cleanup.

Use when: the change is small enough to land without a separate written plan or an isolated worktree. If scope grows, stop and switch to `/full_cycle`.

## Guarantees

All development workflows share the same guardrails:

- **Safety**: Never write to `<BASE_BRANCH>` without explicit user consent; work happens on a feature branch (and, for most workflows, in a dedicated worktree).
- **Integration is offered, not assumed**: a finished branch ends with the candidates presented — merge locally, push and open a PR, keep as-is, or discard. The workflow executes the chosen one and cleans up only as far as that choice requires. No workflow merges on its own.
- **Independence**: The pane that writes code never reviews it. Plans are reviewed by two agent types that never saw each other's draft.
- **Quality**: No task is marked complete without RED-GREEN evidence and a task review that returns both spec-compliance and code-quality verdicts.
- **Transparency**: Each step blocks for user confirmation. Agents do not proceed autonomously through the whole cycle.
- **Evidence**: `verification-before-completion` runs before any "done" claim, and a delegated pane's claim is verified against its report file — not taken on trust.
- **Root cause over symptoms**: When tests fail, `systematic-debugging` drives the investigation.
- **Honest degradation**: Any step that could not be delegated, and any role that fell back to a substitute agent, is named in the final report.

## Invoking a Workflow

| Platform | How |
|---|---|
| Claude Code | Type the namespaced slash command (`/herdrpowers:full_cycle`, `/herdrpowers:plan`, …) from the plugin, or the bare command from a checked-in copy of `commands/`. |
| Cursor | Native slash commands from the plugin's `commands/`. |
| Codex | Plugin commands surface as skills — invoke them by name, or read `commands/<name>.md` directly. |
| Aider / other tools | No native slash commands — read the workflow file directly (e.g. `commands/full_cycle.md`) and instruct the agent to follow it step-by-step. |

> **See Also**: [Development Cycle Guide](./development_cycle.md) for a detailed walkthrough of each phase, and [Roles](./roles.md) for who does what.
